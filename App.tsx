/**
 * Kept as a small compatibility entry for tooling that still imports App.
 * The production entry point is Expo Router (`expo-router/entry`) so the
 * native iOS tab host can own the tab bar.
 */
export { default } from './src/app/_layout';
