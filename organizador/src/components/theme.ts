import { useColorScheme } from 'react-native';

const light = {
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#15181E',
  muted: '#6B7280',
  border: '#E3E6EB',
  primary: '#2F6FEB',
  primaryText: '#FFFFFF',
  danger: '#D93F3F',
  success: '#1F9D55',
  warning: '#C98A00',
  chip: '#EEF1F5',
};

const dark: typeof light = {
  bg: '#0F1115',
  card: '#181B21',
  text: '#ECEEF2',
  muted: '#9AA1AC',
  border: '#2A2F38',
  primary: '#5B8DEF',
  primaryText: '#0F1115',
  danger: '#F06A6A',
  success: '#3CC27A',
  warning: '#E5B23B',
  chip: '#232831',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const PRIORITY_LABEL = { 1: 'Alta', 2: 'Media', 3: 'Baja' } as const;

export function priorityColor(t: Theme, p: number): string {
  return p === 1 ? t.danger : p === 2 ? t.warning : t.muted;
}
