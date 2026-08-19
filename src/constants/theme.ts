import { Platform, StyleSheet } from 'react-native';

export const lightColors = {
  // The logo is the source of truth: acid pink, ink navy and paper lavender.
  background: '#F5EFF7',
  surface: '#FFFFFF',
  surfaceLight: '#E9DDF0',
  surfaceMuted: '#E9DDF0',
  overlay: 'rgba(16, 13, 24, 0.56)',
  glass: 'rgba(250, 248, 251, 0.84)',
  primary: '#292C90',
  primaryLight: '#7C4C9B',
  accent: '#292C90',
  accentPink: '#FF007F',
  friendText: '#A60062',
  lavender: '#7C4C9B',
  accentYellow: '#765500',
  accentGreen: '#087A54',
  textOnPrimary: '#FAF8FB',
  textOnAccent: '#FAF8FB',
  textPrimary: '#17121E',
  textSecondary: '#51485A',
  textMuted: '#6E6575',
  border: '#17121E',
  borderLight: '#D9CEE1',
  borderGlass: 'rgba(41, 44, 144, 0.16)',
  danger: '#B42318',
  success: '#087A54',
  warning: '#936300',
};

export const darkColors: typeof lightColors = {
  background: '#100D18',
  surface: '#1B1426',
  surfaceLight: '#2B2140',
  surfaceMuted: '#2B2140',
  overlay: 'rgba(5, 4, 9, 0.72)',
  glass: 'rgba(26, 21, 35, 0.86)',
  primary: '#9A9FF4',
  primaryLight: '#C9A5DF',
  accent: '#9A9FF4',
  accentPink: '#FF3BA4',
  friendText: '#FF8BCB',
  lavender: '#C9A5DF',
  accentYellow: '#E8BA62',
  accentGreen: '#5AD3A2',
  textOnPrimary: '#100D18',
  textOnAccent: '#100D18',
  textPrimary: '#FAF8FB',
  textSecondary: '#D4C9DC',
  textMuted: '#A99DB2',
  border: '#F8F3FF',
  borderLight: '#403252',
  borderGlass: 'rgba(201, 165, 223, 0.18)',
  danger: '#FF9187',
  success: '#5AD3A2',
  warning: '#E8BA62',
};

export type ThemeColors = typeof lightColors;

export const SOURCE_COLOR_KEYS = [
  'rose',
  'magenta',
  'plum',
  'violet',
  'grape',
  'indigo',
  'iris',
  'orchid',
] as const;

export type SourceColorKey = typeof SOURCE_COLOR_KEYS[number];

export function isSourceColorKey(value: string | undefined): value is SourceColorKey {
  return Boolean(value && SOURCE_COLOR_KEYS.includes(value as SourceColorKey));
}

export const sourceColors: Record<'light' | 'dark', Record<SourceColorKey, string>> = {
  light: {
    rose: '#A91963',
    magenta: '#D10B78',
    plum: '#7C3F73',
    violet: '#6D3CF5',
    grape: '#553B88',
    indigo: '#292C90',
    iris: '#4145A0',
    orchid: '#8F3F8D',
  },
  dark: {
    rose: '#FF77C5',
    magenta: '#FF3BA4',
    plum: '#D49AD0',
    violet: '#B58CFF',
    grape: '#B69CE5',
    indigo: '#9A9FF4',
    iris: '#AEB2FF',
    orchid: '#E39CDE',
  },
};

export function getSourceColor(key: SourceColorKey, theme: 'light' | 'dark'): string {
  return sourceColors[theme][key];
}

export function sourceColorKeyFor(value: string): SourceColorKey {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return SOURCE_COLOR_KEYS[Math.abs(hash) % SOURCE_COLOR_KEYS.length];
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
  full: 999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 19,
  xl: 23,
  xxl: 28,
  title: 32,
};

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

export const Shadows = {
  hairline: {
    ...Platform.select({
      ios: {
        shadowColor: '#100D18',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  sheet: {
    ...Platform.select({
      ios: {
        shadowColor: '#07050B',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.14,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  surface: {
    ...Platform.select({
      ios: {
        shadowColor: '#100D18',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  /** A deliberately unblurred zine shadow. Use on one signature surface per screen. */
  hard: {
    ...Platform.select({
      ios: {
        shadowColor: '#17121E',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
};

export const hairline = StyleSheet.hairlineWidth;
