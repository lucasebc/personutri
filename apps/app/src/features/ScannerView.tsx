import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/ui/primitives';

/** Leitor de código de barras (EAN/UPC) pela câmera. */
export function ScannerView({ onCode }: { onCode: (code: string) => void }) {
  const [permission, request] = useCameraPermissions();
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={{ gap: 12, alignItems: 'flex-start' }}>
        <Text>Para ler o código de barras, permita o uso da câmera.</Text>
        <Button title="Permitir câmera" variant="primary" onPress={() => void request()} />
      </View>
    );
  }
  return (
    <View style={{ height: 320, borderRadius: 14, overflow: 'hidden' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => {
          const now = Date.now();
          if (data === last.current.code && now - last.current.at < 3000) return; // evita leituras repetidas
          last.current = { code: data, at: now };
          onCode(data);
        }}
      />
    </View>
  );
}
