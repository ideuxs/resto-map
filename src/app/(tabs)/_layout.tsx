import React from 'react';
import { Platform } from 'react-native';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { FontFamily } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const isIOS = Platform.OS === 'ios';

  return (
    <NativeTabs
      backgroundColor={isIOS ? null : colors.surface}
      blurEffect={isIOS ? (isDark ? 'systemMaterialDark' : 'systemMaterialLight') : undefined}
      tintColor={colors.primary}
      iconColor={{ default: colors.textMuted, selected: colors.primary }}
      indicatorColor={colors.surfaceLight}
      disableTransparentOnScrollEdge={false}
      labelStyle={{
        default: { color: colors.textMuted, fontFamily: FontFamily.semiBold, fontSize: 11 },
        selected: { color: colors.primary, fontFamily: FontFamily.semiBold, fontSize: 11, fontWeight: '700' },
      }}
    >
      <NativeTabs.Trigger name="restaurants">
        <Icon sf={{ default: 'fork.knife', selected: 'fork.knife' }} />
        <Label>Restos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <Label>Carte</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collections">
        <Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} />
        <Label>Listes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>Paramètres</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
