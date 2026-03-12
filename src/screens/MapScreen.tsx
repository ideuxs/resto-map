import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Map } from 'lucide-react-native';

import { Restaurant, RestaurantCategory } from '../types';
import { getRestaurants } from '../storage/storage';
import { CATEGORIES, CATEGORY_LIST } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';

export default function MapScreen() {
  const { colors, isDark } = useTheme();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<RestaurantCategory | null>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => { getRestaurants().then(setRestaurants); }, []));

  const withLocation = restaurants.filter((r) => r.location && (filter === null || r.category === filter));

  const initialRegion = withLocation.length > 0
    ? { latitude: withLocation[0].location!.latitude, longitude: withLocation[0].location!.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  // Minimal dark mode style for maps
  const customMapStyle = isDark ? [
    { elementType: 'geometry', stylers: [{ color: '#212121' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#181818' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'poi.park', elementType: 'labels.text.stroke', stylers: [{ color: '#1b1b1b' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
    { featureType: 'road.highway.controlled_access', elementType: 'geometry', stylers: [{ color: '#4e4e4e' }] },
    { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
  ] : [];

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* Search & Filter Header (Glassmorphic) */}
      <BlurView intensity={isDark ? 50 : 90} tint={isDark ? "dark" : "light"} style={[s.filterContainer, { paddingTop: insets.top, height: insets.top + 70 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              s.chip,
              { backgroundColor: colors.surface, borderColor: colors.border },
              filter === null && { backgroundColor: colors.primary, borderColor: colors.primary },
              Shadows.sm
            ]}
            onPress={() => setFilter(null)}
          >
            <Text
              style={[
                s.chipText,
                { color: colors.textSecondary },
                filter === null && { color: colors.textOnPrimary, fontFamily: FontFamily.semiBold }
              ]}
            >
              Tous
            </Text>
          </TouchableOpacity>

          {CATEGORY_LIST.map((c) => {
            const Icon = c.icon;
            const isSelected = filter === c.value;
            return (
              <TouchableOpacity
                key={c.value}
                activeOpacity={0.8}
                style={[
                  s.chip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { backgroundColor: c.color, borderColor: c.color },
                  Shadows.sm
                ]}
                onPress={() => setFilter(isSelected ? null : c.value)}
              >
                <Icon size={16} color={isSelected ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text
                  style={[
                    s.chipText,
                    { color: colors.textSecondary },
                    isSelected && { color: '#FFF', fontFamily: FontFamily.semiBold }
                  ]}
                >
                  {c.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </BlurView>

      <MapView
        provider={PROVIDER_DEFAULT}
        style={s.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        showsCompass={false}
        customMapStyle={customMapStyle}
        userInterfaceStyle={isDark ? "dark" : "light"}
        showsBuildings={true}
      >
        {withLocation.map((r) => {
          const cat = CATEGORIES[r.category];
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.location!.latitude, longitude: r.location!.longitude }}
              pinColor={cat.color}
            >
              <Callout tooltip>
                <View style={s.calloutContainer}>
                  <View style={s.calloutBubble}>
                    <Text style={s.calloutTitle}>{r.name}</Text>
                    {r.address ? <Text style={s.calloutAddr} numberOfLines={1}>{r.address}</Text> : null}

                    <View style={s.calloutFooter}>
                      <View style={[s.calloutBadge, { backgroundColor: cat.color + '20' }]}>
                        <Text style={[s.calloutBadgeText, { color: cat.color }]}>{cat.label}</Text>
                      </View>

                      {r.priceMin != null && r.priceMax != null ? (
                        <Text style={[s.calloutPrice, { color: colors.primary }]}>{r.priceMin}€ – {r.priceMax}€</Text>
                      ) : r.priceLevel ? (
                        <Text style={[s.calloutPrice, { color: colors.primary }]}>{'€'.repeat(r.priceLevel)}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={s.calloutArrow} />
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {withLocation.length === 0 && (
        <View style={s.emptyOverlay}>
          <BlurView intensity={isDark ? 50 : 90} tint={isDark ? "dark" : "light"} style={s.emptyBox}>
            <Map size={48} color={colors.primary} strokeWidth={1.5} style={{ marginBottom: Spacing.md }} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Aucun lieu trouvé sur la carte</Text>
          </BlurView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1
  },
  filterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  filterScroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
  },
  map: {
    flex: 1
  },
  calloutContainer: {
    alignItems: 'center',
    width: 200,
  },
  calloutBubble: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
  },
  calloutArrow: {
    width: 16,
    height: 16,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
    marginTop: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    marginBottom: 4,
    color: '#000'
  },
  calloutAddr: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: '#666',
    marginBottom: Spacing.sm
  },
  calloutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  calloutBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  calloutBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
  },
  calloutPrice: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold
  },
  emptyOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -50 }],
  },
  emptyBox: {
    padding: Spacing.xxl,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.2)',
  },
  emptyText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
});
