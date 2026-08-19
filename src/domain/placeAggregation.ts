import type { Restaurant, RestaurantOrigin } from '../types';

export function aggregatePlaceReferences(references: Restaurant[]): Restaurant[] {
  const groups = new Map<string, Restaurant[]>();
  references.forEach((reference) => {
    const placeId = reference.placeId || reference.id;
    groups.set(placeId, [...(groups.get(placeId) || []), reference]);
  });

  return Array.from(groups.entries()).map(([placeId, entries]) => {
    const personal = entries.find((entry) => entry.origin?.kind !== 'imported');
    const primary = personal || [...entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];
    const sources = entries
      .map((entry) => entry.origin)
      .filter((origin): origin is RestaurantOrigin => origin?.kind === 'imported')
      .filter((origin, index, all) => all.findIndex(
        (candidate) => candidate.collectionId === origin.collectionId && candidate.ownerName === origin.ownerName
      ) === index);

    return {
      ...primary,
      placeId,
      referenceId: primary.referenceId || primary.id,
      sources,
    };
  });
}
