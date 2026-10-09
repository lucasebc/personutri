import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export interface Colors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  good: string;
  warn: string;
  bad: string;
  badSoft: string;
  warnSoft: string;
  overlay: string;
}

// Mesmos tokens do site (frontend/src/app/globals.css)
export const lightColors: Colors = {
  bg: '#f5f6f2', surface: '#ffffff', surface2: '#f0f2ec', border: '#dfe3d9', text: '#19211d', muted: '#647069',
  accent: '#1d7a4f', accentText: '#ffffff', accentSoft: '#e2f1e8', protein: '#3566c9', carbs: '#c98a12', fat: '#cc4a62',
  fiber: '#7653c2', good: '#1d7a4f', warn: '#a96a0c', bad: '#bf3a2b', badSoft: '#fbe9e6', warnSoft: '#fbf0dc', overlay: 'rgba(0,0,0,0.5)',
};
export const darkColors: Colors = {
  bg: '#101512', surface: '#181f1b', surface2: '#1f2822', border: '#2b362f', text: '#e7ede9', muted: '#93a09a',
  accent: '#4cc38a', accentText: '#08140e', accentSoft: '#1b3326', protein: '#6d9bf0', carbs: '#e4aa3a', fat: '#ee7a90',
  fiber: '#a287e6', good: '#4cc38a', warn: '#e4aa3a', bad: '#f0806f', badSoft: '#3a1f1b', warnSoft: '#3a2e17', overlay: 'rgba(0,0,0,0.65)',
};

export type ThemePref = 'system' | 'light' | 'dark';

interface ThemeCtx {
  colors: Colors;
  dark: boolean;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const Ctx = createContext<ThemeCtx>({ colors: lightColors, dark: false, pref: 'system', setPref: () => {} });
const KEY = 'personutri:theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => v && (v === 'light' || v === 'dark' || v === 'system') && setPrefState(v))
      .catch(() => {});
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(KEY, p).catch(() => {});
  }, []);

  const value = useMemo(() => {
    const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
    return { colors: dark ? darkColors : lightColors, dark, pref, setPref };
  }, [pref, system, setPref]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
