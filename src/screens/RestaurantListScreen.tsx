import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Utensils, Plus, Sun, Moon } from 'lucide-react-native';

import { Restaurant, RestaurantsStackParamList } from '../types';
import { getRestaurants, addRestaurantsChangeListener } from '../storage/storage';
import RestaurantCard from '../components/RestaurantCard';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'Home'>;

export default function RestaurantListScreen({ navigation }: Props) {
  const { colors, isDark, setTheme } = useTheme();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      getRestaurants().then(setRestaurants);
    }, [])
  );

  useEffect(() => {
    const unsubscribe = addRestaurantsChangeListener(() => {
      getRestaurants().then(setRestaurants);
    });
    return () => { unsubscribe(); };
  }, []);

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.address?.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

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
          </View>
        }
        contentContainerStyle={[
          filtered.length === 0 ? styles.emptyContainer : styles.list,
          { paddingBottom: insets.bottom + 120 }
        ]}
        ListEmptyComponent={
          <EmptyState
            icon={Utensils}
            title="Aucun restaurant"
            subtitle="Explorez et ajoutez votre premier restaurant favori pour commencer."
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
  searchContainer: {
    marginTop: Spacing.xs,
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
