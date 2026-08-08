import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pencil, Trash2, LibraryBig, ArrowLeft, Share2 } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';
import LZString from 'lz-string';

import { Collection, Restaurant, CollectionsStackParamList } from '../types';
import {
  getCollections,
  getRestaurants,
  deleteCollection,
  saveCollection,
  removeRestaurantFromCollection,
  addRestaurantsChangeListener,
  addCollectionsChangeListener,
} from '../storage/storage';
import { CATEGORIES } from '../constants/categories';
import RestaurantCard from '../components/RestaurantCard';
import CollectionFormModal from '../components/CollectionFormModal';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';

import {
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

type Props = NativeStackScreenProps<CollectionsStackParamList, 'CollectionDetail'>;

export default function CollectionDetailScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [editModal, setEditModal] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Refresh when restaurants/collections change (edited/imported/deleted)
  React.useEffect(() => {
    const unsubscribeRestaurants = addRestaurantsChangeListener(() => { loadData(); });
    const unsubscribeCollections = addCollectionsChangeListener(() => { loadData(); });
    return () => {
      unsubscribeRestaurants();
      unsubscribeCollections();
    };
  }, []);

  const loadData = async () => {
    const cols = await getCollections();
    const col = cols.find((c) => c.id === route.params.collectionId);
    setCollection(col || null);
    if (col) {
      const allRestos = await getRestaurants();
      setRestaurants(col.restaurantIds.map((id) => allRestos.find((r) => r.id === id)).filter(Boolean) as Restaurant[]);
    }
  };

  const handleRemove = (restoId: string, name: string) => {
    Alert.alert('Retirer', `Retirer "${name}" de cette liste ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Retirer', style: 'destructive', onPress: async () => { await removeRestaurantFromCollection(collection!.id, restoId); loadData(); } },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Supprimer', `Supprimer la liste "${collection?.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => { await deleteCollection(collection!.id); navigation.goBack(); } },
    ]);
  };

  const handleEditSave = async (data: { name: string; emoji: string; description: string }) => {
    if (!collection) return;
    await saveCollection({ ...collection, name: data.name, emoji: data.emoji, description: data.description || undefined });
    setEditModal(false);
    loadData();
  };

  const openRestaurantDetail = (restaurantId: string) => {
    navigation.navigate('RestaurantDetail', { restaurantId });
  };

  const openRestaurantEdit = (restaurant: Restaurant) => {
    navigation.navigate('AddRestaurant', { restaurant });
  };

  const handleShare = async () => {
    if (!collection) return;

    try {
      // Version 3: Positional array for extreme link shortening
      const catKeys = Object.keys(CATEGORIES);
      
      const colData = [
        collection.name,
        collection.emoji,
        collection.description || ''
      ];

      const restosData = restaurants.map(r => [
        r.name,
        catKeys.indexOf(r.category),
        r.description || '',
        r.address || '',
        r.priceLevel,
        r.priceMin,
        r.priceMax,
        r.location ? [r.location.latitude, r.location.longitude] : null,
        r.visitedAt,
        r.rating,
        r.wouldReturn,
        r.signatureDish || '',
        r.tags || []
      ]);

      const minifiedData = [
        3, // Version
        'un ami', // User
        colData,
        restosData
      ];

      const json = JSON.stringify(minifiedData);
      const compressed = LZString.compressToEncodedURIComponent(json);
      
      // Use a shorter key 's' for share
      const shareUrl = Linking.createURL('share', {
        queryParams: { s: compressed },
      });

      const message = `Ma collec' "${collection.name}" sur RestoHub :\n${shareUrl}`;

      const { Share } = require('react-native');
      await Share.share({
        message,
        url: shareUrl,
      });
    } catch (e) {
      console.error('Sharing failed', e);
      Alert.alert('Erreur', 'Impossible de partager la collection.');
    }
  };

  if (!collection) return <View style={[s.container, { backgroundColor: colors.background }]}><Text style={[s.notFound, { color: colors.textMuted }]}>Collection non trouvée</Text></View>;

  const IconComp = ICONS[collection.emoji || 'Folder'] || Folder;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Persistent Sticky Header */}
      <BlurView intensity={isDark ? 40 : 80} tint={isDark ? "dark" : "light"} style={[s.stickyHeader, { height: insets.top, marginTop: insets.top }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Animated.Text style={[s.stickyTitle, { color: colors.textPrimary, opacity: scrollY.interpolate({ inputRange: [100, 150], outputRange: [0, 1], extrapolate: 'clamp' }) }]} numberOfLines={1}>
          {collection.name}
        </Animated.Text>
        <View style={{ width: 44 }} />
      </BlurView>

      <Animated.FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        ListHeaderComponent={
          <Animated.View style={[s.header, { opacity: headerOpacity, paddingTop: 140 }]}>
            <View style={[s.iconBox, { backgroundColor: colors.primary + '15' }]}>
              <IconComp size={48} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[s.title, { color: colors.textPrimary }]} numberOfLines={2}>{collection.name}</Text>
            {collection.description ? (
              <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={3}>
                {collection.description}
              </Text>
            ) : null}
            <Text style={[s.count, { color: colors.textMuted }]}>
              {restaurants.length} adresse{restaurants.length !== 1 ? 's' : ''} enregistrée{restaurants.length !== 1 ? 's' : ''}
            </Text>

            <View style={s.actions}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.surface }, Shadows.sm]}
                onPress={() => setEditModal(true)}
                activeOpacity={0.8}
              >
                <Pencil size={18} color={colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={[s.actionText, { color: colors.textPrimary }]}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.surface }, Shadows.sm]}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Trash2 size={18} color={colors.danger} style={{ marginRight: 8 }} />
                <Text style={[s.actionText, { color: colors.danger }]}>Supprimer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: colors.primary }, Shadows.sm]}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Share2 size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={[s.actionText, { color: "#FFF" }]}>Partager</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        }
        renderItem={({ item }) => (
          <View style={s.itemBlock}>
            <RestaurantCard
              restaurant={item}
              onPress={() => openRestaurantDetail(item.id)}
            />

            <View style={s.itemActionsRow}>
              <TouchableOpacity
                style={[s.itemActionBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadows.sm]}
                onPress={() => openRestaurantEdit(item)}
                activeOpacity={0.85}
              >
                <Pencil size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={[s.itemActionText, { color: colors.textPrimary }]}>Modifier</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.itemActionBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '35' }, Shadows.sm]}
                onPress={() => handleRemove(item.id, item.name)}
                activeOpacity={0.85}
              >
                <Trash2 size={16} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={[s.itemActionText, { color: colors.danger }]}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={[restaurants.length === 0 ? s.emptyContainer : s.list, { paddingBottom: insets.bottom + 40 }]}
        ListEmptyComponent={
          <EmptyState
            icon={LibraryBig}
            title="Votre liste est vide"
            subtitle="Explorez vos restaurants et ajoutez-les à cette collection !"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <CollectionFormModal
        visible={editModal}
        collection={collection}
        onClose={() => setEditModal(false)}
        onSave={handleEditSave}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyTitle: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    flex: 1,
    textAlign: 'center',
  },
  notFound: {
    fontSize: FontSize.lg,
    textAlign: 'center',
    marginTop: 150,
    fontFamily: FontFamily.medium
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 100,
    paddingBottom: Spacing.xl,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.bold,
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  desc: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: Spacing.sm,
  },
  count: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    marginTop: Spacing.xs
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold
  },
  list: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  itemBlock: {
    marginBottom: Spacing.md,
  },
  itemActionsRow: {
    marginTop: -Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  itemActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  itemActionText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
});
