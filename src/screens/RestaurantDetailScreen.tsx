import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import MapView, { Marker } from 'react-native-maps';
import * as Linking from 'expo-linking';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Heart,
  ListPlus,
  LockKeyhole,
  MapPin,
  Navigation2,
  NotebookPen,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UsersRound,
  Utensils,
  WalletCards,
  X,
} from '../components/FlaticonIcon';

import { Collection, Restaurant, Visit } from '../types';
import {
  addCollectionsChangeListener,
  addRestaurantToCollection,
  addRestaurantsChangeListener,
  addVisitsChangeListener,
  deleteVisit,
  deleteRestaurant,
  getCollections,
  getRestaurants,
  getVisits,
  removeRestaurantFromCollection,
} from '../storage/storage';
import { CATEGORIES } from '../constants/categories';
import { getCollectionIcon } from '../constants/collectionIcons';
import PlaceArtwork from '../components/PlaceArtwork';
import EmptyState from '../components/EmptyState';
import VisitFormModal from '../components/VisitFormModal';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, getSourceColor, isSourceColorKey, Shadows, sourceColorKeyFor, Spacing } from '../constants/theme';
import { priceBandLabel } from '../domain/priceBands';

type Props = { route: any; navigation: any };

function formatVisitDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

const MINI_MAP_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#150D18' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#D9BDDE' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#150D18' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2B1A30' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3B2342' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1E1222' }] },
];

