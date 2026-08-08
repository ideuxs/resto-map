import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from '../constants/theme';

type ColorScheme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setTheme: (scheme: ColorScheme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = '@restohub_theme_preference';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const deviceTheme = useDeviceColorScheme() || 'light';
  const [colorScheme, setColorScheme] = useState<ColorScheme>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        setColorScheme(storedTheme as ColorScheme);
      }
    } catch (e) {
      console.error('Erreur chargement thème', e);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (scheme: ColorScheme) => {
    setColorScheme(scheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
    } catch (e) {
      console.error('Erreur sauvegarde thème', e);
    }
  };

  if (!isLoaded) return null;

  const actualTheme = colorScheme === 'system' ? deviceTheme : colorScheme;
  const isDark = actualTheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme: actualTheme, colorScheme, colors, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
