import { Restaurant, RestaurantCategory } from '../types';
import { priceBandForRestaurant } from '../domain/priceBands';

export type RestaurantSortOption = 'recent' | 'name' | 'price_low' | 'price_high' | 'rating' | 'visited';
export type BudgetFilter = 'all' | 'low' | 'mid' | 'high' | 'unknown';

export interface RestaurantFilters {
  query: string;
  categories: RestaurantCategory[];
  budget: BudgetFilter;
  photosOnly: boolean;
  revisitOnly: boolean;
  minRating: number | null;
  sort: RestaurantSortOption;
}

function normalized(text?: string): string {
  return (text || '').toLowerCase().trim();
}

function effectivePrice(restaurant: Restaurant): number | null {
  const band = priceBandForRestaurant(restaurant);
  if (band === '1-10') return 5;
  if (band === '11-20') return 15;
  if (band === '21-30') return 25;
  if (restaurant.priceMin != null && restaurant.priceMax != null) {
    return (restaurant.priceMin + restaurant.priceMax) / 2;
  }
  if (restaurant.priceMin != null) return restaurant.priceMin;
  if (restaurant.priceMax != null) return restaurant.priceMax;
  if (restaurant.priceLevel != null) return restaurant.priceLevel * 15;
  return null;
}

function matchBudget(price: number | null, budget: BudgetFilter): boolean {
  if (budget === 'all') return true;
  if (budget === 'unknown') return price == null;
  if (price == null) return false;
  if (budget === 'low') return price <= 10;
  if (budget === 'mid') return price > 10 && price <= 20;
  return price > 20 && price <= 30;
}

export function filterAndSortRestaurants(
  restaurants: Restaurant[],
  filters: RestaurantFilters
): Restaurant[] {
  const q = normalized(filters.query);
  const selectedCategories = filters.categories || [];

  const filtered = restaurants.filter((restaurant) => {
    const matchesQuery =
      !q ||
      normalized(restaurant.name).includes(q) ||
      normalized(restaurant.address).includes(q) ||
      normalized(restaurant.description).includes(q) ||
      normalized(restaurant.signatureDish).includes(q) ||
      (restaurant.tags || []).some((tag) => normalized(tag).includes(q)) ||
      normalized(restaurant.category).includes(q);

    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(restaurant.category);
    const matchesPhotos = !filters.photosOnly || restaurant.images.length > 0;
    const matchesPrice = matchBudget(effectivePrice(restaurant), filters.budget);
    const matchesRevisit = !filters.revisitOnly || restaurant.wouldReturn === true;
    const matchesRating = filters.minRating == null || (restaurant.rating || 0) >= filters.minRating;

    return matchesQuery && matchesCategory && matchesPhotos && matchesPrice && matchesRevisit && matchesRating;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (filters.sort === 'name') {
      return a.name.localeCompare(b.name, 'fr');
    }

    if (filters.sort === 'price_low' || filters.sort === 'price_high') {
      const pa = effectivePrice(a);
      const pb = effectivePrice(b);

      if (pa == null && pb == null) return 0;
      if (pa == null) return 1;
      if (pb == null) return -1;
      return filters.sort === 'price_low' ? pa - pb : pb - pa;
    }

    if (filters.sort === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }

    if (filters.sort === 'visited') {
      return new Date(b.visitedAt || b.createdAt).getTime() - new Date(a.visitedAt || a.createdAt).getTime();
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return sorted;
}

export function pickRandomRestaurant(restaurants: Restaurant[]): Restaurant | null {
  if (restaurants.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * restaurants.length);
  return restaurants[randomIndex] || null;
}
