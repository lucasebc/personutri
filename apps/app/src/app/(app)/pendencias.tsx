import { View } from 'react-native';
import { useOutbox } from '@/lib/outbox';
import { Screen } from '@/ui/layout';
import { Badge, Banner, Button, Card, Empty, Row, Text } from '@/ui/primitives';

const KIND: Record<string, string> = {
  'diary.status': 'Refeição marcada',
  'diary.items': 'Quantidades ajustadas',
  'diary.free': 'Consumo livre',
  'diary.delete': 'Registro removido',
  'workout.create': 'Treino',
  'workout.update': 'Treino editado',
  'workout.delete': 'Treino removido',
  'weight.add': 'Pesagem',
  'weight.delete': 'Pesagem removida',
};

export default function Pending() {
  const { ops, online, flushing, flush, discard, retry } = useOutbox();
  return (
    <Screen title="Pendências" subtitle="Registros feitos sem conexão" back right={<Button title={flushing ? 'Enviando…' : 'Enviar agora'} size="sm" variant="primary" disabled={flushing || !online || ops.length === 0} onPress={() => void flush()} />}>
      {!online ? <Banner tone="warn">Sem conexão. Os registros serão enviados quando o sinal voltar.</Banner> : null}
      {ops.length === 0 ? <Empty>Nada pendente. Tudo está sincronizado.</Empty> : null}
      {ops.map((o) => (
        <Card key={o.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text v="bodyBold">{KIND[o.meta.kind] ?? o.meta.kind}</Text>
              <Text v="small">{o.label} · {new Date(o.createdAt).toLocaleString('pt-BR')}</Text>
            </View>
            <Badge label={o.error ? 'recusado' : 'a enviar'} tone={o.error ? 'bad' : 'warn'} />
          </Row>
          {o.error ? <Text v="small" color="#bf3a2b">{o.error}</Text> : null}
          <Row gap={8}>
            {o.error ? <Button title="Tentar de novo" size="sm" onPress={() => retry(o.id)} /> : null}
            <Button title="Descartar" size="sm" variant="danger" onPress={() => discard(o.id)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
