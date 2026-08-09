import { RestaurantCategory } from '../types';
import {
  Utensils,
  Sandwich,
  Croissant,
  Coffee,
  Beer,
  Pizza,
  Soup,
  JapaneseYen,
  Flame,
  Cake,
  Store,
  LucideIcon
} from 'lucide-react-native';

export interface CategoryInfo {
  label: string;
  icon: LucideIcon;
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
    icon: Soup,
    color: '#8E3478',
    markerColor: '#8E3478',
  },
  sushi: {
    label: 'Sushi',
    icon: JapaneseYen,
    color: '#C52B82',
    markerColor: '#C52B82',
  },
  kebab: {
    label: 'Kebab',
    icon: Flame,
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
