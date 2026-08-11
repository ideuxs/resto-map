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
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  UsersRound,
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
import { Utensils } from '../components/FlaticonIcon';

type Props = { route: any; navigation: any };

function formatVisitDate(value: string) {
  return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

const MINI_MAP_DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#17121E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#C9A5DF' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#100D18' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#332940' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#49385B' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#171D38' }] },
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
  const lastVisit = visits[0];
  const rememberedDishes = Array.from(new Set(
    visits.flatMap((visit) => visit.dishes.map((dish) => dish.trim()).filter(Boolean))
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
      <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: colors.background, borderColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={styles.topAction}>
          <ArrowLeft size={23} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>{restaurant.name}</Text>
        {!imported ? (
          <Pressable onPress={() => navigation.navigate('AddRestaurant', { restaurant })} accessibilityLabel="Modifier" style={styles.topAction}>
            <Pencil size={21} color={colors.textPrimary} />
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
            <Pressable onPress={openSourceList} style={({ pressed }) => [styles.sourceRow, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary, opacity: pressed ? 0.66 : 1 }]}>
              <View style={[styles.sourceIcon, { backgroundColor: `${sourceColor}18` }]}>
                <UsersRound size={20} color={sourceColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sourceTitle, { color: sourceColor }]}>{imported ? 'Partagée par' : 'Aussi recommandé par'} {friendSource.ownerName || 'un ami'}</Text>
                <Text style={[styles.sourceDetail, { color: colors.textMuted }]}>{imported ? 'Adresse importée' : 'Votre adresse reste personnelle'} · ouvrir la liste</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <View style={styles.categoryLine}>
            <CategoryIcon size={17} color={category.color} />
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{category.label}</Text>
            {restaurant.location ? <Text style={[styles.locationLabel, { color: colors.accent }]}>Géolocalisé</Text> : null}
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{restaurant.name}</Text>
          {restaurant.address ? (
            <View style={styles.addressLine}>
              <MapPin size={17} color={colors.textMuted} />
              <Text style={[styles.address, { color: colors.textSecondary }]}>{restaurant.address}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable onPress={openDirections} disabled={!restaurant.location} style={({ pressed }) => [styles.routeAction, { backgroundColor: colors.accent, opacity: !restaurant.location ? 0.4 : pressed ? 0.72 : 1 }]}>
              <Navigation2 size={17} color={colors.textOnAccent} />
              <Text style={[styles.routeActionText, { color: colors.textOnAccent }]}>Itinéraire</Text>
            </Pressable>
            {!imported ? (
              <Pressable onPress={() => setListModalOpen(true)} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border, opacity: pressed ? 0.62 : 1 }]}>
                <ListPlus size={17} color={colors.accent} />
                <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>Listes</Text>
              </Pressable>
            ) : null}
          </View>

            <View style={[styles.summary, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
            <SummaryMetric label="Ma note" value={averageRating != null ? `${averageRating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}/5` : '—'} icon={Star} color={colors.accentYellow} />
            <SummaryMetric label="Visites" value={String(visits.length)} icon={CalendarDays} color={colors.accent} />
            <SummaryMetric label="Budget" value={priceBandLabel(restaurant) || 'Non renseigné'} icon={Star} color={colors.accentYellow} />
          </View>

          <View style={[styles.journalSection, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
            <View style={styles.journalHeader}>
              <View style={styles.journalHeaderCopy}>
                <Text style={[styles.sectionTitle, styles.journalTitle, { color: colors.textPrimary }]}>Journal</Text>
                <View style={styles.privateLine}>
                  <LockKeyhole size={14} color={colors.textMuted} />
                  <Text style={[styles.privateText, { color: colors.textMuted }]}>Personnel · jamais partagé</Text>
                </View>
              </View>
              <Pressable
                onPress={openNewVisit}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.addVisitButton,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.72 : 1 },
                ]}
              >
                <Plus size={18} color={colors.textOnAccent} />
                <Text style={[styles.addVisitText, { color: colors.textOnAccent }]}>Noter une visite</Text>
              </Pressable>
            </View>

            {rememberedDishes.length ? (
              <View style={[styles.rememberedRow, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.rememberedLabel, { color: colors.textPrimary }]}>Plats mémorisés</Text>
                <Text style={[styles.rememberedText, { color: colors.textSecondary }]}>
                  {rememberedDishes.slice(0, 6).join(' · ')}
                  {rememberedDishes.length > 6 ? ` · +${rememberedDishes.length - 6}` : ''}
                </Text>
              </View>
            ) : null}

            {visits.length ? (
              <View style={styles.timeline}>
                {visits.map((visit) => (
                  <VisitEntry key={visit.id} visit={visit} />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyJournal, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.emptyJournalTitle, { color: colors.textPrimary }]}>Aucune visite personnelle</Text>
                <Text style={[styles.emptyJournalText, { color: colors.textMuted }]}>Ajoutez un passage pour retrouver vos notes, vos plats et votre moyenne ici.</Text>
              </View>
            )}
          </View>

          {restaurant.signatureDish || restaurant.description || restaurant.tags?.length ? (
            <View style={[styles.section, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
              {restaurant.description ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>À propos</Text>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>{restaurant.description}</Text>
                </>
              ) : null}
              {restaurant.signatureDish ? (
                <View style={restaurant.description ? styles.sectionSubsection : undefined}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Plat à retenir</Text>
                  <Text style={[styles.body, { color: colors.textPrimary }]}>{restaurant.signatureDish}</Text>
                </View>
              ) : null}
              {restaurant.tags?.length ? (
                <View style={restaurant.description || restaurant.signatureDish ? styles.sectionSubsection : undefined}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tags</Text>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>{restaurant.tags.join(' · ')}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {restaurant.location ? (
            <View style={[styles.locationSection, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
              <View style={styles.locationHeader}>
                <View style={styles.locationHeaderCopy}>
                  <MapPin size={18} color={colors.accent} />
                  <Text style={[styles.locationTitle, { color: colors.textPrimary }]}>Emplacement</Text>
                </View>
                <Pressable
                  onPress={openDirections}
                  accessibilityRole="button"
                  accessibilityLabel="Ouvrir l’itinéraire"
                  style={({ pressed }) => [styles.locationAction, { opacity: pressed ? 0.58 : 1 }]}
                >
                  <Text style={[styles.locationActionText, { color: colors.accent }]}>Itinéraire</Text>
                  <Navigation2 size={15} color={colors.accent} />
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
                  <View style={[styles.detailMarker, { backgroundColor: colors.accentPink, borderColor: colors.surface }]}>
                    <MapPin size={17} color={colors.textOnAccent} fill={colors.textOnAccent} />
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
              <View style={[styles.listStatus, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
                <ListPlus size={18} color={colors.accent} />
                <Text style={[styles.listStatusText, { color: colors.textSecondary }]}>{membership.size ? `Dans ${membership.size} liste${membership.size > 1 ? 's' : ''}` : 'Dans aucune liste'}</Text>
                <Pressable onPress={() => setListModalOpen(true)} style={({ pressed }) => [styles.listManageButton, { opacity: pressed ? 0.58 : 1 }]}>
                  <Text style={[styles.listManageText, { color: colors.accent }]}>Gérer</Text>
                  <ChevronRight size={16} color={colors.accent} />
                </Pressable>
              </View>
              <Pressable onPress={remove} style={({ pressed }) => [styles.deleteAction, { borderTopColor: colors.border, opacity: pressed ? 0.55 : 1 }]}>
                <Trash2 size={18} color={colors.danger} />
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
              <X size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={listModalOpen} transparent={false} presentationStyle="fullScreen" animationType="slide" statusBarTranslucent onRequestClose={() => setListModalOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.listModalSheet,
              {
                backgroundColor: colors.background,
                paddingTop: insets.top,
              },
            ]}
          >
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <View style={[styles.listModalBackdropShape, styles.listModalBackdropPink, { backgroundColor: `${colors.accentPink}18` }]} />
              <View style={[styles.listModalBackdropShape, styles.listModalBackdropIndigo, { backgroundColor: `${colors.accent}16` }]} />
              <View style={[styles.listModalBackdropStamp, { borderColor: `${colors.textPrimary}12` }]} />
            </View>

            <View style={styles.listModalHeader}>
              <View style={[styles.listModalHeaderIcon, { backgroundColor: `${colors.accentPink}18`, borderColor: colors.textPrimary }]}>
                <ListPlus size={24} color={colors.accentPink} />
              </View>
              <View style={styles.listModalHeaderCopy}>
                <Text style={[styles.listModalTitle, { color: colors.textPrimary }]}>Ajouter à mes listes</Text>
                <Text style={[styles.listModalSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
                  Choisissez où retrouver « {restaurant.name} ».
                </Text>
              </View>
              <Pressable onPress={() => setListModalOpen(false)} accessibilityLabel="Fermer" style={styles.topAction}>
                <X size={22} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView
              style={[styles.listModalScroll, { backgroundColor: 'transparent' }]}
              contentContainerStyle={[styles.listModalContent, { backgroundColor: 'transparent' }]}
              bounces={false}
              alwaysBounceVertical={false}
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustContentInsets={false}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.listModalSummary, Shadows.surface, { backgroundColor: `${colors.accentPink}12`, borderColor: colors.textPrimary }]}>
                <View style={styles.listModalSummaryCopy}>
                  <View style={styles.listModalSummaryHeading}>
                    <Sparkles size={16} color={colors.accentPink} />
                    <Text style={[styles.listModalSummaryLabel, { color: colors.textPrimary }]}>Sélection actuelle</Text>
                  </View>
                  <Text style={[styles.listModalSummaryDetail, { color: colors.textMuted }]}>
                    {membership.size ? `${membership.size} liste${membership.size !== 1 ? 's' : ''} sélectionnée${membership.size !== 1 ? 's' : ''}` : 'Aucune liste sélectionnée'}
                  </Text>
                </View>
                <View style={[styles.listModalCount, { backgroundColor: membership.size ? colors.accentPink : colors.surface, borderColor: colors.textPrimary }]}>
                  <Text style={[styles.listModalCountText, { color: membership.size ? colors.textOnAccent : colors.accentPink }]}>{membership.size}</Text>
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
                      Shadows.surface,
                      {
                        backgroundColor: selected ? `${colors.accent}16` : colors.surface,
                        borderColor: selected ? colors.accent : colors.textPrimary,
                        opacity: pressed ? 0.62 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.collectionIcon, { backgroundColor: selected ? `${colors.accent}12` : colors.surfaceLight, borderColor: selected ? colors.accent : colors.textPrimary }]}>
                      <CollectionIcon size={20} color={selected ? colors.accent : colors.textSecondary} />
                    </View>
                    <View style={styles.collectionCopy}>
                      <Text style={[styles.collectionName, { color: selected ? colors.accent : colors.textPrimary }]}>{collection.name}</Text>
                      <Text style={[styles.collectionMeta, { color: colors.textMuted }]}>
                        {collection.restaurantIds.length} adresse{collection.restaurantIds.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={[styles.checkbox, { borderColor: selected ? colors.accent : colors.textPrimary, backgroundColor: selected ? colors.accent : colors.surface }]}>
                      {selected ? <Check size={15} color={colors.textOnAccent} strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              }) : (
                <View style={[styles.noListsPanel, Shadows.surface, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
                  <ListPlus size={22} color={colors.accent} />
                  <Text style={[styles.noListsTitle, { color: colors.textPrimary }]}>Aucune liste personnelle</Text>
                  <Text style={[styles.noLists, { color: colors.textMuted }]}>Créez d’abord une liste depuis l’onglet Listes.</Text>
                </View>
              )}

            </ScrollView>
            <View style={[styles.listModalFooter, { backgroundColor: colors.background, paddingBottom: insets.bottom + Spacing.md }]}>
              <View style={styles.listModalFooterHintRow}>
                <Check size={15} color={colors.accentPink} strokeWidth={3} />
                <Text style={[styles.listModalFooterHint, { color: colors.textMuted }]}>Enregistré automatiquement</Text>
              </View>
              <Pressable
                onPress={() => setListModalOpen(false)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.listModalDone, Shadows.hard, { backgroundColor: colors.accent, borderColor: colors.textPrimary, opacity: pressed ? 0.72 : 1 }]}
              >
                <Text style={[styles.listModalDoneText, { color: colors.textOnAccent }]}>Terminé</Text>
              </Pressable>
            </View>
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.bottomSafeAreaFill,
              { height: insets.bottom + 2, backgroundColor: colors.background },
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
      <View style={[
        styles.visitEntry,
        {
          backgroundColor: colors.surfaceLight,
        },
      ]}>
        <View style={[styles.timelineDot, { backgroundColor: colors.accentPink, borderColor: colors.background }]} />
        <View style={styles.visitHeading}>
          <View style={styles.visitHeadingCopy}>
            <Text style={[styles.visitDate, { color: colors.textPrimary }]}>{formatVisitDate(visit.visitedAt)}</Text>
            {visit.dateIsEstimated ? <Text style={[styles.estimatedDate, { color: colors.textMuted }]}>Date approximative</Text> : null}
          </View>
          <View style={styles.visitActions}>
            <Pressable
              onPress={() => openVisit(visit)}
              accessibilityRole="button"
              accessibilityLabel={`Modifier la visite du ${formatVisitDate(visit.visitedAt)}`}
              style={({ pressed }) => [styles.visitIconButton, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Pencil size={17} color={colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => removeVisit(visit)}
              accessibilityRole="button"
              accessibilityLabel={`Supprimer la visite du ${formatVisitDate(visit.visitedAt)}`}
              style={({ pressed }) => [styles.visitIconButton, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Trash2 size={17} color={colors.danger} />
            </Pressable>
          </View>
        </View>

        <View style={styles.visitMetaRow}>
          {visit.rating != null ? (
            <View style={styles.visitMeta}>
              <Star size={15} color={colors.accentYellow} fill={colors.accentYellow} />
              <Text style={[styles.visitMetaText, { color: colors.textSecondary }]}>{visit.rating}/5</Text>
            </View>
          ) : null}
          {visit.wouldReturn != null ? (
            <View style={styles.visitMeta}>
              <Heart size={15} color={visit.wouldReturn ? colors.accentGreen : colors.textMuted} />
              <Text style={[styles.visitMetaText, { color: colors.textSecondary }]}>
                {visit.wouldReturn ? 'J’y retournerais' : 'Je n’y retournerais pas'}
              </Text>
            </View>
          ) : null}
          {visit.amount != null ? (
            <View style={styles.visitMeta}>
              <Star size={15} color={colors.accentYellow} fill={colors.accentYellow} />
              <Text style={[styles.visitMetaText, { color: colors.textSecondary }]}>{formatAmount(visit.amount)}</Text>
            </View>
          ) : null}
        </View>

        {visit.dishes.length ? (
          <Text style={[styles.visitDetail, { color: colors.textSecondary }]}>
            <Text style={[styles.visitDetailLabel, { color: colors.textPrimary }]}>Plats · </Text>{visit.dishes.join(', ')}
          </Text>
        ) : null}
        {visit.companions ? (
          <Text style={[styles.visitDetail, { color: colors.textSecondary }]}>
            <Text style={[styles.visitDetailLabel, { color: colors.textPrimary }]}>Avec · </Text>{visit.companions}
          </Text>
        ) : null}
        {visit.notes ? <Text style={[styles.visitNotes, { color: colors.textSecondary }]}>{visit.notes}</Text> : null}
        {visit.imageUris.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.visitPhotos}>
            {visit.imageUris.map((uri) => <Image key={uri} source={{ uri }} style={styles.visitPhoto} />)}
          </ScrollView>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { minHeight: 54, paddingHorizontal: Spacing.sm, paddingBottom: 5, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 0 },
  topAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, paddingBottom: 12, fontFamily: FontFamily.semiBold, fontSize: FontSize.md, textAlign: 'center' },
  hero: { position: 'relative' },
  heroImage: { height: 260 },
  artwork: { width: '100%', height: 260, borderWidth: 0, borderRadius: 0 },
  photoCounter: { position: 'absolute', right: Spacing.md, bottom: Spacing.md, minWidth: 42, minHeight: 28, paddingHorizontal: Spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.full },
  photoCounterText: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  sourceRow: { minHeight: 64, marginBottom: Spacing.lg, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: 12 },
  sourceIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  sourceTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  sourceDetail: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  categoryLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  categoryText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  locationLabel: { marginLeft: 'auto', fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  title: { marginTop: Spacing.sm, fontFamily: FontFamily.semiBold, fontSize: FontSize.xxl, lineHeight: 34, letterSpacing: -0.8 },
  addressLine: { marginTop: Spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  address: { flex: 1, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21 },
  actionRow: { marginTop: Spacing.xl, flexDirection: 'row', gap: Spacing.sm },
  routeAction: { minHeight: 44, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: BorderRadius.md },
  routeActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  secondaryAction: { minHeight: 44, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: BorderRadius.md },
  secondaryActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  summary: { marginTop: Spacing.xl, padding: Spacing.md, flexDirection: 'row', borderWidth: 1.5, borderRadius: 12 },
  summaryMetric: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  summaryLabel: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  summaryValue: { maxWidth: '100%', fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  section: { marginTop: Spacing.xxl, padding: Spacing.lg, borderWidth: 1.5, borderRadius: 12 },
  sectionSubsection: { marginTop: Spacing.xl },
  sectionTitle: { marginBottom: Spacing.sm, fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  body: { fontFamily: FontFamily.regular, fontSize: FontSize.md, lineHeight: 24 },
  journalSection: { marginTop: Spacing.xxxl, padding: Spacing.lg, borderWidth: 1.5, borderRadius: 12 },
  journalHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.md },
  journalHeaderCopy: { flex: 1, minWidth: 120 },
  journalTitle: { marginBottom: 0 },
  privateLine: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  privateText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  addVisitButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: BorderRadius.md,
  },
  addVisitText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, textAlign: 'center' },
  rememberedRow: {
    marginTop: Spacing.xl,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.hairline,
  },
  rememberedLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  rememberedText: { marginTop: 5, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21 },
  timeline: { marginTop: Spacing.xl, gap: Spacing.sm },
  visitEntry: {
    position: 'relative',
    minHeight: 72,
    padding: Spacing.md,
    paddingLeft: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.hairline,
  },
  timelineDot: {
    position: 'absolute',
    top: 20,
    left: 8,
    width: 9,
    height: 9,
    borderWidth: 2,
    borderRadius: BorderRadius.full,
  },
  visitHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  visitHeadingCopy: { flex: 1, minHeight: 44, justifyContent: 'center' },
  visitDate: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, lineHeight: 22 },
  estimatedDate: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  visitActions: { flexDirection: 'row' },
  visitIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  visitMetaRow: { marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  visitMeta: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 5 },
  visitMetaText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  visitDetail: { marginTop: Spacing.sm, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21 },
  visitDetailLabel: { fontFamily: FontFamily.semiBold },
  visitNotes: { marginTop: Spacing.sm, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 22 },
  visitPhotos: { marginTop: Spacing.md, gap: Spacing.sm },
  visitPhoto: { width: 104, height: 78, borderRadius: BorderRadius.md },
  emptyJournal: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  emptyJournalTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  emptyJournalText: { marginTop: 5, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21 },
  locationSection: { marginTop: Spacing.xxxl, padding: Spacing.lg, borderWidth: 1.5, borderRadius: 12 },
  locationHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  locationHeaderCopy: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  locationTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  locationAction: { minHeight: 44, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  detailMap: { width: '100%', height: 148, marginTop: Spacing.md, borderRadius: 10, overflow: 'hidden' },
  detailMarker: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderRadius: 18 },
  locationAddress: { marginTop: Spacing.sm, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  listStatus: { minHeight: 64, marginTop: Spacing.xxxl, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderRadius: 12 },
  listStatusText: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  listManageButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  listManageText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  deleteAction: { minHeight: 52, marginTop: Spacing.xxl, paddingHorizontal: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
  listModalBackdropShape: { position: 'absolute', overflow: 'hidden' },
  listModalBackdropPink: {
    top: 174,
    right: -118,
    width: 252,
    height: 252,
    borderRadius: 28,
    transform: [{ rotate: '14deg' }],
  },
  listModalBackdropIndigo: {
    bottom: 104,
    left: -104,
    width: 190,
    height: 190,
    borderRadius: 24,
    transform: [{ rotate: '-18deg' }],
  },
  listModalBackdropStamp: {
    position: 'absolute',
    top: 360,
    right: 28,
    width: 74,
    height: 74,
    borderWidth: 2,
    borderRadius: 18,
    transform: [{ rotate: '-12deg' }],
  },
  listModalHeader: {
    minHeight: 108,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  listModalHeaderIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },
  listModalHeaderCopy: { flex: 1, minWidth: 0 },
  listModalTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xl, lineHeight: 29 },
  listModalSubtitle: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  listModalScroll: { flex: 1 },
  listModalContent: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },
  listModalSummary: {
    minHeight: 68,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 14,
  },
  listModalSummaryCopy: { flex: 1, minWidth: 0 },
  listModalSummaryHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  listModalSummaryLabel: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  listModalSummaryDetail: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  listModalCount: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
  },
  listModalCountText: { fontFamily: FontFamily.bold, fontSize: FontSize.sm },
  collectionRow: {
    minHeight: 84,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderRadius: 14,
  },
  collectionIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 12 },
  collectionCopy: { flex: 1, minWidth: 0 },
  collectionName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  collectionMeta: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  checkbox: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 10 },
  noListsPanel: { marginTop: Spacing.lg, padding: Spacing.xl, alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  noListsTitle: { marginTop: Spacing.sm, fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  noLists: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21, textAlign: 'center' },
  listModalFooter: { paddingTop: Spacing.md, paddingHorizontal: Spacing.xl },
  listModalFooterHintRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  listModalFooterHint: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, textAlign: 'center' },
  listModalDone: { minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 12 },
  listModalDoneText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  galleryRoot: { flex: 1, justifyContent: 'center' },
  galleryTop: { position: 'absolute', left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  galleryCountBubble: { minWidth: 52, height: 32, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.48)', borderRadius: BorderRadius.full },
  galleryCount: { color: '#FFFFFF', fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, textAlign: 'center' },
  galleryClose: { position: 'absolute', right: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.48)', borderRadius: BorderRadius.full },
});
