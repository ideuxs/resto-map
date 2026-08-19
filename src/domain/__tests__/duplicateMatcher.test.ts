import { findDuplicateCandidates } from '../duplicateMatcher';

describe('findDuplicateCandidates', () => {
  it('automatically links the same place despite accents and punctuation', () => {
    const matches = findDuplicateCandidates(
      {
        name: 'Café de l’Étoile',
        address: '18, rue de la Paix 75002 Paris',
        location: { latitude: 48.8687, longitude: 2.3312 },
      },
      [
        {
          id: 'place-1',
          name: 'Cafe de l Etoile',
          address: '18 rue de la paix, 75002 Paris',
          location: { latitude: 48.86871, longitude: 2.33121 },
        },
      ]
    );

    expect(matches).toEqual([
      expect.objectContaining({
        placeId: 'place-1',
        resolution: 'automatic',
        reasons: expect.arrayContaining(['Même nom', 'Même adresse']),
      }),
    ]);
  });

  it('honors a previous decision to keep two places separate', () => {
    const incoming = {
      id: 'incoming-1',
      name: 'Chez Marcel',
      address: '4 rue Oberkampf, Paris',
    };

    const matches = findDuplicateCandidates(
      incoming,
      [{ id: 'place-1', name: 'Chez Marcel', address: '4 rue Oberkampf Paris' }],
      [{ incomingFingerprint: 'incoming-1', comparedPlaceId: 'place-1', resolution: 'different' }]
    );

    expect(matches).toEqual([]);
  });

  it('keeps two branches of the same chain separate beyond 250 metres', () => {
    const matches = findDuplicateCandidates(
      {
        name: 'Big Mamma',
        address: '20 avenue de Paris',
        location: { latitude: 48.8566, longitude: 2.3522 },
      },
      [{
        id: 'other-branch',
        name: 'Big Mamma',
        address: '20 avenue de Paris',
        location: { latitude: 48.8612, longitude: 2.3522 },
      }]
    );

    expect(matches).toEqual([]);
  });
});
