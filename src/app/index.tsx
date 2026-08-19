import { Redirect } from 'expo-router';

/**
 * Expo Go and cold launches open the scheme at `/`. Keep that URL concrete so
 * the native tab navigator is mounted instead of showing the unmatched-route
 * screen when the app has no path segment yet.
 */
export default function IndexRoute() {
  return <Redirect href="/(tabs)/restaurants" />;
}
