import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { MapPin, Navigation2, Sparkles, Star, UsersRound } from './FlaticonIcon';

import { Restaurant } from '../types';
import { CATEGORIES } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import {
  BorderRadius,
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

export default function RestaurantCard({
  restaurant,
  onPress,
  compact = false,
  variant = 'default',
  travelLabel,
}: Props) {
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
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${restaurant.name}`}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        collectionLayout && styles.cardCollection,
        Shadows.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.mainRow}>
        {/* Image / Artwork Thumbnail */}
        <View style={styles.imageContainer}>
          {restaurant.images?.[0] ? (
            <Image
              source={restaurant.images[0]}
              style={[styles.image, compact && styles.imageCompact, collectionLayout && styles.imageCollection]}
              contentFit="cover"
              transition={180}
              accessibilityLabel={`Photo de ${restaurant.name}`}
            />
          ) : (
            <PlaceArtwork
              restaurant={restaurant}
              compact={compact}
              style={[styles.image, compact && styles.imageCompact, collectionLayout && styles.imageCollection]}
            />
          )}
          {restaurant.rating ? (
            <View
              style={[
                styles.floatingRatingBadge,
                Shadows.hairline,
                {
                  backgroundColor: isDark ? 'rgba(21, 13, 24, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              <Star size={11} color={colors.accentYellow} fill={colors.accentYellow} />
              <Text style={[styles.floatingRatingText, { color: colors.textPrimary }]}>
                {restaurant.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Content Details */}
        <View style={styles.content}>
          {/* Friend recommendation badge */}
          {friendSource ? (
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor: isDark ? `${sourceColor}20` : `${sourceColor}12`,
                },
              ]}
            >
              <UsersRound size={11} color={sourceColor} strokeWidth={2.2} />
              <Text style={[styles.sourceText, { color: sourceColor }]} numberOfLines={1}>
                {imported ? 'Partagée par' : 'Aussi chez'} {friendSource.ownerName || 'un ami'}
              </Text>
            </View>
          ) : null}

          {/* Title */}
          <Text
            style={[
              styles.name,
              collectionLayout && styles.nameCollection,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>

          {/* Address (Above Category & Price) */}
          {restaurant.address ? (
            <View style={styles.addressRow}>
              <MapPin size={12} color={colors.textMuted} />
              <Text
                style={[
                  styles.address,
                  collectionLayout && styles.addressCollection,
                  { color: colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {restaurant.address}
              </Text>
            </View>
          ) : null}

          {/* Category & Price Row */}
          <View style={styles.tagRow}>
            <View
              style={[
                styles.categoryTag,
                Shadows.hairline,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceLight,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.categoryText, { color: isDark ? '#FAF8FC' : colors.primary }]}>{category.label}</Text>
            </View>
            {price ? (
              <View
                style={[
                  styles.priceTag,
                  Shadows.hairline,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceLight,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[styles.priceText, { color: isDark ? '#D8CEE0' : colors.textSecondary }]}>{price}</Text>
              </View>
            ) : null}
            {travelLabel ? (
              <View
                style={[
                  styles.travelTag,
                  Shadows.hairline,
                  {
                    backgroundColor: isDark ? `${colors.link}25` : `${colors.link}12`,
                    borderColor: isDark ? `${colors.link}45` : `${colors.link}25`,
                    borderWidth: 1,
                  },
                ]}
              >
                <Navigation2 size={10} color={colors.link} />
                <Text style={[styles.travelText, { color: colors.link }]} numberOfLines={1}>{travelLabel}</Text>
              </View>
            ) : null}
          </View>

          {/* Signature Dish highlight */}
          {restaurant.signatureDish ? (
            <View
              style={[
                styles.dishHighlight,
                Shadows.hairline,
                {
                  backgroundColor: isDark ? '#4A154B' : colors.primary,
                  borderColor: isDark ? '#6B2370' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.dishHighlightPrefix, { color: '#FDE68A' }]}>
                {restaurant.signatureDish.includes(',') ? 'Spécialités' : 'Spécialité'}
              </Text>
              <Text style={styles.dishHighlightDot}>·</Text>
              <Text
                style={[
                  styles.dishText,
                  { color: '#FFFFFF' },
                ]}
                numberOfLines={1}
              >
                {restaurant.signatureDish}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  cardCompact: {
    marginHorizontal: 0,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  cardCollection: {
    marginHorizontal: 0,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 94,
    height: 94,
    borderRadius: BorderRadius.lg,
  },
  imageCompact: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
  },
  imageCollection: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.lg,
  },
  floatingRatingBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.sm,
  },
  floatingRatingText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing.md + 2,
    justifyContent: 'center',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.badge,
    marginBottom: 5,
  },
  sourceText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs - 1,
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md + 1,
    lineHeight: 22,
    letterSpacing: -0.25,
  },
  nameCollection: {
    fontSize: FontSize.lg,
    lineHeight: 24,
  },
  addressRow: {
    marginTop: 7,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  addressCollection: {
    fontSize: FontSize.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  categoryTag: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  priceTag: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.sm,
  },
  priceText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  travelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.sm,
  },
  travelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  dishHighlight: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  dishHighlightPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.1,
  },
  dishHighlightDot: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  dishText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});
