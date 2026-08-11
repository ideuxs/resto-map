import { RestaurantCategory } from '../types';
import {
  Utensils,
  Sandwich,
  Burger,
  Croissant,
  Coffee,
  Beer,
  Pizza,
  Cake,
  Store,
  Sushi,
  Kebab,
  Noodles,
  FlaticonIcon
} from '../components/FlaticonIcon';

export interface CategoryInfo {
  label: string;
  icon: FlaticonIcon;
  color: string;
  markerColor: string;
}

export const CATEGORIES: Record<RestaurantCategory, CategoryInfo> = {
  restaurant: {
    label: 'Restaurant',
    icon: Utensils,
    color: '#292C90',
    markerColor: '#292C90',
  },
  fastfood: {
    label: 'Fast-food',
    icon: Sandwich,
    color: '#4947A8',
    markerColor: '#4947A8',
  },
  burger: {
    label: 'Burger',
    icon: Burger,
    color: '#C35A26',
    markerColor: '#C35A26',
  },
  boulangerie: {
    label: 'Boulangerie',
    icon: Croissant,
    color: '#6544A6',
    markerColor: '#6544A6',
  },
  cafe: {
    label: 'Café',
    icon: Coffee,
    color: '#75428F',
    markerColor: '#75428F',
  },
  bar: {
    label: 'Bar',
    icon: Beer,
    color: '#533C88',
    markerColor: '#533C88',
  },
  pizzeria: {
    label: 'Pizzeria',
    icon: Pizza,
    color: '#A91963',
    markerColor: '#A91963',
  },
  asiatique: {
    label: 'Asiatique',
    icon: Noodles,
    color: '#8E3478',
    markerColor: '#8E3478',
  },
  sushi: {
    label: 'Sushi',
    icon: Sushi,
    color: '#C52B82',
    markerColor: '#C52B82',
  },
  kebab: {
    label: 'Kebab',
    icon: Kebab,
    color: '#6A3894',
    markerColor: '#6A3894',
  },
  patisserie: {
    label: 'Pâtisserie',
    icon: Cake,
    color: '#D93491',
    markerColor: '#D93491',
  },
  autre: {
    label: 'Autre',
    icon: Store,
    color: '#665C75',
    markerColor: '#665C75',
  },
};

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([key, info]) => ({
  value: key as RestaurantCategory,
  ...info,
}));
