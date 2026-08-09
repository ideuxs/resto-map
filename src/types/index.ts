import type { NavigatorScreenParams } from '@react-navigation/native';

export type RestaurantCategory =
  | 'restaurant'
  | 'fastfood'
  | 'boulangerie'
  | 'cafe'
  | 'bar'
  | 'pizzeria'
  | 'asiatique'
  | 'sushi'
  | 'kebab'
  | 'patisserie'
  | 'autre';

/** Price is intentionally explicit: it is easier to scan than a row of euro symbols. */
export type PriceBand = '1-10' | '11-20' | '21-30';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export type RestaurantOrigin = {
  kind: 'personal' | 'imported';
  collectionId?: string;
  ownerName?: string;
  sourceColor?: string;
  sourceColorKey?: string;
  ownerId?: string;
  remoteRestaurantId?: string;
};

export interface Place {
  id: string;
  name: string;
  category: RestaurantCategory;
  address?: string;
  location?: Location;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceReference {
  id: string;
  placeId: string;
  origin: RestaurantOrigin;
  identitySnapshot: Pick<Place, 'name' | 'category' | 'address' | 'location'>;
  description?: string;
  rating?: number;
  wouldReturn?: boolean;
  signatureDish?: string;
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  priceLevel?: number;
  priceBand?: PriceBand;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionMembership {
  collectionId: string;
  referenceId: string;
}

export interface DuplicateDecision {
  id: string;
  incomingReferenceId: string;
  fingerprint: string;
  comparedPlaceId: string;
  resolution: 'same' | 'different';
  previousPlaceId: string;
  resultingPlaceId: string;
  automatic: boolean;
  decidedAt: string;
  revertedAt?: string;
}

export interface Visit {
  id: string;
  placeId: string;
  visitedAt: string;
  rating?: number;
  wouldReturn?: boolean;
  dishes: string[];
  amount?: number;
  companions?: string;
  notes?: string;
  imageUris: string[];
  createdAt: string;
  updatedAt: string;
  dateIsEstimated?: boolean;
}

export interface PlaceSummary extends Restaurant {
  placeId: string;
  hasPersonalReference: boolean;
  sources: RestaurantOrigin[];
}

export interface DuplicateReview {
  id: string;
  incomingReferenceId: string;
  candidatePlaceIds: string[];
  reasons: string[];
  createdAt: string;
}

export interface ImportReceipt {
  key: string;
  localCollectionId: string;
  revision: number;
  hash: string;
  importedAt: string;
}

export interface ImportResult {
  collectionId: string;
  added: number;
  linked: number;
  needsReview: number;
  ignored: boolean;
}

export interface Restaurant {
  id: string;
  placeId?: string;
  referenceId?: string;
  name: string;
  category: RestaurantCategory;
  description?: string;
  address?: string;
  visitedAt?: string;
  rating?: number;
  wouldReturn?: boolean;
  signatureDish?: string;
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  priceLevel?: number;
  priceBand?: PriceBand;
  images: string[];
  location?: Location;
  origin?: RestaurantOrigin;
  sources?: RestaurantOrigin[];
  createdAt: string;
  updatedAt: string;
}

export type CollectionKind = 'personal' | 'imported';

export interface Collection {
  id: string;
  name: string;
  /** Kept for backward compatibility. Values now contain Lucide icon names. */
  emoji: string;
  description?: string;
  /** Optional local cover image chosen by the owner. */
  imageUri?: string;
  restaurantIds: string[];
  kind?: CollectionKind;
  ownerName?: string;
  sourceColor?: string;
  sourceColorKey?: string;
  isVisible?: boolean;
  importedAt?: string;
  ownerId?: string;
  remoteCollectionId?: string;
  revision?: number;
  shareHash?: string;
  createdAt: string;
}

export type RestaurantsStackParamList = {
  Home: undefined;
  AddRestaurant: { restaurant?: Restaurant; collectionId?: string } | undefined;
  RestaurantDetail: { restaurantId: string };
};

export type CollectionsStackParamList = {
  CollectionsList: undefined;
  DuplicateReview: undefined;
  CollectionDetail: { collectionId: string };
  RestaurantDetail: { restaurantId: string };
  AddRestaurant: { restaurant?: Restaurant; collectionId?: string } | undefined;
};

export type RootTabParamList = {
  restaurants: NavigatorScreenParams<RestaurantsStackParamList> | undefined;
  map: undefined;
  collections: NavigatorScreenParams<CollectionsStackParamList> | undefined;
  settings: undefined;
};
