import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  BookMarked,
  Check,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  GitMerge,
  Monitor,
  Moon,
  Search,
  Sun,
  UsersRound,
  X,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { decode } from 'base-64';
import LZString from 'lz-string';
import { v4 as uuidv4 } from 'uuid';

import { Collection, CollectionsStackParamList } from '../types';
import {
  addCollectionsChangeListener,
  getCollections,
  getDuplicateReviews,
  getSharedCollectionPreview,
  importSharedCollectionDetailed,
  saveCollection,
  setCollectionVisibility,
} from '../storage/storage';
import CollectionFormModal from '../components/CollectionFormModal';
import EmptyState from '../components/EmptyState';
import ScreenHeader from '../components/ScreenHeader';
import { getCollectionIcon } from '../constants/collectionIcons';
import { useTheme } from '../theme/ThemeProvider';
import {
  BorderRadius,
  FontFamily,
  FontSize,
  getSourceColor,
  isSourceColorKey,
  sourceColorKeyFor,
  Shadows,
  Spacing,
} from '../constants/theme';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'CollectionsList'>;

const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'Système', icon: Monitor },
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
] as const;

function parseSharedText(text: string): any | null {
  const parsed = Linking.parse(text);
  const compact = typeof parsed.queryParams?.s === 'string' ? parsed.queryParams.s : null;
  const v2 = typeof parsed.queryParams?.v2 === 'string' ? parsed.queryParams.v2 : null;
  const v1 = typeof parsed.queryParams?.data === 'string' ? parsed.queryParams.data : null;
  if (compact || v2) {
    const json = LZString.decompressFromEncodedURIComponent(compact || v2 || '');
    return json ? JSON.parse(json) : null;
  }
  if (v1) return JSON.parse(decode(v1));
  const decompressed = LZString.decompressFromEncodedURIComponent(text);
  if (decompressed) return JSON.parse(decompressed);
  return JSON.parse(decode(text));
}

