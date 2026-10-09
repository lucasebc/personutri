import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/** Segredos (token) ficam no cofre do Android; no web de teste, no armazenamento do navegador. */
type Secure = typeof import('expo-secure-store');
const secure: Secure | null = Platform.OS === 'web' ? null : (require('expo-secure-store') as Secure);

export const getSecret = (key: string): Promise<string | null> => (secure ? secure.getItemAsync(key) : AsyncStorage.getItem(key));
export const setSecret = (key: string, value: string): Promise<void> => (secure ? secure.setItemAsync(key, value) : AsyncStorage.setItem(key, value));
export const deleteSecret = (key: string): Promise<void> => (secure ? secure.deleteItemAsync(key) : AsyncStorage.removeItem(key));

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const writeJson = (key: string, value: unknown): Promise<void> => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
