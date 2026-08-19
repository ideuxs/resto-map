import type { PriceBand, Restaurant } from '../types';

export const PRICE_BANDS: ReadonlyArray<{ id: PriceBand; min: number; max: number; label: string }> = [
  { id: '1-10', min: 1, max: 10, label: '1–10 €' },
  { id: '11-20', min: 11, max: 20, label: '11–20 €' },
  { id: '21-30', min: 21, max: 30, label: '21–30 €' },
];

export function priceBandBounds(band: PriceBand) {
  return PRICE_BANDS.find((item) => item.id === band) || null;
}

/** Reads new data first, then understands old imports without changing them in place. */
export function priceBandForRestaurant(restaurant: Pick<Restaurant, 'priceBand' | 'priceMin' | 'priceMax' | 'priceLevel'>): PriceBand | null {
  if (restaurant.priceBand) return restaurant.priceBand;
  const min = restaurant.priceMin;
  const max = restaurant.priceMax;
  if (min != null || max != null) {
    const midpoint = ((min ?? max ?? 0) + (max ?? min ?? 0)) / 2;
    if (midpoint <= 10) return '1-10';
    if (midpoint <= 20) return '11-20';
    if (midpoint <= 30) return '21-30';
    return null;
  }
  if (restaurant.priceLevel === 1) return '1-10';
  if (restaurant.priceLevel === 2) return '11-20';
  if (restaurant.priceLevel === 3 || restaurant.priceLevel === 4) return '21-30';
  return null;
}

export function priceBandLabel(restaurant: Pick<Restaurant, 'priceBand' | 'priceMin' | 'priceMax' | 'priceLevel'>): string | null {
  const band = priceBandForRestaurant(restaurant);
  return band ? priceBandBounds(band)?.label || null : null;
}

export function priceBandMatches(restaurant: Pick<Restaurant, 'priceBand' | 'priceMin' | 'priceMax' | 'priceLevel'>, selected: PriceBand): boolean {
  return priceBandForRestaurant(restaurant) === selected;
}
