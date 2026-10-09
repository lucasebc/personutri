import { useState } from 'react';
import { Row, Button } from '@/ui/primitives';
import { Field } from '@/ui/fields';

/** No navegador (apenas testes) o código é digitado. */
export function ScannerView({ onCode }: { onCode: (code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <Row gap={8} style={{ alignItems: 'flex-end' }}>
      <Field label="Código de barras" value={code} onChangeText={setCode} keyboardType="number-pad" accessibilityLabel="Código de barras" />
      <Button title="Buscar" variant="primary" disabled={code.trim().length < 8} onPress={() => onCode(code.trim())} />
    </Row>
  );
}
