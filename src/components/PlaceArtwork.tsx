import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Restaurant } from '../types';
import { CATEGORIES } from '../constants/categories';
import { FontFamily, getSourceColor, isSourceColorKey, sourceColorKeyFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  restaurant: Restaurant;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'RH';
}

export default function PlaceArtwork({ restaurant, style, compact = false }: Props) {
  const { isDark, colors } = useTheme();
  const category = CATEGORIES[restaurant.category] || CATEGORIES.autre;
  const Icon = category.icon;
  const sourceColor = restaurant.origin?.kind === 'imported'
    ? getSourceColor(
        isSourceColorKey(restaurant.origin.sourceColorKey)
          ? restaurant.origin.sourceColorKey
          : sourceColorKeyFor(restaurant.origin.ownerId || restaurant.origin.ownerName || restaurant.id),
        isDark ? 'dark' : 'light'
      )
    : category.color;
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const surfaceRadius = typeof flattenedStyle.borderRadius === 'number' ? flattenedStyle.borderRadius : 12;

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: surfaceRadius,
          backgroundColor: isDark ? colors.surfaceLight : `${sourceColor}15`,
          borderColor: isDark ? colors.border : `${sourceColor}30`,
        },
        style,
      ]}
      accessibilityLabel={`Illustration ${category.label} pour ${restaurant.name}`}
    >
      <Icon size={compact ? 20 : 26} color={isDark ? colors.lavender : sourceColor} strokeWidth={1.8} />
      <Text style={[styles.initials, compact && styles.initialsCompact, { color: isDark ? colors.textPrimary : sourceColor }]}>
        {initials(restaurant.name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  initials: {
    marginTop: 4,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    letterSpacing: -0.4,
  },
  initialsCompact: {
    marginTop: 2,
    fontSize: 13,
  },
});
