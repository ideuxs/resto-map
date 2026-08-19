import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Share2,
  Trash2,
  UsersRound,
  X,
} from '../components/FlaticonIcon';
import * as Linking from 'expo-linking';
import LZString from 'lz-string';
import { Image } from 'expo-image';

import { Collection, CollectionsStackParamList, Restaurant } from '../types';
import {
  addCollectionsChangeListener,
  addRestaurantsChangeListener,
  deleteCollection,
  createSharedCollectionPayload,
  getCollections,
  getLocalShareOwner,
  getRestaurants,
  saveCollection,
  setLocalShareOwnerName,
  setCollectionVisibility,
} from '../storage/storage';
import { getCollectionIcon } from '../constants/collectionIcons';
import RestaurantCard from '../components/RestaurantCard';
import CollectionFormModal from '../components/CollectionFormModal';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, getSourceColor, isSourceColorKey, Shadows, sourceColorKeyFor, Spacing } from '../constants/theme';
import { BookMarked } from '../components/FlaticonIcon';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'CollectionDetail'>;

export default function CollectionDetailScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareName, setShareName] = useState('');
  const [shareNameTouched, setShareNameTouched] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    const [allCollections, allRestaurants] = await Promise.all([getCollections(), getRestaurants()]);
    const selected = allCollections.find((item) => item.id === route.params.collectionId) || null;
    setCollection(selected);
    setRestaurants(selected
      ? selected.restaurantIds.map((id) => allRestaurants.find((item) => item.id === id)).filter(Boolean) as Restaurant[]
      : []);
  }, [route.params.collectionId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const offCollections = addCollectionsChangeListener(load);
    const offRestaurants = addRestaurantsChangeListener(load);
    return () => { offCollections(); offRestaurants(); };
  }, [load]);

  const removeCollection = () => {
    if (!collection) return;
    const imported = collection.kind === 'imported';
    Alert.alert(
      imported ? 'Supprimer la liste importée ?' : 'Supprimer cette liste ?',
      imported
        ? `Les ${collection.restaurantIds.length} adresses importées avec « ${collection.name} » seront aussi supprimées.`
        : 'Les restaurants resteront dans votre carnet.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(collection.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const editCollection = async (data: { name: string; emoji: string; description: string; imageUri?: string }) => {
    if (!collection) return;
    await saveCollection({ ...collection, name: data.name, emoji: data.emoji, description: data.description || undefined, imageUri: data.imageUri });
    setEditOpen(false);
  };

  const openShareModal = async () => {
    const owner = await getLocalShareOwner();
    setShareName(owner.displayName === 'un ami' ? '' : owner.displayName);
    setShareNameTouched(false);
    setShareOpen(true);
  };

  const shareCollection = async () => {
    if (!collection || collection.kind === 'imported' || sharing) return;
    const normalizedName = shareName.trim();
    setShareNameTouched(true);
    if (!normalizedName) return;

    Keyboard.dismiss();
    setSharing(true);
    try {
      const owner = await setLocalShareOwnerName(normalizedName);
      const payload = await createSharedCollectionPayload(collection.id, owner);
      const url = Linking.createURL('share', {
        queryParams: { s: LZString.compressToEncodedURIComponent(JSON.stringify(payload)) },
      });
      await Share.share({ message: `Ma liste « ${collection.name} » sur RestoHub\n${url}`, url });
      setShareOpen(false);
    } catch {
      Alert.alert('Partage impossible', 'Le lien n’a pas pu être généré. Réessayez dans un instant.');
    } finally {
      setSharing(false);
    }
  };

  if (!collection) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState icon={BookMarked} title="Liste introuvable" subtitle="Elle a peut-être été supprimée." actionLabel="Retour" onAction={() => navigation.goBack()} />
      </View>
    );
  }

  const imported = collection.kind === 'imported';
  const sourceKey = isSourceColorKey(collection.sourceColorKey)
    ? collection.sourceColorKey
    : sourceColorKeyFor(collection.ownerId || collection.ownerName || collection.id);
  const sourceColor = getSourceColor(sourceKey, isDark ? 'dark' : 'light');
  const Icon = getCollectionIcon(collection.emoji);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={styles.topAction}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>{collection.name}</Text>
        {!imported ? (
          <Pressable onPress={openShareModal} accessibilityRole="button" accessibilityLabel="Partager la liste" style={styles.topAction}>
            <Share2 size={20} color={colors.textPrimary} />
          </Pressable>
        ) : <View style={styles.topAction} />}
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={index === 0 ? styles.firstRestaurant : undefined}>
            <RestaurantCard variant="collection" restaurant={item} onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })} />
          </View>
        )}
        ListHeaderComponent={(
          <View style={[styles.header, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.collectionIcon, { backgroundColor: imported ? (isDark ? colors.surfaceLight : `${sourceColor}15`) : (isDark ? colors.surfaceLight : colors.surfaceLight), borderColor: imported ? `${sourceColor}40` : colors.border }]}>
              {collection.imageUri ? (
                <Image source={{ uri: collection.imageUri }} style={styles.collectionImage} contentFit="cover" />
              ) : (
                <Icon size={28} color={imported ? sourceColor : colors.primary} strokeWidth={2} />
              )}
            </View>
            {imported ? (
              <View style={styles.ownerRow}>
                <UsersRound size={14} color={sourceColor} />
                <Text style={[styles.owner, { color: sourceColor }]}>Partagée par {collection.ownerName || 'un ami'}</Text>
              </View>
            ) : null}
            <Text style={[styles.title, { color: colors.textPrimary }]}>{collection.name}</Text>
            {collection.description ? <Text style={[styles.description, { color: colors.textSecondary }]}>{collection.description}</Text> : null}
            <Text style={[styles.count, { color: colors.textMuted }]}>{restaurants.length} adresse{restaurants.length !== 1 ? 's' : ''}</Text>

            {imported ? (
              <Pressable
                onPress={() => setCollectionVisibility(collection.id, collection.isVisible === false)}
                accessibilityRole="switch"
                accessibilityState={{ checked: collection.isVisible !== false }}
                style={({ pressed }) => [
                  styles.visibilityRow,
                  Shadows.hairline,
                  {
                    backgroundColor: isDark ? colors.surfaceLight : colors.background,
                    borderColor: colors.border,
                    opacity: pressed ? 0.65 : 1,
                  },
                ]}
              >
                {collection.isVisible === false ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={sourceColor} />}
                <View style={styles.visibilityCopy}>
                  <Text style={[styles.visibilityTitle, { color: colors.textPrimary }]}>
                    {collection.isVisible === false ? 'Afficher dans Restos et Carte' : 'Visible dans Restos et Carte'}
                  </Text>
                  <Text style={[styles.visibilityDetail, { color: colors.textMuted }]}>Masquer ne supprime aucune donnée.</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => navigation.navigate('AddRestaurant', { collectionId: collection.id })}
                style={({ pressed }) => [
                  styles.addAddress,
                  Shadows.card,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <Plus size={16} color={colors.textOnPrimary} />
                <Text style={[styles.addAddressText, { color: colors.textOnPrimary }]}>Ajouter une adresse</Text>
              </Pressable>
            )}

            <View style={styles.collectionActions}>
              {!imported ? (
                <Pressable
                  onPress={() => setEditOpen(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.collectionAction,
                    { borderColor: colors.border, backgroundColor: isDark ? colors.surfaceLight : colors.background, opacity: pressed ? 0.65 : 1 },
                  ]}
                >
                  <Pencil size={16} color={colors.textSecondary} />
                  <Text style={[styles.collectionActionText, { color: colors.textSecondary }]}>Modifier</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={removeCollection}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.collectionAction,
                  styles.collectionDeleteAction,
                  { borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}10`, opacity: pressed ? 0.65 : 1 },
                ]}
              >
                <Trash2 size={16} color={colors.danger} />
                <Text style={[styles.collectionActionText, { color: colors.danger }]}>Supprimer</Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Adresses</Text>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon={BookMarked} title="Cette liste est vide" subtitle={imported ? 'Aucune adresse n’était incluse dans le partage.' : 'Ajoutez une adresse directement dans cette liste.'} />}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      />

      <CollectionFormModal visible={editOpen} collection={collection} onClose={() => setEditOpen(false)} onSave={editCollection} />
      <Modal
        visible={shareOpen}
        transparent
        presentationStyle="overFullScreen"
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => { if (!sharing) setShareOpen(false); }}
      >
        <KeyboardAvoidingView
          style={styles.shareModalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]}
            onPress={() => { if (!sharing) setShareOpen(false); }}
          />
          <View style={[styles.shareSheet, Shadows.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.shareSheetBody}>
              <View style={styles.shareSheetHeader}>
                <View style={styles.shareSheetCopy}>
                  <Text style={[styles.shareSheetTitle, { color: colors.textPrimary }]}>Partager cette liste</Text>
                  <Text style={[styles.shareSheetSubtitle, { color: colors.textMuted }]}>Votre prénom sera visible chez la personne qui l’importera.</Text>
                </View>
                <Pressable
                  onPress={() => setShareOpen(false)}
                  disabled={sharing}
                  accessibilityRole="button"
                  accessibilityLabel="Fermer"
                  style={({ pressed }) => [styles.closeButton, { opacity: pressed || sharing ? 0.45 : 1 }]}
                >
                  <X size={20} color={colors.textPrimary} />
                </Pressable>
              </View>

              <Text style={[styles.shareLabel, { color: colors.textPrimary }]}>Votre prénom</Text>
              <TextInput
                value={shareName}
                onChangeText={setShareName}
                onBlur={() => setShareNameTouched(true)}
                onSubmitEditing={shareCollection}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                returnKeyType="done"
                blurOnSubmit
                placeholder="Ex. Camille"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                accessibilityLabel="Prénom à afficher lors du partage"
                style={[
                  styles.shareInput,
                  {
                    color: colors.textPrimary,
                    backgroundColor: isDark ? colors.surfaceLight : colors.background,
                    borderColor: shareNameTouched && !shareName.trim() ? colors.danger : colors.border,
                  },
                ]}
              />
              {shareNameTouched && !shareName.trim() ? (
                <Text style={[styles.shareError, { color: colors.danger }]}>Ajoutez un prénom pour partager la liste.</Text>
              ) : null}
            </View>

            <View style={[styles.shareFooter, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.md }]}>
              <Pressable
                onPress={shareCollection}
                disabled={sharing}
                accessibilityRole="button"
                accessibilityLabel="Générer le lien de partage"
                style={({ pressed }) => [
                  styles.shareButton,
                  Shadows.card,
                  {
                    backgroundColor: colors.primary,
                    opacity: sharing ? 0.45 : !shareName.trim() ? 0.58 : pressed ? 0.78 : 1,
                  },
                ]}
              >
                {sharing ? <ActivityIndicator color={colors.textOnPrimary} /> : <Text style={[styles.shareButtonText, { color: colors.textOnPrimary }]}>Générer le lien</Text>}
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { minHeight: 50, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
  topAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: -0.2, textAlign: 'center' },
  header: { alignItems: 'flex-start', marginTop: Spacing.lg, marginBottom: Spacing.lg, padding: Spacing.xl, borderWidth: 1, borderRadius: BorderRadius.xl },
  collectionIcon: { width: 56, height: 56, marginBottom: Spacing.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderRadius: BorderRadius.lg },
  collectionImage: { width: '100%', height: '100%' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing.xs },
  owner: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xxl, letterSpacing: -0.768 },
  description: { marginTop: Spacing.xs, maxWidth: 520, fontFamily: FontFamily.regular, fontSize: FontSize.md, lineHeight: 22 },
  count: { marginTop: Spacing.xs, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  visibilityRow: { alignSelf: 'stretch', minHeight: 60, marginTop: Spacing.lg, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.lg },
  visibilityCopy: { flex: 1 },
  visibilityTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  visibilityDetail: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  addAddress: { minHeight: 46, alignSelf: 'stretch', marginTop: Spacing.lg, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: BorderRadius.button },
  addAddressText: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, letterSpacing: 0.1 },
  collectionActions: { alignSelf: 'stretch', marginTop: Spacing.lg, flexDirection: 'row', gap: Spacing.sm },
  collectionAction: { flex: 1, minHeight: 44, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: BorderRadius.button },
  collectionDeleteAction: { borderWidth: 1 },
  collectionActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  sectionTitle: { marginTop: Spacing.xxl, marginBottom: Spacing.xs, fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: -0.2 },
  firstRestaurant: { marginTop: Spacing.sm },
  shareModalRoot: { flex: 1, justifyContent: 'flex-end' },
  bottomSafeAreaFill: { position: 'absolute', right: 0, bottom: 0, left: 0, zIndex: 20 },
  shareSheet: { overflow: 'hidden', borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, borderWidth: 1 },
  shareSheetBody: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  shareSheetHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  shareSheetCopy: { flex: 1 },
  shareSheetTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, letterSpacing: -0.3 },
  shareSheetSubtitle: { marginTop: 3, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  shareLabel: { marginTop: Spacing.lg, marginBottom: Spacing.xs, fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  shareInput: { minHeight: 48, paddingHorizontal: Spacing.md, borderWidth: 1, borderRadius: BorderRadius.md, fontFamily: FontFamily.regular, fontSize: FontSize.md },
  shareError: { marginTop: 6, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  shareFooter: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  shareButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.button },
  shareButtonText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: 0.1 },
});
