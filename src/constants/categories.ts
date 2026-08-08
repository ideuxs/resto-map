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
    color: '#6C5CE7',
    markerColor: '#6C5CE7',
  },
  fastfood: {
    label: 'Fast-food',
    icon: Sandwich,
    color: '#E17055',
    markerColor: '#E17055',
  },
  boulangerie: {
    label: 'Boulangerie',
    icon: Croissant,
    color: '#FDCB6E',
    markerColor: '#D4A017',
  },
  cafe: {
    label: 'Café',
    icon: Coffee,
    color: '#A0522D',
    markerColor: '#A0522D',
  },
  bar: {
    label: 'Bar',
    icon: Beer,
    color: '#00CEC9',
    markerColor: '#00CEC9',
  },
  pizzeria: {
    label: 'Pizzeria',
    icon: Pizza,
    color: '#FF6B6B',
    markerColor: '#FF6B6B',
  },
  asiatique: {
    label: 'Asiatique',
    icon: Soup,
    color: '#FF9FF3',
    markerColor: '#FF9FF3',
  },
  sushi: {
    label: 'Sushi',
    icon: JapaneseYen,
    color: '#F8A5C2',
    markerColor: '#F8A5C2',
  },
  kebab: {
    label: 'Kebab',
    icon: Flame,
    color: '#F39C12',
    markerColor: '#F39C12',
  },
  patisserie: {
    label: 'Pâtisserie',
    icon: Cake,
    color: '#E056A0',
    markerColor: '#E056A0',
  },
  autre: {
    label: 'Autre',
    icon: Store,
    color: '#636E72',
    markerColor: '#636E72',
  },
};

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([key, info]) => ({
  value: key as RestaurantCategory,
  ...info,
}));
