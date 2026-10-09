import { useEffect, useState } from 'react';
import { Linking, Platform, Share, View } from 'react-native';
import { fmt, formatDateBr, type SyncOutcome } from '@personutri/shared';
import { Segmented } from '@/ui/fields';
import { Screen } from '@/ui/layout';
import { Badge, Banner, Button, Card, Divider, Loading, Row, Text } from '@/ui/primitives';
import { health } from '@/native/health';
import { type DiagnosticsReport, formatReport, type PermissionState } from '@/native/health.types';
import { lastSync, resetSyncState, syncNow } from '@/native/health-sync';
import { backgroundSupported, disableBackgroundSync, enableBackgroundSync, isBackgroundEnabled } from '@/native/health-task';
import { HC_BG_KEY } from '@/lib/keys';
import { readJson, writeJson } from '@/lib/storage';

const TONE: Record<SyncOutcome['state'], 'good' | 'warn' | 'bad'> = { ok: 'good', offline: 'warn', 'needs-permission': 'warn', 'update-required': 'warn', unavailable: 'bad', error: 'bad' };

function Outcome({ o }: { o: SyncOutcome }) {
  const when = new Date(o.at).toLocaleString('pt-BR');
  if (o.state !== 'ok') {
    return (
      <View style={{ gap: 4 }}>
        <Badge label={o.state === 'offline' ? 'sem conexão' : o.state === 'needs-permission' ? 'precisa de permissão' : o.state === 'update-required' ? 'atualizar Health Connect' : 'falhou'} tone={TONE[o.state]} />
        <Text v="small">{o.message}</Text>
        <Text v="small">{when}</Text>
      </View>
    );
  }
  const w = o.workouts;
  return (
    <View style={{ gap: 4 }}>
      <Badge label={o.mode === 'initial' ? 'primeira sincronização' : 'sincronizado'} tone="good" />
      <Text>
        {w.sent} {w.sent === 1 ? 'treino enviado' : 'treinos enviados'} ({w.created} novos, {w.updated} atualizados{w.deleted ? `, ${w.deleted} removidos` : ''})
        {o.weights.sent ? ` · ${o.weights.sent} pesagem(ns)` : ''}
      </Text>
      {w.estimatedFromTotal > 0 ? <Text v="small">{w.estimatedFromTotal} treino(s) tiveram as calorias ativas estimadas a partir das calorias totais.</Text> : null}
      {w.withoutCalories > 0 ? <Text v="small">{w.withoutCalories} treino(s) sem calorias do relógio: o servidor estima pelo tipo de atividade e seu peso.</Text> : null}
      {w.errors > 0 ? <Text v="small">{w.errors} item(ns) recusados pelo servidor.</Text> : null}
      <Text v="small">{when}</Text>
    </View>
  );
}

