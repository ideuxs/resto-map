import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search, Plus, LibraryBig, Folder, Download } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { decode } from 'base-64';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import LZString from 'lz-string';

import { Collection, CollectionsStackParamList } from '../types';
import { getCollections, saveCollection, importSharedCollection } from '../storage/storage';
import CollectionFormModal from '../components/CollectionFormModal';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';
import { v4 as uuidv4 } from 'uuid';

import {
  Star,
  Heart,
  Flame,
  Pizza,
  Utensils,
  MapPin,
  Coffee,
  Beer,
  Cake,
  Gem,
  Target,
  Globe,
  Camera,
  Music
} from 'lucide-react-native';

const ICONS: Record<string, any> = {
  Folder,
  Star,
  Heart,
  Flame,
  Pizza,
  Utensils,
  MapPin,
  Coffee,
  Beer,
  Cake,
  Gem,
  Target,
  Globe,
  Camera,
  Music
};

type Props = NativeStackScreenProps<CollectionsStackParamList, 'CollectionsList'>;

export default function CollectionsListScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      getCollections().then(setCollections);
    }, [])
  );

  const handleSave = async (data: { name: string; emoji: string; description: string }) => {
    const collection: Collection = {
      id: editingCollection?.id || uuidv4(),
      name: data.name,
      emoji: data.emoji,
      description: data.description || undefined,
      restaurantIds: editingCollection?.restaurantIds || [],
      createdAt: editingCollection?.createdAt || new Date().toISOString(),
    };
    await saveCollection(collection);
    setModalVisible(false);
    setEditingCollection(null);
    getCollections().then(setCollections);
  };

  const openCreate = () => {
    setEditingCollection(null);
    setModalVisible(true);
  };

  const handleManualImport = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) {
        Alert.alert('Presse-papier vide', 'Copiez un lien de partage ou le code de collection d\'abord.');
        return;
      }

      let sharedData;
      if (text.includes('s=')) {
        const { queryParams } = Linking.parse(text);
        const json = LZString.decompressFromEncodedURIComponent(queryParams?.s as string);
        sharedData = JSON.parse(json!);
      } else if (text.includes('v2=')) {
        const { queryParams } = Linking.parse(text);
        const json = LZString.decompressFromEncodedURIComponent(queryParams?.v2 as string);
        sharedData = JSON.parse(json!);
      } else if (text.includes('data=')) {
        const { queryParams } = Linking.parse(text);
        const json = decode(text);
        sharedData = JSON.parse(json);
      } else {
        // Assume raw inputs
        try {
          const json = LZString.decompressFromEncodedURIComponent(text);
          sharedData = JSON.parse(json!);
        } catch {
          const json = decode(text);
          sharedData = JSON.parse(json);
        }
      }

      if (!sharedData) {
        Alert.alert('Erreur', 'Lien ou code invalide.');
        return;
      }

      let colName = 'Sans titre';
      if (Array.isArray(sharedData)) {
        colName = sharedData[2][0];
      } else {
        colName = sharedData.collection?.name || sharedData.c?.n || 'Sans titre';
      }

      Alert.alert(
        '📥 Importer une collection',
        `Voulez-vous importer "${colName}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Importer', 
            onPress: async () => {
              await importSharedCollection(sharedData);
              getCollections().then(setCollections);
              Alert.alert('Succès', 'Collection importée avec succès !');
            }
          }
        ]
      );
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de lire le code de partage.');
    }
  };

  const renderItem = ({ item }: { item: Collection }) => {
    const IconComp = ICONS[item.emoji || 'Folder'] || Folder;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: colors.surface },
          Shadows.md
        ]}
        onPress={() => navigation.navigate('CollectionDetail', { collectionId: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <IconComp size={26} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          {item.description ? (
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
          <View style={[styles.countBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.cardCount, { color: colors.textMuted }]}>
              {item.restaurantIds.length} adresse{item.restaurantIds.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.chevronBox}>
          <Search size={20} color={colors.textMuted} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      <BlurView
        intensity={isDark ? 40 : 80}
        tint={isDark ? "dark" : "light"}
        style={[styles.header, { paddingTop: insets.top + 60, height: insets.top + 140 }]}
      >
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Vos listes</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Organisez vos lieux favoris</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: colors.surfaceLight }, Shadows.sm]}
            onPress={handleManualImport}
            activeOpacity={0.8}
            accessibilityLabel="Importer depuis le presse-papier"
          >
            <Download size={20} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }, Shadows.glow(colors.primary)]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.9}
          >
            <Plus size={20} color={colors.textOnPrimary} strokeWidth={2.5} style={{ marginRight: 4 }} />
            <Text style={[styles.addBtnText, { color: colors.textOnPrimary }]}>Créer</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      <FlatList
        data={collections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          collections.length === 0 ? styles.emptyContainer : styles.list,
          { paddingTop: insets.top + 160, paddingBottom: insets.bottom + 100 }
        ]}
        ListEmptyComponent={
          <EmptyState
            icon={Folder}
            title="Aucune collection"
            subtitle="Créez des listes thématiques pour retrouver facilement vos meilleures adresses !"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <CollectionFormModal
        visible={modalVisible}
        collection={editingCollection}
        onClose={() => {
          setModalVisible(false);
          setEditingCollection(null);
        }}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  title: {
    fontSize: FontSize.title,
    fontFamily: FontFamily.bold,
    letterSpacing: -1,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
  },
  addBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  importBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.xl,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xxl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardName: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    marginBottom: 6,
  },
  countBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  cardCount: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  chevronBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
