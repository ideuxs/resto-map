import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { CollectionsStackParamList, RestaurantsStackParamList } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import RestaurantListScreen from '../screens/RestaurantListScreen';
import AddRestaurantScreen from '../screens/AddRestaurantScreen';
import RestaurantDetailScreen from '../screens/RestaurantDetailScreen';
import CollectionsListScreen from '../screens/CollectionsListScreen';
import CollectionDetailScreen from '../screens/CollectionDetailScreen';
import DuplicateReviewScreen from '../screens/DuplicateReviewScreen';

const RestaurantStack = createNativeStackNavigator<RestaurantsStackParamList>();
const CollectionStack = createNativeStackNavigator<CollectionsStackParamList>();

/**
 * The native tab host owns the bottom bar. These stacks only own the screens
 * that sit above each tab, so existing screen-level navigation keeps working.
 */
export function RestaurantsNavigator() {
  const { colors } = useTheme();
  return (
    <RestaurantStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'default',
      }}
    >
      <RestaurantStack.Screen name="Home" component={RestaurantListScreen} />
      <RestaurantStack.Screen name="AddRestaurant" component={AddRestaurantScreen} />
      <RestaurantStack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
    </RestaurantStack.Navigator>
  );
}

export function CollectionsNavigator() {
  const { colors } = useTheme();
  return (
    <CollectionStack.Navigator
      initialRouteName="CollectionsList"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'default',
      }}
    >
      <CollectionStack.Screen name="CollectionsList" component={CollectionsListScreen} />
      <CollectionStack.Screen name="DuplicateReview" component={DuplicateReviewScreen} />
      <CollectionStack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      <CollectionStack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
      <CollectionStack.Screen name="AddRestaurant" component={AddRestaurantScreen} />
    </CollectionStack.Navigator>
  );
}
