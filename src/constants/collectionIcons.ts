import {
  Bookmark,
  Burger,
  CakeSlice,
  Coffee,
  Flame,
  Heart,
  Kebab,
  MapPinned,
  Noodles,
  Pizza,
  Salad,
  Sparkles,
  Star,
  Sushi,
  UsersRound,
  Wine,
  type FlaticonIcon,
} from '../components/FlaticonIcon';

export const COLLECTION_ICONS: { name: string; label: string; icon: FlaticonIcon }[] = [
  { name: 'Bookmark', label: 'Général', icon: Bookmark },
  { name: 'Star', label: 'Favoris', icon: Star },
  { name: 'Heart', label: 'À deux', icon: Heart },
  { name: 'Sparkles', label: 'À tester', icon: Sparkles },
  { name: 'Burger', label: 'Burgers', icon: Burger },
  { name: 'Pizza', label: 'Pizza', icon: Pizza },
  { name: 'Sushi', label: 'Sushi', icon: Sushi },
  { name: 'Kebab', label: 'Kebab', icon: Kebab },
  { name: 'Noodles', label: 'Asiatique', icon: Noodles },
  { name: 'Coffee', label: 'Cafés', icon: Coffee },
  { name: 'Wine', label: 'Sorties', icon: Wine },
  { name: 'CakeSlice', label: 'Sucré', icon: CakeSlice },
  { name: 'Salad', label: 'Léger', icon: Salad },
  { name: 'Flame', label: 'Pépites', icon: Flame },
  { name: 'MapPinned', label: 'Quartiers', icon: MapPinned },
  { name: 'UsersRound', label: 'Amis', icon: UsersRound },
];

export function getCollectionIcon(name?: string): FlaticonIcon {
  return COLLECTION_ICONS.find((item) => item.name === name)?.icon || Bookmark;
}
