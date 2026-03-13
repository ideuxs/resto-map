import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  FlatList,
  Animated,
  StatusBar,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Coins, Navigation, FolderPlus, Pencil, Trash2, ArrowLeft, X, Camera, Check, Sparkles, Folder } from 'lucide-react-native';

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
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [savingCollectionId, setSavingCollectionId] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const saveModalAnim = useRef(new Animated.Value(0)).current;

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

  const openSaveModal = () => {
    setSaveModalVisible(true);
    Animated.spring(saveModalAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 90,
    }).start();
  };

  const closeSaveModal = () => {
    Animated.timing(saveModalAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSaveModalVisible(false));
  };

  const handleAddToCollection = () => {
    openSaveModal();
  };

  const handleSelectCollection = async (collection: Collection) => {
    if (!restaurant || savingCollectionId) return;
    try {
      setSavingCollectionId(collection.id);
      await addRestaurantToCollection(collection.id, restaurant.id);
      await loadData();
      Alert.alert('Ajout avec succes', `Dans la collection "${collection.name}"`);
      closeSaveModal();
    } finally {
      setSavingCollectionId(null);
    }
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
  const imageCountText = `${restaurant.images.length} photo${restaurant.images.length > 1 ? 's' : ''}`;

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

      {/* Floating Navigation */}
      <View style={[styles.navHeader, { paddingTop: insets.top + Spacing.xs }]} pointerEvents="box-none">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <BlurView intensity={60} tint="dark" style={styles.backButton}>
            <ArrowLeft size={24} color="#FFF" />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('AddRestaurant', { restaurant })}
          activeOpacity={0.85}
        >
          <BlurView intensity={60} tint="dark" style={styles.backButton}>
            <Pencil size={20} color="#FFF" />
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
          <View style={[styles.grabHandle, { backgroundColor: colors.border }]} />

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
              <View style={[styles.infoRow, styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceLight }]}>
                  <MapPin size={20} color={colors.textSecondary} />
                </View>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{restaurant.address}</Text>
              </View>
            ) : null}

            {priceText() ? (
              <View style={[styles.infoRow, styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.primary + '55' }, Shadows.sm]}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
                  <Coins size={20} color={colors.primary} />
                </View>
                <Text style={[styles.infoText, { color: colors.primary, fontFamily: FontFamily.bold }]}>{priceText()}</Text>
              </View>
            ) : null}

          </View>

          {/* Description Card */}
          {restaurant.description ? (
            <LinearGradient
              colors={isDark ? ['rgba(99,102,241,0.20)', 'rgba(24,24,27,0.6)'] : ['rgba(208, 207, 226, 0.1)', 'rgba(255, 255, 255, 0.95)']}
              style={[styles.descSection, { borderColor: isDark ? 'rgba(129,140,248,0.22)' : 'rgba(79,70,229,0.16)' }]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>À propos</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{restaurant.description}</Text>
            </LinearGradient>
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
              style={[styles.actionBtnWide, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '35' }, Shadows.sm, { shadowColor: colors.danger }]}
              onPress={handleDelete}
            >
              <View style={[styles.actionIconBox, { backgroundColor: colors.danger + '20', marginBottom: 0 }]}> 
                <Trash2 size={22} color={colors.danger} />
              </View>
              <View>
                <Text style={[styles.actionText, { color: colors.danger }]}>Supprimer</Text>
                <Text style={[styles.actionSubText, { color: colors.textSecondary }]}>Retirer definitivement cette fiche</Text>
              </View>
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

      <Modal
        visible={saveModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeSaveModal}
      >
        <View style={styles.saveModalBackdrop}> 
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15,23,42,0.4)', opacity: saveModalAnim }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={closeSaveModal}
            />
          </Animated.View>

          <Animated.View
            style={[
              {
                transform: [
                  {
                    translateY: saveModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [600, 0],
                    })
                  }
                ]
              }
            ]}
          >
            <BlurView
              intensity={isDark ? 50 : 90}
              tint={isDark ? 'dark' : 'light'}
              style={[styles.saveModalSheet, { borderColor: colors.borderGlass }]}
            >
              <View style={styles.saveModalSheetHandle} />
              
              <LinearGradient
                colors={isDark ? ['rgba(99,102,241,0.25)', 'transparent'] : ['rgba(255, 255, 255, 0.98)', 'rgba(230, 227, 227, 0.6)']}
                style={styles.saveModalHero}
              >
                <View style={[styles.saveModalIconWrap, { backgroundColor: colors.primary + '20' }]}> 
                  <FolderPlus size={32} color={colors.primary} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.saveModalTitle, { color: isDark ? '#fff' : '#000' }]}>Enregistrer l'adresse</Text>
                  <Text style={[styles.saveModalSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                </View>
              </LinearGradient>

              {collections.length === 0 ? (
                <View style={[styles.saveEmptyCard, { borderColor: colors.border, backgroundColor: colors.surface + '80' }]}> 
                  <Text style={[styles.saveEmptyTitle, { color: colors.textPrimary }]}>Aucune collection existante</Text>
                  <Text style={[styles.saveEmptyText, { color: colors.textSecondary }]}>Creez une collection depuis l'onglet Collections pour commencer a organiser vos endroits favoris.</Text>
                </View>
              ) : (
                <FlatList
                  data={collections}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.saveList}
                  renderItem={({ item }) => {
                    const alreadySaved = item.restaurantIds.includes(restaurant.id);
                    const isSaving = savingCollectionId === item.id;
                    return (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                          styles.saveCollectionItem,
                          {
                            backgroundColor: alreadySaved ? (isDark ? colors.surfaceLight : '#fff') : colors.surface,
                            borderColor: alreadySaved ? colors.primary + '40' : colors.border,
                            transform: [{ scale: isSaving ? 0.98 : 1 }]
                          },
                          Shadows.sm,
                        ]}
                        onPress={() => handleSelectCollection(item)}
                        disabled={isSaving || alreadySaved}
                      >
                        <View style={[styles.saveCollectionDot, { backgroundColor: alreadySaved ? colors.primary : colors.surfaceLight }]}> 
                          {alreadySaved ? (
                            <Check size={14} color={colors.textOnPrimary} strokeWidth={3} />
                          ) : (
                            <Folder size={14} color={colors.textSecondary} strokeWidth={2} />
                          )}
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.saveCollectionName, { color: colors.textPrimary }]}>{item.name}</Text>
                          <Text style={[styles.saveCollectionMeta, { color: colors.textSecondary }]}>
                            {item.restaurantIds.length} adresse{item.restaurantIds.length > 1 ? 's' : ''}
                          </Text>
                        </View>

                        <View style={[
                          styles.saveCollectionAction, 
                          { backgroundColor: alreadySaved ? 'transparent' : colors.primary + '15' }
                        ]}> 
                          {alreadySaved ? (
                            <Check size={20} color={colors.primary} />
                          ) : (
                            <Text style={[styles.saveCollectionActionText, { color: colors.primary }]}>
                              {isSaving ? 'Ajout...' : 'Ajouter'}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                  style={{ maxHeight: 340 }}
                />
              )}

              <TouchableOpacity
                onPress={closeSaveModal}
                activeOpacity={0.85}
                style={[styles.saveCloseBtn, { backgroundColor: isDark ? colors.surfaceLight : colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.saveCloseText, { color: colors.textPrimary }]}>Fermer</Text>
              </TouchableOpacity>
            </BlurView>
          </Animated.View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    bottom: Spacing.lg,
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
  heroMetaCard: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: Spacing.xxxl + 14,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  heroMetaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  heroCatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  heroCatText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  heroPhotoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  heroPhotoText: {
    color: '#FFF',
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  heroName: {
    color: '#FFF',
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.bold,
    lineHeight: 30,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroPrice: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: 60,
    marginTop: -Spacing.xxxl, // Overlap the header slightly
    borderTopLeftRadius: BorderRadius.xxl * 1.5,
    borderTopRightRadius: BorderRadius.xxl * 1.5,
  },
  grabHandle: {
    width: 46,
    height: 5,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    opacity: 0.8,
  },
  headerInfo: {
    marginBottom: Spacing.xl,
    marginLeft: 0,
  },
  name: {
    marginTop: 4,
    fontSize: FontSize.xxl + 4,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
    lineHeight: 34,
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
    marginLeft: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
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
    borderWidth: 1,
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
  actionBtnWide: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  actionSubText: {
    marginTop: 2,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
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
  saveModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  saveModalSheet: {
    borderTopLeftRadius: BorderRadius.xxl * 1.2,
    borderTopRightRadius: BorderRadius.xxl * 1.2,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl + 20,
  },
  saveModalSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(150,150,150,0.3)',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  saveModalHero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  saveModalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.5,
  },
  saveModalSubtitle: {
    marginTop: 4,
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
  },
  saveModalMetaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  savePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  savePillText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  saveList: {
    gap: Spacing.sm,
  },
  saveCollectionItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveCollectionDot: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  saveCollectionName: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
  },
  saveCollectionMeta: {
    marginTop: 2,
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
  },
  saveCollectionAction: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    marginLeft: Spacing.sm,
  },
  saveCollectionActionText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  saveEmptyCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  saveEmptyTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    marginBottom: 4,
  },
  saveEmptyText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    lineHeight: 20,
  },
  saveCloseBtn: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  saveCloseText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
});
