import type { HealthNative } from './health.types';

/** Plataformas sem Health Connect (web e iOS): tudo desligado. */
const nope = async () => ({ read: false, background: false, history: false });

export const health: HealthNative = {
  supported: false,
  port: null,
  permissionState: nope,
  requestPermissions: nope,
  openHealthConnect: () => {},
  diagnostics: async (days) => ({
    generatedAt: new Date().toISOString(),
    sdkStatus: 'unavailable',
    permissions: { read: false, background: false, history: false },
    days,
    sessions: [],
    origins: [],
    weights: 0,
    bodyFat: 0,
  }),
};
