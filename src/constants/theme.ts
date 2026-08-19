import { Platform, StyleSheet } from 'react-native';

export const lightColors = {
  background: '#F4EDE4', // Canvas Cream
  surface: '#FFFFFF', // Canvas White
  surfaceLight: '#F9F0FF', // Canvas Lavender
  surfaceMuted: '#EFE6E0', // Muted cream tone
  surfaceAubergine: '#4A154B', // Signature Aubergine surface
  canvasCream: '#F4EDE4',
  canvasLavender: '#F9F0FF',
  overlay: 'rgba(21, 13, 24, 0.48)',
  glass: 'rgba(255, 255, 255, 0.88)',
  primary: '#4A154B', // Aubergine primary
  primaryDeep: '#481A54',
  primaryPress: '#611F69',
  primaryTint: '#592466',
  accent: '#4A154B',
  accentPink: '#4A154B',
  friendText: '#1264A3',
  lavender: '#7C4C9B',
  link: '#1264A3', // Link Blue
  linkHover: '#3860BE',
  accentYellow: '#D97706',
  accentGreen: '#007A5A',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',
  textOnAubergineMute: '#D9BDDE',
  textPrimary: '#1D1D1D', // Ink
  textSecondary: '#4A4A4A',
  textMuted: '#696969', // Ink Mute
  border: '#E6E6E6', // Hairline border
  borderLight: '#F0F0F0',
  borderGlass: 'rgba(74, 21, 75, 0.08)',
  danger: '#CC4117', // Semantic error
  success: '#007A5A', // Semantic success
  warning: '#D97706',
};

export const darkColors: typeof lightColors = {
  background: '#110D14', // Deep Charcoal with subtle warm plum undertone
  surface: '#1C1622', // Clean dark elevated card surface
  surfaceLight: '#282030', // Secondary dark surface for nested elements
  surfaceMuted: '#221B29',
  surfaceAubergine: '#4A154B', // Signature Slacc Aubergine
  canvasCream: '#110D14',
  canvasLavender: '#282030',
  overlay: 'rgba(8, 4, 10, 0.78)',
  glass: 'rgba(28, 22, 34, 0.88)',
  primary: '#A84BAE', // Refined vibrant aubergine in dark mode
  primaryDeep: '#8E3694',
  primaryPress: '#BD62C3',
  primaryTint: '#4A154B',
  accent: '#A84BAE',
  accentPink: '#A84BAE',
  friendText: '#70B6FF',
  lavender: '#E7D0EB', // Soft luminous lavender
  link: '#70B6FF',
  linkHover: '#96CAFF',
  accentYellow: '#FBBF24',
  accentGreen: '#3DD69B',
  textOnPrimary: '#FFFFFF', // Crisp pure white
  textOnAccent: '#FFFFFF',
  textOnAubergineMute: '#E7D0EB',
  textPrimary: '#FAF8FC', // Crisp clear off-white
  textSecondary: '#D8CEE0', // Clean readable secondary text
  textMuted: '#9B8C9F', // Soft readable muted text
  border: '#2E2336', // Clean hairline border
  borderLight: '#251C2C',
  borderGlass: 'rgba(231, 208, 235, 0.12)',
  danger: '#FF8566',
  success: '#3DD69B',
  warning: '#FBBF24',
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
    rose: '#8E1854',
    magenta: '#A8136A',
    plum: '#6E2D64',
    violet: '#582CA8',
    grape: '#4A154B',
    indigo: '#1264A3',
    iris: '#3848A2',
    orchid: '#7E3685',
  },
  dark: {
    rose: '#FF80B5',
    magenta: '#FF6BB8',
    plum: '#D9A1D3',
    violet: '#C29EFF',
    grape: '#D9BDDE',
    indigo: '#70B6FF',
    iris: '#A1B1FF',
    orchid: '#E5A5E0',
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
  xs: 3,
  sm: 6, // Form inputs, compact tags
  md: 10, // Standard buttons, compact cards
  lg: 14, // Main action buttons, medium cards
  xl: 16, // Feature cards, restaurant cards, container sheets
  xxl: 24, // Large containers
  button: 12, // Standard iOS-inspired button radius
  badge: 6, // Square-rounded badge
  full: 999, // Reserved strictly for avatars/circular icons if needed
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 19,
  xl: 23,
  xxl: 28,
  title: 32,
  display: 40,
  stat: 48,
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
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  card: {
    ...Platform.select({
      ios: {
        shadowColor: '#1D1D1D',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  sheet: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  floating: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  surface: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  hard: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
};

export const hairline = StyleSheet.hairlineWidth;
