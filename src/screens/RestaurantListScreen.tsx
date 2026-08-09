import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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
import {
  Check,
  Filter,
  Search,
  Shuffle,
  SlidersHorizontal,
  Utensils,
  X,
} from 'lucide-react-native';

import { Restaurant, RestaurantCategory, RestaurantsStackParamList } from '../types';
import { addCollectionsChangeListener, addRestaurantsChangeListener, getVisibleRestaurants } from '../storage/storage';
import RestaurantCard from '../components/RestaurantCard';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
import { CATEGORY_LIST } from '../constants/categories';
import {
  BudgetFilter,
  filterAndSortRestaurants,
  pickRandomRestaurant,
  RestaurantSortOption,
} from '../utils/restaurantDiscovery';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'Home'>;
type SourceFilter = 'all' | 'personal' | 'friends';

export default function RestaurantListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compactControls = width < 360 || fontScale > 1.3;
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<SourceFilter>('all');
  const [category, setCategory] = useState<RestaurantCategory | null>(null);
  const [budget, setBudget] = useState<BudgetFilter>('all');
  const [photosOnly, setPhotosOnly] = useState(false);
  const [revisitOnly, setRevisitOnly] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sort, setSort] = useState<RestaurantSortOption>('recent');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(() => {
    getVisibleRestaurants().then(setRestaurants);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const offRestaurants = addRestaurantsChangeListener(load);
    const offCollections = addCollectionsChangeListener(load);
    return () => { offRestaurants(); offCollections(); };
  }, [load]);

  const sourceRestaurants = useMemo(() => restaurants.filter((restaurant) => {
    if (source === 'personal') return restaurant.origin?.kind !== 'imported';
    if (source === 'friends') return restaurant.origin?.kind === 'imported' || Boolean(restaurant.sources?.length);
    return true;
  }), [restaurants, source]);

  const filtered = useMemo(() => filterAndSortRestaurants(sourceRestaurants, {
    query,
    category,
    budget,
    photosOnly,
    revisitOnly,
    minRating,
    sort,
  }), [sourceRestaurants, query, category, budget, photosOnly, revisitOnly, minRating, sort]);

  const rated = restaurants.filter((restaurant) => restaurant.rating);
  const average = rated.length
    ? rated.reduce((total, restaurant) => total + (restaurant.rating || 0), 0) / rated.length
    : 0;
  const importedCount = restaurants.filter((restaurant) => restaurant.origin?.kind === 'imported' || Boolean(restaurant.sources?.length)).length;
  const importedShare = restaurants.length ? Math.round((importedCount / restaurants.length) * 100) : 0;
  const advancedCount = [category, budget !== 'all', photosOnly, revisitOnly, minRating, sort !== 'recent'].filter(Boolean).length;
  const selectedCategoryLabel = category
    ? CATEGORY_LIST.find((item) => item.value === category)?.label || 'Catégorie'
    : 'Toutes';
  const selectedBudgetLabel = ({ all: 'Tous', low: '1–10 €', mid: '11–20 €', high: '21–30 €', unknown: 'Non renseigné' } as const)[budget];
  const selectedSortLabel = ({ recent: 'Ajout récent', rating: 'Note', visited: 'Dernier passage', name: 'Nom', price_low: 'Prix croissant', price_high: 'Prix décroissant' } as const)[sort];

  const resetAdvanced = () => {
    setCategory(null);
    setBudget('all');
    setPhotosOnly(false);
    setRevisitOnly(false);
    setMinRating(null);
    setSort('recent');
  };

  const openRandom = () => {
    const restaurant = pickRandomRestaurant(filtered);
    if (restaurant) navigation.navigate('RestaurantDetail', { restaurantId: restaurant.id });
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
      <ScreenHeader
        title="Restos"
        subtitle="Toutes les adresses au même endroit"
        onAdd={() => navigation.navigate('AddRestaurant')}
        addAccessibilityLabel="Ajouter une adresse"
        showAdd={restaurants.length > 0}
      />

      <View style={[styles.stats, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{restaurants.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>adresses</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{average ? average.toFixed(1) : '—'}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>moyenne</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.friendText }]}>{importedShare}%</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>des amis</Text>
        </View>
      </View>

      <View style={[styles.search, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
        <Search size={19} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Nom, quartier, plat…"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          accessibilityLabel="Rechercher une adresse"
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="Effacer la recherche" hitSlop={10}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={[
          styles.sourceTabs,
          compactControls && styles.sourceTabsCompact,
          { backgroundColor: colors.surfaceMuted, borderColor: colors.textPrimary, borderWidth: 1.5 },
        ]}
      >
        {([
          ['all', 'Tout'],
          ['personal', 'Mes adresses'],
          ['friends', 'Listes d’amis'],
        ] as const).map(([value, label]) => {
          const selected = source === value;
          return (
            <Pressable
              key={value}
              onPress={() => setSource(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.sourceTab,
                compactControls && styles.sourceTabCompact,
                selected && { backgroundColor: colors.surface, borderColor: colors.textPrimary, borderWidth: 1.5 },
                { opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <Text style={[styles.sourceTabText, { color: selected ? colors.textPrimary : colors.textMuted }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.resultRow, compactControls && styles.resultRowCompact]}>
        <Text style={[styles.resultText, { color: colors.textMuted }]}>
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </Text>
        <View style={[styles.inlineActions, compactControls && styles.inlineActionsCompact]}>
          <Pressable
            onPress={openRandom}
            disabled={!filtered.length}
            style={({ pressed }) => [styles.textAction, { opacity: !filtered.length ? 0.35 : pressed ? 0.55 : 1 }]}
          >
            <Shuffle size={16} color={colors.textSecondary} />
            <Text style={[styles.textActionLabel, { color: colors.textSecondary }]}>Choisir</Text>
          </Pressable>
          <Pressable onPress={() => setFiltersOpen(true)} style={({ pressed }) => [styles.textAction, { opacity: pressed ? 0.55 : 1 }]}>
            {advancedCount ? <Filter size={16} color={colors.accent} /> : <SlidersHorizontal size={16} color={colors.textSecondary} />}
            <Text style={[styles.textActionLabel, { color: advancedCount ? colors.accent : colors.textSecondary }]}>Filtres{advancedCount ? ` · ${advancedCount}` : ''}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RestaurantCard restaurant={item} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={(
          <EmptyState
            icon={Utensils}
            title={restaurants.length ? 'Aucune adresse trouvée' : 'Votre carnet est vide'}
            subtitle={restaurants.length ? 'Essayez une autre recherche ou réinitialisez les filtres.' : 'Ajoutez une adresse ou importez la liste d’un ami.'}
            actionLabel={restaurants.length ? 'Réinitialiser' : 'Ajouter une adresse'}
            onAction={restaurants.length ? () => { setQuery(''); setSource('all'); resetAdvanced(); } : () => navigation.navigate('AddRestaurant')}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={filtersOpen} transparent={false} presentationStyle="fullScreen" animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.surface }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setFiltersOpen(false)} />
          <View style={[styles.sheet, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary, paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Affiner les adresses</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>Les filtres s’appliquent immédiatement.</Text>
              </View>
              <Pressable onPress={() => setFiltersOpen(false)} accessibilityLabel="Fermer" style={styles.closeButton}>
                <X size={22} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Catégorie</Text>
              <Text style={[styles.selectionHint, { color: colors.textMuted }]}>{selectedCategoryLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalOptions}>
                <Option label="Toutes" selected={!category} onPress={() => setCategory(null)} />
                {CATEGORY_LIST.map((item) => (
                  <Option key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(category === item.value ? null : item.value)} />
                ))}
              </ScrollView>

              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Budget</Text>
              <Text style={[styles.selectionHint, { color: colors.textMuted }]}>{selectedBudgetLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalOptions}>
                {([
                  ['all', 'Tous'], ['low', '1–10 €'], ['mid', '11–20 €'], ['high', '21–30 €'], ['unknown', 'Non renseigné'],
                ] as const).map(([value, label]) => <Option key={value} label={label} selected={budget === value} onPress={() => setBudget(value)} />)}
              </ScrollView>

              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Préférences</Text>
              <View style={[styles.preferenceList, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
                <PreferenceRow label="Avec photos" selected={photosOnly} onPress={() => setPhotosOnly(!photosOnly)} />
                <PreferenceRow label="À refaire" selected={revisitOnly} onPress={() => setRevisitOnly(!revisitOnly)} />
                <PreferenceRow label="Notées 4+" selected={minRating === 4} onPress={() => setMinRating(minRating === 4 ? null : 4)} />
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Trier</Text>
              <Text style={[styles.selectionHint, { color: colors.textMuted }]}>{selectedSortLabel}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalOptions}>
                {([
                  ['recent', 'Ajout récent'], ['rating', 'Note'], ['visited', 'Dernier passage'], ['name', 'Nom'], ['price_low', 'Prix croissant'], ['price_high', 'Prix décroissant'],
                ] as const).map(([value, label]) => <Option key={value} label={label} selected={sort === value} onPress={() => setSort(value)} />)}
              </ScrollView>
              <View style={[styles.sheetFooter, compactControls && styles.sheetFooterCompact]}>
                <Pressable onPress={resetAdvanced} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, opacity: pressed ? 0.55 : 1 }]}>
                  <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>Réinitialiser</Text>
                </Pressable>
                <Pressable onPress={() => setFiltersOpen(false)} style={({ pressed }) => [styles.applyButton, { backgroundColor: colors.accent, opacity: pressed ? 0.72 : 1 }]}>
                  <Text style={[styles.applyText, { color: colors.textOnAccent }]}>Voir {filtered.length} adresse{filtered.length !== 1 ? 's' : ''}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={({ pressed }) => [
          styles.option,
          {
            backgroundColor: selected ? `${colors.accent}18` : colors.surfaceLight,
            borderColor: selected ? colors.accent : colors.textPrimary,
            opacity: pressed ? 0.62 : 1,
          },
        ]}
      >
        <Text style={[styles.optionText, { color: selected ? colors.accent : colors.textPrimary }]}>{label}</Text>
      </Pressable>
    );
  }

  function PreferenceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={({ pressed }) => [styles.preferenceRow, { opacity: pressed ? 0.62 : 1 }]}
      >
        <Text style={[styles.preferenceLabel, { color: colors.textPrimary }]}>{label}</Text>
        <View style={[styles.preferenceMark, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accent : 'transparent' }]}>
          {selected ? <Check size={14} color={colors.textOnAccent} strokeWidth={3} /> : null}
        </View>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  stats: { marginTop: Spacing.xxl, padding: Spacing.lg, flexDirection: 'row', borderWidth: 1.5, borderRadius: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  statLabel: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  search: { minHeight: 52, marginTop: Spacing.xl, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderRadius: 10 },
  searchInput: { flex: 1, minHeight: 46, fontFamily: FontFamily.regular, fontSize: FontSize.md },
  sourceTabs: { marginTop: Spacing.md, padding: 4, flexDirection: 'row', borderRadius: 8 },
  sourceTabsCompact: { flexDirection: 'column' },
  sourceTab: { flex: 1, minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 5 },
  sourceTabCompact: { flex: 0, width: '100%' },
  sourceTabText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, textAlign: 'center' },
  resultRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultRowCompact: { minHeight: 76, paddingVertical: Spacing.xs, flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center' },
  resultText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  inlineActionsCompact: { alignSelf: 'stretch', justifyContent: 'flex-end' },
  textAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  textActionLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '84%', paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1.5 },
  sheetHandle: { width: 36, height: 4, alignSelf: 'center', marginBottom: Spacing.md, borderRadius: BorderRadius.full },
  sheetHeader: { minHeight: 52, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  sheetHeaderCopy: { flex: 1 },
  sheetTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xl },
  sheetSubtitle: { marginTop: 3, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filterContent: { paddingBottom: Spacing.sm },
  sectionLabel: { marginTop: Spacing.lg, marginBottom: 3, fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  selectionHint: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  horizontalOptions: { paddingVertical: Spacing.sm, paddingRight: Spacing.xl, gap: Spacing.sm },
  option: { minHeight: 44, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 8 },
  optionText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  preferenceList: { marginTop: Spacing.sm, padding: Spacing.sm, borderWidth: 1.5, borderRadius: 10 },
  preferenceRow: { minHeight: 48, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: BorderRadius.md },
  preferenceLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  preferenceMark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 11 },
  preferenceCheck: { fontFamily: FontFamily.bold, fontSize: 14, lineHeight: 17 },
  sheetFooter: { marginTop: Spacing.xxl, flexDirection: 'row', gap: Spacing.sm },
  sheetFooterCompact: { flexDirection: 'column' },
  secondaryButton: { minHeight: 50, paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: BorderRadius.md },
  secondaryButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  applyButton: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  applyText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
});
