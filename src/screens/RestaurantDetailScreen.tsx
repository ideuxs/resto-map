import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  FlatList,
  Animated,
  StatusBar,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Coins, Navigation, FolderPlus, Pencil, Trash2, ArrowLeft, X } from 'lucide-react-native';

import { Restaurant, RestaurantsStackParamList, Collection } from '../types';
import { getRestaurants, deleteRestaurant, getCollections, addRestaurantToCollection } from '../storage/storage';
import { deleteImages } from '../storage/imageStorage';
import { CATEGORIES } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'RestaurantDetail'>;
const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 380;

export default function RestaurantDetailScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const all = await getRestaurants();
    const found = all.find((r) => r.id === route.params.restaurantId);
    setRestaurant(found || null);
    const cols = await getCollections();
    setCollections(cols);
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer',
      `Supprimer "${restaurant?.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (restaurant) {
              await deleteImages(restaurant.images);
              await deleteRestaurant(restaurant.id);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleAddToCollection = () => {
    if (collections.length === 0) {
      Alert.alert('Aucune collection', 'Créez d\'abord une collection.');
      return;
    }
    const buttons: { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" }[] = collections.map((col) => ({
      text: `${col.name}`,
      onPress: () => {
        addRestaurantToCollection(col.id, restaurant!.id).then(() => {
          Alert.alert('Ajout avec Succès', `Dans la collection "${col.name}"`);
        });
      },
    }));
    buttons.push({ text: 'Annuler', style: 'cancel' });
    Alert.alert('Ajouter à une collection', 'Choisissez la destination', buttons);
  };

  if (!restaurant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <Text style={[styles.notFound, { color: colors.textMuted }]}>Restaurant introuvable</Text>
      </View>
    );
  }

  const cat = CATEGORIES[restaurant.category];
  const CategoryIcon = cat.icon;

  const priceText = () => {
    const parts: string[] = [];
    if (restaurant.priceMin != null && restaurant.priceMax != null) {
      parts.push(`${restaurant.priceMin}€ – ${restaurant.priceMax}€`);
    }
    if (restaurant.priceLevel) {
      parts.push('€'.repeat(restaurant.priceLevel));
    }
    return parts.join(' · ') || null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Floating Back Button */}
      <View style={[styles.navHeader, { paddingTop: insets.top }]} pointerEvents="box-none">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <BlurView intensity={60} tint="dark" style={styles.backButton}>
            <ArrowLeft size={24} color="#FFF" />
          </BlurView>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Hero Image Gallery */}
        {restaurant.images.length > 0 ? (
          <View style={styles.heroContainer}>
            <FlatList
              data={restaurant.images}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={{ height: HEADER_HEIGHT }}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setImgIndex(idx);
              }}
              keyExtractor={(item, i) => `${item}-${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setSelectedImg(item)}
                  style={{ width, height: HEADER_HEIGHT }}
                >
                  <Image
                    source={{ uri: item }}
                    style={{ width, height: HEADER_HEIGHT }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
            />
            <LinearGradient
              colors={['transparent', colors.background]}
              style={styles.heroGradient}
              locations={[0.5, 1]}
              pointerEvents="none"
            />
            {restaurant.images.length > 1 && (
              <View style={styles.dots} pointerEvents="none">
                {restaurant.images.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === imgIndex && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.heroContainer, { backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }]}>
            <CategoryIcon size={80} color={cat.color} strokeWidth={1} opacity={0.2} />
            <LinearGradient
              colors={['transparent', colors.background]}
              style={styles.heroGradient}
              locations={[0.5, 1]}
            />
          </View>
        )}

        {/* Content Section */}
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <View style={styles.headerInfo}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{restaurant.name}</Text>

            <View style={[styles.badge, { backgroundColor: cat.color + '20', borderColor: cat.color + '40' }]}>
              <CategoryIcon size={14} color={cat.color} style={{ marginRight: 6 }} />
              <Text style={[styles.badgeText, { color: cat.color }]}>
                {cat.label}
              </Text>
            </View>
          </View>

          <View style={styles.infoBlocks}>
            {restaurant.address ? (
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceLight }]}>
                  <MapPin size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{restaurant.address}</Text>
              </View>
            ) : null}

            {priceText() ? (
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                  <Coins size={20} color={colors.primary} />
                </View>
                <Text style={[styles.infoText, { color: colors.primary, fontFamily: FontFamily.bold }]}>{priceText()}</Text>
              </View>
            ) : null}

            {restaurant.location ? (
              <View style={styles.infoRow}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceLight }]}>
                  <Navigation size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {restaurant.location.address || `${restaurant.location.latitude.toFixed(4)}, ${restaurant.location.longitude.toFixed(4)}`}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Description Card */}
          {restaurant.description ? (
            <BlurView
              intensity={isDark ? 40 : 80}
              tint={isDark ? "dark" : "light"}
              style={[styles.descSection, Shadows.sm, { overflow: 'hidden' }]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>À propos</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{restaurant.description}</Text>
            </BlurView>
          ) : null}

          {/* Actions Grid */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: Spacing.xxxl }]}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface }, Shadows.sm]}
              onPress={handleAddToCollection}
            >
              <View style={[styles.actionIconBox, { backgroundColor: colors.primary + '15' }]}>
                <FolderPlus size={22} color={colors.primary} />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Sauvegarder</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface }, Shadows.sm]}
              onPress={() => navigation.navigate('AddRestaurant', { restaurant })}
            >
              <View style={[styles.actionIconBox, { backgroundColor: colors.textMuted + '20' }]}>
                <Pencil size={22} color={colors.textSecondary} />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.danger + '10' }, Shadows.sm, { shadowColor: colors.danger }]}
              onPress={handleDelete}
            >
              <View style={[styles.actionIconBox, { backgroundColor: colors.danger + '20' }]}>
                <Trash2 size={22} color={colors.danger} />
              </View>
              <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={!!selectedImg}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImg(null)}
      >
        <View style={styles.modalBackground}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              onPress={() => setSelectedImg(null)}
              style={styles.modalCloseBtn}
            >
              <BlurView intensity={20} tint="dark" style={styles.closeBlur}>
                <X size={24} color="#FFF" />
              </BlurView>
            </TouchableOpacity>
          </View>

          <FlatList
            data={restaurant.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={imgIndex}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / width);
              setImgIndex(idx);
            }}
            keyExtractor={(item, i) => `modal-${item}-${i}`}
            renderItem={({ item }) => (
              <View style={{ width, justifyContent: 'center', alignItems: 'center' }}>
                <Image
                  source={{ uri: item }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              </View>
            )}
            style={{ flex: 1 }}
          />

          <View style={styles.modalFooter} pointerEvents="none">
            <Text style={styles.modalText}>
              {imgIndex + 1} / {restaurant?.images?.length || 0}
            </Text>
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
  navHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  notFound: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
  },
  heroContainer: {
    height: HEADER_HEIGHT,
    width: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: Spacing.xxxl,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 60,
    marginTop: -Spacing.xxxl, // Overlap the header slightly
    borderTopLeftRadius: BorderRadius.xxl * 1.5,
    borderTopRightRadius: BorderRadius.xxl * 1.5,
  },
  headerInfo: {
    marginBottom: Spacing.xl,
    marginLeft: 10
  },
  name: {
    marginTop: 10,
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    marginBottom: Spacing.md,
    lineHeight: 40,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  infoBlocks: {
    gap: Spacing.lg,
    marginBottom: Spacing.xxxl,
    marginLeft: 10
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoText: {
    fontSize: FontSize.md + 1,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  descSection: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.regular,
    lineHeight: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  actionBtn: {
    width: (width - Spacing.xl * 2 - Spacing.md) / 2,
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xxl,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  closeBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modalText: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
    opacity: 0.8,
  },
});
