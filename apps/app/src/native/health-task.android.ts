import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { syncNow } from './health-sync';

export const HEALTH_TASK = 'personutri-health-sync';
export const backgroundSupported = true;

// Precisa estar no escopo global (importado pelo layout raiz) para o Android poder executá-la com o app fechado.
TaskManager.defineTask(HEALTH_TASK, async () => {
  try {
    const r = await syncNow();
    return r.state === 'ok' || r.state === 'offline' ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const isBackgroundEnabled = () => TaskManager.isTaskRegisteredAsync(HEALTH_TASK);
/** O Android decide o horário; 15 min é o mínimo, usamos 60 para poupar bateria. */
export const enableBackgroundSync = () => BackgroundTask.registerTaskAsync(HEALTH_TASK, { minimumInterval: 60 });
export const disableBackgroundSync = () => BackgroundTask.unregisterTaskAsync(HEALTH_TASK);
