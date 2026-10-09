import { useNetInfo } from '@react-native-community/netinfo';
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
  const { client, configured, unauthorized } = useSession();
  const qc = useQueryClient();
  const net = useNetInfo();
  const online = net.isConnected !== false && net.isInternetReachable !== false;

  const [ops, setOpsState] = useState<OutboxOp[]>([]);
  const opsRef = useRef<OutboxOp[]>([]);
  const loaded = useRef(false);
  const running = useRef(false);
  const [flushing, setFlushing] = useState(false);

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
    const sent = new Set<string>();
    const dropped = new Set<string>();
    try {
      for (const op of [...opsRef.current]) {
        if (op.error) continue;
        try {
          await client.request(op.path, { method: op.method, body: op.body, idempotencyKey: op.id });
          sent.add(op.id);
        } catch (e) {
          const err = e instanceof ApiError ? e : new ApiError(String(e), 0, true);
          const outcome = classifyFailure(op, { status: err.status, network: err.network });
          if (outcome === 'retry-later') break; // sem conexão: mantém a ordem e tenta depois
          if (outcome === 'drop') dropped.add(op.id);
          else if (outcome === 'failed') {
            setOps(opsRef.current.map((o) => (o.id === op.id ? { ...o, attempts: o.attempts + 1, error: err.message } : o)));
          }
        }
      }
      if (sent.size || dropped.size) {
        // Atualiza as telas antes de tirar as pendências da visão, para não "piscar" os valores antigos.
        await qc.invalidateQueries();
        setOps(opsRef.current.filter((o) => !sent.has(o.id) && !dropped.has(o.id)));
      }
    } finally {
      running.current = false;
      setFlushing(false);
    }
  }, [client, configured, unauthorized, qc, setOps]);

  const submit = useCallback(
    (op: NewOp) => {
      setOps(enqueue(opsRef.current, op));
      setTimeout(() => void flush(), 0);
    },
    [flush, setOps],
  );

  const discard = useCallback((id: string) => setOps(opsRef.current.filter((o) => o.id !== id)), [setOps]);
  const retry = useCallback(
    (id: string) => {
      setOps(opsRef.current.map((o) => (o.id === id ? { ...o, error: undefined } : o)));
      setTimeout(() => void flush(), 0);
    },
    [flush, setOps],
  );

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
    () => ({ ops, pending: pendingCount(ops), failed: ops.filter((o) => o.error), flushing, online, submit, flush, discard, retry }),
    [ops, flushing, online, submit, flush, discard, retry],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOutbox(): OutboxCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOutbox fora do OutboxProvider');
  return v;
}
