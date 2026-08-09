import { priceBandForRestaurant, priceBandLabel, priceBandMatches } from '../priceBands';

describe('price bands', () => {
  it('uses explicit bands and readable labels', () => {
    const restaurant = { priceBand: '11-20' as const };
    expect(priceBandForRestaurant(restaurant)).toBe('11-20');
    expect(priceBandLabel(restaurant)).toBe('11–20 €');
    expect(priceBandMatches(restaurant, '11-20')).toBe(true);
  });

  it('maps legacy euro levels without showing euro symbols', () => {
    expect(priceBandLabel({ priceLevel: 1 })).toBe('1–10 €');
    expect(priceBandLabel({ priceMin: 18, priceMax: 22 })).toBe('11–20 €');
    expect(priceBandLabel({ priceLevel: 4 })).toBe('21–30 €');
  });
});
