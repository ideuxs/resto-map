import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  deleteCollection,
  createSharedCollectionPayload,
  getLocalShareOwner,
  getCollections,
  getDuplicateReviews,
  getRestaurants,
  getVisits,
  importSharedCollectionDetailed,
  getDuplicateDecisions,
  resolveDuplicate,
  saveRestaurant,
  saveCollection,
  setLocalShareOwnerName,
  undoDuplicate,
} from '../storage';

describe('catalog migration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('persists the sender display name for future share payloads', async () => {
    await saveCollection({
      id: 'paris', name: 'Paris', emoji: 'MapPinned', restaurantIds: [], kind: 'personal',
      isVisible: true, createdAt: '2026-06-01T12:00:00.000Z',
    });

    const owner = await setLocalShareOwnerName('Camille');
    expect(await getLocalShareOwner()).toEqual(owner);

    const payload = await createSharedCollectionPayload('paris', owner);
    expect(payload.owner).toEqual({ id: owner.id, displayName: 'Camille' });
  });

  it('migrates legacy records once and never turns an imported opinion into a visit', async () => {
    await AsyncStorage.multiSet([
      ['@restohub_restaurants', JSON.stringify([
        {
          id: 'mine', name: 'Clamato', category: 'restaurant', visitedAt: '2026-06-01T12:00:00.000Z',
          rating: 4, images: [], createdAt: '2026-05-01T12:00:00.000Z', updatedAt: '2026-06-01T12:00:00.000Z',
        },
        {
          id: 'friend', name: 'Le Baratin', category: 'restaurant', visitedAt: '2026-06-02T12:00:00.000Z',
          rating: 5, images: [], createdAt: '2026-05-02T12:00:00.000Z', updatedAt: '2026-06-02T12:00:00.000Z',
        },
      ])],
      ['@restohub_collections', JSON.stringify([
        { id: 'shared_1', name: 'Léa', emoji: 'UsersRound', restaurantIds: ['friend'], kind: 'imported', ownerName: 'Léa', createdAt: '2026-06-02T12:00:00.000Z' },
      ])],
    ]);

    const [restaurants, collections, visits] = await Promise.all([getRestaurants(), getCollections(), getVisits()]);

    expect(restaurants).toHaveLength(2);
    expect(collections[0].restaurantIds).toEqual(['friend']);
    expect(visits).toHaveLength(1);
    expect(visits[0]).toEqual(expect.objectContaining({ placeId: 'mine', rating: 4 }));
    expect(await AsyncStorage.getItem('@restohub_catalog_v1')).not.toBeNull();
  });

  it('queues likely legacy duplicates without merging them automatically', async () => {
    await AsyncStorage.setItem('@restohub_restaurants', JSON.stringify([
      {
        id: 'first', name: 'Café de Flore', category: 'cafe', address: '172 boulevard Saint-Germain, Paris',
        images: [], createdAt: '2026-05-01T12:00:00.000Z', updatedAt: '2026-05-01T12:00:00.000Z',
      },
      {
        id: 'second', name: 'Cafe de Flore', category: 'cafe', address: '172 bd St Germain Paris',
        images: [], createdAt: '2026-05-02T12:00:00.000Z', updatedAt: '2026-05-02T12:00:00.000Z',
      },
    ]));

    const [restaurants, reviews] = await Promise.all([getRestaurants(), getDuplicateReviews()]);

    expect(restaurants).toHaveLength(2);
    expect(reviews).toEqual([
      expect.objectContaining({ incomingReferenceId: 'ref:second', candidatePlaceIds: ['first'] }),
    ]);
  });

  it('reimports v4 idempotently and preserves a personal place when its imported source is removed', async () => {
    await saveRestaurant({
      id: 'mine', name: 'Clamato', category: 'restaurant', address: '80 rue de Charonne, Paris',
      location: { latitude: 48.8537, longitude: 2.3812 }, images: [],
      createdAt: '2026-05-01T12:00:00.000Z', updatedAt: '2026-05-01T12:00:00.000Z',
    });
    const payload = {
      v: 4,
      owner: { id: 'friend-device', displayName: 'Léa' },
      collection: { id: 'paris', revision: 3, name: 'Paris', icon: 'MapPinned' },
      places: [{
        id: 'remote-clamato', name: 'Clamato', category: 'restaurant', address: '80 rue de Charonne Paris',
        location: [48.85371, 2.38121],
      }],
    };

    const first = await importSharedCollectionDetailed(payload);
    const second = await importSharedCollectionDetailed(payload);

    expect(first).toEqual(expect.objectContaining({ added: 0, linked: 1, ignored: false }));
    expect(second).toEqual(expect.objectContaining({ collectionId: first.collectionId, ignored: true }));
    expect(await getRestaurants()).toHaveLength(1);

    const [automaticDecision] = await getDuplicateDecisions();
    expect(automaticDecision.automatic).toBe(true);
    await undoDuplicate(automaticDecision.id);
    expect(await getRestaurants()).toHaveLength(2);

    await deleteCollection(first.collectionId);

    const remaining = await getRestaurants();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toEqual(expect.objectContaining({ id: 'mine', hasPersonalReference: true }));
  });

  it('still imports a legacy v3 tuple without leaking its rating into the private journal', async () => {
    const result = await importSharedCollectionDetailed([
      3,
      'Noé',
      ['Adresses', 'Bookmark', ''],
      [['Mokonuts', 0, '', '5 rue Saint-Bernard Paris', 2, 10, 30, null, '2026-01-01', 5, true, 'Cookie', []]],
    ]);

    expect(result.added).toBe(1);
    expect(await getRestaurants()).toHaveLength(1);
    expect(await getVisits()).toEqual([]);
  });

  it('can undo a manual association without losing either place', async () => {
    await AsyncStorage.setItem('@restohub_restaurants', JSON.stringify([
      { id: 'a', name: 'Le Verre Volé', category: 'restaurant', address: '67 rue de Lancry Paris', images: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'b', name: 'Le Verre Vole', category: 'restaurant', address: '67 rue de Lancry, Paris', images: [], createdAt: '2026-01-02', updatedAt: '2026-01-02' },
    ]));
    const [review] = await getDuplicateReviews();

    await resolveDuplicate(review.id, review.candidatePlaceIds[0]);
    expect(await getRestaurants()).toHaveLength(1);

    const [decision] = await getDuplicateDecisions();
    await undoDuplicate(decision.id);

    expect(await getRestaurants()).toHaveLength(2);
  });
});
