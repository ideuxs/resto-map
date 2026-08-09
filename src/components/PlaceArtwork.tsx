import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Restaurant } from '../types';
import { CATEGORIES } from '../constants/categories';
import { FontFamily, getSourceColor, isSourceColorKey, Shadows, sourceColorKeyFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  restaurant: Restaurant;
  style?: ViewStyle;
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
  const surfaceBorderWidth = flattenedStyle.borderWidth === 0 ? 0 : 1.5;

  return (
    <View
      style={[
        styles.container,
        style,
      ]}
      accessibilityLabel={`Illustration ${category.label} pour ${restaurant.name}`}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          Shadows.hard,
          {
            backgroundColor: `${sourceColor}20`,
            borderColor: colors.textPrimary,
            borderWidth: surfaceBorderWidth,
            borderRadius: surfaceRadius,
          },
        ]}
      />
      <Icon size={compact ? 20 : 28} color={sourceColor} strokeWidth={1.8} />
      <Text style={[styles.initials, compact && styles.initialsCompact, { color: sourceColor }]}>
        {initials(restaurant.name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  initials: {
    marginTop: 7,
    fontFamily: FontFamily.bold,
    fontSize: 18,
    letterSpacing: -0.5,
  },
  initialsCompact: {
    marginTop: 3,
    fontSize: 14,
  },
});
