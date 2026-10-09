import { useRouter } from 'expo-router';
import { useOutbox } from '@/lib/outbox';
import { Banner, Button } from '@/ui/primitives';

/** Faixa que aparece quando está offline ou há registros aguardando envio. */
export function SyncStatus() {
  const { online, pending, failed, flushing, flush } = useOutbox();
  const router = useRouter();
  if (online && pending === 0 && failed.length === 0) return null;

  if (failed.length > 0) {
    return (
      <Banner tone="bad" action={<Button title="Ver" size="sm" onPress={() => router.push('/pendencias')} />}>
        {failed.length === 1 ? '1 registro foi recusado pelo servidor.' : `${failed.length} registros foram recusados pelo servidor.`}
      </Banner>
    );
  }
  if (!online) {
    return (
      <Banner tone="warn" action={pending ? <Button title="Ver" size="sm" onPress={() => router.push('/pendencias')} /> : undefined}>
        {pending ? `Sem conexão. ${pending} ${pending === 1 ? 'registro será enviado' : 'registros serão enviados'} quando voltar o sinal.` : 'Sem conexão. Mostrando os últimos dados salvos.'}
      </Banner>
    );
  }
  return (
    <Banner tone="info" action={<Button title={flushing ? 'Enviando…' : 'Enviar agora'} size="sm" disabled={flushing} onPress={() => void flush()} />}>
      {`${pending} ${pending === 1 ? 'registro aguardando envio' : 'registros aguardando envio'}.`}
    </Banner>
  );
}
