import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, type LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Bookmark, CarFront, LocateFixed, MapPinned, Navigation2, UsersRound, X } from '../components/FlaticonIcon';
import * as Location from 'expo-location';

import { Restaurant } from '../types';
import { addCollectionsChangeListener, addRestaurantsChangeListener, addWishlistChangeListener, getVisibleRestaurants, isWishlisted, toggleWishlist } from '../storage/storage';
import { CATEGORIES } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, getSourceColor, isSourceColorKey, Shadows, sourceColorKeyFor, Spacing } from '../constants/theme';
import { getTravelTimesFromCurrentPosition, TravelTimes } from '../services/travelTimes';

type SourceFilter = 'all' | 'personal' | 'friends';

function ownerInitials(name?: string) {
  if (!name || name === 'un ami') return 'A';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function distanceKm(from: Location.LocationObjectCoords, to: { latitude: number; longitude: number }) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [source, setSource] = useState<SourceFilter>('all');
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedWishlisted, setSelectedWishlisted] = useState(false);
  const [travel, setTravel] = useState<TravelTimes | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [miniCardHeight, setMiniCardHeight] = useState(0);

  const load = useCallback(() => { getVisibleRestaurants().then(setRestaurants); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const offRestaurants = addRestaurantsChangeListener(load);
    const offCollections = addCollectionsChangeListener(load);
    return () => { offRestaurants(); offCollections(); };
  }, [load]);

  useEffect(() => {
    if (selectedRestaurant?.id) {
      isWishlisted(selectedRestaurant.id).then(setSelectedWishlisted);
    }
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    const offWishlist = addWishlistChangeListener(() => {
      if (selectedRestaurant?.id) {
        isWishlisted(selectedRestaurant.id).then(setSelectedWishlisted);
      }
    });
    return () => offWishlist();
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    let active = true;
    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (!active || status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (active) setUserLocation(position.coords);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const destination = selectedRestaurant?.location;
    if (!destination || !userLocation) {
      setTravel(null);
      setTravelLoading(false);
      return;
    }

    let active = true;
    setTravelLoading(true);
    getTravelTimesFromCurrentPosition({
      originLat: userLocation.latitude,
      originLng: userLocation.longitude,
      destLat: destination.latitude,
      destLng: destination.longitude,
    }).then((nextTravel) => {
      if (active) setTravel(nextTravel);
    }).finally(() => {
      if (active) setTravelLoading(false);
    });
    return () => { active = false; };
  }, [selectedRestaurant?.id, selectedRestaurant?.location?.latitude, selectedRestaurant?.location?.longitude, userLocation?.latitude, userLocation?.longitude]);

  const visible = useMemo(() => restaurants.filter((restaurant) => {
    if (!restaurant.location) return false;
    if (source === 'personal') return restaurant.origin?.kind !== 'imported';
    if (source === 'friends') return restaurant.origin?.kind === 'imported' || Boolean(restaurant.sources?.length);
    return true;
  }), [restaurants, source]);

  const initialRegion = visible[0]?.location
    ? {
        latitude: visible[0].location.latitude,
        longitude: visible[0].location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  const recenter = () => {
    if (!userLocation) {
      Alert.alert('Position indisponible', 'Autorisez la localisation dans les réglages pour recentrer la carte.');
      return;
    }
    mapRef.current?.animateToRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.018,
      longitudeDelta: 0.018,
    }, 280);
  };

  const mapStyle = isDark ? [
    { elementType: 'geometry', stylers: [{ color: '#150D18' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#D9BDDE' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#150D18' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1F1222' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#18241D' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2B1A30' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3B2342' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1A1830' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#25162A' }] },
  ] : [];

  const selectedCategory = selectedRestaurant ? (CATEGORIES[selectedRestaurant.category] || CATEGORIES.autre) : null;
  const selectedImported = selectedRestaurant?.origin?.kind === 'imported';
  const selectedFriendSource = selectedImported ? selectedRestaurant?.origin : selectedRestaurant?.sources?.[0];
  const selectedSourceKey = selectedFriendSource && isSourceColorKey(selectedFriendSource.sourceColorKey)
    ? selectedFriendSource.sourceColorKey
    : sourceColorKeyFor(selectedFriendSource?.ownerId || selectedFriendSource?.ownerName || selectedRestaurant?.id || 'restohub');
  const selectedSourceColor = getSourceColor(selectedSourceKey, isDark ? 'dark' : 'light');
  const routeCoordinates = selectedRestaurant?.location && userLocation
    ? [userLocation, ...(travel?.drivingPath || []), selectedRestaurant.location]
    : [];

  const GlassPanel = ({ children, style, onLayout }: { children: React.ReactNode; style?: any; onLayout?: (event: LayoutChangeEvent) => void }) => (
    <View onLayout={onLayout} style={[style, { overflow: 'hidden' }]}>
      <BlurView
        pointerEvents="none"
        intensity={isDark ? 65 : 80}
        tint={isDark ? 'dark' : 'light'}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFillObject}
      />
      <View>{children}</View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        customMapStyle={mapStyle}
        userInterfaceStyle={isDark ? 'dark' : 'light'}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {visible.map((restaurant) => {
          const imported = restaurant.origin?.kind === 'imported';
          const friendSource = imported ? restaurant.origin : restaurant.sources?.[0];
          const category = CATEGORIES[restaurant.category] || CATEGORIES.autre;
          const Icon = category.icon;
          const sourceKey = isSourceColorKey(friendSource?.sourceColorKey)
            ? friendSource.sourceColorKey
            : sourceColorKeyFor(friendSource?.ownerId || friendSource?.ownerName || restaurant.id);
          const markerColor = imported ? getSourceColor(sourceKey, isDark ? 'dark' : 'light') : category.markerColor;
          return (
            <Marker
              key={restaurant.id}
              coordinate={restaurant.location!}
              onPress={() => setSelectedRestaurant(restaurant)}
              accessibilityLabel={`${restaurant.name}, ${imported ? `partagée par ${restaurant.origin?.ownerName || 'un ami'}` : 'adresse personnelle'}`}
            >
              {imported ? (
                <View style={styles.markerWrap}>
                  <View style={[styles.friendMarker, { backgroundColor: markerColor, borderColor: colors.surface }]}>
                    <Text style={styles.friendInitials}>{ownerInitials(restaurant.origin?.ownerName)}</Text>
                  </View>
                  <View style={[styles.markerTail, { borderTopColor: markerColor }]} />
                </View>
              ) : (
                <View style={styles.markerWrap}>
                  <View style={[styles.personalMarker, { backgroundColor: colors.surface, borderColor: markerColor }]}>
                    <Icon size={16} color={markerColor} strokeWidth={2.2} />
                    {friendSource ? <View style={[styles.friendBadge, { backgroundColor: getSourceColor(sourceKey, isDark ? 'dark' : 'light'), borderColor: colors.surface }]} /> : null}
                  </View>
                  <View style={[styles.markerTail, { borderTopColor: markerColor }]} />
                </View>
              )}
            </Marker>
          );
        })}
        {routeCoordinates.length > 1 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={colors.primary}
            strokeWidth={3.5}
            lineCap="round"
            lineJoin="round"
            zIndex={2}
          />
        ) : null}
      </MapView>

      {selectedRestaurant && selectedCategory ? (
        <GlassPanel
          onLayout={({ nativeEvent }) => {
            const nextHeight = Math.round(nativeEvent.layout.height);
            setMiniCardHeight((currentHeight) => currentHeight === nextHeight ? currentHeight : nextHeight);
          }}
          style={[styles.miniCard, Shadows.floating, { bottom: insets.bottom + 74, backgroundColor: colors.glass, borderColor: colors.border }]}
        >
          <View style={styles.miniHeader}>
            <View style={[styles.miniCategoryIcon, { backgroundColor: isDark ? colors.surfaceLight : `${selectedSourceColor}15` }]}>
              <selectedCategory.icon size={18} color={selectedSourceColor} />
            </View>
            <View style={styles.miniCopy}>
              <Text style={[styles.miniName, { color: colors.textPrimary }]} numberOfLines={1}>{selectedRestaurant.name}</Text>
              <Text style={[styles.miniCategory, { color: colors.textSecondary }]} numberOfLines={1}>{selectedCategory.label}{selectedRestaurant.address ? ` · ${selectedRestaurant.address}` : ''}</Text>
            </View>
            <Pressable
              onPress={async () => {
                if (!selectedRestaurant) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                const next = !selectedWishlisted;
                setSelectedWishlisted(next);
                await toggleWishlist(selectedRestaurant.id);
              }}
              style={({ pressed }) => [
                styles.miniWishlistBtn,
                {
                  transform: [{ scale: pressed ? 0.85 : 1 }],
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityLabel={selectedWishlisted ? "Retirer des envies" : "Ajouter aux envies"}
            >
              <Bookmark
                size={18}
                fill={selectedWishlisted ? (isDark ? '#A84BAE' : colors.primary) : 'none'}
                color={selectedWishlisted ? (isDark ? '#A84BAE' : colors.primary) : colors.textMuted}
                strokeWidth={selectedWishlisted ? 2.6 : 1.8}
              />
            </Pressable>
            <Pressable onPress={() => { setSelectedRestaurant(null); setTravel(null); }} style={styles.miniClose} accessibilityLabel="Fermer la mini-fiche">
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={[styles.routeSummary, { backgroundColor: isDark ? colors.surfaceLight : `${colors.primary}08` }]}>
            <View style={styles.routeSummaryItem}>
              {travelLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <CarFront size={16} color={colors.primary} />}
              <Text style={[styles.routeSummaryLabel, { color: colors.textMuted }]}>Voiture</Text>
              <Text style={[styles.routeSummaryValue, { color: colors.textPrimary }]}>{travelLoading ? 'Calcul…' : travel?.driving || (userLocation ? `${distanceKm(userLocation, selectedRestaurant.location!).toFixed(1).replace('.', ',')} km` : 'Position requise')}</Text>
            </View>
            <View style={[styles.routeSummaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.routeSummaryItem}>
              <Navigation2 size={16} color={colors.link} />
              <Text style={[styles.routeSummaryLabel, { color: colors.textMuted }]}>Transports</Text>
              <Text style={[styles.routeSummaryValue, { color: colors.textPrimary }]}>{travelLoading ? '…' : travel?.transit || '—'}</Text>
            </View>
          </View>
          <View style={styles.miniActions}>
            <Text style={[styles.miniRouteHint, { color: colors.textMuted }]}>{userLocation ? 'Tracé affiché sur la carte' : 'Autorisez la position pour afficher le tracé'}</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                navigation.navigate('restaurants', { screen: 'RestaurantDetail', params: { restaurantId: selectedRestaurant.id } });
              }}
              style={({ pressed }) => [
                styles.miniOpen,
                {
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.miniOpenText, { color: colors.link }]}>Ouvrir la fiche</Text>
              <Navigation2 size={14} color={colors.link} />
            </Pressable>
          </View>
        </GlassPanel>
      ) : null}

      <GlassPanel style={[styles.topPanel, Shadows.card, { top: insets.top + Spacing.sm, backgroundColor: colors.glass, borderColor: colors.border }]}>
        <View style={styles.mapTitleRow}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Carte</Text>
            <Text style={[styles.count, { color: colors.textSecondary }]}>{visible.length} adresse{visible.length !== 1 ? 's' : ''} géolocalisée{visible.length !== 1 ? 's' : ''}</Text>
          </View>
          <MapPinned size={22} color={colors.primary} />
        </View>
        <View style={[styles.sourceTabs, { backgroundColor: isDark ? colors.surfaceLight : colors.surfaceMuted }]}>
          {([
            ['all', 'Tout'], ['personal', 'Moi'], ['friends', 'Amis'],
          ] as const).map(([value, label]) => {
            const selected = source === value;
            return (
              <Pressable
                key={value}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setSource(value);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.sourceTab,
                  selected && [
                    Shadows.hairline,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ],
                  {
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.sourceTabText, { color: selected ? colors.primary : colors.textMuted, fontFamily: selected ? FontFamily.bold : FontFamily.medium }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </GlassPanel>

      {!visible.length ? (
        <View pointerEvents="none" style={[styles.empty, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MapPinned size={26} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Aucune adresse sur cette vue</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Ajoutez une position ou changez le filtre.</Text>
        </View>
      ) : null}

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          recenter();
        }}
        accessibilityRole="button"
        accessibilityLabel="Me localiser"
        style={({ pressed }) => [
          styles.locate,
          Shadows.floating,
          {
            bottom: insets.bottom + (selectedRestaurant ? (miniCardHeight ? miniCardHeight + 74 + Spacing.md : 280) : 76),
            backgroundColor: colors.glass,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.92 : 1 }],
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <LocateFixed size={20} color={userLocation ? colors.primary : colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topPanel: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.xl },
  mapTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, letterSpacing: -0.4 },
  count: { marginTop: 1, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  sourceTabs: { marginTop: Spacing.sm, padding: 3, flexDirection: 'row', borderRadius: BorderRadius.md },
  sourceTab: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', borderRadius: BorderRadius.sm },
  sourceTabText: { fontSize: FontSize.xs },
  markerWrap: { alignItems: 'center' },
  personalMarker: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  friendBadge: { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  friendMarker: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  friendInitials: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: FontSize.xs },
  markerTail: { width: 0, height: 0, marginTop: -2, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  miniCard: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, padding: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.xl, zIndex: 3 },
  miniHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  miniCategoryIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  miniCopy: { flex: 1, minWidth: 0 },
  miniName: { fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: -0.2 },
  miniCategory: { marginTop: 1, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  miniWishlistBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  miniClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  routeSummary: { minHeight: 46, marginTop: Spacing.md, paddingVertical: Spacing.xs, flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.md },
  routeSummaryItem: { flex: 1, minWidth: 0, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 4 },
  routeSummaryLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  routeSummaryValue: { width: '100%', paddingLeft: 20, marginTop: 1, fontFamily: FontFamily.bold, fontSize: FontSize.xs },
  routeSummaryDivider: { width: 1, height: 28 },
  miniActions: { minHeight: 32, marginTop: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  miniRouteHint: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  miniOpen: { minWidth: 110, minHeight: 36, paddingHorizontal: Spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  miniOpenText: { flexShrink: 0, fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  locate: { position: 'absolute', right: Spacing.lg, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: BorderRadius.md, zIndex: 10 },
  empty: { position: 'absolute', left: Spacing.xl, right: Spacing.xl, top: '44%', padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.xl },
  emptyTitle: { marginTop: Spacing.md, fontFamily: FontFamily.bold, fontSize: FontSize.md },
  emptyText: { marginTop: 3, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
});
