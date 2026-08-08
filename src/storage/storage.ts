import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant, Collection, RestaurantCategory } from '../types';
import { CATEGORIES } from '../constants/categories';

const RESTAURANTS_KEY = '@restohub_restaurants';
const COLLECTIONS_KEY = '@restohub_collections';

// ─── Restaurants ─────────────────────────────────────────────

export async function getRestaurants(): Promise<Restaurant[]> {
  try {
    const data = await AsyncStorage.getItem(RESTAURANTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Simple change emitter so UI can react to restaurant updates
const restaurantChangeListeners: Set<() => void> = new Set();
const collectionChangeListeners: Set<() => void> = new Set();

export function addRestaurantsChangeListener(cb: () => void) {
  restaurantChangeListeners.add(cb);
  return () => restaurantChangeListeners.delete(cb);
}

export function addCollectionsChangeListener(cb: () => void) {
  collectionChangeListeners.add(cb);
  return () => collectionChangeListeners.delete(cb);
}

function emitRestaurantsChanged() {
  for (const cb of Array.from(restaurantChangeListeners)) {
    try { cb(); } catch (e) { /* swallow listener errors */ }
  }
}

function emitCollectionsChanged() {
  for (const cb of Array.from(collectionChangeListeners)) {
    try { cb(); } catch (e) { /* swallow listener errors */ }
  }
}

export async function saveRestaurant(restaurant: Restaurant): Promise<void> {
  const restaurants = await getRestaurants();
  const idx = restaurants.findIndex((r) => r.id === restaurant.id);
  if (idx >= 0) {
    restaurants[idx] = restaurant;
  } else {
    restaurants.unshift(restaurant);
  }
  await AsyncStorage.setItem(RESTAURANTS_KEY, JSON.stringify(restaurants));
  emitRestaurantsChanged();
}

export async function deleteRestaurant(id: string): Promise<void> {
  const restaurants = await getRestaurants();
  const filtered = restaurants.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RESTAURANTS_KEY, JSON.stringify(filtered));

  // Also remove from all collections
  const collections = await getCollections();
  const updated = collections.map((c) => ({
    ...c,
    restaurantIds: c.restaurantIds.filter((rid) => rid !== id),
  }));
  await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(updated));
  emitRestaurantsChanged();
  emitCollectionsChanged();
}

// ─── Collections ─────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  try {
    const data = await AsyncStorage.getItem(COLLECTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveCollection(collection: Collection): Promise<void> {
  const collections = await getCollections();
  const idx = collections.findIndex((c) => c.id === collection.id);
  if (idx >= 0) {
    collections[idx] = collection;
  } else {
    collections.unshift(collection);
  }
  await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
  emitCollectionsChanged();
}

export async function deleteCollection(id: string): Promise<void> {
  const collections = await getCollections();
  const filtered = collections.filter((c) => c.id !== id);
  await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(filtered));
  emitCollectionsChanged();
}

export async function addRestaurantToCollection(
  collectionId: string,
  restaurantId: string
): Promise<void> {
  const collections = await getCollections();
  const col = collections.find((c) => c.id === collectionId);
  if (col && !col.restaurantIds.includes(restaurantId)) {
    col.restaurantIds.push(restaurantId);
    await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    emitCollectionsChanged();
  }
}

export async function removeRestaurantFromCollection(
  collectionId: string,
  restaurantId: string
): Promise<void> {
  const collections = await getCollections();
  const col = collections.find((c) => c.id === collectionId);
  if (col) {
    col.restaurantIds = col.restaurantIds.filter((id) => id !== restaurantId);
    await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
    emitCollectionsChanged();
  }
}

export async function importSharedCollection(data: any): Promise<string> {
  // Handle Version 3 (Array), Version 2 (Minified Object), and Version 1 (Standard Object)
  let collection: Collection;
  let restaurants: Restaurant[];

  if (Array.isArray(data) && data[0] === 3) {
    // Version 3: [3, userName, [name, emoji, desc], [[rName, rCatIdx, rDesc, rAdd, pL, pMin, pMax, [lat, lng]], ...]]
    const catKeys = Object.keys(CATEGORIES);
    const [, , colArr, restoArr] = data;
    
    collection = {
      id: '',
      name: colArr[0],
      emoji: colArr[1],
      description: colArr[2],
      restaurantIds: [],
      createdAt: new Date().toISOString()
    };

    restaurants = (restoArr as any[]).map(r => ({
      id: `rest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: r[0],
      category: catKeys[r[1]] as RestaurantCategory || 'restaurant',
      description: r[2],
      address: r[3],
      priceLevel: r[4],
      priceMin: r[5],
      priceMax: r[6],
      location: r[7] ? { latitude: r[7][0], longitude: r[7][1] } : undefined,
      visitedAt: r[8],
      rating: r[9],
      wouldReturn: r[10],
      signatureDish: r[11],
      tags: Array.isArray(r[12]) ? r[12] : [],
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }) as Restaurant);
  } else {
    // Version 2/1 logic (Fallback)
    collection = data.collection || {
      id: '',
      name: data.c?.n || 'Sans titre',
      emoji: data.c?.e || 'Folder',
      description: data.c?.d || '',
      restaurantIds: [],
      createdAt: new Date().toISOString()
    };

    const rawRestos: any[] = data.restaurants || data.r || [];
    restaurants = rawRestos.map(r => {
      if (r.id) return r; // Version 1
      return {
        id: `rest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: r.n || 'Sans nom',
        category: r.c || 'restaurant',
        description: r.d || '',
        address: r.a || '',
        priceLevel: r.pl,
        priceMin: r.pm,
        priceMax: r.px,
        location: r.l,
        visitedAt: r.va,
        rating: r.rt,
        wouldReturn: r.wr,
        signatureDish: r.sd,
        tags: r.t || [],
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Restaurant;
    });
  }
  
  // 1. Save all restaurants
  const existingRestos = await getRestaurants();
  const newRestaurantIds: string[] = [];

  for (const newResto of restaurants) {
    // Generate new ID for all shared restaurants to avoid collisions and allow importing the same restaurant multiple times if needed
    // or we can match by name+address. Let's keep it simple: new IDs.
    const finalResto = { ...newResto, id: `rest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
    existingRestos.unshift(finalResto);
    newRestaurantIds.push(finalResto.id);
  }
  await AsyncStorage.setItem(RESTAURANTS_KEY, JSON.stringify(existingRestos));

  // 2. Save the collection
  const existingCols = await getCollections();
  const newCol: Collection = {
    ...collection,
    id: `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    restaurantIds: newRestaurantIds,
    createdAt: new Date().toISOString()
  };
  existingCols.unshift(newCol);
  await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(existingCols));

  // Notify listeners that restaurants (and collections) changed due to import
  emitRestaurantsChanged();
  emitCollectionsChanged();

  return newCol.id;
}
