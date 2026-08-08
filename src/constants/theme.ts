import { StyleSheet, Platform } from 'react-native';

export const lightColors = {
  background: '#F8FAFC',      // slate-50
  surface: '#FFFFFF',         // pure white, optimized for shadows
  surfaceLight: '#F1F5F9',    // slate-100
  overlay: 'rgba(15, 23, 42, 0.4)', // dark overlay with blur
  glass: 'rgba(255, 255, 255, 0.85)', // translucent white for glassmorphism

  primary: '#4F46E5',         // Indigo 600 - vibrant modern primary
  primaryLight: '#818CF8',    // Indigo 400
  textOnPrimary: '#FFFFFF',

  textPrimary: '#0F172A',     // slate-900 (softer than pure black)
  textSecondary: '#475569',   // slate-600
  textMuted: '#94A3B8',       // slate-400

  border: '#E2E8F0',          // slate-200
  borderLight: '#F1F5F9',     // slate-100
  borderGlass: 'rgba(255,255,255,0.4)',

  danger: '#E11D48',          // rose-600
  success: '#10B981',         // emerald-500
  warning: '#F59E0B',         // amber-500
};

export const darkColors = {
  background: '#09090B',      // zinc-950 (ultra dark for OLED)
  surface: '#18181B',         // zinc-900 
  surfaceLight: '#27272A',    // zinc-800
  overlay: 'rgba(0, 0, 0, 0.7)',
  glass: 'rgba(24, 24, 27, 0.85)', // translucent dark for glassmorphism

  primary: '#6366F1',         // Indigo 500
  primaryLight: '#818CF8',    // Indigo 400
  textOnPrimary: '#FFFFFF',

  textPrimary: '#F8FAFC',     // slate-50
  textSecondary: '#94A3B8',   // slate-400
  textMuted: '#64748B',       // slate-500

  border: '#27272A',          // zinc-800
  borderLight: '#3F3F46',     // zinc-700
  borderGlass: 'rgba(255,255,255,0.05)',

  danger: '#F43F5E',          // rose-500
  success: '#34D399',         // emerald-400
  warning: '#FBBF24',         // amber-400
};

export type ThemeColors = typeof lightColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  title: 32,
};

export const FontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
};
