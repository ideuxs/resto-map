import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import MapView, { Marker, Callout, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, Map, MapPin, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';

import { Restaurant, RestaurantCategory } from '../types';
import { getRestaurants, addRestaurantsChangeListener } from '../storage/storage';
import { CATEGORIES, CATEGORY_LIST } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';
import { getTravelTimesFromCurrentPosition } from '../services/travelTimes';

export default function MapScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filter, setFilter] = useState<RestaurantCategory | null>(null);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [etaCar, setEtaCar] = useState<string | null>(null);
  const [etaTransit, setEtaTransit] = useState<string | null>(null);
  const [drivingPath, setDrivingPath] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [isEtaLoading, setIsEtaLoading] = useState(false);
  const lastEtaFetchRef = useRef<number>(0);
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => { getRestaurants().then(setRestaurants); }, []));

  useEffect(() => {
    let mounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startLocationWatch = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;

      if (status !== 'granted') {
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (mounted) {
        setUserLocation(current.coords);
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (position) => {
          if (mounted) {
            setUserLocation(position.coords);
          }
        }
      );
    };

    startLocationWatch();

    // Subscribe to restaurant changes so the map updates immediately when a restaurant is added/edited/removed
    const unsubscribeRestaurants = addRestaurantsChangeListener(() => {
      getRestaurants().then((rs) => {
        if (mounted) setRestaurants(rs);
      });
    });

    return () => {
      mounted = false;
      if (subscription) {
        subscription.remove();
      }
      if (unsubscribeRestaurants) unsubscribeRestaurants();
    };
  }, []);

  const recenterOnUser = () => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018,
      },
      500
    );
  };

  const loadTravelEstimates = useCallback(async (restaurant: Restaurant) => {
    if (!userLocation || !restaurant.location) {
      setEtaCar(null);
      setEtaTransit(null);
      setDrivingPath(null);
      return;
    }

    setIsEtaLoading(true);
    const result = await getTravelTimesFromCurrentPosition({
      originLat: userLocation.latitude,
      originLng: userLocation.longitude,
      destLat: restaurant.location.latitude,
      destLng: restaurant.location.longitude,
    });

    setEtaCar(result.driving);
    setEtaTransit(result.transit);
    setDrivingPath(result.drivingPath);
    setIsEtaLoading(false);
  }, [userLocation]);

  useEffect(() => {
    if (!selectedRestaurantId || !userLocation) return;

    const now = Date.now();
    if (now - lastEtaFetchRef.current < 10000) return;

    const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId);
    if (!selectedRestaurant?.location) return;

    lastEtaFetchRef.current = now;
    loadTravelEstimates(selectedRestaurant);
  }, [selectedRestaurantId, userLocation, restaurants, loadTravelEstimates]);

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

      <View style={[s.topOverlay, { paddingTop: insets.top + Spacing.sm }]}> 
        <BlurView
          intensity={isDark ? 45 : 75}
          tint={isDark ? 'dark' : 'light'}
          style={[s.heroCard, { borderColor: colors.borderGlass }]}
        >
          <View style={s.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.heroTitle, { color: colors.textPrimary }]}>Carte gourmande</Text>
              <Text style={[s.heroSubtitle, { color: colors.textSecondary }]}> 
                {withLocation.length} lieu{withLocation.length > 1 ? 'x' : ''} geolocalise{withLocation.length > 1 ? 's' : ''}
              </Text>
            </View>

            <View style={[s.heroIconBadge, { backgroundColor: colors.primary + '20' }]}> 
              <Compass size={18} color={colors.primary} strokeWidth={2.4} />
            </View>
          </View>
        </BlurView>

        <BlurView
          intensity={isDark ? 40 : 70}
          tint={isDark ? 'dark' : 'light'}
          style={[s.filterContainer, { borderColor: colors.borderGlass }]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
            <TouchableOpacity
              activeOpacity={0.85}
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
                  activeOpacity={0.85}
                  style={[
                    s.chip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected && { backgroundColor: c.color, borderColor: c.color },
                    Shadows.sm
                  ]}
                  onPress={() => setFilter(isSelected ? null : c.value)}
                >
                  <Icon size={15} color={isSelected ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
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
              );
            })}
          </ScrollView>
        </BlurView>
      </View>

      <MapView
        ref={mapRef}
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
        {drivingPath ? (
          <Polyline
            coordinates={drivingPath}
            strokeColor={colors.primary}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {userLocation ? (
          <Circle
            center={{ latitude: userLocation.latitude, longitude: userLocation.longitude }}
            radius={Math.max(userLocation.accuracy ?? 25, 25)}
            fillColor={colors.primary + '22'}
            strokeColor={colors.primary + '66'}
            strokeWidth={1.5}
          />
        ) : null}

        {withLocation.map((r) => {
          const cat = CATEGORIES[r.category];
          const CatIcon = cat.icon;
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.location!.latitude, longitude: r.location!.longitude }}
              pinColor={cat.color}
              onPress={() => {
                setSelectedRestaurantId(r.id);
                setEtaCar(null);
                setEtaTransit(null);
                loadTravelEstimates(r);
              }}
            >
              <Callout tooltip onPress={() => navigation.navigate('RestaurantsTab', { screen: 'RestaurantDetail', params: { restaurantId: r.id } })}>
                <View style={s.calloutContainer}>
                  <View style={[s.calloutBubble, { borderColor: cat.color + '40', backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                    <LinearGradient
                      colors={[cat.color + '15', 'transparent']}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                    />
                    
                    <View style={s.calloutHeaderRow}>
                      <View style={[s.calloutIconBox, { backgroundColor: cat.color + '20' }]}>
                        <CatIcon size={20} color={cat.color} strokeWidth={2.5} />
                      </View>
                      <View style={[s.calloutBadge, { backgroundColor: cat.color + '15', borderColor: cat.color + '30' }]}>
                        <Text style={[s.calloutBadgeText, { color: cat.color }]}>{cat.label}</Text>
                      </View>
                    </View>

                    <Text style={[s.calloutTitle, { color: colors.textPrimary }]} numberOfLines={2}>{r.name}</Text>
                    
                    {r.address ? (
                      <View style={s.calloutAddrRow}>
                        <MapPin size={12} color={colors.textSecondary} />
                        <Text style={[s.calloutAddr, { color: colors.textSecondary }]} numberOfLines={1}>{r.address}</Text>
                      </View>
                    ) : null}

                    <View style={s.calloutDivider} />

                    <View style={s.calloutFooter}>
                      <View style={s.actionPill}>
                        <Navigation size={12} color={colors.primary} />
                        <Text style={[s.actionPillText, { color: colors.primary }]}>Voir infos</Text>
                      </View>

                      {r.priceMin != null && r.priceMax != null ? (
                        <Text style={[s.calloutPrice, { color: colors.textPrimary }]}>{r.priceMin}€ – {r.priceMax}€</Text>
                      ) : r.priceLevel ? (
                        <Text style={[s.calloutPrice, { color: colors.textPrimary }]}>{'€'.repeat(r.priceLevel)}</Text>
                      ) : null}
                    </View>

                    {selectedRestaurantId === r.id ? (
                      <View style={s.calloutEtaBlock}>
                        <Text style={[s.calloutEtaLine, { color: colors.textPrimary }]}>Voiture: {isEtaLoading ? '...' : (etaCar || '--')}</Text>
                        <Text style={[s.calloutEtaLine, { color: colors.textPrimary }]}>Transport: {isEtaLoading ? '...' : (etaTransit || '--')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[s.calloutArrow, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)', borderBottomColor: cat.color + '40', borderRightColor: cat.color + '40' }]} />
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={recenterOnUser}
        disabled={!userLocation}
        style={[
          s.locateBtn,
          {
            bottom: insets.bottom,
            backgroundColor: userLocation ? colors.primary : colors.surface,
            borderColor: userLocation ? colors.primary : colors.border,
            opacity: userLocation ? 1 : 0.7,
          },
          Shadows.md,
        ]}
      >
        <Navigation size={16} color={userLocation ? '#FFF' : colors.textMuted} />
        <Text style={[s.locateBtnText, { color: userLocation ? '#FFF' : colors.textMuted }]}>
          Me localiser
        </Text>
      </TouchableOpacity>

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
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: Spacing.lg,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'hidden',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    marginTop: 2,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
  },
  heroIconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    paddingBottom: Spacing.md,
    overflow: 'hidden',
  },
  filterScroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 1,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
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
    width: 240,
    paddingBottom: 10,
  },
  calloutBubble: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    width: '100%',
    overflow: 'hidden',
  },
  calloutArrow: {
    width: 20,
    height: 20,
    transform: [{ rotate: '45deg' }],
    marginTop: -12,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  calloutIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  calloutBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
  },
  calloutTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  calloutAddrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  calloutAddr: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  calloutDivider: {
    height: 1,
    backgroundColor: 'rgba(150,150,150,0.2)',
    marginVertical: Spacing.sm + 2,
  },
  calloutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionPillText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  calloutPrice: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  calloutEtaBlock: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  calloutEtaLine: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  locateBtn: {
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locateBtnText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  emptyOverlay: {
    position: 'absolute',
    top: '54%',
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
