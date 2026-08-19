import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addWishlistChangeListener,
  getWishlistRestaurantIds,
  getWishlistRestaurants,
  isWishlisted,
  saveRestaurant,
  setWishlistStatus,
  toggleWishlist,
} from '../storage';

describe('wishlist storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('toggles wishlist status correctly and triggers listeners', async () => {
    const listener = jest.fn();
    const unsubscribe = addWishlistChangeListener(listener);

    expect(await isWishlisted('place-1')).toBe(false);

    const added = await toggleWishlist('place-1');
    expect(added).toBe(true);
    expect(await isWishlisted('place-1')).toBe(true);
    expect(await getWishlistRestaurantIds()).toEqual(['place-1']);
    expect(listener).toHaveBeenCalledTimes(1);

    const removed = await toggleWishlist('place-1');
    expect(removed).toBe(false);
    expect(await isWishlisted('place-1')).toBe(false);
    expect(await getWishlistRestaurantIds()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('sets explicit wishlist status', async () => {
    await setWishlistStatus('place-2', true);
    expect(await isWishlisted('place-2')).toBe(true);

    // Setting true again should be idempotent
    await setWishlistStatus('place-2', true);
    expect(await getWishlistRestaurantIds()).toEqual(['place-2']);

    await setWishlistStatus('place-2', false);
    expect(await isWishlisted('place-2')).toBe(false);
  });

  it('returns full restaurant objects that are in the wishlist', async () => {
    await saveRestaurant({
      id: 'resto-1',
      name: 'Le Bistrot Parisien',
      category: 'restaurant',
      images: [],
      createdAt: '2026-06-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    });

    await saveRestaurant({
      id: 'resto-2',
      name: 'Pizza Napoletana',
      category: 'pizzeria',
      images: [],
      createdAt: '2026-06-02T12:00:00.000Z',
      updatedAt: '2026-06-02T12:00:00.000Z',
    });

    await setWishlistStatus('resto-1', true);

    const wishlistRestos = await getWishlistRestaurants();
    expect(wishlistRestos.length).toBe(1);
    expect(wishlistRestos[0].name).toBe('Le Bistrot Parisien');
    expect(wishlistRestos[0].inWishlist).toBe(true);
  });
});
