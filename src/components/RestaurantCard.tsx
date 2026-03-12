import React, { useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Restaurant } from '../types';
import { CATEGORIES } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';

interface Props {
  restaurant: Restaurant;
  onPress: () => void;
}

export default function RestaurantCard({ restaurant, onPress }: Props) {
  const { colors, isDark } = useTheme();
  const cat = CATEGORIES[restaurant.category];
  const Icon = cat.icon;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const priceText = () => {
    if (restaurant.priceMin != null && restaurant.priceMax != null) {
      return `${restaurant.priceMin}€ – ${restaurant.priceMax}€`;
    }
    if (restaurant.priceLevel) {
      return '€'.repeat(restaurant.priceLevel);
    }
    return null;
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View 
        style={[
          styles.card, 
          Shadows.md,
          { transform: [{ scale }] }
        ]}
      >
        {restaurant.images.length > 0 ? (
          <Image source={{ uri: restaurant.images[0] }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: colors.surfaceLight }]}>
            <Icon size={64} color={cat.color} strokeWidth={1} opacity={0.2} />
          </View>
        )}
        
        {/* Dark overlay for text readability */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />

        <View style={styles.infoContainer}>
            <BlurView intensity={isDark ? 50 : 80} tint="dark" style={styles.glassPanel}>
              <View style={styles.info}>
                <View style={styles.topRow}>
                  <Text style={[styles.name, { color: '#FFFFFF' }]} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: cat.color + '40', borderColor: cat.color + '60' }]}>
                    <Icon size={12} color={'#FFF'} strokeWidth={2.5} style={{ marginRight: 4 }} />
                    <Text style={[styles.badgeText, { color: '#FFF' }]}>
                      {cat.label}
                    </Text>
                  </View>
                </View>
                {restaurant.address ? (
                  <View style={styles.addressContainer}>
                    <MapPin size={12} color={'rgba(255,255,255,0.6)'} style={{ marginRight: 4 }} />
                    <Text style={[styles.address, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                      {restaurant.address}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.bottomRow}>
                  {priceText() ? (
                    <Text style={[styles.price, { color: '#FFD700' }]}>{priceText()}</Text>
                  ) : null}
                  {restaurant.description ? (
                    <Text style={[styles.desc, { color: 'rgba(255,255,255,0.5)' }]} numberOfLines={2}>
                      {restaurant.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </BlurView>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xxl,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    height: 280,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  glassPanel: {
    padding: Spacing.md,
  },
  info: {
    zIndex: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.5,
    flex: 1,
    marginRight: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  address: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  bottomRow: {
    marginTop: Spacing.xs,
  },
  price: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    marginBottom: Spacing.xs,
  },
  desc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
  },
});
