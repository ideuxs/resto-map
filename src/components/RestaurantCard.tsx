import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, MapPin, Navigation2, Star, UsersRound } from './FlaticonIcon';

import { Restaurant } from '../types';
import { CATEGORIES } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import {
  FontFamily,
  FontSize,
  getSourceColor,
  isSourceColorKey,
  sourceColorKeyFor,
  Shadows,
  Spacing,
} from '../constants/theme';
import PlaceArtwork from './PlaceArtwork';
import { priceBandLabel } from '../domain/priceBands';

type Props = {
  restaurant: Restaurant;
  onPress: () => void;
  compact?: boolean;
  variant?: 'default' | 'collection';
  /** Optional value supplied by a screen that already has a location fix. */
  travelLabel?: string;
};

/**
 * A single, glanceable surface: the image anchors the scan and the source
 * line keeps imported recommendations distinct without decorative rails.
 */
export default function RestaurantCard({ restaurant, onPress, compact = false, variant = 'default', travelLabel }: Props) {
  const { colors, isDark } = useTheme();
  const collectionLayout = variant === 'collection';
  const category = CATEGORIES[restaurant.category] || CATEGORIES.autre;
  const imported = restaurant.origin?.kind === 'imported';
  const friendSource = imported ? restaurant.origin : restaurant.sources?.[0];
  const sourceKey = isSourceColorKey(friendSource?.sourceColorKey)
    ? friendSource.sourceColorKey
    : sourceColorKeyFor(friendSource?.ownerId || friendSource?.ownerName || restaurant.id);
  const sourceColor = getSourceColor(sourceKey, isDark ? 'dark' : 'light');
  const price = priceBandLabel(restaurant);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${restaurant.name}`}
      style={({ pressed }) => [
        styles.row,
        compact && styles.rowCompact,
        collectionLayout && styles.rowCollection,
        Shadows.hard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.68 : 1 },
      ]}
    >
      {restaurant.images?.[0] ? (
        <Image
          source={restaurant.images[0]}
          style={[styles.image, compact && styles.imageCompact, collectionLayout && styles.imageCollection]}
          contentFit="cover"
          transition={160}
          accessibilityLabel={`Photo de ${restaurant.name}`}
        />
      ) : (
        <PlaceArtwork restaurant={restaurant} compact={compact} style={[styles.image, compact && styles.imageCompact, collectionLayout && styles.imageCollection]} />
      )}

      <View style={styles.content}>
        {friendSource ? (
          <View style={styles.sourceLine}>
            <UsersRound size={13} color={sourceColor} strokeWidth={2} />
            <Text style={[styles.sourceText, collectionLayout && styles.sourceTextCollection, { color: sourceColor }]} numberOfLines={1}>
              {imported ? 'Partagée par' : 'Aussi chez'} {friendSource.ownerName || 'un ami'}
            </Text>
          </View>
        ) : null}
        <Text style={[styles.name, collectionLayout && styles.nameCollection, { color: colors.textPrimary }]} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <Text style={[styles.category, collectionLayout && styles.categoryCollection, { color: colors.textSecondary }]} numberOfLines={1}>
          {category.label}
        </Text>
        {restaurant.address ? (
          <View style={styles.addressRow}>
            <MapPin size={13} color={colors.textMuted} />
            <Text style={[styles.address, collectionLayout && styles.addressCollection, { color: colors.textMuted }]} numberOfLines={1}>
              {restaurant.address}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          {restaurant.rating ? (
            <View style={styles.metaItem}>
              <Star size={13} color={colors.accentYellow} fill={colors.accentYellow} />
              <Text style={[styles.metaText, collectionLayout && styles.metaTextCollection, { color: colors.textSecondary }]}>{restaurant.rating}/5</Text>
            </View>
          ) : null}
          {price ? <Text style={[styles.metaText, collectionLayout && styles.metaTextCollection, { color: colors.textSecondary }]}>{price}</Text> : null}
          {travelLabel ? (
            <View style={styles.metaItem}>
              <Navigation2 size={13} color={colors.accent} />
              <Text style={[styles.metaText, collectionLayout && styles.metaTextCollection, { color: colors.accent }]} numberOfLines={1}>{travelLabel}</Text>
            </View>
          ) : restaurant.location ? (
            <View style={styles.metaItem}>
              <Navigation2 size={13} color={colors.textMuted} />
              <Text style={[styles.metaText, collectionLayout && styles.metaTextCollection, { color: colors.textMuted }]}>Itinéraire</Text>
            </View>
          ) : null}
          {restaurant.signatureDish ? (
            <Text style={[styles.dish, collectionLayout && styles.dishCollection, { color: colors.textMuted }]} numberOfLines={1}>{restaurant.signatureDish}</Text>
          ) : null}
        </View>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 116,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },
  rowCompact: {
    minHeight: 92,
    marginHorizontal: 0,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 10,
  },
  rowCollection: {
    minHeight: 140,
    marginHorizontal: 0,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 14,
  },
  image: {
    width: 92,
    height: 92,
    borderRadius: 12,
  },
  imageCompact: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  imageCollection: {
    width: 104,
    height: 104,
    borderRadius: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: Spacing.md,
  },
  sourceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  sourceText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  sourceTextCollection: { fontSize: FontSize.sm },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    lineHeight: 21,
  },
  nameCollection: { fontSize: FontSize.lg, lineHeight: 24 },
  category: {
    marginTop: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  categoryCollection: { fontSize: FontSize.sm },
  addressRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  addressCollection: { fontSize: FontSize.sm },
  metaRow: {
    minHeight: 19,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  metaTextCollection: { fontSize: FontSize.sm },
  dish: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  dishCollection: { fontSize: FontSize.sm },
});
