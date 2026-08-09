import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Collection,
  CollectionMembership,
  DuplicateDecision,
  DuplicateReview,
  ImportReceipt,
  ImportResult,
  Place,
  PlaceReference,
  PlaceSummary,
  Restaurant,
  RestaurantCategory,
  RestaurantOrigin,
  PriceBand,
  Visit,
} from '../types';
import { CATEGORIES } from '../constants/categories';
import {
  getSourceColor,
  isSourceColorKey,
  sourceColorKeyFor,
  SourceColorKey,
} from '../constants/theme';
import { findDuplicateCandidates } from '../domain/duplicateMatcher';
import { legacyRestaurantToVisit } from '../domain/visitMigration';

const LEGACY_RESTAURANTS_KEY = '@restohub_restaurants';
const LEGACY_COLLECTIONS_KEY = '@restohub_collections';
const CATALOG_KEY = '@restohub_catalog_v1';
const SHARE_OWNER_KEY = '@restohub_share_owner_v1';

type CatalogCollection = Omit<Collection, 'restaurantIds'>;

interface CatalogSnapshot {
  schemaVersion: 1;
  places: Place[];
  references: PlaceReference[];
  collections: CatalogCollection[];
  memberships: CollectionMembership[];
  duplicateDecisions: DuplicateDecision[];
  duplicateReviews: DuplicateReview[];
  visits: Visit[];
  importReceipts: ImportReceipt[];
}

interface IncomingPlace {
  id: string;
  name: string;
  category: RestaurantCategory;
  address?: string;
  location?: { latitude: number; longitude: number; address?: string };
  description?: string;
  rating?: number;
  wouldReturn?: boolean;
  signatureDish?: string;
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  priceLevel?: number;
  priceBand?: PriceBand;
}

interface NormalizedShare {
  ownerId: string;
  ownerName: string;
  remoteCollectionId: string;
  revision: number;
  name: string;
  icon: string;
  description?: string;
  places: IncomingPlace[];
  hash: string;
  legacy: boolean;
}

const restaurantChangeListeners = new Set<() => void>();
const collectionChangeListeners = new Set<() => void>();
const visitChangeListeners = new Set<() => void>();
let migrationPromise: Promise<CatalogSnapshot> | null = null;
let mutationQueue: Promise<unknown> = Promise.resolve();

function emitRestaurantsChanged() { restaurantChangeListeners.forEach((listener) => listener()); }
function emitCollectionsChanged() { collectionChangeListeners.forEach((listener) => listener()); }
function emitVisitsChanged() { visitChangeListeners.forEach((listener) => listener()); }

export function addRestaurantsChangeListener(listener: () => void) {
  restaurantChangeListeners.add(listener);
  return () => { restaurantChangeListeners.delete(listener); };
}

export function addCollectionsChangeListener(listener: () => void) {
  collectionChangeListeners.add(listener);
  return () => { collectionChangeListeners.delete(listener); };
}

