import type { Location } from '../types';

export interface PlaceIdentityDraft {
  id?: string;
  remoteId?: string;
  name: string;
  address?: string;
  location?: Location;
}

export interface DuplicateCandidate {
  placeId: string;
  score: number;
  nameScore: number;
  addressScore: number;
  distanceMeters: number | null;
  resolution: 'automatic' | 'review';
  reasons: string[];
}

export interface DuplicateDecisionInput {
  incomingFingerprint: string;
  comparedPlaceId: string;
  resolution: 'same' | 'different';
}

function normalize(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\b(saint)\b/g, 'st')
    .replace(/\b(avenue)\b/g, 'av')
    .replace(/\b(boulevard)\b/g, 'bd')
    .replace(/\b(rue)\b/g, 'r')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editSimilarity(a: string, b: string): number {
  if (a === b) return a ? 1 : 0;
  if (!a || !b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        (current[column - 1] ?? 0) + 1,
        (previous[column] ?? 0) + 1,
        (previous[column - 1] ?? 0) + (a[row - 1] === b[column - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return 1 - (previous[b.length] ?? Math.max(a.length, b.length)) / Math.max(a.length, b.length);
}

function haversineMeters(a?: Location, b?: Location): number | null {
  if (!a || !b) return null;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

export function findDuplicateCandidates(
  incoming: PlaceIdentityDraft,
  existing: Array<PlaceIdentityDraft & { id: string }>,
  decisions: DuplicateDecisionInput[] = []
): DuplicateCandidate[] {
  const incomingName = normalize(incoming.name);
  const incomingAddress = normalize(incoming.address);
  const fingerprint = incoming.id || `${incomingName}|${incomingAddress}`;

  return existing
    .map((candidate): DuplicateCandidate | null => {
      const priorDecision = decisions.find(
        (decision) => decision.incomingFingerprint === fingerprint && decision.comparedPlaceId === candidate.id
      );
      if (priorDecision?.resolution === 'different') return null;
      const nameScore = editSimilarity(incomingName, normalize(candidate.name));
      const addressScore = editSimilarity(incomingAddress, normalize(candidate.address));
      const distanceMeters = haversineMeters(incoming.location, candidate.location);
      const isDifferentBranch = distanceMeters != null && distanceMeters > 250;
      const distanceScore = distanceMeters == null ? 0 : Math.max(0, 1 - distanceMeters / 250);
      const sameRemoteId = Boolean(incoming.remoteId && candidate.remoteId === incoming.remoteId);
      const automatic = priorDecision?.resolution === 'same' || sameRemoteId || (
        !isDifferentBranch && nameScore >= 0.92 &&
        (addressScore >= 0.9 || (distanceMeters != null && distanceMeters <= 75))
      );
      const score = nameScore * 0.45 + addressScore * 0.35 + distanceScore * 0.2;
      if ((!sameRemoteId && isDifferentBranch) || (!automatic && score < 0.72)) return null;

      const reasons: string[] = [];
      if (priorDecision?.resolution === 'same') reasons.push('Association confirmée');
      if (sameRemoteId) reasons.push('Même identifiant partagé');
      if (nameScore >= 0.92) reasons.push('Même nom');
      if (addressScore >= 0.9) reasons.push('Même adresse');
      if (distanceMeters != null && distanceMeters <= 75) reasons.push(`À ${Math.round(distanceMeters)} m`);

      return {
        placeId: candidate.id,
        score,
        nameScore,
        addressScore,
        distanceMeters,
        resolution: automatic ? 'automatic' : 'review',
        reasons,
      };
    })
    .filter((candidate): candidate is DuplicateCandidate => Boolean(candidate))
    .sort((a, b) => Number(b.resolution === 'automatic') - Number(a.resolution === 'automatic') || b.score - a.score)
    .slice(0, 3);
}

export const duplicateMatcherInternals = { normalize, editSimilarity, haversineMeters };
