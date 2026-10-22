import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Bookmark, MapPin, Navigation2, Sparkles, Star, UsersRound } from './FlaticonIcon';

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
import { addWishlistChangeListener, isWishlisted, toggleWishlist } from '../storage/storage';

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

  const [wishlisted, setWishlisted] = useState(Boolean(restaurant.inWishlist));

  useEffect(() => {
    let active = true;
    const check = () => {
      isWishlisted(restaurant.id).then((val) => {
        if (active) setWishlisted(val);
      });
    };
    check();
    const unsubscribe = addWishlistChangeListener(check);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [restaurant.id]);

  const CategoryIcon = category.icon;

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
          backgroundColor: isDark ? colors.surface : '#FFFFFF',
          borderColor: isDark ? `${category.color}40` : `${category.color}45`,
          shadowColor: isDark ? '#000000' : category.color,
          shadowOpacity: isDark ? 0.35 : 2,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {/* Category color tint wash */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: isDark ? `${category.color}18` : `${category.color}15`,
          },
        ]}
      />
      {/* Subtle decorative watermark motif in background */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.cardWatermark}
      >
        <CategoryIcon
          size={74}
          color={isDark ? colors.lavender : category.color}
          style={{ opacity: isDark ? 0.04 : 0.045, transform: [{ rotate: '-12deg' }] }}
        />
      </View>

      <View style={styles.mainRow}>
        {/* Image / Artwork Thumbnail */}
        <View
          style={[
            styles.imageContainer,
            {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : `${category.color}25`,
              backgroundColor: isDark ? colors.surfaceLight : `${category.color}10`,
            },
          ]}
        >
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
                  backgroundColor: isDark ? 'rgba(28, 22, 34, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(74, 21, 75, 0.1)',
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
                  backgroundColor: isDark ? `${sourceColor}22` : `${sourceColor}14`,
                  borderColor: isDark ? `${sourceColor}40` : `${sourceColor}25`,
                  borderWidth: 1,
                },
              ]}
            >
              <UsersRound size={11} color={sourceColor} strokeWidth={2.2} />
              <Text style={[styles.sourceText, { color: sourceColor }]} numberOfLines={1}>
                {imported ? 'Partagée par' : 'Aussi chez'} {friendSource.ownerName || 'un ami'}
              </Text>
            </View>
          ) : null}

          {/* Title & Wishlist Button Row */}
          <View style={styles.titleRow}>
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
            <Pressable
              onPress={async (e) => {
                e.stopPropagation?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                const next = !wishlisted;
                setWishlisted(next);
                await toggleWishlist(restaurant.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={wishlisted ? `Retirer ${restaurant.name} des envies` : `Ajouter ${restaurant.name} aux envies`}
              hitSlop={10}
              style={({ pressed }) => [
                styles.wishlistCardBtn,
                {
                  transform: [{ scale: pressed ? 0.85 : 1 }],
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Bookmark
                size={18}
                fill={wishlisted ? (isDark ? '#A84BAE' : colors.primary) : 'none'}
                color={wishlisted ? (isDark ? '#A84BAE' : colors.primary) : colors.textMuted}
                strokeWidth={wishlisted ? 2.6 : 1.8}
              />
            </Pressable>
          </View>

          {/* Address */}
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
                  backgroundColor: isDark ? `${category.color}25` : `${category.color}14`,
                  borderColor: isDark ? `${category.color}45` : `${category.color}25`,
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.categoryText, { color: isDark ? '#FAF8FC' : category.color }]}>{category.label}</Text>
            </View>
            {price ? (
              <View
                style={[
                  styles.priceTag,
                  Shadows.hairline,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(74, 21, 75, 0.04)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(74, 21, 75, 0.07)',
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
                  backgroundColor: isDark ? 'rgba(168, 75, 174, 0.18)' : 'rgba(74, 21, 75, 0.06)',
                  borderColor: isDark ? 'rgba(168, 75, 174, 0.35)' : 'rgba(74, 21, 75, 0.12)',
                  borderWidth: 1,
                },
              ]}
            >
              <Sparkles size={11} color={colors.accentYellow} />
              <Text style={[styles.dishHighlightPrefix, { color: isDark ? colors.lavender : colors.primary }]}>
                {restaurant.signatureDish.includes(',') ? 'Spécialités' : 'Spécialité'}
              </Text>
              <Text style={[styles.dishHighlightDot, { color: colors.textMuted }]}>·</Text>
              <Text
                style={[
                  styles.dishText,
                  { color: isDark ? '#FAF8FC' : colors.textPrimary },
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
    position: 'relative',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: 15,
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: '#170E1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    overflow: 'hidden',
  },
  cardWatermark: {
    position: 'absolute',
    right: -10,
    bottom: -10,
  },
  cardCompact: {
    marginHorizontal: 0,
    marginBottom: Spacing.sm,
    padding: 12,
    borderRadius: 16,
  },
  cardCollection: {
    marginHorizontal: 0,
    marginBottom: Spacing.md,
    padding: 15,
    borderRadius: 22,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 18,
  },
  imageCompact: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  imageCollection: {
    width: 96,
    height: 96,
    borderRadius: 18,
  },
  floatingRatingBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
  },
  floatingRatingText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    lineHeight: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginLeft: 15,
    justifyContent: 'center',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
    marginBottom: 4,
  },
  sourceText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs - 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    letterSpacing: -0.35,
  },
  nameCollection: {
    fontSize: FontSize.lg,
    lineHeight: 24,
  },
  wishlistCardBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRow: {
    marginTop: 4,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  addressCollection: {
    fontSize: FontSize.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  categoryTag: {
    paddingHorizontal: 8.5,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  priceTag: {
    paddingHorizontal: 8.5,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
  },
  priceText: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  travelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
  },
  travelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  dishHighlight: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8.5,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  dishHighlightPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    letterSpacing: 0.1,
  },
  dishHighlightDot: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
  },
  dishText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});
