import { legacyRestaurantToVisit } from '../visitMigration';

describe('legacyRestaurantToVisit', () => {
  it('converts legacy visit fields into one private visit', () => {
    const visit = legacyRestaurantToVisit({
      id: 'restaurant-1',
      placeId: 'place-1',
      name: 'Mokonuts',
      category: 'restaurant',
      visitedAt: '2026-07-12T12:30:00.000Z',
      rating: 4.5,
      wouldReturn: true,
      signatureDish: 'Cookie miso',
      images: [],
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-12T13:00:00.000Z',
    });

    expect(visit).toEqual(expect.objectContaining({
      placeId: 'place-1',
      visitedAt: '2026-07-12T12:30:00.000Z',
      rating: 4.5,
      wouldReturn: true,
      dishes: ['Cookie miso'],
      imageUris: [],
    }));
  });

  it('does not create a visit when no legacy visit data exists', () => {
    expect(legacyRestaurantToVisit({
      id: 'restaurant-2',
      name: 'Clamato',
      category: 'restaurant',
      images: [],
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
    })).toBeNull();
  });

  it('never converts an imported recommendation into a private visit', () => {
    expect(legacyRestaurantToVisit({
      id: 'imported-1',
      name: 'Le Baratin',
      category: 'restaurant',
      visitedAt: '2026-06-10T18:00:00.000Z',
      rating: 5,
      images: [],
      origin: { kind: 'imported', ownerName: 'Léa' },
      createdAt: '2026-06-10T18:00:00.000Z',
      updatedAt: '2026-06-10T18:00:00.000Z',
    })).toBeNull();
  });

  it('does not treat a default wouldReturn value as proof of a visit', () => {
    expect(legacyRestaurantToVisit({
      id: 'restaurant-3',
      name: 'Double Dragon',
      category: 'restaurant',
      wouldReturn: false,
      images: [],
      createdAt: '2026-06-10T18:00:00.000Z',
      updatedAt: '2026-06-10T18:00:00.000Z',
    })).toBeNull();
  });

  it('keeps an explicit positive return intention as historical visit evidence', () => {
    expect(legacyRestaurantToVisit({
      id: 'restaurant-4',
      name: 'Le Dauphin',
      category: 'restaurant',
      wouldReturn: true,
      images: [],
      createdAt: '2026-06-10T18:00:00.000Z',
      updatedAt: '2026-06-11T18:00:00.000Z',
    })).toEqual(expect.objectContaining({
      placeId: 'restaurant-4',
      wouldReturn: true,
      dateIsEstimated: true,
    }));
  });
});
