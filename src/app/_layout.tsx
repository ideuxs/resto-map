import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { decode } from 'base-64';
import LZString from 'lz-string';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { getSharedCollectionPreview, importSharedCollectionDetailed } from '../storage/storage';

function decodeSharedUrl(url: string): any | null {
  const { path, queryParams } = Linking.parse(url);
  const parsed = Linking.parse(url);
  if (parsed.path !== 'share' && parsed.hostname !== 'share') return null;
  const compact = typeof queryParams?.s === 'string' ? queryParams.s : null;
  const versionTwo = typeof queryParams?.v2 === 'string' ? queryParams.v2 : null;
  const versionOne = typeof queryParams?.data === 'string' ? queryParams.data : null;
  if (compact || versionTwo) {
    const json = LZString.decompressFromEncodedURIComponent(compact || versionTwo || '');
    return json ? JSON.parse(json) : null;
  }
  return versionOne ? JSON.parse(decode(versionOne)) : null;
}

function ImportLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (url: string) => {
      try {
        const sharedData = decodeSharedUrl(url);
        if (!sharedData) return;
        const preview = getSharedCollectionPreview(sharedData);
        const owner = preview.ownerName === 'un ami' ? "d’un ami" : `de ${preview.ownerName}`;
        Alert.alert(
          'Importer cette liste ?',
          `« ${preview.name} » ${owner} contient ${preview.count} adresse${preview.count > 1 ? 's' : ''}.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Importer',
              onPress: async () => {
                try {
                  const result = await importSharedCollectionDetailed(sharedData);
                  Alert.alert(
                    result.ignored ? 'Déjà à jour' : 'Import terminé',
                    result.ignored
                      ? 'Cette version de la liste est déjà présente.'
                      : `${result.added} nouvelle${result.added !== 1 ? 's' : ''} · ${result.linked} reliée${result.linked !== 1 ? 's' : ''} · ${result.needsReview} à vérifier.`,
                  );
                  router.replace('/(tabs)/collections');
                } catch {
                  Alert.alert('Import impossible', 'Le lien est incomplet ou endommagé. Demandez un nouveau partage.');
                }
              },
            },
          ],
        );
      } catch {
        Alert.alert('Lien illisible', 'Ce partage RestoHub ne peut pas être ouvert.');
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL().then((url) => url && handleUrl(url));
    return () => subscription.remove();
  }, [router]);

  return null;
}

function AppShell() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ImportLinkHandler />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'default',
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    FlaticonUIconsRegularRounded: require('../../assets/fonts/FlaticonUIconsRegularRounded.ttf'),
    FlaticonUIconsSolidRounded: require('../../assets/fonts/FlaticonUIconsSolidRounded.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#292C90" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EFF7',
  },
});
