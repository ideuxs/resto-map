import React from 'react';
import { Platform } from 'react-native';
import { Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';

import { flaticonVectorFamily } from '../../components/FlaticonIcon';
import { FontFamily } from '../../constants/theme';
import { useTheme } from '../../theme/ThemeProvider';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const isIOS = Platform.OS === 'ios';

  return (
    <NativeTabs
      backgroundColor={isIOS ? null : colors.surface}
      blurEffect={isIOS ? (isDark ? 'systemMaterialDark' : 'systemMaterialLight') : undefined}
      tintColor={isDark ? colors.lavender : colors.primary}
      iconColor={{ default: colors.textMuted, selected: isDark ? colors.lavender : colors.primary }}
      indicatorColor={colors.surfaceLight}
      disableTransparentOnScrollEdge={false}
      labelStyle={{
        default: { color: colors.textMuted, fontFamily: FontFamily.semiBold, fontSize: 11 },
        selected: { color: isDark ? colors.lavender : colors.primary, fontFamily: FontFamily.semiBold, fontSize: 11, fontWeight: '700' },
      }}
    >
      <NativeTabs.Trigger name="restaurants">
        <Icon src={<VectorIcon family={flaticonVectorFamily} name="utensils" />} />
        <Label>Restos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <Icon src={<VectorIcon family={flaticonVectorFamily} name="map" />} />
        <Label>Carte</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="wishlist">
        <Icon src={<VectorIcon family={flaticonVectorFamily} name="bookmark" />} />
        <Label>Envies</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collections">
        <Icon src={<VectorIcon family={flaticonVectorFamily} name="book-bookmark" />} />
        <Label>Listes</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon src={<VectorIcon family={flaticonVectorFamily} name="settings-sliders" />} />
        <Label>Réglages</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
