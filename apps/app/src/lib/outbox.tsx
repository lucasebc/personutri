import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, classifyFailure, enqueue, type OutboxOp, pendingCount } from '@personutri/shared';
import { readJson, writeJson } from './storage';
import { useSession } from './session';

const KEY = 'personutri:outbox:v1';
type NewOp = Parameters<typeof enqueue>[1];

interface OutboxCtx {
  ops: OutboxOp[];
  pending: number;
  failed: OutboxOp[];
  flushing: boolean;
  online: boolean;
  /** Registra a operação (visível na hora) e tenta enviar. */
  submit: (op: NewOp) => void;
  flush: () => Promise<void>;
  discard: (id: string) => void;
  /** Recoloca uma operação recusada na fila para nova tentativa. */
  retry: (id: string) => void;
}

const Ctx = createContext<OutboxCtx | null>(null);

export function OutboxProvider({ children }: { children: ReactNode }) {
  const { client, configured, unauthorized, reachable } = useSession();
  const qc = useQueryClient();
  // "Online" = o servidor respondeu na última tentativa (ver SessionProvider).
  const online = reachable !== false;

  const [ops, setOpsState] = useState<OutboxOp[]>([]);
  const opsRef = useRef<OutboxOp[]>([]);
  const loaded = useRef(false);
  const running = useRef(false);
  const [flushing, setFlushing] = useState(false);
  const retry = useRef<{ timer: ReturnType<typeof setTimeout> | null; n: number }>({ timer: null, n: 0 });

  const setOps = useCallback((next: OutboxOp[]) => {
    opsRef.current = next;
    setOpsState(next);
    if (loaded.current) void writeJson(KEY, next);
  }, []);

  useEffect(() => {
    readJson<OutboxOp[]>(KEY, []).then((saved) => {
      // o que foi enfileirado antes do carregamento termina depois do que já estava salvo
      const merged = [...saved, ...opsRef.current];
      loaded.current = true;
      setOps(merged);
    });
  }, [setOps]);

  const flush = useCallback(async () => {
    if (running.current || !configured || unauthorized || !loaded.current) return;
    running.current = true;
    setFlushing(true);
    if (retry.current.timer) clearTimeout(retry.current.timer);
    retry.current.timer = null;
    const sent = new Set<string>();
    const dropped = new Set<string>();
    let blocked = false; // algum envio falhou por rede/servidor: tentar de novo mais tarde
    try {
      for (const op of [...opsRef.current]) {
        if (op.error) continue;
        try {
          await client.request(op.path, { method: op.method, body: op.body, idempotencyKey: op.id });
          sent.add(op.id);
        } catch (e) {
          const err = e instanceof ApiError ? e : new ApiError(String(e), 0, true);
          const outcome = classifyFailure(op, { status: err.status, network: err.network });
          if (outcome === 'retry-later') {
            blocked = true;
            break; // sem conexão: mantém a ordem e tenta depois
          }
          if (outcome === 'drop') dropped.add(op.id);
          else if (outcome === 'failed') {
            setOps(opsRef.current.map((o) => (o.id === op.id ? { ...o, attempts: o.attempts + 1, error: err.message } : o)));
          }
        }
      }
      if (sent.size || dropped.size) {
        // Atualiza as telas antes de tirar as pendências da visão, para não "piscar" os valores antigos
        // (com limite de tempo: uma consulta lenta não pode prender a fila).
        await Promise.race([qc.invalidateQueries(), new Promise((r) => setTimeout(r, 8000))]);
        setOps(opsRef.current.filter((o) => !sent.has(o.id) && !dropped.has(o.id)));
      }
    } finally {
      running.current = false;
      setFlushing(false);
      if (blocked) {
        // recuo progressivo: 5 s, 10 s, 20 s… até 60 s (independe do evento de conectividade, que nem sempre dispara)
        retry.current.n += 1;
        const delay = Math.min(5000 * 2 ** (retry.current.n - 1), 60_000);
        retry.current.timer = setTimeout(() => void flushRef.current(), delay);
      } else {
        retry.current.n = 0;
      }
    }
  }, [client, configured, unauthorized, qc, setOps]);
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const submit = useCallback(
    (op: NewOp) => {
      setOps(enqueue(opsRef.current, op));
      setTimeout(() => void flush(), 0);
    },
    [flush, setOps],
  );

  const discard = useCallback((id: string) => setOps(opsRef.current.filter((o) => o.id !== id)), [setOps]);
  const retryOp = useCallback(
    (id: string) => {
      setOps(opsRef.current.map((o) => (o.id === id ? { ...o, error: undefined } : o)));
      setTimeout(() => void flush(), 0);
    },
    [flush, setOps],
  );

  useEffect(() => () => {
    if (retry.current.timer) clearTimeout(retry.current.timer);
  }, []);

  // Gatilhos de envio: voltou a conexão, app voltou ao primeiro plano, e a cada 45 s com pendências.
  useEffect(() => {
    if (online) void flush();
  }, [online, flush, ops.length]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void flush());
    return () => sub.remove();
  }, [flush]);
  useEffect(() => {
    if (!ops.some((o) => !o.error)) return;
    const t = setInterval(() => void flush(), 45_000);
    return () => clearInterval(t);
  }, [ops, flush]);

  const value = useMemo<OutboxCtx>(
    () => ({ ops, pending: pendingCount(ops), failed: ops.filter((o) => o.error), flushing, online, submit, flush, discard, retry: retryOp }),
    [ops, flushing, online, submit, flush, discard, retryOp],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOutbox(): OutboxCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOutbox fora do OutboxProvider');
  return v;
}
