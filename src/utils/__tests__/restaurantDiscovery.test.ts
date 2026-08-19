import type { Restaurant, RestaurantCategory } from '../../types';
import { filterAndSortRestaurants, type RestaurantFilters } from '../restaurantDiscovery';

function restaurant(id: string, category: RestaurantCategory): Restaurant {
  return {
    id,
    name: id,
    category,
    images: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const baseFilters: RestaurantFilters = {
  query: '',
  categories: [],
  budget: 'all',
  photosOnly: false,
  revisitOnly: false,
  minRating: null,
  sort: 'recent',
};

describe('filterAndSortRestaurants', () => {
  const restaurants = [
    restaurant('burger', 'burger'),
    restaurant('sushi', 'sushi'),
    restaurant('café', 'cafe'),
  ];

  it('inclut toutes les catégories quand aucune catégorie n’est sélectionnée', () => {
    expect(filterAndSortRestaurants(restaurants, baseFilters)).toHaveLength(3);
  });

  it('combine plusieurs catégories avec une logique OU', () => {
    const result = filterAndSortRestaurants(restaurants, {
      ...baseFilters,
      categories: ['burger', 'sushi'],
    });

    expect(result.map((item) => item.id)).toEqual(['burger', 'sushi']);
  });
});
