import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import {
  Bookmark,
  ChevronRight,
  MapPin,
  Navigation2,
  Search,
  Shuffle,
  Sparkles,
  Star,
  X,
} from '../components/FlaticonIcon';

import { Restaurant, RestaurantCategory, WishlistStackParamList } from '../types';
import {
  addCollectionsChangeListener,
  addRestaurantsChangeListener,
  addWishlistChangeListener,
  getWishlistRestaurants,
} from '../storage/storage';
import RestaurantCard from '../components/RestaurantCard';
import PlaceArtwork from '../components/PlaceArtwork';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
import { CATEGORIES, CATEGORY_LIST } from '../constants/categories';
import { priceBandLabel } from '../domain/priceBands';

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistHome'>;
type WishlistSort = 'recent' | 'name' | 'rating' | 'distance';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export default function WishlistScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compactControls = width < 360 || fontScale > 1.3;

  const [wishlist, setWishlist] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<RestaurantCategory[]>([]);
  const [sort, setSort] = useState<WishlistSort>('recent');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [randomModalVisible, setRandomModalVisible] = useState(false);
  const [pickedRestaurant, setPickedRestaurant] = useState<Restaurant | null>(null);

  const load = useCallback(async () => {
    const items = await getWishlistRestaurants();
    setWishlist(items);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const offWishlist = addWishlistChangeListener(load);
    const offRestaurants = addRestaurantsChangeListener(load);
    const offCollections = addCollectionsChangeListener(load);
    return () => {
      offWishlist();
      offRestaurants();
      offCollections();
    };
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch {
        // Ignored
      }
    })();
  }, []);

  const handleRandomPick = () => {
    if (filtered.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const randomIndex = Math.floor(Math.random() * filtered.length);
    const selected = filtered[randomIndex];
    setPickedRestaurant(selected);
    setRandomModalVisible(true);
  };

  const toggleCategory = (cat: RestaurantCategory) => {
    Haptics.selectionAsync().catch(() => undefined);
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return wishlist.filter((item) => {
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.signatureDish && item.signatureDish.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);

      const matchCat =
        selectedCategories.length === 0 || selectedCategories.includes(item.category);

      return matchSearch && matchCat;
    });
  }, [wishlist, query, selectedCategories]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'name') {
      return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    }
    if (sort === 'rating') {
      return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    if (sort === 'distance' && userLocation) {
      return list.sort((a, b) => {
        if (!a.location && !b.location) return 0;
        if (!a.location) return 1;
        if (!b.location) return -1;
        const distA = calculateDistanceKm(userLocation.latitude, userLocation.longitude, a.location.latitude, a.location.longitude);
        const distB = calculateDistanceKm(userLocation.latitude, userLocation.longitude, b.location.latitude, b.location.longitude);
        return distA - distB;
      });
    }
    return list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [filtered, sort, userLocation]);

  const categoryOptions = useMemo(() => {
    return CATEGORY_LIST.filter((cat) => wishlist.some((r) => r.category === cat.value));
  }, [wishlist]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
      <ScreenHeader
        title="Mes Envies"
        subtitle={wishlist.length > 0 ? "Vos coups de cœur et adresses à tester" : "Créez votre liste d'envies"}
        onAdd={() => navigation.navigate('AddRestaurant', { defaultWishlist: true })}
        addAccessibilityLabel="Ajouter une envie"
        showAdd={wishlist.length > 0}
      />

      {wishlist.length > 0 ? (
        <>
          {/* Stats & Random Picker Card */}
          <View style={[styles.statsCard, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: isDark ? '#FAF8FC' : colors.primary }]}>{wishlist.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>à tester</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: isDark ? '#FAF8FC' : colors.primary }]}>{categoryOptions.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>catégories</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <Pressable
              onPress={handleRandomPick}
              accessibilityRole="button"
              accessibilityLabel="Tirage au sort d'une envie"
              style={({ pressed }) => [
                styles.randomPickBtn,
                {
                  backgroundColor: isDark ? '#4A154B' : `${colors.primary}12`,
                  borderColor: isDark ? '#6B2370' : colors.primary,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Shuffle size={14} color={isDark ? '#FFFFFF' : colors.primary} strokeWidth={2.2} />
              <Text style={[styles.randomPickBtnText, { color: isDark ? '#FFFFFF' : colors.primary }]}>
                Au hasard
              </Text>
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={[styles.search, Shadows.hairline, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={Keyboard.dismiss}
              returnKeyType="search"
              blurOnSubmit
              placeholder="Rechercher une envie (nom, plat, quartier)…"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              accessibilityLabel="Rechercher dans mes envies"
              style={[styles.searchInput, { color: colors.textPrimary }]}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} accessibilityLabel="Effacer la recherche" hitSlop={10}>
                <X size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Category Chips (if multiple categories) */}
          {categoryOptions.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsScroll}
            >
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setSelectedCategories([]);
                }}
                style={({ pressed }) => [
                  styles.chip,
                  Shadows.hairline,
                  {
                    backgroundColor: selectedCategories.length === 0
                      ? (isDark ? '#4A154B' : `${colors.primary}15`)
                      : colors.surface,
                    borderColor: selectedCategories.length === 0
                      ? (isDark ? '#6B2370' : colors.primary)
                      : colors.border,
                    borderWidth: 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: selectedCategories.length === 0
                        ? (isDark ? '#FFFFFF' : colors.primary)
                        : colors.textMuted,
                      fontFamily: selectedCategories.length === 0 ? FontFamily.bold : FontFamily.medium,
                    },
                  ]}
                >
                  Toutes ({wishlist.length})
                </Text>
              </Pressable>

              {categoryOptions.map((cat) => {
                const active = selectedCategories.includes(cat.value);
                const count = wishlist.filter((r) => r.category === cat.value).length;
                return (
                  <Pressable
                    key={cat.value}
                    onPress={() => toggleCategory(cat.value)}
                    style={({ pressed }) => [
                      styles.chip,
                      Shadows.hairline,
                      {
                        backgroundColor: active
                          ? (isDark ? '#4A154B' : `${colors.primary}15`)
                          : colors.surface,
                        borderColor: active
                          ? (isDark ? '#6B2370' : colors.primary)
                          : colors.border,
                        borderWidth: 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active
                            ? (isDark ? '#FFFFFF' : colors.primary)
                            : colors.textMuted,
                          fontFamily: active ? FontFamily.bold : FontFamily.medium,
                        },
                      ]}
                    >
                      {cat.label} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Sort Selector Bar */}
          <View
            style={[
              styles.sortTabs,
              compactControls && styles.sortTabsCompact,
              Shadows.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {[
              { key: 'recent', label: 'Récents' },
              { key: 'name', label: 'Nom' },
              { key: 'rating', label: 'Note' },
              ...(userLocation ? [{ key: 'distance', label: 'Distance' }] : []),
            ].map((opt) => {
              const selected = sort === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => undefined);
                    setSort(opt.key as WishlistSort);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.sortTab,
                    compactControls && styles.sortTabCompact,
                    selected && [
                      Shadows.hairline,
                      {
                        backgroundColor: isDark ? '#4A154B' : `${colors.primary}12`,
                        borderColor: isDark ? '#6B2370' : colors.primary,
                        borderWidth: 1,
                      },
                    ],
                    {
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sortTabText,
                      {
                        color: selected ? (isDark ? '#FFFFFF' : colors.primary) : colors.textMuted,
                        fontFamily: selected ? FontFamily.bold : FontFamily.medium,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 90 },
          sorted.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          let travelLabel: string | undefined;
          if (userLocation && item.location) {
            const km = calculateDistanceKm(userLocation.latitude, userLocation.longitude, item.location.latitude, item.location.longitude);
            travelLabel = formatDistance(km);
          }

          return (
            <View style={styles.cardItem}>
              <RestaurantCard
                restaurant={{ ...item, inWishlist: true }}
                onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
                travelLabel={travelLabel}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={Bookmark}
            title={wishlist.length === 0 ? 'Votre Wishlist est vide' : 'Aucun résultat'}
            subtitle={
              wishlist.length === 0
                ? 'Enregistrez ici les adresses que vous rêvez de tester ! Cliquez sur l’icône marque-page sur vos restos ou ajoutez-en directement.'
                : 'Aucune envie ne correspond à vos filtres.'
            }
            actionLabel={wishlist.length === 0 ? 'Ajouter une envie' : 'Effacer la recherche'}
            onAction={
              wishlist.length === 0
                ? () => navigation.navigate('AddRestaurant', { defaultWishlist: true })
                : () => {
                    setQuery('');
                    setSelectedCategories([]);
                  }
            }
          />
        }
      />

      {/* Random Picker Modal (Tirage au sort d'une envie) */}
      <Modal
        visible={randomModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRandomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setRandomModalVisible(false)}
            accessibilityLabel="Fermer la suggestion"
          />
          <View
            style={[
              styles.randomModalCard,
              Shadows.floating,
              {
                backgroundColor: colors.surface,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(74, 21, 75, 0.1)',
              },
            ]}
          >
            {/* Close button */}
            <Pressable
              onPress={() => setRandomModalVisible(false)}
              accessibilityLabel="Fermer"
              hitSlop={12}
              style={({ pressed }) => [
                styles.modalCloseBtn,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(74, 21, 75, 0.05)',
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                },
              ]}
            >
              <X size={16} color={colors.textMuted} />
            </Pressable>

            {/* Sparkle Header */}
            <View style={styles.randomModalHeader}>
              <View
                style={[
                  styles.randomIconBubble,
                  {
                    backgroundColor: isDark ? 'rgba(217, 189, 222, 0.18)' : 'rgba(74, 21, 75, 0.08)',
                    borderColor: isDark ? 'rgba(217, 189, 222, 0.3)' : 'rgba(74, 21, 75, 0.15)',
                  },
                ]}
              >
                <Sparkles size={26} color={isDark ? colors.lavender : colors.primary} />
              </View>
              <Text style={[styles.randomModalTitle, { color: colors.textPrimary }]}>
                Et si on allait là ?
              </Text>
              <Text style={[styles.randomModalSubtitle, { color: colors.textMuted }]}>
                Une adresse tirée au sort parmi vos envies
              </Text>
            </View>

            {/* Picked Restaurant Showcase Card */}
            {pickedRestaurant ? (
              <View
                style={[
                  styles.pickedCard,
                  Shadows.hairline,
                  {
                    backgroundColor: isDark ? colors.surfaceLight : colors.surfaceMuted,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(74, 21, 75, 0.08)',
                  },
                ]}
              >
                <View style={styles.pickedHeaderRow}>
                  {/* Image/Artwork */}
                  <View
                    style={[
                      styles.pickedImageContainer,
                      {
                        backgroundColor: isDark ? colors.surface : `${(CATEGORIES[pickedRestaurant.category] || CATEGORIES.autre).color}12`,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : `${(CATEGORIES[pickedRestaurant.category] || CATEGORIES.autre).color}25`,
                      },
                    ]}
                  >
                    {pickedRestaurant.images?.[0] ? (
                      <Image
                        source={pickedRestaurant.images[0]}
                        style={styles.pickedImage}
                        contentFit="cover"
                        transition={180}
                      />
                    ) : (
                      <PlaceArtwork restaurant={pickedRestaurant} style={styles.pickedImage} compact />
                    )}
                    {pickedRestaurant.rating ? (
                      <View
                        style={[
                          styles.pickedRatingBadge,
                          {
                            backgroundColor: isDark ? 'rgba(28, 22, 34, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(74, 21, 75, 0.1)',
                          },
                        ]}
                      >
                        <Star size={10} color={colors.accentYellow} fill={colors.accentYellow} />
                        <Text style={[styles.pickedRatingText, { color: colors.textPrimary }]}>
                          {pickedRestaurant.rating.toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Info Details */}
                  <View style={styles.pickedInfo}>
                    <Text style={[styles.pickedName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {pickedRestaurant.name}
                    </Text>

                    {pickedRestaurant.address ? (
                      <View style={styles.pickedAddressRow}>
                        <MapPin size={11} color={colors.textMuted} />
                        <Text style={[styles.pickedAddress, { color: colors.textMuted }]} numberOfLines={1}>
                          {pickedRestaurant.address}
                        </Text>
                      </View>
                    ) : null}

                    {/* Tag badges */}
                    <View style={styles.pickedTagRow}>
                      <View
                        style={[
                          styles.pickedCategoryTag,
                          {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : `${(CATEGORIES[pickedRestaurant.category] || CATEGORIES.autre).color}15`,
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : `${(CATEGORIES[pickedRestaurant.category] || CATEGORIES.autre).color}30`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickedCategoryText,
                            { color: isDark ? '#FAF8FC' : (CATEGORIES[pickedRestaurant.category] || CATEGORIES.autre).color },
                          ]}
                        >
                          {(CATEGORIES[pickedRestaurant.category] || CATEGORIES.autre).label}
                        </Text>
                      </View>

                      {priceBandLabel(pickedRestaurant) ? (
                        <View
                          style={[
                            styles.pickedPriceTag,
                            {
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(74, 21, 75, 0.05)',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(74, 21, 75, 0.08)',
                            },
                          ]}
                        >
                          <Text style={[styles.pickedPriceText, { color: isDark ? '#D8CEE0' : colors.textSecondary }]}>
                            {priceBandLabel(pickedRestaurant)}
                          </Text>
                        </View>
                      ) : null}

                      {userLocation && pickedRestaurant.location ? (
                        <View
                          style={[
                            styles.pickedTravelTag,
                            {
                              backgroundColor: isDark ? `${colors.link}25` : `${colors.link}12`,
                              borderColor: isDark ? `${colors.link}45` : `${colors.link}25`,
                            },
                          ]}
                        >
                          <Navigation2 size={10} color={colors.link} />
                          <Text style={[styles.pickedTravelText, { color: colors.link }]}>
                            {formatDistance(calculateDistanceKm(userLocation.latitude, userLocation.longitude, pickedRestaurant.location.latitude, pickedRestaurant.location.longitude))}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* Signature Dish Pill */}
                {pickedRestaurant.signatureDish ? (
                  <View
                    style={[
                      styles.pickedDishBanner,
                      {
                        backgroundColor: isDark ? 'rgba(168, 75, 174, 0.16)' : 'rgba(74, 21, 75, 0.06)',
                        borderColor: isDark ? 'rgba(168, 75, 174, 0.3)' : 'rgba(74, 21, 75, 0.1)',
                      },
                    ]}
                  >
                    <Sparkles size={12} color={colors.accentYellow} />
                    <Text style={[styles.pickedDishPrefix, { color: isDark ? colors.lavender : colors.primary }]}>
                      Plat signature :
                    </Text>
                    <Text
                      style={[
                        styles.pickedDishValue,
                        { color: isDark ? '#FAF8FC' : colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {pickedRestaurant.signatureDish}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.randomModalButtons}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
                  handleRandomPick();
                }}
                accessibilityRole="button"
                accessibilityLabel="Relancer le tirage au sort"
                style={({ pressed }) => [
                  styles.randomSecondaryBtn,
                  Shadows.hairline,
                  {
                    backgroundColor: isDark ? colors.surfaceLight : colors.surface,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
              >
                <Shuffle size={16} color={isDark ? colors.lavender : colors.primary} strokeWidth={2.2} />
                <Text style={[styles.randomSecondaryBtnText, { color: isDark ? colors.lavender : colors.primary }]}>
                  Autre envie
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setRandomModalVisible(false);
                  if (pickedRestaurant) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                    navigation.navigate('RestaurantDetail', { restaurantId: pickedRestaurant.id });
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Voir la fiche détaillée"
                style={({ pressed }) => [
                  styles.randomPrimaryBtn,
                  Shadows.card,
                  {
                    backgroundColor: isDark ? '#A84BAE' : colors.primary,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                <Text style={[styles.randomPrimaryBtnText, { color: colors.textOnPrimary }]}>
                  Voir la fiche
                </Text>
                <ChevronRight size={16} color={colors.textOnPrimary} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    letterSpacing: -0.3,
  },
  statLabel: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  randomPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    gap: 6,
  },
  randomPickBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  search: {
    minHeight: 46,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
  },
  categoryChipsScroll: {
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: FontSize.xs,
  },
  sortTabs: {
    padding: 4,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  sortTabsCompact: {
    padding: 3,
    gap: 3,
  },
  sortTab: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortTabCompact: {
    minHeight: 30,
  },
  sortTabText: {
    fontSize: FontSize.xs,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardItem: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 10, 20, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  randomModalCard: {
    position: 'relative',
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  randomModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  randomIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  randomModalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  randomModalSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    marginTop: 3,
    textAlign: 'center',
  },
  pickedCard: {
    width: '100%',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  pickedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickedImageContainer: {
    position: 'relative',
    width: 76,
    height: 76,
    borderRadius: 15,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickedImage: {
    width: 76,
    height: 76,
    borderRadius: 15,
  },
  pickedRatingBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
  },
  pickedRatingText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    lineHeight: 12,
  },
  pickedInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  pickedName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  pickedAddressRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pickedAddress: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  pickedTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  pickedCategoryTag: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pickedCategoryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
  },
  pickedPriceTag: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pickedPriceText: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
  },
  pickedTravelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pickedTravelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
  },
  pickedDishBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickedDishPrefix: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
  },
  pickedDishValue: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  randomModalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
  },
  randomSecondaryBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  randomSecondaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
  randomPrimaryBtn: {
    flex: 1.35,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 6,
  },
  randomPrimaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
  },
});