export default function RestaurantDetailScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const load = useCallback(async () => {
    const [allRestaurants, allCollections] = await Promise.all([getRestaurants(), getCollections()]);
    const nextRestaurant = allRestaurants.find((item) => item.id === route.params.restaurantId) || null;
    const nextVisits = nextRestaurant ? await getVisits(nextRestaurant.placeId || nextRestaurant.id) : [];
    setRestaurant(nextRestaurant);
    setCollections(allCollections.filter((collection) => collection.kind !== 'imported'));
    setVisits(nextVisits);
  }, [route.params.restaurantId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const offRestaurants = addRestaurantsChangeListener(load);
    const offCollections = addCollectionsChangeListener(load);
    const offVisits = addVisitsChangeListener(load);
    return () => { offRestaurants(); offCollections(); offVisits(); };
  }, [load]);

  const membership = useMemo(() => new Set(
    collections.filter((collection) => collection.restaurantIds.includes(restaurant?.id || '')).map((collection) => collection.id)
  ), [collections, restaurant?.id]);

  const signatureDishes = useMemo(() => {
    if (!restaurant?.signatureDish) return [];
    return restaurant.signatureDish
      .split(',')
      .map((dish) => dish.trim())
      .filter(Boolean);
  }, [restaurant?.signatureDish]);

  if (!restaurant) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState icon={Utensils} title="Adresse introuvable" subtitle="Elle a peut-être été supprimée." actionLabel="Retour" onAction={() => navigation.goBack()} />
      </View>
    );
  }

  const category = CATEGORIES[restaurant.category] || CATEGORIES.autre;
  const CategoryIcon = category.icon;
  const imported = restaurant.origin?.kind === 'imported';
  const friendSource = imported ? restaurant.origin : restaurant.sources?.[0];
  const sourceKey = isSourceColorKey(friendSource?.sourceColorKey)
    ? friendSource.sourceColorKey
    : sourceColorKeyFor(friendSource?.ownerId || friendSource?.ownerName || restaurant.id);
  const sourceColor = getSourceColor(sourceKey, isDark ? 'dark' : 'light');
  const ratedVisits = visits.filter((visit) => visit.rating != null);
  const averageRating = ratedVisits.length
    ? ratedVisits.reduce((sum, visit) => sum + (visit.rating || 0), 0) / ratedVisits.length
    : null;
  const rememberedDishes = Array.from(new Set(
    visits.flatMap((visit) => (visit.dishes || []).map((dish) => dish.trim()).filter(Boolean))
  ));

  const remove = () => {
    Alert.alert('Supprimer cette adresse ?', 'Elle sera retirée de votre carnet et de vos listes.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteRestaurant(restaurant.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const toggleCollection = async (collection: Collection) => {
    if (membership.has(collection.id)) await removeRestaurantFromCollection(collection.id, restaurant.id);
    else await addRestaurantToCollection(collection.id, restaurant.id);
    await load();
  };

  const openSourceList = () => {
    const collectionId = friendSource?.collectionId;
    if (!collectionId) return;
    const firstParent = navigation.getParent?.();
    const secondParent = firstParent?.getParent?.();
    const thirdParent = secondParent?.getParent?.();
    const tabNavigator = [firstParent, secondParent, thirdParent].find((parent) =>
      parent?.getState?.().routeNames?.includes('collections'),
    );
    tabNavigator?.navigate('collections', { screen: 'CollectionDetail', params: { collectionId } });
  };

  const openNewVisit = () => {
    setEditingVisit(null);
    setVisitModalOpen(true);
  };

  const openVisit = (visit: Visit) => {
    setEditingVisit(visit);
    setVisitModalOpen(true);
  };

  const removeVisit = (visit: Visit) => {
    Alert.alert('Supprimer cette visite ?', 'Cette note privée sera définitivement supprimée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVisit(visit.id);
          } catch {
            Alert.alert('Suppression impossible', 'Réessayez dans quelques instants.');
          }
        },
      },
    ]);
  };

  const openDirections = () => {
    if (!restaurant.location) return;
    const { latitude, longitude } = restaurant.location;
    Linking.openURL(`http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`).catch(() => undefined);
  };

  const openGallery = (index: number) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={styles.topAction}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>{restaurant.name}</Text>
        {!imported ? (
          <Pressable onPress={() => navigation.navigate('AddRestaurant', { restaurant })} accessibilityLabel="Modifier" style={styles.topAction}>
            <Pencil size={20} color={colors.textPrimary} />
          </Pressable>
        ) : <View style={styles.topAction} />}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {restaurant.images.length ? (
          <View style={styles.hero}>
            <FlatList
              data={restaurant.images}
              horizontal
              pagingEnabled
              keyExtractor={(item, index) => `${item}-${index}`}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => openGallery(index)} accessibilityRole="imagebutton" accessibilityLabel={`Ouvrir la photo ${index + 1} de ${restaurant.images.length}`}>
                  <Image source={item} style={[styles.heroImage, { width }]} contentFit="cover" transition={180} />
                </Pressable>
              )}
            />
            {restaurant.images.length > 1 ? (
              <View style={[styles.photoCounter, { backgroundColor: colors.overlay }]}>
                <Text style={styles.photoCounterText}>{galleryIndex + 1}/{restaurant.images.length}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <PlaceArtwork restaurant={restaurant} style={styles.artwork} />
        )}

        <View style={styles.content}>
          {friendSource ? (
            <Pressable
              onPress={openSourceList}
              style={({ pressed }) => [
                styles.sourceRow,
                Shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <View style={[styles.sourceIcon, { backgroundColor: isDark ? colors.surfaceLight : `${sourceColor}15` }]}>
                <UsersRound size={18} color={sourceColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sourceTitle, { color: sourceColor }]}>{imported ? 'Partagée par' : 'Aussi recommandé par'} {friendSource.ownerName || 'un ami'}</Text>
                <Text style={[styles.sourceDetail, { color: colors.textMuted }]}>{imported ? 'Adresse importée' : 'Votre adresse reste personnelle'} · ouvrir la liste</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <View style={styles.categoryLine}>
            <View style={[styles.categoryBadge, Shadows.hairline, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.surfaceLight, borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border, borderWidth: 1 }]}>
              <CategoryIcon size={14} color={isDark ? colors.lavender : category.color} />
              <Text style={[styles.categoryText, { color: isDark ? '#FAF8FC' : colors.primary }]}>{category.label}</Text>
            </View>
            {restaurant.location ? (
              <View style={[styles.locationBadge, Shadows.hairline, { backgroundColor: isDark ? `${colors.link}20` : `${colors.link}12`, borderColor: `${colors.link}30`, borderWidth: 1 }]}>
                <MapPin size={11} color={colors.link} />
                <Text style={[styles.locationLabel, { color: colors.link }]}>Géolocalisé</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{restaurant.name}</Text>
          </View>
          {restaurant.address ? (
            <View style={styles.addressLine}>
              <MapPin size={14} color={colors.textMuted} />
              <Text style={[styles.address, { color: colors.textSecondary }]}>{restaurant.address}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={openDirections}
              disabled={!restaurant.location}
              style={({ pressed }) => [
                styles.routeAction,
                Shadows.card,
                {
                  backgroundColor: isDark ? '#4A154B' : colors.primary,
                  borderColor: isDark ? '#6B2370' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                  opacity: !restaurant.location ? 0.4 : pressed ? 0.78 : 1,
                },
              ]}
            >
              <Navigation2 size={16} color={colors.textOnPrimary} />
              <Text style={[styles.routeActionText, { color: colors.textOnPrimary }]}>Itinéraire</Text>
            </Pressable>
            {!imported ? (
              <Pressable
                onPress={() => setListModalOpen(true)}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  Shadows.hairline,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                <ListPlus size={16} color={isDark ? colors.lavender : colors.primary} />
                <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>Listes</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={[styles.summary, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SummaryMetric label="Ma note" value={averageRating != null ? `${averageRating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/5` : '—'} icon={Star} color={colors.accentYellow} />
            <SummaryMetric label="Visites" value={String(visits.length)} icon={CalendarDays} color={isDark ? colors.lavender : colors.primary} />
            <SummaryMetric label="Budget" value={priceBandLabel(restaurant) || 'Non renseigné'} icon={WalletCards} color={isDark ? colors.lavender : colors.primary} />
          </View>

          {signatureDishes.length ? (
            <View
              style={[
                styles.featuredDishBand,
                Shadows.card,
                {
                  backgroundColor: isDark ? '#4A154B' : colors.surfaceAubergine,
                  borderColor: isDark ? '#6B2370' : 'transparent',
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <Text style={[styles.featuredDishEyebrow, { color: isDark ? '#FDE68A' : colors.textOnAubergineMute }]}>
                {signatureDishes.length > 1 ? 'PLATS À RETENIR' : 'PLAT À RETENIR'}
              </Text>
              <View style={styles.featuredDishesWrap}>
                {signatureDishes.map((dish) => (
                  <View key={dish} style={styles.featuredDishItem}>
                    <Text style={[styles.featuredDishTitle, { color: '#FFFFFF' }]}>{dish}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {restaurant.description || restaurant.tags?.length ? (
            <View style={[styles.aboutCard, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {restaurant.description ? (
                <View style={styles.aboutBlock}>
                  <View style={styles.aboutHeader}>
                    <NotebookPen size={17} color={colors.primary} />
                    <Text style={[styles.aboutTitle, { color: colors.textPrimary }]}>À propos</Text>
                  </View>
                  <Text style={[styles.aboutBody, { color: colors.textPrimary }]}>{restaurant.description}</Text>
                </View>
              ) : null}

              {restaurant.description && restaurant.tags?.length ? (
                <View style={[styles.aboutDivider, { backgroundColor: colors.border }]} />
              ) : null}

              {restaurant.tags?.length ? (
                <View style={styles.tagsBlock}>
                  <Text style={[styles.tagsSectionLabel, { color: colors.textMuted }]}>TAGS & AMBIANCE</Text>
                  <View style={styles.tagsGrid}>
                    {restaurant.tags.map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.tagChip,
                          {
                            backgroundColor: isDark ? colors.surfaceLight : `${colors.primary}0D`,
                            borderColor: isDark ? colors.border : `${colors.primary}18`,
                          },
                        ]}
                      >
                        <Text style={[styles.tagHash, { color: colors.primary }]}>#</Text>
                        <Text style={[styles.tagText, { color: colors.textPrimary }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={[styles.journalSection, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.journalHeader}>
              <View style={styles.journalHeaderCopy}>
                <Text style={[styles.sectionTitle, styles.journalTitle, { color: colors.textPrimary }]}>Journal</Text>
                <View style={styles.privateLine}>
                  <LockKeyhole size={13} color={colors.lavender} />
                  <Text style={[styles.privateText, { color: colors.textMuted }]}>Personnel</Text>
                </View>
              </View>
              <Pressable
                onPress={openNewVisit}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.addVisitButton,
                  Shadows.hairline,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Plus size={15} color={colors.textOnPrimary} strokeWidth={2.4} />
                <Text style={[styles.addVisitText, { color: colors.textOnPrimary }]}>Noter une visite</Text>
              </Pressable>
            </View>

            {rememberedDishes.length ? (
              <View style={styles.rememberedSection}>
                <Text style={[styles.rememberedLabel, { color: colors.textMuted }]}>PLATS PRÉCÉDEMMENT TESTÉS</Text>
                <View style={styles.rememberedGrid}>
                  {rememberedDishes.map((dish) => (
                    <View
                      key={dish}
                      style={[
                        styles.rememberedChip,
                        Shadows.hairline,
                        { backgroundColor: isDark ? colors.surfaceAubergine : `${colors.primary}0D`, borderColor: isDark ? colors.border : `${colors.primary}18` },
                      ]}
                    >
                      <Text style={[styles.rememberedChipText, { color: colors.primary, fontFamily: FontFamily.medium }]}>
                        {dish}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {visits.length ? (
              <View style={styles.timeline}>
                {visits.map((visit) => (
                  <VisitEntry key={visit.id} visit={visit} />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyJournal, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                <Text style={[styles.emptyJournalTitle, { color: colors.textPrimary }]}>Aucune visite personnelle</Text>
                <Text style={[styles.emptyJournalText, { color: colors.textMuted }]}>Ajoutez un passage pour retrouver vos notes, vos plats et votre moyenne ici.</Text>
              </View>
            )}
          </View>

          {restaurant.location ? (
            <View style={[styles.locationSection, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <View style={styles.locationHeaderCopy}>
                  <MapPin size={18} color={colors.primary} />
                  <Text style={[styles.locationTitle, { color: colors.textPrimary }]}>Emplacement</Text>
                </View>
                <Pressable
                  onPress={openDirections}
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir l’itinéraire"
                  style={({ pressed }) => [styles.locationAction, { opacity: pressed ? 0.58 : 1 }]}
                >
                  <Text style={[styles.locationActionText, { color: colors.link }]}>Itinéraire</Text>
                  <Navigation2 size={14} color={colors.link} />
                </Pressable>
              </View>
              <MapView
                style={styles.detailMap}
                initialRegion={{
                  latitude: restaurant.location.latitude,
                  longitude: restaurant.location.longitude,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }}
                customMapStyle={isDark ? MINI_MAP_DARK_STYLE : undefined}
                userInterfaceStyle={isDark ? 'dark' : 'light'}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                toolbarEnabled={false}
                showsCompass={false}
                showsScale={false}
                showsBuildings={false}
              >
                <Marker
                  coordinate={{ latitude: restaurant.location.latitude, longitude: restaurant.location.longitude }}
                  tracksViewChanges={false}
                  accessibilityLabel={`Emplacement de ${restaurant.name}`}
                >
                  <View style={[styles.detailMarker, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                    <MapPin size={16} color={colors.textOnPrimary} fill={colors.textOnPrimary} />
                  </View>
                </Marker>
              </MapView>
              <Text style={[styles.locationAddress, { color: colors.textMuted }]} numberOfLines={2}>
                {restaurant.address || 'Position enregistrée'}
              </Text>
            </View>
          ) : null}

          {!imported ? (
            <>
              <View style={[styles.listStatus, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ListPlus size={18} color={colors.primary} />
                <Text style={[styles.listStatusText, { color: colors.textSecondary }]}>
                  {membership.size ? `Dans ${membership.size} liste${membership.size > 1 ? 's' : ''}` : 'Dans aucune liste'}
                </Text>
                <Pressable onPress={() => setListModalOpen(true)} style={({ pressed }) => [styles.listManageButton, { opacity: pressed ? 0.58 : 1 }]}>
                  <Text style={[styles.listManageText, { color: colors.link }]}>Gérer</Text>
                  <ChevronRight size={16} color={colors.link} />
                </Pressable>
              </View>
              <Pressable onPress={remove} style={({ pressed }) => [styles.deleteAction, { opacity: pressed ? 0.55 : 1 }]}>
                <Trash2 size={17} color={colors.danger} />
                <Text style={[styles.deleteText, { color: colors.danger }]}>Supprimer l’adresse</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal visible={galleryOpen} animationType="fade" onRequestClose={() => setGalleryOpen(false)}>
        <View style={[styles.galleryRoot, { backgroundColor: colors.background }]}>
          <FlatList
            data={restaurant.images}
            horizontal
            pagingEnabled
            initialScrollIndex={galleryIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            keyExtractor={(item, index) => `gallery-${item}-${index}`}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <Image source={item} style={{ width, height: '100%' }} contentFit="contain" />}
          />
          <View style={[styles.galleryTop, { top: insets.top + Spacing.sm }]}>
            <View style={styles.galleryCountBubble}>
              <Text style={styles.galleryCount}>{galleryIndex + 1}/{restaurant.images.length}</Text>
            </View>
            <Pressable onPress={() => setGalleryOpen(false)} style={styles.galleryClose} accessibilityLabel="Fermer les photos">
              <X size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={listModalOpen} transparent={false} presentationStyle="fullScreen" animationType="slide" statusBarTranslucent onRequestClose={() => setListModalOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.listModalSheet,
              {
                backgroundColor: colors.surface,
                paddingTop: insets.top,
              },
            ]}
          >
            <View style={styles.listModalHeader}>
              <View style={[styles.listModalHeaderIcon, { backgroundColor: isDark ? colors.surfaceLight : colors.surfaceLight }]}>
                <ListPlus size={22} color={colors.primary} />
              </View>
              <View style={styles.listModalHeaderCopy}>
                <Text style={[styles.listModalTitle, { color: colors.textPrimary }]}>Ajouter à mes listes</Text>
                <Text style={[styles.listModalSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
                  Choisissez où retrouver « {restaurant.name} ».
                </Text>
              </View>
              <Pressable onPress={() => setListModalOpen(false)} accessibilityLabel="Fermer" style={styles.topAction}>
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={[styles.listModalScroll, { backgroundColor: 'transparent' }]}
              contentContainerStyle={styles.listModalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.listModalSummary, Shadows.hairline, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.border }]}>
                <View style={styles.listModalSummaryCopy}>
                  <View style={styles.listModalSummaryHeading}>
                    <Sparkles size={16} color={colors.primary} />
                    <Text style={[styles.listModalSummaryLabel, { color: colors.textPrimary }]}>Sélection actuelle</Text>
                  </View>
                  <Text style={[styles.listModalSummaryDetail, { color: colors.textMuted }]}>
                    {membership.size ? `${membership.size} liste${membership.size !== 1 ? 's' : ''} sélectionnée${membership.size !== 1 ? 's' : ''}` : 'Aucune liste sélectionnée'}
                  </Text>
                </View>
                <View style={[styles.listModalCount, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.listModalCountText, { color: colors.textOnPrimary }]}>{membership.size}</Text>
                </View>
              </View>

              {collections.length ? collections.map((collection) => {
                const selected = membership.has(collection.id);
                const CollectionIcon = getCollectionIcon(collection.emoji);
                return (
                  <Pressable
                    key={collection.id}
                    onPress={() => toggleCollection(collection)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${selected ? 'Retirer de' : 'Ajouter à'} ${collection.name}`}
                    style={({ pressed }) => [
                      styles.collectionRow,
                      Shadows.hairline,
                      {
                        backgroundColor: selected ? (isDark ? colors.surfaceAubergine : `${colors.primary}10`) : colors.surface,
                        borderColor: selected ? colors.primary : colors.border,
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.collectionIcon, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                      <CollectionIcon size={20} color={selected ? colors.primary : colors.textSecondary} />
                    </View>
                    <View style={styles.collectionCopy}>
                      <Text style={[styles.collectionName, { color: selected ? colors.primary : colors.textPrimary }]}>{collection.name}</Text>
                      <Text style={[styles.collectionMeta, { color: colors.textMuted }]}>
                        {collection.restaurantIds.length} adresse{collection.restaurantIds.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {selected ? <Check size={14} color={colors.textOnPrimary} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              }) : (
                <View style={[styles.noListsPanel, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.border }]}>
                  <ListPlus size={22} color={colors.primary} />
                  <Text style={[styles.noListsTitle, { color: colors.textPrimary }]}>Aucune liste personnelle</Text>
                  <Text style={[styles.noLists, { color: colors.textMuted }]}>Créez d’abord une liste depuis l’onglet Listes.</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.listModalFooter, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.md }]}>
              <View style={styles.listModalFooterHintRow}>
                <Check size={14} color={colors.success} strokeWidth={2.5} />
                <Text style={[styles.listModalFooterHint, { color: colors.textMuted }]}>Enregistré automatiquement</Text>
              </View>
              <Pressable
                onPress={() => setListModalOpen(false)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.listModalDone,
                  Shadows.card,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <Text style={[styles.listModalDoneText, { color: colors.textOnPrimary }]}>Terminé</Text>
              </Pressable>
            </View>
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.bottomSafeAreaFill,
              { height: insets.bottom + 2, backgroundColor: colors.surface },
            ]}
          />
        </View>
      </Modal>

      <VisitFormModal
        visible={visitModalOpen}
        placeId={restaurant.placeId || restaurant.id}
        visit={editingVisit}
        onClose={() => setVisitModalOpen(false)}
      />
    </View>
  );

  function SummaryMetric({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
      <View style={styles.summaryMetric}>
        <Icon size={16} color={color} />
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
      </View>
    );
  }

  function VisitEntry({ visit }: { visit: Visit }) {
    return (
      <View style={[styles.visitEntry, Shadows.hairline, { backgroundColor: isDark ? colors.surfaceAubergine : colors.surfaceLight, borderColor: isDark ? colors.border : `${colors.primary}18` }]}>
        {/* Header: Date + Star + Action Icons */}
        <View style={styles.visitHeading}>
          <View style={styles.visitHeadingLeft}>
            <Text style={[styles.visitDate, { color: colors.textPrimary }]}>{formatVisitDate(visit.visitedAt)}</Text>
            {visit.rating != null ? (
              <View style={[styles.visitRatingPill, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.18)' : '#FFF9EB', borderColor: isDark ? 'rgba(217, 119, 6, 0.3)' : '#FDE68A' }]}>
                <Star size={11} color={colors.accentYellow} fill={colors.accentYellow} />
                <Text style={[styles.visitRatingText, { color: isDark ? '#FCD34D' : '#B45309' }]}>{visit.rating}/5</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.visitActions}>
            <Pressable
              onPress={() => openVisit(visit)}
              accessibilityRole="button"
              accessibilityLabel={`Modifier la visite du ${formatVisitDate(visit.visitedAt)}`}
              style={({ pressed }) => [styles.visitIconButton, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Pencil size={14} color={colors.textMuted} />
            </Pressable>
            <Pressable
              onPress={() => removeVisit(visit)}
              accessibilityRole="button"
              accessibilityLabel={`Supprimer la visite du ${formatVisitDate(visit.visitedAt)}`}
              style={({ pressed }) => [styles.visitIconButton, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Trash2 size={14} color={colors.danger} />
            </Pressable>
          </View>
        </View>

        {/* Lightweight metadata line */}
        {(visit.amount != null || visit.wouldReturn != null || visit.companions) ? (
          <View style={styles.visitMetaInlineRow}>
            {visit.amount != null ? (
              <Text style={[styles.visitMetaInlineItem, { color: colors.textPrimary, fontFamily: FontFamily.semiBold }]}>
                {formatAmount(visit.amount)}
              </Text>
            ) : null}
            {visit.amount != null && (visit.wouldReturn != null || visit.companions) ? (
              <Text style={{ color: colors.textMuted }}>·</Text>
            ) : null}
            {visit.wouldReturn != null ? (
              <Text style={[styles.visitMetaInlineItem, { color: visit.wouldReturn ? colors.success : colors.textMuted, fontFamily: FontFamily.medium }]}>
                {visit.wouldReturn ? '❤️ J’y retournerais' : '💔 Pas convaincu'}
              </Text>
            ) : null}
            {visit.wouldReturn != null && visit.companions ? (
              <Text style={{ color: colors.textMuted }}>·</Text>
            ) : null}
            {visit.companions ? (
              <Text style={[styles.visitMetaInlineItem, { color: colors.textSecondary }]}>
                Avec <Text style={{ color: colors.textPrimary, fontFamily: FontFamily.medium }}>{visit.companions}</Text>
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Dishes: clean white chips with same color for all */}
        {visit.dishes && visit.dishes.length ? (
          <View style={styles.dishesInlineWrap}>
            {visit.dishes.map((dish) => (
              <View
                key={dish}
                style={[
                  styles.dishItem,
                  Shadows.hairline,
                  { backgroundColor: colors.surface, borderColor: isDark ? colors.border : `${colors.primary}20` },
                ]}
              >
                <Text style={[styles.dishItemText, { color: colors.textPrimary, fontFamily: FontFamily.semiBold }]}>
                  {dish}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Notes (clean white card on the soft lavender card) */}
        {visit.notes ? (
          <View style={[styles.visitSimpleNoteBox, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : `${colors.primary}15` }]}>
            <Text style={[styles.visitSimpleNote, { color: colors.textPrimary }]}>
              {visit.notes}
            </Text>
          </View>
        ) : null}

        {/* Photos */}
        {visit.imageUris && visit.imageUris.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visitPhotos}>
            {visit.imageUris.map((uri) => (
              <Image key={uri} source={{ uri }} style={[styles.visitPhoto, { borderColor: colors.border }]} />
            ))}
          </ScrollView>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { minHeight: 50, paddingHorizontal: Spacing.sm, paddingBottom: 4, flexDirection: 'row', alignItems: 'center' },
  topAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: -0.2, textAlign: 'center' },
  hero: { position: 'relative' },
  heroImage: { height: 260 },
  artwork: { width: '100%', height: 240, borderWidth: 0, borderRadius: 0 },
  photoCounter: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    minWidth: 42,
    minHeight: 28,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  photoCounterText: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sourceRow: {
    minHeight: 60,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  sourceIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  sourceTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  sourceDetail: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  categoryLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.sm,
  },
  categoryText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.sm,
  },
  locationLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.xs - 1 },
  titleWrap: { marginTop: Spacing.md + 2 },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.7,
  },
  addressLine: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  address: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.sm - 0.5, lineHeight: 19 },
  actionRow: { marginTop: Spacing.lg, flexDirection: 'row', gap: Spacing.sm },
  routeAction: {
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: BorderRadius.button,
  },
  routeActionText: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, letterSpacing: 0.1 },
  secondaryAction: {
    minHeight: 46,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
  },
  secondaryActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  summary: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  summaryMetric: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  summaryLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  summaryValue: { maxWidth: '100%', fontFamily: FontFamily.bold, fontSize: FontSize.sm },
  featuredDishBand: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  featuredDishEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs - 1,
    letterSpacing: 0.96,
  },
  featuredDishesWrap: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featuredDishItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BorderRadius.sm,
  },
  featuredDishTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  aboutCard: {
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  aboutBlock: {
    gap: Spacing.xs,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 2,
  },
  aboutTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    letterSpacing: -0.2,
  },
  aboutBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm + 1,
    lineHeight: 22,
  },
  aboutDivider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  tagsBlock: {
    gap: Spacing.sm,
  },
  tagsSectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs - 1,
    letterSpacing: 0.9,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  tagHash: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  tagText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: -0.2 },
  journalSection: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  journalHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md },
  journalHeaderCopy: { flex: 1, minWidth: 120 },
  journalTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: -0.2, marginBottom: 0 },
  privateLine: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  privateText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  addVisitButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
  },
  addVisitText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  rememberedSection: {
    marginTop: Spacing.lg,
    paddingBottom: 4,
  },
  rememberedLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs - 1,
    letterSpacing: 0.85,
  },
  rememberedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  rememberedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  rememberedChipText: {
    fontSize: FontSize.xs,
  },
  timeline: { marginTop: Spacing.lg, gap: Spacing.lg },
  visitEntry: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  visitHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  visitHeadingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visitDate: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, letterSpacing: -0.2 },
  visitRatingPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.sm },
  visitRatingText: { fontFamily: FontFamily.bold, fontSize: 11 },
  visitActions: { flexDirection: 'row', gap: 2 },
  visitIconButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  visitMetaInlineRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  visitMetaInlineItem: { fontSize: FontSize.xs },
  dishesInlineWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 },
  dishItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderRadius: BorderRadius.sm },
  dishItemText: { fontSize: 11 },
  visitSimpleNoteBox: { marginTop: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.md },
  visitSimpleNote: { fontFamily: FontFamily.regular, fontSize: FontSize.xs + 1, lineHeight: 19 },
  visitPhotos: { marginTop: 8, gap: 8 },
  visitPhoto: { width: 80, height: 60, borderRadius: BorderRadius.md, borderWidth: 1 },
  emptyJournal: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  emptyJournalTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  emptyJournalText: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  locationSection: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  locationHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  locationHeaderCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  locationTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.md },
  locationAction: { minHeight: 40, paddingHorizontal: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  detailMap: { width: '100%', height: 140, marginTop: Spacing.md, borderRadius: BorderRadius.md, overflow: 'hidden' },
  detailMarker: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 16 },
  locationAddress: { marginTop: Spacing.sm, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  listStatus: {
    minHeight: 56,
    marginTop: Spacing.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  listStatusText: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  listManageButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 2 },
  listManageText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  deleteAction: { minHeight: 48, marginTop: Spacing.xl, paddingHorizontal: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  deleteText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  modalRoot: { flex: 1 },
  bottomSafeAreaFill: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  listModalSheet: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  listModalHeader: {
    minHeight: 80,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  listModalHeaderIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  listModalHeaderCopy: { flex: 1, minWidth: 0 },
  listModalTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, lineHeight: 28, letterSpacing: -0.3 },
  listModalSubtitle: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 17 },
  listModalScroll: { flex: 1 },
  listModalContent: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  listModalSummary: {
    minHeight: 60,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  listModalSummaryCopy: { flex: 1, minWidth: 0 },
  listModalSummaryHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  listModalSummaryLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  listModalSummaryDetail: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  listModalCount: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  listModalCountText: { fontFamily: FontFamily.bold, fontSize: FontSize.sm },
  collectionRow: {
    minHeight: 72,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  collectionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  collectionCopy: { flex: 1, minWidth: 0 },
  collectionName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  collectionMeta: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  checkbox: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: BorderRadius.sm },
  noListsPanel: { marginTop: Spacing.lg, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.lg },
  noListsTitle: { marginTop: Spacing.sm, fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  noLists: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21, textAlign: 'center' },
  listModalFooter: { paddingTop: Spacing.md, paddingHorizontal: Spacing.xl },
  listModalFooterHintRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  listModalFooterHint: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, textAlign: 'center' },
  listModalDone: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.button },
  listModalDoneText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: 0.1 },
  galleryRoot: { flex: 1, justifyContent: 'center' },
  galleryTop: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  galleryCountBubble: { minWidth: 52, height: 32, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.48)', borderRadius: BorderRadius.sm },
  galleryCount: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, textAlign: 'center' },
  galleryClose: { position: 'absolute', right: 0, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.48)', borderRadius: BorderRadius.sm },
});
