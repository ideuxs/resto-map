import React from 'react';
import { Text, type ColorValue, type ImageStyle, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { Image } from 'expo-image';
import { renderToImageAsync } from 'expo-font';

export type FlaticonIconName =
  | 'add'
  | 'angle-small-down'
  | 'angle-small-right'
  | 'angle-small-up'
  | 'arrow-left'
  | 'arrow-right'
  | 'beer'
  | 'book-bookmark'
  | 'bookmark'
  | 'burger-fries'
  | 'cake-slice'
  | 'calendar-days'
  | 'camera'
  | 'car'
  | 'check'
  | 'code-merge'
  | 'coffee'
  | 'croissant'
  | 'download'
  | 'eye'
  | 'eye-crossed'
  | 'filter'
  | 'flame'
  | 'heart'
  | 'link-alt'
  | 'list-check'
  | 'lock'
  | 'location-crosshairs'
  | 'map'
  | 'map-marker'
  | 'map-pin'
  | 'meat'
  | 'moon'
  | 'navigation'
  | 'notebook-alt'
  | 'pencil'
  | 'pizza-slice'
  | 'rotate-left'
  | 'salad'
  | 'sandwich'
  | 'screen'
  | 'search'
  | 'settings-sliders'
  | 'share'
  | 'shield-check'
  | 'shuffle'
  | 'soup'
  | 'sparkles'
  | 'split'
  | 'star'
  | 'store-alt'
  | 'sun'
  | 'sushi-roll'
  | 'trash'
  | 'utensils'
  | 'users'
  | 'wallet'
  | 'wine-glass-empty'
  | 'x';

const GLYPHS: Record<FlaticonIconName, number> = {
  add: 0xf11a,
  'angle-small-down': 0xf153,
  'angle-small-right': 0xf155,
  'angle-small-up': 0xf156,
  'arrow-left': 0xf197,
  'arrow-right': 0xf19b,
  beer: 0xf231,
  'book-bookmark': 0xf278,
  bookmark: 0xf28b,
  'burger-fries': 0xf30b,
  'cake-slice': 0xf319,
  'calendar-days': 0xf327,
  camera: 0xf348,
  car: 0xf369,
  check: 0xf3c8,
  'code-merge': 0xf486,
  coffee: 0xf48f,
  croissant: 0xf4f3,
  download: 0xf591,
  eye: 0xf5f8,
  'eye-crossed': 0xf5f5,
  filter: 0xf67e,
  flame: 0xf696,
  heart: 0xf7a0,
  'link-alt': 0xf8b5,
  'list-check': 0xf8c0,
  lock: 0xf8d5,
  'location-crosshairs': 0xf8ce,
  map: 0xf8fb,
  'map-marker': 0xf8f8,
  'map-pin': 0xf8f9,
  meat: 0xf90f,
  moon: 0xf972,
  navigation: 0xf99d,
  'notebook-alt': 0xf9b9,
  pencil: 0xfa29,
  'pizza-slice': 0xfa86,
  'rotate-left': 0xfb68,
  salad: 0xfb88,
  sandwich: 0xfb8d,
  screen: 0xfba4,
  search: 0xfbba,
  'settings-sliders': 0xfbd1,
  share: 0xfbd5,
  'shield-check': 0xfbdb,
  shuffle: 0xfc03,
  soup: 0xfc79,
  sparkles: 0xfc84,
  split: 0xfc91,
  star: 0xfce9,
  'store-alt': 0xfcfc,
  sun: 0xfd17,
  'sushi-roll': 0xfd26,
  trash: 0xfe17,
  utensils: 0xfea8,
  users: 0xfea6,
  wallet: 0xfedc,
  'wine-glass-empty': 0xff15,
  x: 0xff27,
};

/**
 * Rounded Regular and Rounded Solid do not share the same glyph positions.
 * Only the icons rendered filled need an explicit mapping; falling back to
 * Regular keeps all outline icons stable.
 */
const SOLID_GLYPHS: Partial<Record<FlaticonIconName, number>> = {
  'book-bookmark': 0xf276,
  bookmark: 0xf289,
  'map-pin': 0xf8eb,
  star: 0xfcc1,
};

export type FlaticonIconProps = Omit<TextProps, 'children'> & {
  name: FlaticonIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  style?: StyleProp<TextStyle>;
};

export type FlaticonIcon = React.ComponentType<Omit<FlaticonIconProps, 'name'>>;

const REGULAR_FONT = 'FlaticonUIconsRegularRounded';
const SOLID_FONT = 'FlaticonUIconsSolidRounded';

export const flaticonVectorFamily = {
  getImageSource: async (name: string, size: number, color: ColorValue) => {
    const glyph = GLYPHS[name as FlaticonIconName];
    if (!glyph) return null;

    try {
      const image = await renderToImageAsync(String.fromCodePoint(glyph), {
        fontFamily: REGULAR_FONT,
        size,
        color: typeof color === 'string' ? color : '#FFFFFF',
      });
      // NativeTabs uses the image's scale to render the glyph at the device
      // density. Keeping it avoids the soft, upscaled tab-bar icons.
      return image;
    } catch {
      return null;
    }
  },
};

export default function FlaticonGlyph({ name, size = 24, color = '#17121E', fill, style, ...textProps }: FlaticonIconProps) {
  const wantsSolid = Boolean(fill && fill !== 'transparent' && fill !== 'none' && SOLID_GLYPHS[name]);
  const fontFamily = wantsSolid ? SOLID_FONT : REGULAR_FONT;
  const glyph = wantsSolid ? SOLID_GLYPHS[name]! : GLYPHS[name];

  return (
    <Text
      {...textProps}
      allowFontScaling={false}
      style={[
        {
          color,
          fontFamily,
          fontSize: size,
          height: size,
          lineHeight: size,
          textAlign: 'center',
          width: size,
        },
        style,
      ]}
    >
      {String.fromCodePoint(glyph)}
    </Text>
  );
}

function assetIcon(source: number): FlaticonIcon {
  const Component: FlaticonIcon = ({ size = 24, color = '#17121E', style }) => (
    <Image
      source={source}
      contentFit="contain"
      style={[
        {
          width: size,
          height: size,
          tintColor: color,
        },
        style as StyleProp<ImageStyle>,
      ]}
    />
  );
  Component.displayName = 'FlaticonAsset';
  return Component;
}

function icon(name: FlaticonIconName): FlaticonIcon {
  const Component = (props: Omit<FlaticonIconProps, 'name'>) => <FlaticonGlyph {...props} name={name} />;
  Component.displayName = 'Flaticon(' + name + ')';
  return Component;
}

export const Add = icon('add');
export const ArrowLeft = icon('arrow-left');
export const ArrowRight = icon('arrow-right');
export const Beer = icon('beer');
export const Beef = icon('meat');
export const BookMarked = icon('book-bookmark');
export const Bookmark = icon('bookmark');
export const Burger = icon('burger-fries');
export const Cake = icon('cake-slice');
export const CakeSlice = icon('cake-slice');
export const CalendarDays = icon('calendar-days');
export const Camera = icon('camera');
export const CarFront = icon('car');
export const Check = icon('check');
export const ChevronDown = icon('angle-small-down');
export const ChevronRight = icon('angle-small-right');
export const ChevronUp = icon('angle-small-up');
export const Coffee = icon('coffee');
export const Croissant = icon('croissant');
export const Download = icon('download');
export const Eye = icon('eye');
export const EyeOff = icon('eye-crossed');
export const Filter = icon('filter');
export const Flame = icon('flame');
export const GitMerge = icon('code-merge');
export const Heart = icon('heart');
export const JapaneseYen = icon('sushi-roll');
export const Link2 = icon('link-alt');
export const ListPlus = icon('list-check');
export const LocateFixed = icon('location-crosshairs');
export const LockKeyhole = icon('lock');
export const MapPin = icon('map-pin');
export const MapPinned = icon('map-marker');
export const Meat = icon('meat');
export const Monitor = icon('screen');
export const Moon = icon('moon');
export const Navigation2 = icon('navigation');
export const NotebookPen = icon('notebook-alt');
export const Pencil = icon('pencil');
export const Pizza = icon('pizza-slice');
export const Plus = icon('add');
export const RotateCcw = icon('rotate-left');
export const Salad = icon('salad');
export const Search = icon('search');
export const SlidersHorizontal = icon('settings-sliders');
export const Sandwich = icon('sandwich');
export const Settings = icon('settings-sliders');
export const Share2 = icon('share');
export const ShieldCheck = icon('shield-check');
export const Shuffle = icon('shuffle');
export const Soup = icon('soup');
export const Sparkles = icon('sparkles');
export const Split = icon('split');
export const Star = icon('star');
export const Store = icon('store-alt');
export const Sun = icon('sun');
export const Trash2 = icon('trash');
export const Utensils = icon('utensils');
export const UsersRound = icon('users');
export const WalletCards = icon('wallet');
export const Wine = icon('wine-glass-empty');
export const X = icon('x');

// Category illustrations selected from Flaticon and kept as local assets so
// they remain available offline and match the exact references chosen for the app.
export const Sushi = assetIcon(require('../../assets/flaticon/sushi-2159685.png'));
export const Kebab = assetIcon(require('../../assets/flaticon/kebab-2776860.png'));
export const Noodles = assetIcon(require('../../assets/flaticon/noodles-1531225.png'));