export default function SyncScreen() {
  const [perm, setPerm] = useState<PermissionState | null>(null);
  const [last, setLast] = useState<SyncOutcome | null>(null);
  const [bg, setBg] = useState(false);
  const [busy, setBusy] = useState<'sync' | 'perm' | 'diag' | null>(null);
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setPerm(await health.permissionState());
      setLast(await lastSync());
      setBg(backgroundSupported && (await isBackgroundEnabled()));
    })();
  }, []);

  if (!health.supported) {
    return (
      <Screen title="Relógio" back>
        <Banner tone="info">A sincronização com o Health Connect existe apenas no app Android. Use o PersoNutri no celular para importar os treinos do Galaxy Watch.</Banner>
      </Screen>
    );
  }
  if (!perm) {
    return (
      <Screen title="Relógio" back>
        <Loading />
      </Screen>
    );
  }

  const ready = perm.read;
  return (
    <Screen title="Relógio" subtitle="Treinos e peso do Galaxy Watch via Health Connect" back>
      <Card title="1. Permissões">
        <Text v="small">
          O Samsung Health grava os dados do relógio no Health Connect, e o PersoNutri lê de lá. Em Samsung Health → Configurações → Health Connect, deixe a sincronização ligada.
        </Text>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Badge label={perm.read ? 'leitura permitida' : 'sem permissão de leitura'} tone={perm.read ? 'good' : 'warn'} />
          <Badge label={perm.background ? 'segundo plano permitido' : 'segundo plano não permitido'} tone={perm.background ? 'good' : 'muted'} />
          <Badge label={perm.history ? 'histórico permitido' : 'só 30 dias de histórico'} tone={perm.history ? 'good' : 'muted'} />
        </Row>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          <Button
            title={perm.read ? 'Revisar permissões' : 'Permitir acesso'}
            variant={perm.read ? 'default' : 'primary'}
            loading={busy === 'perm'}
            onPress={async () => {
              setBusy('perm');
              setPerm(await health.requestPermissions());
              setBusy(null);
            }}
          />
          <Button title="Abrir Health Connect" onPress={() => health.openHealthConnect()} />
        </Row>
      </Card>

      <Card title="2. Sincronizar">
        <Button
          title="Sincronizar agora"
          variant="primary"
          disabled={!ready}
          loading={busy === 'sync'}
          onPress={async () => {
            setBusy('sync');
            const r = await syncNow();
            setLast(r);
            setPerm(await health.permissionState());
            setBusy(null);
          }}
        />
        {last ? <Outcome o={last} /> : <Text v="small">Ainda não sincronizado.</Text>}
        <Divider />
        <Text v="bodyBold">Sincronização automática</Text>
        <Text v="small">Roda em segundo plano mais ou menos a cada hora (o Android decide o horário, só com bateria e rede disponíveis).</Text>
        <Segmented<'on' | 'off'>
          value={bg ? 'on' : 'off'}
          onChange={async (v) => {
            try {
              if (v === 'on') await enableBackgroundSync();
              else await disableBackgroundSync();
              await writeJson(HC_BG_KEY, v === 'on');
              setBg(v === 'on');
              setMessage(null);
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
          options={[
            { value: 'off', label: 'Desligada' },
            { value: 'on', label: 'Ligada' },
          ]}
        />
        {bg && !perm.background ? <Banner tone="warn">Sem a permissão de segundo plano do Health Connect a leitura automática pode falhar. Toque em "Revisar permissões".</Banner> : null}
        <Banner tone="info" action={Platform.OS === 'android' ? <Button title="Abrir ajustes" size="sm" onPress={() => void Linking.openSettings()} /> : undefined}>
          Em aparelhos Samsung, para a sincronização automática funcionar: Configurações → Aplicativos → PersoNutri → Bateria → "Sem restrições" (e tire o app de "Aplicativos em suspensão").
        </Banner>
        {message ? <Banner tone="bad">{message}</Banner> : null}
        <Button
          title="Refazer a leitura dos últimos 30 dias"
          size="sm"
          onPress={async () => {
            await resetSyncState();
            setLast(null);
            setMessage('Pronto: a próxima sincronização relê os últimos 30 dias (nada é duplicado).');
          }}
        />
      </Card>

      <Card title="3. Diagnóstico">
        <Text v="small">Mostra o que o Samsung Health gravou nos últimos 7 dias e o que seria enviado. Útil para conferir calorias e tipos de treino.</Text>
        <Button
          title="Ver dados do relógio (7 dias)"
          loading={busy === 'diag'}
          disabled={!ready}
          onPress={async () => {
            setBusy('diag');
            setReport(await health.diagnostics(7));
            setBusy(null);
          }}
        />
        {report ? (
          <View style={{ gap: 8 }}>
            <Text v="small">
              {report.sessions.length} sessões · {report.weights} pesagens · {report.bodyFat} registros de gordura · origens: {report.origins.join(', ') || '—'}
            </Text>
            {report.sessions.map((s) => (
              <View key={s.id} style={{ gap: 2 }}>
                <Text v="bodyBold">{s.type}{s.title ? ` · ${s.title}` : ''}</Text>
                <Text v="small" num>
                  {formatDateBr(s.start.slice(0, 10))} · {fmt(s.durationMin, 1)} min · ativas {s.activeKcal ?? '—'} · totais {s.totalKcal ?? '—'} · {s.distanceKm ?? '—'} km · FC {s.avgHeartRate ?? '—'}
                </Text>
                <Text v="small">origem {s.origin ?? '?'} → {s.send ? `enviaria ${s.send.deviceActiveKcal ?? 'sem'} kcal (${s.kcalSource === 'active' ? 'ativas' : s.kcalSource === 'total-minus-resting' ? 'totais − repouso' : 'estimado pelo servidor'})` : 'nada'}</Text>
              </View>
            ))}
            <Button title="Compartilhar relatório" size="sm" onPress={() => void Share.share({ message: formatReport(report) })} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
