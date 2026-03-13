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

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  category: RestaurantCategory;
  description?: string;
  address?: string;
  priceMin?: number;
  priceMax?: number;
  priceLevel?: number; // 1-4 (€, €€, €€€, €€€€)
  images: string[]; // max 5 local URIs
  location?: Location;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  restaurantIds: string[];
  createdAt: string;
}

export type RootTabParamList = {
  RestaurantsTab: undefined;
  MapTab: undefined;
  CollectionsTab: undefined;
};

export type RestaurantsStackParamList = {
  Home: undefined;
  AddRestaurant: { restaurant?: Restaurant };
  RestaurantDetail: { restaurantId: string };
};

export type CollectionsStackParamList = {
  CollectionsList: undefined;
  CollectionDetail: { collectionId: string };
  RestaurantDetail: { restaurantId: string };
  AddRestaurant: { restaurant?: Restaurant };
};
