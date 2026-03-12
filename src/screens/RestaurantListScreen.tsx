import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  // Fix: height animation doesn't support native driver
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Utensils, Plus, Sun, Moon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import { Restaurant, RestaurantsStackParamList } from '../types';
import { getRestaurants } from '../storage/storage';
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

  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      getRestaurants().then(setRestaurants);
    }, [])
  );

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.address?.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50, 100],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const HeaderBackground = Animated.createAnimatedComponent(BlurView);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Sticky Compact Header */}
      <HeaderBackground
        intensity={isDark ? 40 : 80}
        tint={isDark ? "dark" : "light"}
        style={[
          styles.headerBlur,
          { height: insets.top + 60, paddingTop: insets.top + 6 }
        ]}
      >
        <Animated.Text
          style={[
            styles.stickyTitle,
            {
              color: colors.textPrimary,
              opacity: scrollY.interpolate({ inputRange: [100, 150], outputRange: [0, 1], extrapolate: 'clamp' }),
            }
          ]}
          numberOfLines={1}
        >
          Mes adresses
        </Animated.Text>
      </HeaderBackground>

      <Animated.FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <RestaurantCard
            restaurant={item}
            onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
          />
        )}
        ListHeaderComponent={
          <View style={[styles.mainHeaderContent, { paddingTop: insets.top + 50 }]}>
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
  headerBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainHeaderContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  stickyTitle: {
    fontSize: FontSize.sm + 1,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