export default function CollectionsListScreen({ navigation }: Props) {
  const { colors, colorScheme, isDark, setTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const load = useCallback(() => {
    void Promise.all([getCollections(), getDuplicateReviews()]).then(([nextCollections, reviews]) => {
      setCollections(nextCollections);
      setDuplicateCount(reviews.length);
    });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => addCollectionsChangeListener(load), [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    return collections.filter((collection) =>
      !normalized || collection.name.toLocaleLowerCase('fr').includes(normalized) ||
      (collection.ownerName || '').toLocaleLowerCase('fr').includes(normalized)
    );
  }, [collections, query]);

  const sections = [
    { title: 'Mes listes', data: filtered.filter((collection) => collection.kind !== 'imported') },
    { title: 'Listes importées', data: filtered.filter((collection) => collection.kind === 'imported') },
  ].filter((section) => section.data.length > 0);
  const currentAppearance = APPEARANCE_OPTIONS.find((option) => option.value === colorScheme) || APPEARANCE_OPTIONS[0];
  const AppearanceIcon = currentAppearance.icon;

  const createCollection = async (data: { name: string; emoji: string; description: string; imageUri?: string }) => {
    await saveCollection({
      id: uuidv4(),
      name: data.name,
      emoji: data.emoji,
      description: data.description || undefined,
      imageUri: data.imageUri,
      restaurantIds: [],
      kind: 'personal',
      isVisible: true,
      createdAt: new Date().toISOString(),
    });
    setFormOpen(false);
  };

  const importFromClipboard = async () => {
    if (importing) return;
    try {
      const text = await Clipboard.getStringAsync();
      if (!text.trim()) {
        Alert.alert('Presse-papier vide', 'Copiez d’abord un lien de partage RestoHub.');
        return;
      }
      const data = parseSharedText(text);
      if (!data) throw new Error('Empty payload');
      const preview = getSharedCollectionPreview(data);
      Alert.alert(
        'Importer cette liste ?',
        `« ${preview.name} » de ${preview.ownerName} contient ${preview.count} adresse${preview.count !== 1 ? 's' : ''}.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Importer',
            onPress: async () => {
              setImporting(true);
              try {
                const result = await importSharedCollectionDetailed(data);
                if (result.ignored) {
                  Alert.alert('Déjà à jour', 'Cette version de la liste est déjà importée.');
                } else {
                  Alert.alert(
                    'Import terminé',
                    `${result.added} nouvelle${result.added !== 1 ? 's' : ''} · ${result.linked} reliée${result.linked !== 1 ? 's' : ''} · ${result.needsReview} à vérifier.`
                  );
                }
              } catch {
                Alert.alert('Import impossible', 'Le contenu du partage est incomplet. Demandez un nouveau lien.');
              } finally {
                setImporting(false);
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Aucun partage détecté', 'Copiez un lien RestoHub complet, puis réessayez.');
    }
  };

  const renderCollection = ({ item }: { item: Collection }) => {
    const Icon = getCollectionIcon(item.emoji);
    const imported = item.kind === 'imported';
    const sourceColor = getSourceColor(
      isSourceColorKey(item.sourceColorKey)
        ? item.sourceColorKey
        : sourceColorKeyFor(item.ownerId || item.ownerName || item.id),
      isDark ? 'dark' : 'light'
    );
    return (
      <Pressable
        onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id })}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.row,
          Shadows.hard,
          { backgroundColor: colors.surface, borderColor: colors.textPrimary, opacity: pressed ? 0.68 : 1 },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: imported ? `${sourceColor}18` : colors.surfaceMuted }]}>
          {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.collectionImage} contentFit="cover" /> : <Icon size={23} color={imported ? sourceColor : colors.textPrimary} strokeWidth={2} />}
        </View>
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          {imported ? (
            <View style={styles.ownerLine}>
              <UsersRound size={13} color={sourceColor} />
              <Text style={[styles.owner, { color: sourceColor }]} numberOfLines={1}>Liste de {item.ownerName || 'un ami'}</Text>
            </View>
          ) : null}
          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
            {item.restaurantIds.length} adresse{item.restaurantIds.length !== 1 ? 's' : ''}
            {imported && item.isVisible === false ? ' · masquée' : ''}
          </Text>
        </View>
        {imported ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              setCollectionVisibility(item.id, item.isVisible === false);
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: item.isVisible !== false }}
            accessibilityLabel={item.isVisible === false ? `Afficher ${item.name}` : `Masquer ${item.name}`}
            style={({ pressed }) => [styles.eyeButton, { opacity: pressed ? 0.5 : 1 }]}
          >
            {item.isVisible === false
              ? <EyeOff size={21} color={colors.textMuted} />
              : <Eye size={21} color={sourceColor} />}
          </Pressable>
        ) : (
          <ChevronRight size={19} color={colors.textMuted} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderCollection}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
        )}
        ListHeaderComponent={(
          <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
            <ScreenHeader
              title="Listes"
              subtitle="Organisez vos repères et retrouvez les listes de vos proches."
              onAdd={() => setFormOpen(true)}
              addAccessibilityLabel="Créer une liste"
            />

            <View style={[styles.importLine, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
              <View style={[styles.importIcon, { backgroundColor: `${colors.accentPink}16` }]}>
                <Download size={18} color={colors.accentPink} />
              </View>
              <View style={styles.importCopy}>
                <Text style={[styles.importTitle, { color: colors.textPrimary }]}>Importer une liste</Text>
                <Text style={[styles.importSubtitle, { color: colors.textMuted }]}>Depuis un lien RestoHub copié.</Text>
              </View>
              <Pressable onPress={importFromClipboard} disabled={importing} style={({ pressed }) => [styles.importButton, { opacity: pressed ? 0.55 : 1 }]}>
                {importing ? <ActivityIndicator size="small" color={colors.accentPink} /> : <Text style={[styles.importButtonText, { color: colors.accentPink }]}>Importer</Text>}
              </Pressable>
            </View>

            <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
              <Search size={19} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher une liste ou un ami"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                accessibilityLabel="Rechercher une liste"
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {query ? <Pressable onPress={() => setQuery('')} hitSlop={10}><X size={18} color={colors.textMuted} /></Pressable> : null}
            </View>

            <Text style={[styles.toolsLabel, { color: colors.textPrimary }]}>Outils</Text>
            <View style={[styles.toolsSection, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
              <Pressable onPress={() => navigation.navigate('DuplicateReview')} style={({ pressed }) => [styles.utilityRow, { opacity: pressed ? 0.6 : 1 }]}>
                <View style={[styles.toolIconBox, { backgroundColor: `${duplicateCount ? colors.accentPink : colors.textMuted}14` }]}><GitMerge size={19} color={duplicateCount ? colors.accentPink : colors.textMuted} /></View>
                <View style={styles.utilityCopy}>
                  <Text style={[styles.utilityTitle, { color: colors.textPrimary }]}>Doublons à vérifier</Text>
                  <Text style={[styles.utilityDetail, { color: colors.textMuted }]}>{duplicateCount ? `${duplicateCount} rapprochement${duplicateCount > 1 ? 's' : ''} en attente` : 'Aucun rapprochement en attente'}</Text>
                </View>
                <ChevronRight size={19} color={colors.textMuted} />
              </Pressable>
              <Pressable onPress={() => setAppearanceOpen(true)} style={({ pressed }) => [styles.utilityRow, { opacity: pressed ? 0.6 : 1 }]} accessibilityRole="button">
                <View style={[styles.toolIconBox, { backgroundColor: `${colors.accent}14` }]}><AppearanceIcon size={19} color={colors.accent} /></View>
                <View style={styles.utilityCopy}>
                  <Text style={[styles.utilityTitle, { color: colors.textPrimary }]}>Apparence</Text>
                  <Text style={[styles.utilityDetail, { color: colors.textMuted }]}>{currentAppearance.label} · modifier</Text>
                </View>
                <ChevronRight size={19} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={(
          <EmptyState
            icon={BookMarked}
            title={collections.length ? 'Aucune liste trouvée' : 'Aucune liste pour l’instant'}
            subtitle={collections.length ? 'Modifiez votre recherche.' : 'Créez une liste personnelle ou importez celle d’un ami.'}
            actionLabel={collections.length ? 'Effacer la recherche' : 'Créer une liste'}
            onAction={collections.length ? () => setQuery('') : () => setFormOpen(true)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: insets.bottom + 96 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
      <CollectionFormModal visible={formOpen} onClose={() => setFormOpen(false)} onSave={createCollection} />
      <Modal visible={appearanceOpen} transparent={false} presentationStyle="fullScreen" animationType="slide" onRequestClose={() => setAppearanceOpen(false)}>
        <View style={[styles.appearanceModalRoot, { backgroundColor: colors.surface }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setAppearanceOpen(false)} />
          <View style={[styles.appearanceSheet, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.appearanceSheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Apparence</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>Choisissez le contraste qui vous convient.</Text>
              </View>
              <Pressable onPress={() => setAppearanceOpen(false)} style={styles.closeButton} accessibilityLabel="Fermer">
                <X size={21} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View accessibilityRole="radiogroup">
              {APPEARANCE_OPTIONS.map((option) => {
                const selected = colorScheme === option.value;
                const Icon = option.icon;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => { setTheme(option.value); setAppearanceOpen(false); }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={({ pressed }) => [
                      styles.appearanceOption,
                      Shadows.hard,
                      {
                        backgroundColor: selected ? colors.surfaceLight : colors.surface,
                        borderColor: colors.textPrimary,
                        opacity: pressed ? 0.62 : 1,
                      },
                    ]}
                  >
                    <Icon size={19} color={selected ? colors.accent : colors.textMuted} />
                    <Text style={[styles.appearanceOptionText, { color: selected ? colors.accent : colors.textSecondary }]}>{option.label}</Text>
                    {selected ? <Check size={20} color={colors.accent} strokeWidth={2.4} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingBottom: Spacing.xl },
  importLine: { minHeight: 76, marginTop: Spacing.xl, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: 12 },
  importIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  importCopy: { flex: 1 },
  importTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  importSubtitle: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  importButton: { minHeight: 44, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  importButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  search: { minHeight: 52, marginTop: Spacing.xl, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderRadius: 10 },
  searchInput: { flex: 1, minHeight: 46, fontFamily: FontFamily.regular, fontSize: FontSize.md },
  toolsLabel: { marginTop: Spacing.xxxl, marginBottom: Spacing.sm, fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  toolsSection: { padding: Spacing.sm, borderWidth: 1.5, borderRadius: 12 },
  utilityRow: { minHeight: 62, paddingHorizontal: Spacing.xs, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: BorderRadius.lg },
  toolIconBox: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  utilityCopy: { flex: 1 },
  utilityDetail: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  utilityTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  appearanceOption: { minHeight: 54, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: 8 },
  appearanceOptionText: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  sectionTitle: { marginTop: Spacing.xxl, marginBottom: Spacing.sm, fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  row: { minHeight: 80, marginBottom: Spacing.md, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: 12 },
  iconBox: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 14 },
  collectionImage: { width: '100%', height: '100%' },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  ownerLine: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 5 },
  owner: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  rowMeta: { marginTop: 4, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  eyeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  appearanceModalRoot: { flex: 1, justifyContent: 'flex-end' },
  appearanceSheet: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1.5 },
  sheetHandle: { width: 36, height: 4, alignSelf: 'center', marginBottom: Spacing.md, borderRadius: BorderRadius.full },
  appearanceSheetHeader: { minHeight: 54, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  sheetTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xl },
  sheetSubtitle: { marginTop: 3, fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