export function addVisitsChangeListener(listener: () => void) {
  visitChangeListeners.add(listener);
  return () => { visitChangeListeners.delete(listener); };
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizedSourceKey(value?: string, fallback = 'un ami'): SourceColorKey {
  return isSourceColorKey(value) ? value : sourceColorKeyFor(fallback);
}

export function sourceColorFor(value: string): string {
  return getSourceColor(sourceColorKeyFor(value), 'light');
}

function normalizeCollection(collection: Collection): CatalogCollection {
  const kind = collection.kind || (collection.id.startsWith('shared_') ? 'imported' : 'personal');
  const ownerName = kind === 'imported' ? collection.ownerName || 'un ami' : undefined;
  const sourceColorKey = kind === 'imported'
    ? normalizedSourceKey(collection.sourceColorKey, ownerName)
    : undefined;
  const { restaurantIds: _restaurantIds, ...record } = collection;
  return {
    ...record,
    emoji: collection.emoji || 'Bookmark',
    kind,
    ownerName,
    sourceColorKey,
    sourceColor: undefined,
    isVisible: kind === 'imported' ? collection.isVisible !== false : true,
  };
}

function validateCatalog(catalog: CatalogSnapshot) {
  const placeIds = new Set(catalog.places.map((place) => place.id));
  const referenceIds = new Set(catalog.references.map((reference) => reference.id));
  const collectionIds = new Set(catalog.collections.map((collection) => collection.id));
  if (catalog.references.some((reference) => !placeIds.has(reference.placeId))) {
    throw new Error('Catalogue invalide : référence sans lieu.');
  }
  if (catalog.memberships.some((membership) => !referenceIds.has(membership.referenceId) || !collectionIds.has(membership.collectionId))) {
    throw new Error('Catalogue invalide : appartenance orpheline.');
  }
}

function inferredOrigin(restaurant: Restaurant, collections: Collection[]): RestaurantOrigin {
  if (restaurant.origin) return restaurant.origin;
  const importedCollection = collections.find(
    (collection) => collection.kind === 'imported' && collection.restaurantIds.includes(restaurant.id)
  );
  if (!importedCollection) return { kind: 'personal' };
  const key = normalizedSourceKey(importedCollection.sourceColorKey, importedCollection.ownerName);
  return {
    kind: 'imported',
    collectionId: importedCollection.id,
    ownerName: importedCollection.ownerName || 'un ami',
    ownerId: importedCollection.ownerId,
    sourceColorKey: key,
    remoteRestaurantId: undefined,
  };
}

async function migrateLegacy(): Promise<CatalogSnapshot> {
  const [rawRestaurants, rawCollections] = await Promise.all([
    AsyncStorage.getItem(LEGACY_RESTAURANTS_KEY),
    AsyncStorage.getItem(LEGACY_COLLECTIONS_KEY),
  ]);
  const restaurants = rawRestaurants ? (JSON.parse(rawRestaurants) as Restaurant[]) : [];
  const collections = rawCollections ? (JSON.parse(rawCollections) as Collection[]) : [];
  const places: Place[] = [];
  const references: PlaceReference[] = [];
  const restaurantToReference = new Map<string, string>();

  restaurants.forEach((restaurant) => {
    const placeId = restaurant.placeId || restaurant.id;
    if (!places.some((place) => place.id === placeId)) {
      places.push({
        id: placeId,
        name: restaurant.name,
        category: restaurant.category,
        address: restaurant.address,
        location: restaurant.location,
        createdAt: restaurant.createdAt,
        updatedAt: restaurant.updatedAt,
      });
    }
    const referenceId = restaurant.referenceId || `ref:${restaurant.id}`;
    const origin = inferredOrigin(restaurant, collections);
    const key = origin.kind === 'imported' ? normalizedSourceKey(origin.sourceColorKey, origin.ownerName) : undefined;
    references.push({
      id: referenceId,
      placeId,
      origin: key ? { ...origin, sourceColorKey: key, sourceColor: undefined } : origin,
      identitySnapshot: {
        name: restaurant.name,
        category: restaurant.category,
        address: restaurant.address,
        location: restaurant.location,
      },
      description: restaurant.description,
      rating: origin.kind === 'imported' ? restaurant.rating : undefined,
      wouldReturn: origin.kind === 'imported' ? restaurant.wouldReturn : undefined,
      signatureDish: origin.kind === 'imported' ? restaurant.signatureDish : undefined,
      tags: restaurant.tags || [],
      priceMin: restaurant.priceMin,
      priceMax: restaurant.priceMax,
      priceLevel: restaurant.priceLevel,
      priceBand: restaurant.priceBand,
      images: restaurant.images || [],
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
    });
    restaurantToReference.set(restaurant.id, referenceId);
  });

  const visits = restaurants
    .map((restaurant) => legacyRestaurantToVisit({ ...restaurant, origin: inferredOrigin(restaurant, collections) }))
    .filter((visit): visit is Visit => Boolean(visit));
  const memberships = collections.flatMap((collection) => collection.restaurantIds
    .map((restaurantId) => restaurantToReference.get(restaurantId))
    .filter((referenceId): referenceId is string => Boolean(referenceId))
    .map((referenceId) => ({ collectionId: collection.id, referenceId })));
  const duplicateReviews: DuplicateReview[] = references.flatMap((reference, index) => {
    const matches = findDuplicateCandidates(
      { id: reference.id, ...reference.identitySnapshot },
      places.slice(0, index)
    );
    if (!matches.length) return [];
    return [{
      id: `review:legacy:${hashString(reference.id)}`,
      incomingReferenceId: reference.id,
      candidatePlaceIds: matches.map((match) => match.placeId),
      reasons: matches.flatMap((match) => match.reasons),
      createdAt: reference.createdAt,
    }];
  });
  const catalog: CatalogSnapshot = {
    schemaVersion: 1,
    places,
    references,
    collections: collections.map(normalizeCollection),
    memberships,
    duplicateDecisions: [],
    duplicateReviews,
    visits,
    importReceipts: [],
  };
  validateCatalog(catalog);
  await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  return catalog;
}

async function readCatalog(): Promise<CatalogSnapshot> {
  const raw = await AsyncStorage.getItem(CATALOG_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Partial<CatalogSnapshot>;
    const catalog: CatalogSnapshot = {
      schemaVersion: 1,
      places: parsed.places || [],
      references: (parsed.references || []).map((reference) => ({
        ...reference,
        rating: reference.origin.kind === 'personal' ? undefined : reference.rating,
        wouldReturn: reference.origin.kind === 'personal' ? undefined : reference.wouldReturn,
        signatureDish: reference.origin.kind === 'personal' ? undefined : reference.signatureDish,
        origin: reference.origin.kind === 'imported'
          ? {
              ...reference.origin,
              sourceColor: undefined,
              sourceColorKey: normalizedSourceKey(
                reference.origin.sourceColorKey,
                reference.origin.ownerId || reference.origin.ownerName
              ),
            }
          : reference.origin,
      })),
      collections: (parsed.collections || []).map((collection) => ({
        ...collection,
        sourceColor: undefined,
        sourceColorKey: collection.kind === 'imported'
          ? normalizedSourceKey(collection.sourceColorKey, collection.ownerId || collection.ownerName)
          : undefined,
      })),
      memberships: parsed.memberships || [],
      duplicateDecisions: parsed.duplicateDecisions || [],
      duplicateReviews: parsed.duplicateReviews || [],
      visits: (parsed.visits || []).map((visit) => ({
        ...visit,
        dishes: visit.dishes || [],
        imageUris: visit.imageUris || [],
      })),
      importReceipts: parsed.importReceipts || [],
    };
    validateCatalog(catalog);
    return catalog;
  }
  if (!migrationPromise) migrationPromise = migrateLegacy().finally(() => { migrationPromise = null; });
  return migrationPromise;
}

function cloneCatalog(catalog: CatalogSnapshot): CatalogSnapshot {
  return JSON.parse(JSON.stringify(catalog)) as CatalogSnapshot;
}

function transactCatalog<T>(mutator: (catalog: CatalogSnapshot) => T | Promise<T>): Promise<T> {
  const operation = mutationQueue.then(async () => {
    const catalog = cloneCatalog(await readCatalog());
    const result = await mutator(catalog);
    validateCatalog(catalog);
    await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    return result;
  });
  mutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

function projectSummaries(catalog: CatalogSnapshot, visibleOnly: boolean): PlaceSummary[] {
  const collectionById = new Map(catalog.collections.map((collection) => [collection.id, collection]));
  const visibleReferences = catalog.references.filter((reference) => {
    if (!visibleOnly || reference.origin.kind !== 'imported') return true;
    const collection = reference.origin.collectionId ? collectionById.get(reference.origin.collectionId) : undefined;
    return !collection || collection.isVisible !== false;
  });
  const byPlace = new Map<string, PlaceReference[]>();
  visibleReferences.forEach((reference) => byPlace.set(reference.placeId, [...(byPlace.get(reference.placeId) || []), reference]));

  return catalog.places.flatMap((place) => {
    const references = byPlace.get(place.id) || [];
    if (!references.length) return [];
    const personal = references.find((reference) => reference.origin.kind === 'personal');
    const primary = personal || [...references].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    const visits = catalog.visits
      .filter((visit) => visit.placeId === place.id)
      .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
    const ratedVisits = visits.filter((visit) => visit.rating != null);
    const personalAverage = ratedVisits.length
      ? ratedVisits.reduce((sum, visit) => sum + (visit.rating || 0), 0) / ratedVisits.length
      : undefined;
    const lastVisit = visits[0];
    const sources = references
      .map((reference) => reference.origin)
      .filter((origin) => origin.kind === 'imported')
      .filter((origin, index, all) => all.findIndex((candidate) => candidate.collectionId === origin.collectionId) === index);
    return [{
      id: place.id,
      placeId: place.id,
      referenceId: primary.id,
      name: place.name,
      category: place.category,
      address: place.address,
      location: place.location,
      description: primary.description,
      visitedAt: lastVisit?.visitedAt,
      rating: personalAverage ?? primary.rating,
      wouldReturn: lastVisit?.wouldReturn ?? primary.wouldReturn,
      signatureDish: lastVisit?.dishes[0] ?? primary.signatureDish,
      tags: primary.tags || [],
      priceMin: primary.priceMin,
      priceMax: primary.priceMax,
      priceLevel: primary.priceLevel,
      priceBand: primary.priceBand,
      images: primary.images || [],
      origin: personal ? { kind: 'personal' } : primary.origin,
      sources,
      hasPersonalReference: Boolean(personal),
      createdAt: place.createdAt,
      updatedAt: references.reduce((latest, reference) => reference.updatedAt > latest ? reference.updatedAt : latest, place.updatedAt),
    }];
  });
}

export async function getPlaceSummaries(options?: { visibleOnly?: boolean }): Promise<PlaceSummary[]> {
  return projectSummaries(await readCatalog(), options?.visibleOnly === true);
}

export async function getRestaurants(): Promise<Restaurant[]> {
  return getPlaceSummaries();
}

export async function getVisibleRestaurants(): Promise<Restaurant[]> {
  return getPlaceSummaries({ visibleOnly: true });
}

export async function getCollections(): Promise<Collection[]> {
  const catalog = await readCatalog();
  const referenceById = new Map(catalog.references.map((reference) => [reference.id, reference]));
  return catalog.collections.map((collection) => ({
    ...collection,
    restaurantIds: Array.from(new Set(catalog.memberships
      .filter((membership) => membership.collectionId === collection.id)
      .map((membership) => referenceById.get(membership.referenceId)?.placeId)
      .filter((placeId): placeId is string => Boolean(placeId)))),
  }));
}

export async function saveRestaurant(restaurant: Restaurant): Promise<string> {
  const savedPlaceId = await transactCatalog((catalog) => {
    const now = new Date().toISOString();
    const requestedPlaceId = restaurant.placeId || restaurant.id;
    const currentPlace = catalog.places.find((place) => place.id === requestedPlaceId);
    const automatic = currentPlace ? null : findDuplicateCandidates(
      { id: restaurant.id, name: restaurant.name, address: restaurant.address, location: restaurant.location },
      catalog.places
    ).find((candidate) => candidate.resolution === 'automatic');
    const placeId = currentPlace?.id || automatic?.placeId || requestedPlaceId;
    if (automatic && !catalog.places.some((place) => place.id === requestedPlaceId)) {
      catalog.places.push({
        id: requestedPlaceId,
        name: restaurant.name,
        category: restaurant.category,
        address: restaurant.address,
        location: restaurant.location,
        createdAt: restaurant.createdAt || now,
        updatedAt: restaurant.updatedAt || now,
      });
    }
    const placeIndex = catalog.places.findIndex((place) => place.id === placeId);
    const place: Place = {
      id: placeId,
      name: restaurant.name,
      category: restaurant.category,
      address: restaurant.address,
      location: restaurant.location,
      createdAt: placeIndex >= 0 ? catalog.places[placeIndex].createdAt : restaurant.createdAt || now,
      updatedAt: restaurant.updatedAt || now,
    };
    if (placeIndex >= 0) catalog.places[placeIndex] = place;
    else catalog.places.unshift(place);

    const existingReference = catalog.references.find((reference) => reference.placeId === placeId && reference.origin.kind === 'personal');
    const reference: PlaceReference = {
      id: existingReference?.id || `personal:${placeId}`,
      placeId,
      origin: { kind: 'personal' },
      identitySnapshot: { name: place.name, category: place.category, address: place.address, location: place.location },
      description: restaurant.description,
      rating: restaurant.rating,
      wouldReturn: restaurant.wouldReturn,
      signatureDish: restaurant.signatureDish,
      tags: restaurant.tags || [],
      priceMin: restaurant.priceMin,
      priceMax: restaurant.priceMax,
      priceLevel: restaurant.priceLevel,
      priceBand: restaurant.priceBand,
      images: restaurant.images || [],
      createdAt: existingReference?.createdAt || restaurant.createdAt || now,
      updatedAt: restaurant.updatedAt || now,
    };
    const referenceIndex = existingReference ? catalog.references.indexOf(existingReference) : -1;
    if (referenceIndex >= 0) catalog.references[referenceIndex] = reference;
    else catalog.references.unshift(reference);
    if (automatic && !existingReference) {
      catalog.duplicateDecisions.unshift({
        id: `decision:auto:${hashString(reference.id)}`,
        incomingReferenceId: reference.id,
        fingerprint: reference.id,
        comparedPlaceId: automatic.placeId,
        resolution: 'same',
        previousPlaceId: requestedPlaceId,
        resultingPlaceId: automatic.placeId,
        automatic: true,
        decidedAt: now,
      });
    }
    return placeId;
  });
  emitRestaurantsChanged();
  return savedPlaceId;
}

export const upsertPersonalPlace = saveRestaurant;

export async function deleteRestaurant(placeId: string): Promise<void> {
  await transactCatalog((catalog) => {
    const removedReferenceIds = new Set(catalog.references
      .filter((reference) => reference.placeId === placeId && reference.origin.kind === 'personal')
      .map((reference) => reference.id));
    catalog.references = catalog.references.filter((reference) => !removedReferenceIds.has(reference.id));
    catalog.memberships = catalog.memberships.filter((membership) => !removedReferenceIds.has(membership.referenceId));
    const stillReferenced = catalog.references.some((reference) => reference.placeId === placeId);
    const hasVisits = catalog.visits.some((visit) => visit.placeId === placeId);
    if (!stillReferenced && !hasVisits) catalog.places = catalog.places.filter((place) => place.id !== placeId);
  });
  emitRestaurantsChanged();
  emitCollectionsChanged();
}

export const removePersonalReference = deleteRestaurant;

export async function saveCollection(collection: Collection): Promise<void> {
  await transactCatalog((catalog) => {
    const record = normalizeCollection(collection);
    const index = catalog.collections.findIndex((item) => item.id === collection.id);
    if (index >= 0) catalog.collections[index] = record;
    else catalog.collections.unshift(record);
    const existing = new Set(catalog.memberships.filter((item) => item.collectionId === collection.id).map((item) => item.referenceId));
    collection.restaurantIds.forEach((placeId) => {
      const reference = catalog.references.find((item) => item.placeId === placeId && item.origin.kind === 'personal') || catalog.references.find((item) => item.placeId === placeId);
      if (reference && !existing.has(reference.id)) catalog.memberships.push({ collectionId: collection.id, referenceId: reference.id });
    });
  });
  emitCollectionsChanged();
}

export async function setCollectionVisibility(id: string, isVisible: boolean): Promise<void> {
  await transactCatalog((catalog) => {
    const collection = catalog.collections.find((item) => item.id === id && item.kind === 'imported');
    if (collection) collection.isVisible = isVisible;
  });
  emitCollectionsChanged();
  emitRestaurantsChanged();
}

function removeOrphanPlaces(catalog: CatalogSnapshot) {
  const referenced = new Set(catalog.references.map((reference) => reference.placeId));
  const visited = new Set(catalog.visits.map((visit) => visit.placeId));
  const reversible = new Set(catalog.duplicateDecisions
    .filter((decision) => !decision.revertedAt)
    .map((decision) => decision.previousPlaceId));
  catalog.places = catalog.places.filter((place) => referenced.has(place.id) || visited.has(place.id) || reversible.has(place.id));
}

export async function deleteCollection(id: string): Promise<void> {
  await transactCatalog((catalog) => {
    const target = catalog.collections.find((collection) => collection.id === id);
    const referenceIds = new Set(catalog.memberships.filter((membership) => membership.collectionId === id).map((membership) => membership.referenceId));
    catalog.memberships = catalog.memberships.filter((membership) => membership.collectionId !== id);
    catalog.collections = catalog.collections.filter((collection) => collection.id !== id);
    if (target?.kind === 'imported') {
      catalog.references = catalog.references.filter((reference) => !referenceIds.has(reference.id));
      catalog.duplicateReviews = catalog.duplicateReviews.filter((review) => !referenceIds.has(review.incomingReferenceId));
      catalog.duplicateDecisions = catalog.duplicateDecisions.filter((decision) => !referenceIds.has(decision.incomingReferenceId));
      removeOrphanPlaces(catalog);
    }
  });
  emitCollectionsChanged();
  emitRestaurantsChanged();
}

export async function addRestaurantToCollection(collectionId: string, placeId: string): Promise<void> {
  await transactCatalog((catalog) => {
    const collection = catalog.collections.find((item) => item.id === collectionId);
    if (!collection || collection.kind === 'imported') return;
    const reference = catalog.references.find((item) => item.placeId === placeId && item.origin.kind === 'personal');
    if (!reference) return;
    if (!catalog.memberships.some((item) => item.collectionId === collectionId && item.referenceId === reference.id)) {
      catalog.memberships.push({ collectionId, referenceId: reference.id });
    }
  });
  emitCollectionsChanged();
}

export async function removeRestaurantFromCollection(collectionId: string, placeId: string): Promise<void> {
  await transactCatalog((catalog) => {
    const collection = catalog.collections.find((item) => item.id === collectionId);
    if (collection?.kind === 'imported') return;
    const referenceIds = new Set(catalog.references.filter((item) => item.placeId === placeId).map((item) => item.id));
    catalog.memberships = catalog.memberships.filter((item) => item.collectionId !== collectionId || !referenceIds.has(item.referenceId));
  });
  emitCollectionsChanged();
}

export async function getVisits(placeId?: string): Promise<Visit[]> {
  const visits = (await readCatalog()).visits;
  return visits
    .filter((visit) => !placeId || visit.placeId === placeId)
    .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime());
}

export async function saveVisit(visit: Visit): Promise<void> {
  await transactCatalog((catalog) => {
    const index = catalog.visits.findIndex((item) => item.id === visit.id);
    if (index >= 0) catalog.visits[index] = visit;
    else catalog.visits.unshift(visit);
    const place = catalog.places.find((item) => item.id === visit.placeId);
    if (place && !catalog.references.some((item) => item.placeId === place.id && item.origin.kind === 'personal')) {
      catalog.references.unshift({
        id: `personal:${place.id}`,
        placeId: place.id,
        origin: { kind: 'personal' },
        identitySnapshot: { name: place.name, category: place.category, address: place.address, location: place.location },
        images: [], tags: [], createdAt: visit.createdAt, updatedAt: visit.updatedAt,
      });
    }
  });
  emitVisitsChanged();
  emitRestaurantsChanged();
}

export async function deleteVisit(id: string): Promise<void> {
  await transactCatalog((catalog) => { catalog.visits = catalog.visits.filter((visit) => visit.id !== id); });
  emitVisitsChanged();
}

export async function getDuplicateDecisions(): Promise<DuplicateDecision[]> {
  return (await readCatalog()).duplicateDecisions;
}

export async function getDuplicateReviews(): Promise<DuplicateReview[]> {
  return (await readCatalog()).duplicateReviews;
}

export async function resolveDuplicate(reviewId: string, comparedPlaceId: string | null): Promise<void> {
  await transactCatalog((catalog) => {
    const review = catalog.duplicateReviews.find((item) => item.id === reviewId);
    const reference = review ? catalog.references.find((item) => item.id === review.incomingReferenceId) : undefined;
    if (!review || !reference) return;
    const previousPlaceId = reference.placeId;
    const resultingPlaceId = comparedPlaceId || previousPlaceId;
    if (comparedPlaceId) reference.placeId = comparedPlaceId;
    catalog.duplicateDecisions.unshift({
      id: `decision:${review.id}`,
      incomingReferenceId: reference.id,
      fingerprint: review.id,
      comparedPlaceId: comparedPlaceId || review.candidatePlaceIds[0] || previousPlaceId,
      resolution: comparedPlaceId ? 'same' : 'different',
      previousPlaceId,
      resultingPlaceId,
      automatic: false,
      decidedAt: new Date().toISOString(),
    });
    catalog.duplicateReviews = catalog.duplicateReviews.filter((item) => item.id !== reviewId);
  });
  emitRestaurantsChanged();
  emitCollectionsChanged();
}

export async function undoDuplicate(decisionId: string): Promise<void> {
  await transactCatalog((catalog) => {
    const decision = catalog.duplicateDecisions.find((item) => item.id === decisionId && !item.revertedAt);
    const reference = decision ? catalog.references.find((item) => item.id === decision.incomingReferenceId) : undefined;
    if (!decision || !reference) return;
    reference.placeId = decision.previousPlaceId;
    decision.revertedAt = new Date().toISOString();
  });
  emitRestaurantsChanged();
  emitCollectionsChanged();
}

function normalizeShare(data: any): NormalizedShare {
  const serialized = JSON.stringify(data);
  const hash = hashString(serialized);
  if (data?.v === 4 && data.owner && data.collection && Array.isArray(data.places)) {
    return {
      ownerId: String(data.owner.id),
      ownerName: String(data.owner.displayName || 'un ami'),
      remoteCollectionId: String(data.collection.id),
      revision: Number(data.collection.revision) || 1,
      name: String(data.collection.name || 'Sans titre'),
      icon: String(data.collection.icon || 'UsersRound'),
      description: data.collection.description ? String(data.collection.description) : undefined,
      places: data.places.map((place: any) => ({
        id: String(place.id), name: String(place.name || 'Sans nom'), category: place.category || 'restaurant',
        priceBand: place.priceBand, priceMin: place.priceMin, priceMax: place.priceMax, priceLevel: place.priceLevel,
        address: place.address, location: Array.isArray(place.location) ? { latitude: place.location[0], longitude: place.location[1] } : place.location,
      })),
      hash, legacy: false,
    };
  }

  const categoryKeys = Object.keys(CATEGORIES) as RestaurantCategory[];
  const ownerName = Array.isArray(data) ? data[1] || 'un ami' : data?.userName || data?.u || 'un ami';
  const rawPlaces = Array.isArray(data) ? data[3] || [] : data?.restaurants || data?.r || [];
  const list = Array.isArray(data) ? data[2] || [] : null;
  return {
    ownerId: `legacy:${hashString(ownerName)}`,
    ownerName,
    remoteCollectionId: `legacy:${hash}`,
    revision: 1,
    name: list ? list[0] || 'Sans titre' : data?.collection?.name || data?.c?.n || 'Sans titre',
    icon: list ? list[1] || 'UsersRound' : data?.collection?.emoji || data?.c?.e || 'UsersRound',
    description: list ? list[2] : data?.collection?.description || data?.c?.d,
    places: rawPlaces.map((raw: any, index: number) => Array.isArray(raw) ? ({
      id: `legacy:${index}:${hashString(String(raw[0]))}`, name: raw[0] || 'Sans nom', category: categoryKeys[raw[1]] || 'restaurant',
      description: raw[2], address: raw[3], priceLevel: raw[4], priceMin: raw[5], priceMax: raw[6], priceBand: raw[13],
      location: raw[7] ? { latitude: raw[7][0], longitude: raw[7][1] } : undefined,
      rating: raw[9], wouldReturn: raw[10], signatureDish: raw[11], tags: raw[12],
    }) : ({
      id: String(raw.id || raw.i || `legacy:${index}`), name: raw.name || raw.n || 'Sans nom', category: raw.category || raw.c || 'restaurant',
      description: raw.description || raw.d, address: raw.address || raw.a, priceLevel: raw.priceLevel || raw.pl,
      priceMin: raw.priceMin || raw.pm, priceMax: raw.priceMax || raw.px, priceBand: raw.priceBand || raw.pb, location: raw.location || raw.l,
      rating: raw.rating || raw.rt, wouldReturn: raw.wouldReturn || raw.wr, signatureDish: raw.signatureDish || raw.sd, tags: raw.tags || raw.t,
    })),
    hash, legacy: true,
  };
}

export function getSharedCollectionPreview(data: any): { name: string; ownerName: string; count: number } {
  const share = normalizeShare(data);
  return { name: share.name, ownerName: share.ownerName, count: share.places.length };
}

export async function importSharedCollectionDetailed(data: any): Promise<ImportResult> {
  const share = normalizeShare(data);
  const receiptKey = `${share.ownerId}:${share.remoteCollectionId}`;
  const result = await transactCatalog((catalog): ImportResult => {
    const receipt = catalog.importReceipts.find((item) => item.key === receiptKey);
    if (receipt) {
      if (receipt.revision > share.revision) return { collectionId: receipt.localCollectionId, added: 0, linked: 0, needsReview: 0, ignored: true };
      if (receipt.revision === share.revision && receipt.hash === share.hash) return { collectionId: receipt.localCollectionId, added: 0, linked: 0, needsReview: 0, ignored: true };
      if (receipt.revision === share.revision) throw new Error('Cette révision de liste a un contenu différent.');
    }
    const collectionId = receipt?.localCollectionId || `shared_${hashString(receiptKey)}`;
    const key = sourceColorKeyFor(share.ownerId || share.ownerName);
    const now = new Date().toISOString();
    const record: CatalogCollection = {
      id: collectionId, name: share.name, emoji: share.icon, description: share.description,
      kind: 'imported', ownerName: share.ownerName, ownerId: share.ownerId,
      sourceColorKey: key, sourceColor: undefined, isVisible: true,
      importedAt: now, remoteCollectionId: share.remoteCollectionId, revision: share.revision,
      shareHash: share.hash, createdAt: catalog.collections.find((item) => item.id === collectionId)?.createdAt || now,
    };
    const collectionIndex = catalog.collections.findIndex((item) => item.id === collectionId);
    if (collectionIndex >= 0) catalog.collections[collectionIndex] = record;
    else catalog.collections.unshift(record);

    const incomingReferenceIds = new Set<string>();
    let added = 0; let linked = 0; let needsReview = 0;
    share.places.forEach((incoming) => {
      const referenceId = `remote:${hashString(`${share.ownerId}:${share.remoteCollectionId}:${incoming.id}`)}`;
      incomingReferenceIds.add(referenceId);
      let reference = catalog.references.find((item) => item.id === referenceId);
      let placeId = reference?.placeId;
      if (!placeId) {
        const matches = findDuplicateCandidates(
          { id: referenceId, name: incoming.name, address: incoming.address, location: incoming.location },
          catalog.places
        );
        const automatic = matches.find((candidate) => candidate.resolution === 'automatic');
        if (automatic) {
          const previousPlaceId = `place:${hashString(referenceId)}`;
          placeId = automatic.placeId;
          linked += 1;
          if (!catalog.places.some((place) => place.id === previousPlaceId)) {
            catalog.places.push({ id: previousPlaceId, name: incoming.name, category: incoming.category, address: incoming.address, location: incoming.location, createdAt: now, updatedAt: now });
          }
          catalog.duplicateDecisions.unshift({
            id: `decision:auto:${hashString(referenceId)}`,
            incomingReferenceId: referenceId,
            fingerprint: referenceId,
            comparedPlaceId: automatic.placeId,
            resolution: 'same',
            previousPlaceId,
            resultingPlaceId: automatic.placeId,
            automatic: true,
            decidedAt: now,
          });
        }
        else {
          placeId = `place:${hashString(referenceId)}`;
          catalog.places.push({ id: placeId, name: incoming.name, category: incoming.category, address: incoming.address, location: incoming.location, createdAt: now, updatedAt: now });
          added += 1;
          if (matches.length) {
            catalog.duplicateReviews.push({ id: `review:${hashString(referenceId)}`, incomingReferenceId: referenceId, candidatePlaceIds: matches.map((match) => match.placeId), reasons: matches.flatMap((match) => match.reasons), createdAt: now });
            needsReview += 1;
          }
        }
      }
      const origin: RestaurantOrigin = {
        kind: 'imported', collectionId, ownerName: share.ownerName, ownerId: share.ownerId,
        remoteRestaurantId: incoming.id, sourceColorKey: key,
      };
      const nextReference: PlaceReference = {
        id: referenceId, placeId, origin,
        identitySnapshot: { name: incoming.name, category: incoming.category, address: incoming.address, location: incoming.location },
        description: incoming.description, rating: incoming.rating, wouldReturn: incoming.wouldReturn,
        signatureDish: incoming.signatureDish, tags: incoming.tags || [], priceMin: incoming.priceMin,
        priceMax: incoming.priceMax, priceLevel: incoming.priceLevel, images: [],
        priceBand: incoming.priceBand,
        createdAt: reference?.createdAt || now, updatedAt: now,
      };
      if (reference) catalog.references[catalog.references.indexOf(reference)] = nextReference;
      else catalog.references.push(nextReference);
      if (!catalog.memberships.some((item) => item.collectionId === collectionId && item.referenceId === referenceId)) {
        catalog.memberships.push({ collectionId, referenceId });
      }
    });

    const removed = new Set(catalog.memberships
      .filter((item) => item.collectionId === collectionId && !incomingReferenceIds.has(item.referenceId))
      .map((item) => item.referenceId));
    catalog.memberships = catalog.memberships.filter((item) => item.collectionId !== collectionId || !removed.has(item.referenceId));
    catalog.references = catalog.references.filter((item) => !removed.has(item.id));
    catalog.duplicateReviews = catalog.duplicateReviews.filter((item) => !removed.has(item.incomingReferenceId));
    catalog.duplicateDecisions = catalog.duplicateDecisions.filter((item) => !removed.has(item.incomingReferenceId));
    removeOrphanPlaces(catalog);
    catalog.importReceipts = catalog.importReceipts.filter((item) => item.key !== receiptKey);
    catalog.importReceipts.push({ key: receiptKey, localCollectionId: collectionId, revision: share.revision, hash: share.hash, importedAt: now });
    return { collectionId, added, linked, needsReview, ignored: false };
  });
  emitRestaurantsChanged(); emitCollectionsChanged();
  return result;
}

export async function importSharedCollection(data: any): Promise<string> {
  return (await importSharedCollectionDetailed(data)).collectionId;
}

export async function createSharedCollectionPayload(collectionId: string, owner: { id: string; displayName: string }) {
  const catalog = await readCatalog();
  const collection = catalog.collections.find((item) => item.id === collectionId && item.kind !== 'imported');
  if (!collection) throw new Error('Liste introuvable.');
  const referenceById = new Map(catalog.references.map((reference) => [reference.id, reference]));
  const placeById = new Map(catalog.places.map((place) => [place.id, place]));
  const places = catalog.memberships
    .filter((item) => item.collectionId === collectionId)
    .map((item) => referenceById.get(item.referenceId))
    .filter((reference): reference is PlaceReference => Boolean(reference))
    .map((reference) => ({ reference, place: placeById.get(reference.placeId) }))
    .filter((item): item is { reference: PlaceReference; place: Place } => Boolean(item.place))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.place.id === item.place.id) === index)
    .map(({ reference, place }) => ({
      id: place.id, name: place.name, category: place.category, address: place.address,
      priceBand: reference.priceBand, priceMin: reference.priceMin, priceMax: reference.priceMax,
      location: place.location ? [place.location.latitude, place.location.longitude] : undefined,
    }));
  return {
    v: 4 as const,
    owner,
    collection: { id: collection.id, revision: collection.revision || 1, name: collection.name, icon: collection.emoji, description: collection.description },
    places,
  };
}

export async function getLocalShareOwner(): Promise<{ id: string; displayName: string }> {
  const stored = await AsyncStorage.getItem(SHARE_OWNER_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { id?: string; displayName?: string };
      if (parsed.id) return { id: parsed.id, displayName: parsed.displayName || 'un ami' };
    } catch {
      // Regenerate the non-sensitive local sharing identity below.
    }
  }
  const owner = {
    id: `device_${hashString(`${Date.now()}:${Math.random()}`)}`,
    displayName: 'un ami',
  };
  await AsyncStorage.setItem(SHARE_OWNER_KEY, JSON.stringify(owner));
  return owner;
}
