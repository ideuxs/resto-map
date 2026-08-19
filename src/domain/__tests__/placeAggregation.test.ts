import { aggregatePlaceReferences } from '../placeAggregation';
import type { Restaurant } from '../../types';

const base = {
  name: 'Le Servan',
  category: 'restaurant' as const,
  images: [],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

describe('aggregatePlaceReferences', () => {
  it('shows one personal place while preserving every recommending source', () => {
    const references: Restaurant[] = [
      { ...base, id: 'personal', placeId: 'place-1', origin: { kind: 'personal' } },
      { ...base, id: 'lea', placeId: 'place-1', origin: { kind: 'imported', ownerName: 'Léa', collectionId: 'c1' } },
      { ...base, id: 'adam', placeId: 'place-1', origin: { kind: 'imported', ownerName: 'Adam', collectionId: 'c2' } },
    ];

    expect(aggregatePlaceReferences(references)).toEqual([
      expect.objectContaining({
        id: 'personal',
        placeId: 'place-1',
        origin: { kind: 'personal' },
        sources: expect.arrayContaining([
          expect.objectContaining({ ownerName: 'Léa' }),
          expect.objectContaining({ ownerName: 'Adam' }),
        ]),
      }),
    ]);
  });
});
