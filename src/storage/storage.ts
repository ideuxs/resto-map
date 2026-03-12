import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant, Collection } from '../types';

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

export async function saveRestaurant(restaurant: Restaurant): Promise<void> {
  const restaurants = await getRestaurants();
  const idx = restaurants.findIndex((r) => r.id === restaurant.id);
  if (idx >= 0) {
    restaurants[idx] = restaurant;
  } else {
    restaurants.unshift(restaurant);
  }
  await AsyncStorage.setItem(RESTAURANTS_KEY, JSON.stringify(restaurants));
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
}

export async function deleteCollection(id: string): Promise<void> {
  const collections = await getCollections();
  const filtered = collections.filter((c) => c.id !== id);
  await AsyncStorage.setItem(COLLECTIONS_KEY, JSON.stringify(filtered));
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
  }
}
