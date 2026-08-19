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
      <View style={[styles.topBar, { paddingTop: insets.top, backgroundColor: colors.background, borderColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={styles.topAction}>
          <ArrowLeft size={23} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.textPrimary }]} numberOfLines={1}>{collection.name}</Text>
        {!imported ? (
          <Pressable onPress={openShareModal} accessibilityRole="button" accessibilityLabel="Partager la liste" style={styles.topAction}>
            <Share2 size={21} color={colors.textPrimary} />
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
          <View style={[styles.header, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
            <View style={[styles.collectionIcon, { backgroundColor: imported ? `${sourceColor}18` : colors.surfaceMuted, borderColor: imported ? sourceColor : colors.textPrimary }]}>
              {collection.imageUri ? <Image source={{ uri: collection.imageUri }} style={styles.collectionImage} contentFit="cover" /> : <Icon size={30} color={imported ? sourceColor : colors.textPrimary} strokeWidth={2} />}
            </View>
            {imported ? (
              <View style={styles.ownerRow}>
                <UsersRound size={15} color={sourceColor} />
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
                style={({ pressed }) => [styles.visibilityRow, Shadows.hard, { backgroundColor: colors.surfaceLight, borderColor: colors.textPrimary, opacity: pressed ? 0.65 : 1 }]}
              >
                {collection.isVisible === false ? <EyeOff size={21} color={colors.textMuted} /> : <Eye size={21} color={sourceColor} />}
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
                style={({ pressed }) => [styles.addAddress, { backgroundColor: colors.accent, opacity: pressed ? 0.72 : 1 }]}
              >
                <Plus size={18} color={colors.textOnAccent} />
                <Text style={[styles.addAddressText, { color: colors.textOnAccent }]}>Ajouter une adresse</Text>
              </Pressable>
            )}

            <View style={styles.collectionActions}>
              {!imported ? (
                <Pressable
                  onPress={() => setEditOpen(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.collectionAction, { borderColor: colors.textPrimary, opacity: pressed ? 0.58 : 1 }]}
                >
                  <Pencil size={18} color={colors.textSecondary} />
                  <Text style={[styles.collectionActionText, { color: colors.textSecondary }]}>Modifier</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={removeCollection}
                accessibilityRole="button"
                style={({ pressed }) => [styles.collectionAction, styles.collectionDeleteAction, { borderColor: colors.danger, opacity: pressed ? 0.58 : 1 }]}
              >
                <Trash2 size={18} color={colors.danger} />
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
          <View style={[styles.shareSheet, Shadows.sheet, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
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
                  <X size={21} color={colors.textPrimary} />
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
                style={[styles.shareInput, Shadows.hard, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: shareNameTouched && !shareName.trim() ? colors.danger : colors.textPrimary }]}
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
                  Shadows.hard,
                  {
                    backgroundColor: colors.accentPink,
                    borderColor: colors.textPrimary,
                    opacity: sharing ? 0.45 : !shareName.trim() ? 0.58 : pressed ? 0.72 : 1,
                  },
                ]}
              >
                {sharing ? <ActivityIndicator color={colors.textOnAccent} /> : <Text style={[styles.shareButtonText, { color: colors.textOnAccent }]}>Générer le lien</Text>}
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
  topBar: { minHeight: 54, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 6, borderBottomWidth: 0 },
  topAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, paddingBottom: 12, fontFamily: FontFamily.semiBold, fontSize: FontSize.md, textAlign: 'center' },
  header: { alignItems: 'flex-start', marginTop: Spacing.xxl, marginBottom: Spacing.lg, padding: Spacing.xl, borderWidth: 1.5, borderRadius: 14 },
  collectionIcon: { width: 64, height: 64, marginBottom: Spacing.lg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderRadius: BorderRadius.lg },
  collectionImage: { width: '100%', height: '100%' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  owner: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xxl, letterSpacing: -0.7 },
  description: { marginTop: Spacing.sm, maxWidth: 520, fontFamily: FontFamily.regular, fontSize: FontSize.md, lineHeight: 23 },
  count: { marginTop: Spacing.sm, fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  visibilityRow: { alignSelf: 'stretch', minHeight: 68, marginTop: Spacing.xl, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: 10 },
  visibilityCopy: { flex: 1 },
  visibilityTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  visibilityDetail: { marginTop: 3, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  addAddress: { minHeight: 46, marginTop: Spacing.xl, paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: BorderRadius.md },
  addAddressText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  collectionActions: { alignSelf: 'stretch', marginTop: Spacing.xl, flexDirection: 'row', gap: Spacing.sm },
  collectionAction: { flex: 1, minHeight: 46, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderRadius: BorderRadius.md },
  collectionDeleteAction: { borderWidth: 1.5 },
  collectionActionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  sectionTitle: { marginTop: Spacing.xxxl, marginBottom: Spacing.md, fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  firstRestaurant: { marginTop: Spacing.md },
  shareModalRoot: { flex: 1, justifyContent: 'flex-end' },
  bottomSafeAreaFill: { position: 'absolute', right: 0, bottom: 0, left: 0, zIndex: 20 },
  shareSheet: { overflow: 'hidden', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1.5 },
  shareSheetBody: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  shareSheetHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  shareSheetCopy: { flex: 1 },
  shareSheetTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xl },
  shareSheetSubtitle: { marginTop: 5, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 20 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  shareLabel: { marginTop: Spacing.xl, marginBottom: Spacing.sm, fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  shareInput: { minHeight: 52, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderRadius: 8, fontFamily: FontFamily.regular, fontSize: FontSize.md },
  shareError: { marginTop: 6, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  shareFooter: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl },
  shareButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1.5 },
  shareButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
});
