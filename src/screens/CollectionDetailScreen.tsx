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
import { Pencil, Trash2, LibraryBig, ArrowLeft, MoreVertical } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import { Collection, Restaurant, CollectionsStackParamList } from '../types';
import { getCollections, getRestaurants, deleteCollection, saveCollection, removeRestaurantFromCollection } from '../storage/storage';
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
            </View>
          </Animated.View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => handleRemove(item.id, item.name)} activeOpacity={0.9}>
            <RestaurantCard
              restaurant={item}
              onPress={() => {
                const parent = navigation.getParent();
                if (parent) (parent as any).navigate('RestaurantsTab', {
                  screen: 'RestaurantDetail',
                  params: { restaurantId: item.id }
                });
              }}
            />
          </TouchableOpacity>
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
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center'
  },
});
