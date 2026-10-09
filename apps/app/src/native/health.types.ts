import type { HealthPort, WorkoutImportItem } from '@personutri/shared';

export interface PermissionState {
  /** leitura de exercícios, calorias, distância, FC e peso */
  read: boolean;
  /** leitura em segundo plano (depende da versão do Health Connect) */
  background: boolean;
  /** histórico além dos 30 dias iniciais */
  history: boolean;
}

export interface DiagnosticSession {
  id: string;
  type: string;
  title: string | null;
  origin: string | null;
  start: string;
  durationMin: number;
  activeKcal: number | null;
  totalKcal: number | null;
  distanceKm: number | null;
  avgHeartRate: number | null;
  /** o que seria enviado ao servidor */
  send: WorkoutImportItem | null;
  kcalSource: 'active' | 'total-minus-resting' | 'none' | null;
}

export interface DiagnosticsReport {
  generatedAt: string;
  sdkStatus: 'available' | 'update-required' | 'unavailable';
  permissions: PermissionState;
  days: number;
  sessions: DiagnosticSession[];
  origins: string[];
  weights: number;
  bodyFat: number;
}

/** Acesso ao Health Connect (só existe no Android; nas outras plataformas `port` é null). */
export interface HealthNative {
  supported: boolean;
  port: HealthPort | null;
  permissionState(): Promise<PermissionState>;
  requestPermissions(): Promise<PermissionState>;
  openHealthConnect(): void;
  diagnostics(days: number): Promise<DiagnosticsReport>;
}

export function formatReport(r: DiagnosticsReport): string {
  const lines = [
    `PersoNutri — diagnóstico do Health Connect (${r.generatedAt})`,
    `Status: ${r.sdkStatus} · permissões: leitura=${r.permissions.read} segundo plano=${r.permissions.background} histórico=${r.permissions.history}`,
    `Últimos ${r.days} dias: ${r.sessions.length} sessões de exercício, ${r.weights} pesagens, ${r.bodyFat} registros de gordura corporal`,
    `Origens dos dados: ${r.origins.join(', ') || '—'}`,
    '',
  ];
  for (const s of r.sessions) {
    lines.push(
      `• ${s.start} · ${s.type}${s.title ? ` (${s.title})` : ''} · ${s.durationMin} min · origem ${s.origin ?? '?'}`,
      `    ativas=${s.activeKcal ?? '—'} totais=${s.totalKcal ?? '—'} dist=${s.distanceKm ?? '—'} km FC=${s.avgHeartRate ?? '—'} → enviaria ${s.send ? `${s.send.deviceActiveKcal ?? 'sem kcal'} kcal (${s.kcalSource})` : 'nada'}`,
    );
  }
  return lines.join('\n');
}
