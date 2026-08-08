import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Utensils, Plus, Sun, Moon, Sparkles, FilterX, Camera, Heart, Star, Calendar, SlidersHorizontal, X } from 'lucide-react-native';

import { Restaurant, RestaurantCategory, RestaurantsStackParamList } from '../types';
import { getRestaurants, addRestaurantsChangeListener } from '../storage/storage';
import RestaurantCard from '../components/RestaurantCard';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';
import { CATEGORY_LIST } from '../constants/categories';
import { BudgetFilter, filterAndSortRestaurants, pickRandomRestaurant, RestaurantSortOption } from '../utils/restaurantDiscovery';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'Home'>;

export default function RestaurantListScreen({ navigation }: Props) {
  const { colors, isDark, setTheme } = useTheme();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<RestaurantCategory | null>(null);
  const [budget, setBudget] = useState<BudgetFilter>('all');
  const [photosOnly, setPhotosOnly] = useState(false);
  const [revisitOnly, setRevisitOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState<RestaurantSortOption>('recent');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const loadRestaurants = useCallback(() => {
    getRestaurants().then(setRestaurants);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRestaurants();
    }, [loadRestaurants])
  );

  useEffect(() => {
    const unsubscribe = addRestaurantsChangeListener(() => {
      loadRestaurants();
    });
    return () => { unsubscribe(); };
  }, [loadRestaurants]);

  const filtered = filterAndSortRestaurants(restaurants, {
    query: search,
    category,
    budget,
    photosOnly,
    revisitOnly,
    minRating,
    sort,
  });

  const ratedRestaurants = restaurants.filter((restaurant) => restaurant.rating);
  const averageRating = ratedRestaurants.length
    ? ratedRestaurants.reduce((sum, restaurant) => sum + (restaurant.rating || 0), 0) / ratedRestaurants.length
    : 0;
  const revisitCount = restaurants.filter((restaurant) => restaurant.wouldReturn).length;
  const visitedCount = restaurants.filter((restaurant) => restaurant.visitedAt).length;
  const hasActiveFilters = !!search.trim() || category !== null || budget !== 'all' || photosOnly || revisitOnly || minRating !== null || sort !== 'recent';
  const filterCount = [
    category !== null,
    budget !== 'all',
    photosOnly,
    revisitOnly,
    minRating !== null,
    sort !== 'recent',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setCategory(null);
    setBudget('all');
    setPhotosOnly(false);
    setRevisitOnly(false);
    setMinRating(null);
    setSort('recent');
  };

  const chooseForMe = () => {
    const chosen = pickRandomRestaurant(filtered);
    if (!chosen) {
      Alert.alert('Aucun résultat', 'Modifiez les filtres pour obtenir des suggestions.');
      return;
    }
    navigation.navigate('RestaurantDetail', { restaurantId: chosen.id });
  };

  const sortLabel = sort === 'recent'
    ? 'Récents'
    : sort === 'name'
      ? 'A-Z'
      : sort === 'price_low'
        ? 'Prix +'
        : sort === 'price_high'
          ? 'Prix -'
          : sort === 'rating'
            ? 'Note'
            : 'Passage';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} translucent={false} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
          />
        )}
        ListHeaderComponent={
          <View style={[styles.mainHeaderContent, { paddingTop: insets.top + Spacing.lg }]}> 
            <View style={styles.titleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>Mes adresses</Text>
                <View style={[styles.countBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.countText, { color: colors.primary }]}>{restaurants.length}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setTheme(isDark ? 'light' : 'dark')}
                style={[styles.themeToggle, { backgroundColor: colors.surfaceLight }]}
              >
                {isDark ? (
                  <Sun size={20} color={colors.primary} />
                ) : (
                  <Moon size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Les meilleurs spots en ville</Text>

            <View style={[styles.insightPanel, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
              <View style={styles.insightItem}>
                <View style={[styles.insightIcon, { backgroundColor: colors.warning + '18' }]}>
                  <Star size={17} color={colors.warning} fill={averageRating > 0 ? colors.warning : 'transparent'} />
                </View>
                <Text style={[styles.insightValue, { color: colors.textPrimary }]}>
                  {averageRating ? averageRating.toFixed(1) : '--'}
                </Text>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>note moy.</Text>
              </View>
              <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
              <View style={styles.insightItem}>
                <View style={[styles.insightIcon, { backgroundColor: colors.success + '18' }]}>
                  <Heart size={17} color={colors.success} fill={revisitCount > 0 ? colors.success : 'transparent'} />
                </View>
                <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{revisitCount}</Text>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>à refaire</Text>
              </View>
              <View style={[styles.insightDivider, { backgroundColor: colors.border }]} />
              <View style={styles.insightItem}>
                <View style={[styles.insightIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Calendar size={17} color={colors.primary} />
                </View>
                <Text style={[styles.insightValue, { color: colors.textPrimary }]}>{visitedCount}</Text>
                <Text style={[styles.insightLabel, { color: colors.textMuted }]}>passages</Text>
              </View>
            </View>

            <View style={[styles.searchContainer, Shadows.sm]}>
              <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
                <Search size={20} color={colors.textMuted} style={styles.searchIcon} strokeWidth={2.5} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Chercher un lieu, un plat..."
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            <View style={styles.headerActionsRow}>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={chooseForMe}
                activeOpacity={0.9}
              >
                <Sparkles size={16} color={colors.textOnPrimary} />
                <Text style={[styles.quickActionText, { color: colors.textOnPrimary }]}>Choisis pour moi</Text>
              </TouchableOpacity>

              {hasActiveFilters ? (
                <TouchableOpacity
                  style={[styles.quickActionLight, { backgroundColor: colors.surfaceLight }]}
                  onPress={clearFilters}
                  activeOpacity={0.9}
                >
                  <FilterX size={16} color={colors.textSecondary} />
                  <Text style={[styles.quickActionLightText, { color: colors.textSecondary }]}>Réinitialiser</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.quickActionLight, { backgroundColor: colors.surfaceLight }]}
                onPress={() => setFilterModalVisible(true)}
                activeOpacity={0.9}
              >
                <SlidersHorizontal size={16} color={colors.textSecondary} />
                <Text style={[styles.quickActionLightText, { color: colors.textSecondary }]}>
                  Filtres{filterCount ? ` (${filterCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.resultMeta, { color: colors.textMuted }]}>
              {filtered.length} résultat{filtered.length > 1 ? 's' : ''} · Tri: {sortLabel}
            </Text>
          </View>
        }
        contentContainerStyle={[
          filtered.length === 0 ? styles.emptyContainer : styles.list,
          { paddingBottom: insets.bottom + 120 }
        ]}
        ListEmptyComponent={
          <EmptyState
            icon={Utensils}
            title={restaurants.length === 0 ? 'Aucun restaurant' : 'Aucun résultat'}
            subtitle={restaurants.length === 0
              ? 'Explorez et ajoutez votre premier restaurant favori pour commencer.'
              : 'Aucun restaurant ne correspond à vos filtres actuels.'}
          />
        }
        showsVerticalScrollIndicator={false}
      />
      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: insets.bottom,
            backgroundColor: colors.primary
          },
          Shadows.glow(colors.primary)
        ]}
        onPress={() => navigation.navigate('AddRestaurant', {})}
        activeOpacity={0.9}
      >
        <Plus size={32} color={colors.textOnPrimary} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFillObject}
            onPress={() => setFilterModalVisible(false)}
          />
          <View
            style={[
              styles.filterSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                paddingBottom: insets.bottom + Spacing.xl,
              },
            ]}
          >
            <View style={styles.filterHandle} />
            <View style={styles.filterHeader}>
              <View>
                <Text style={[styles.filterTitle, { color: colors.textPrimary }]}>Filtres</Text>
                <Text style={[styles.filterSubtitle, { color: colors.textMuted }]}>
                  {filtered.length} adresse{filtered.length > 1 ? 's' : ''} visible{filtered.length > 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.filterCloseBtn, { backgroundColor: colors.surfaceLight }]}
                onPress={() => setFilterModalVisible(false)}
              >
                <X size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
              <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Catégorie</Text>
              <View style={styles.filterChipGrid}>
                <TouchableOpacity
                  onPress={() => setCategory(null)}
                  style={[
                    styles.modalChip,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    category === null && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                >
                  <Text style={[styles.chipText, { color: category === null ? colors.textOnPrimary : colors.textSecondary }]}>
                    Toutes
                  </Text>
                </TouchableOpacity>
                {CATEGORY_LIST.map((item) => {
                  const selected = category === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => setCategory(selected ? null : item.value)}
                      style={[
                        styles.modalChip,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        selected && { backgroundColor: item.color, borderColor: item.color },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? '#FFF' : colors.textSecondary }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Budget</Text>
              <View style={styles.filterChipGrid}>
                {[
                  { key: 'all', label: 'Tous' },
                  { key: 'low', label: '< 20€' },
                  { key: 'mid', label: '20-40€' },
                  { key: 'high', label: '> 40€' },
                  { key: 'unknown', label: 'Non renseigné' },
                ].map((item) => {
                  const selected = budget === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setBudget(item.key as BudgetFilter)}
                      style={[
                        styles.modalChip,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? colors.textOnPrimary : colors.textSecondary }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Options</Text>
              <View style={styles.filterOptionGrid}>
                <TouchableOpacity
                  onPress={() => setPhotosOnly((prev) => !prev)}
                  style={[
                    styles.filterOption,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    photosOnly && { borderColor: colors.primary + '70', backgroundColor: colors.primary + '12' },
                  ]}
                >
                  <Camera size={18} color={photosOnly ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.filterOptionText, { color: photosOnly ? colors.primary : colors.textSecondary }]}>Avec photos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setRevisitOnly((prev) => !prev)}
                  style={[
                    styles.filterOption,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    revisitOnly && { borderColor: colors.success + '70', backgroundColor: colors.success + '12' },
                  ]}
                >
                  <Heart size={18} color={revisitOnly ? colors.success : colors.textSecondary} fill={revisitOnly ? colors.success : 'transparent'} />
                  <Text style={[styles.filterOptionText, { color: revisitOnly ? colors.success : colors.textSecondary }]}>À refaire</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setMinRating((prev) => prev === 4 ? null : 4)}
                  style={[
                    styles.filterOption,
                    { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                    minRating === 4 && { borderColor: colors.warning + '70', backgroundColor: colors.warning + '12' },
                  ]}
                >
                  <Star size={18} color={minRating === 4 ? colors.warning : colors.textSecondary} fill={minRating === 4 ? colors.warning : 'transparent'} />
                  <Text style={[styles.filterOptionText, { color: minRating === 4 ? colors.warning : colors.textSecondary }]}>4+ étoiles</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.filterSectionTitle, { color: colors.textPrimary }]}>Tri</Text>
              <View style={styles.filterChipGrid}>
                {[
                  { key: 'recent', label: 'Récents' },
                  { key: 'visited', label: 'Passage' },
                  { key: 'rating', label: 'Note' },
                  { key: 'name', label: 'A-Z' },
                  { key: 'price_low', label: 'Prix +' },
                  { key: 'price_high', label: 'Prix -' },
                ].map((item) => {
                  const selected = sort === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setSort(item.key as RestaurantSortOption)}
                      style={[
                        styles.modalChip,
                        { backgroundColor: colors.surfaceLight, borderColor: colors.border },
                        selected && { backgroundColor: colors.primary + '18', borderColor: colors.primary + '70' },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: selected ? colors.primary : colors.textSecondary }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.filterFooter}>
              <TouchableOpacity
                style={[styles.filterSecondaryBtn, { backgroundColor: colors.surfaceLight }]}
                onPress={clearFilters}
              >
                <Text style={[styles.filterSecondaryText, { color: colors.textSecondary }]}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPrimaryBtn, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={[styles.filterPrimaryText, { color: colors.textOnPrimary }]}>Voir les résultats</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainHeaderContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    justifyContent: 'space-between',
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitle: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.5,
  },
  countBadge: {
    marginLeft: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  subtitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
    marginBottom: Spacing.xl,
  },
  insightPanel: {
    borderWidth: 1,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightIcon: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  insightValue: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    lineHeight: 22,
  },
  insightLabel: {
    marginTop: 2,
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
  },
  insightDivider: {
    width: 1,
    height: 54,
    opacity: 0.8,
  },
  searchContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xxl,
    paddingHorizontal: Spacing.lg,
    height: 56,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
    height: '100%',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  quickAction: {
    height: 38,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  quickActionLight: {
    height: 38,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickActionLightText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  resultMeta: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
  },
  filterBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  filterSheet: {
    maxHeight: '86%',
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  filterHandle: {
    width: 42,
    height: 5,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.45)',
    marginBottom: Spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  filterTitle: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.bold,
  },
  filterSubtitle: {
    marginTop: 2,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
  },
  filterCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContent: {
    paddingBottom: Spacing.xl,
  },
  filterSectionTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  filterChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  modalChip: {
    minHeight: 38,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  filterOptionGrid: {
    gap: Spacing.sm,
  },
  filterOption: {
    minHeight: 52,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterOptionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  filterFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  filterSecondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSecondaryText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  filterPrimaryBtn: {
    flex: 1.3,
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPrimaryText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  list: {
    paddingTop: Spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
