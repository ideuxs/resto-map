import type { Restaurant, Visit } from '../types';

export function legacyRestaurantToVisit(restaurant: Restaurant): Visit | null {
  if (restaurant.origin?.kind === 'imported') return null;
  const hasVisitData = Boolean(
    restaurant.visitedAt ||
    restaurant.rating != null ||
    restaurant.signatureDish ||
    restaurant.wouldReturn === true
  );
  if (!hasVisitData) return null;

  const timestamp = restaurant.visitedAt || restaurant.updatedAt || restaurant.createdAt;
  return {
    id: `legacy_visit_${restaurant.id}`,
    placeId: restaurant.placeId || restaurant.id,
    visitedAt: timestamp,
    rating: restaurant.rating,
    wouldReturn: restaurant.wouldReturn,
    dishes: restaurant.signatureDish ? [restaurant.signatureDish] : [],
    imageUris: [],
    createdAt: timestamp,
    updatedAt: restaurant.updatedAt || timestamp,
    dateIsEstimated: !restaurant.visitedAt,
  };
}
