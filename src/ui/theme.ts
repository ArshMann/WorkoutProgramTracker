import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store/app';

/**
 * One restrained accent, generous whitespace, numbers as the hero. Dark is
 * the default; light is supported.
 */
export interface Colors {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  danger: string;
  scheme: 'dark' | 'light';
}

export const DARK: Colors = {
  bg: '#0E0F12',
  surface: '#16181D',
  surfaceRaised: '#1E2129',
  border: '#2A2E37',
  text: '#F2F3F5',
  textMuted: '#A3A8B3',
  textFaint: '#6B7078',
  accent: '#6FC2B5',
  accentText: '#0E0F12',
  accentSoft: '#1C332F',
  danger: '#D98C7A',
  scheme: 'dark',
};

export const LIGHT: Colors = {
  bg: '#F6F7F8',
  surface: '#FFFFFF',
  surfaceRaised: '#EEF0F3',
  border: '#DDE1E6',
  text: '#15171B',
  textMuted: '#5B616B',
  textFaint: '#8B909A',
  accent: '#2F8C7E',
  accentText: '#FFFFFF',
  accentSoft: '#DDEFEB',
  danger: '#B4573F',
  scheme: 'light',
};

export function useColors(): Colors {
  const pref = useAppStore((s) => s.theme);
  const system = useColorScheme();
  if (pref === 'light') return LIGHT;
  if (pref === 'dark') return DARK;
  return system === 'light' ? LIGHT : DARK;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16 } as const;
/** Minimum touch target everywhere. */
export const TOUCH = 48;
export const font = {
  display: 44,
  number: 32,
  title: 22,
  body: 17,
  small: 14,
  caption: 12,
} as const;
