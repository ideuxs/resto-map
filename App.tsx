import 'react-native-get-random-values';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, Theme, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { decode } from 'base-64';
import { Alert } from 'react-native';
import { importSharedCollection } from './src/storage/storage';
import LZString from 'lz-string';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Utensils, Map as MapIcon, LibraryBig } from 'lucide-react-native';

// Providers
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

// Types
import {
  RootTabParamList,
  RestaurantsStackParamList,
  CollectionsStackParamList,
} from './src/types';

// Constants
import { FontFamily } from './src/constants/theme';

// Screens
import RestaurantListScreen from './src/screens/RestaurantListScreen';
import AddRestaurantScreen from './src/screens/AddRestaurantScreen';
import RestaurantDetailScreen from './src/screens/RestaurantDetailScreen';
import MapScreen from './src/screens/MapScreen';
import CollectionsListScreen from './src/screens/CollectionsListScreen';
import CollectionDetailScreen from './src/screens/CollectionDetailScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const RestStack = createNativeStackNavigator<RestaurantsStackParamList>();
const ColStack = createNativeStackNavigator<CollectionsStackParamList>();

function RestaurantsNavigator() {
  const { colors } = useTheme();
  return (
    <RestStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <RestStack.Screen name="Home" component={RestaurantListScreen} options={{ headerShown: false }} />
      <RestStack.Screen name="AddRestaurant" component={AddRestaurantScreen} options={{ title: '' }} />
      <RestStack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} options={{ title: '' }} />
    </RestStack.Navigator>
  );
}

function CollectionsNavigator() {
  const { colors } = useTheme();
  return (
    <ColStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ColStack.Screen name="CollectionsList" component={CollectionsListScreen} options={{ headerShown: false }} />
      <ColStack.Screen name="CollectionDetail" component={CollectionDetailScreen} options={{ title: '' }} />
    </ColStack.Navigator>
  );
}

function AppContent() {
  const { colors, isDark } = useTheme();

  // Sync React Navigation theme with our custom ThemeProvider
  const navigationTheme: Theme = {
    dark: isDark,
    colors: {
      ...(isDark ? NavDarkTheme.colors : NavDefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
    },
    fonts: isDark ? NavDarkTheme.fonts : NavDefaultTheme.fonts,
  };

  React.useEffect(() => {
    const handleUrl = (url: string) => {
      const { path, queryParams } = Linking.parse(url);
      if (path === 'share') {
        try {
          let sharedData;
          if (queryParams?.s) {
            // Newest Version 3 (compressed positional array)
            const json = LZString.decompressFromEncodedURIComponent(queryParams.s as string);
            sharedData = JSON.parse(json!);
          } else if (queryParams?.v2) {
            // Version 2 (compressed minified object)
            const json = LZString.decompressFromEncodedURIComponent(queryParams.v2 as string);
            sharedData = JSON.parse(json!);
          } else if (queryParams?.data) {
            // Version 1 (base64 standard object)
            const json = decode(queryParams.data as string);
            sharedData = JSON.parse(json);
          }

          if (!sharedData) return;
          
          let colName = 'Sans titre';
          let userName = 'un ami';
          
          if (Array.isArray(sharedData)) {
            // Version 3 [version, user, colArr, restosArr]
            colName = sharedData[2][0];
            userName = sharedData[1];
          } else {
            colName = sharedData.collection?.name || sharedData.c?.n || 'Sans titre';
            userName = sharedData.userName || sharedData.u || 'un ami';
          }
          
          const displayName = userName === 'un ami' ? "d'un ami" : (/^[aeiouy]/i.test(userName) ? `d'${userName}` : `de ${userName}`);
          
          Alert.alert(
            '📥 Importer une collection',
            `Voulez-vous importer la collection "${colName}" ${displayName} ?`,
            [
              { text: 'Annuler', style: 'cancel' },
              { 
                text: 'Importer', 
                onPress: async () => {
                  try {
                    await importSharedCollection(sharedData);
                    Alert.alert('Succès', 'Collection importée avec succès !');
                  } catch (e) {
                    Alert.alert('Erreur', 'Impossible d\'importer la collection.');
                  }
                }
              }
            ]
          );
        } catch (e) {
          console.error('Failed to parse shared data', e);
        }
      }
    };

    const subscription = Linking.addEventListener('url', (event) => {
      handleUrl(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopWidth: 0,
              elevation: 8,
              height: 75,
              paddingBottom: 15,
              paddingTop: 10,
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
            },
            tabBarBackground: undefined,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarLabelStyle: { fontFamily: FontFamily.semiBold, fontSize: 11, marginTop: -5 },
          }}
        >
          <Tab.Screen
            name="RestaurantsTab"
            component={RestaurantsNavigator}
            options={{
              tabBarLabel: 'Restos',
              tabBarIcon: ({ color, size }) => <Utensils color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="MapTab"
            component={MapScreen}
            options={{
              tabBarLabel: 'Carte',
              tabBarIcon: ({ color, size }) => <MapIcon color={color} size={size} />,
            }}
          />
          <Tab.Screen
            name="CollectionsTab"
            component={CollectionsNavigator}
            options={{
              tabBarLabel: 'Collections',
              tabBarIcon: ({ color, size }) => <LibraryBig color={color} size={size} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090B' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
