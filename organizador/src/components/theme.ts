import { useColorScheme } from 'react-native';

// Familias cargadas en src/app/_layout.tsx. En Android `fontWeight` no elige el archivo de una
// fuente custom, por eso el componente Text traduce el peso a la familia correspondiente.
export const FONTS = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

export function fontFor(weight: string | number | undefined): string {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 400 : weight);
  if (w >= 800) return FONTS.extrabold;
  if (w >= 700) return FONTS.bold;
  if (w >= 600) return FONTS.semibold;
  return FONTS.regular;
}

/** Color de cada módulo: encabezado con curva, ilustración y mosaicos de tarjetas. */
export type Accent = {
  hero: string; // fondo del encabezado
  glow: string; // círculos de luz detrás de la ilustración
  ink: string; // texto sobre el encabezado
  tile: string; // fondo de mosaicos e íconos dentro de tarjetas
  tileInk: string;
};

export type Module = 'hoy' | 'tareas' | 'agenda' | 'notas' | 'habitos';

const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#FBF8F4',
  card: '#FFFFFF',
  cardAlt: '#F4EFE9',
  text: '#2D2A26',
  muted: '#7A736C',
  border: '#ECE4DB',
  primary: '#1652F0',
  primaryText: '#FFFFFF',
  danger: '#E5484D',
  success: '#1E9E5A',
  warning: '#FF7A2E',
  chip: '#F2ECE5',
  shadow: '#5A3A1A',
  sun: '#FF7A2E',
  sunLight: '#FFA25E',
  accents: {
    hoy: { hero: '#FFB31F', glow: '#FFCB45', ink: '#2D2A26', tile: '#FFE7B3', tileInk: '#B35A00' },
    tareas: { hero: '#FF8A3D', glow: '#FFA866', ink: '#2D2A26', tile: '#FFE1CC', tileInk: '#B34A00' },
    agenda: { hero: '#FFD23F', glow: '#FFE27A', ink: '#2D2A26', tile: '#FFF1BF', tileInk: '#8A6A00' },
    notas: { hero: '#9B7BF2', glow: '#B79CFF', ink: '#FFFFFF', tile: '#ECE4FF', tileInk: '#5B3CC4' },
    habitos: { hero: '#1F45E0', glow: '#3D63FF', ink: '#FFFFFF', tile: '#DDE5FF', tileInk: '#1F45E0' },
  } as Record<Module, Accent>,
};

export type Theme = typeof light;

// Oscuro: noche azul (como un programa de sueño), con los acentos un punto más profundos.
const dark: Theme = {
  scheme: 'dark',
  bg: '#0F1230',
  card: '#1A1E44',
  cardAlt: '#222755',
  text: '#F6F1EA',
  muted: '#A9A6C4',
  border: '#2D3365',
  primary: '#5B86FF',
  primaryText: '#FFFFFF',
  danger: '#FF6B6E',
  success: '#3CCB7F',
  warning: '#FF9550',
  chip: '#262B5C',
  shadow: '#000000',
  sun: '#FF8A3D',
  sunLight: '#FFB067',
  accents: {
    hoy: { hero: '#E58A00', glow: '#F7A21B', ink: '#1A1206', tile: '#3A2C1A', tileInk: '#FFB84D' },
    tareas: { hero: '#E0631C', glow: '#F27D36', ink: '#FFFFFF', tile: '#3A2418', tileInk: '#FF9A5C' },
    agenda: { hero: '#D9A800', glow: '#EDC11F', ink: '#1A1406', tile: '#3A3214', tileInk: '#FFD54A' },
    notas: { hero: '#5E3FC4', glow: '#7455DD', ink: '#FFFFFF', tile: '#2E2660', tileInk: '#C2AEFF' },
    habitos: { hero: '#14257A', glow: '#1F3599', ink: '#FFFFFF', tile: '#1E2A66', tileInk: '#8FA8FF' },
  },
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const PRIORITY_LABEL = { 1: 'Alta', 2: 'Media', 3: 'Baja' } as const;

export function priorityColor(t: Theme, p: number): string {
  return p === 1 ? t.danger : p === 2 ? t.warning : t.muted;
}

export const RADIUS = { card: 22, pill: 999, field: 16 } as const;
