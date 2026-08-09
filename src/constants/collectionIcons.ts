import {
  Bookmark,
  CakeSlice,
  Coffee,
  Flame,
  Heart,
  MapPinned,
  Pizza,
  Salad,
  Sparkles,
  Star,
  UsersRound,
  Wine,
  type LucideIcon,
} from 'lucide-react-native';

export const COLLECTION_ICONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'Bookmark', label: 'Général', icon: Bookmark },
  { name: 'MapPinned', label: 'Quartiers', icon: MapPinned },
  { name: 'Star', label: 'Favoris', icon: Star },
  { name: 'Heart', label: 'À deux', icon: Heart },
  { name: 'Sparkles', label: 'À tester', icon: Sparkles },
  { name: 'Salad', label: 'Léger', icon: Salad },
  { name: 'Pizza', label: 'Pizza', icon: Pizza },
  { name: 'Coffee', label: 'Cafés', icon: Coffee },
  { name: 'Wine', label: 'Sorties', icon: Wine },
  { name: 'CakeSlice', label: 'Sucré', icon: CakeSlice },
  { name: 'Flame', label: 'Pépites', icon: Flame },
  { name: 'UsersRound', label: 'Amis', icon: UsersRound },
];

export function getCollectionIcon(name?: string): LucideIcon {
  return COLLECTION_ICONS.find((item) => item.name === name)?.icon || Bookmark;
}
