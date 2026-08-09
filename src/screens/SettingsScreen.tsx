import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  LockKeyhole,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react-native';

import ScreenHeader from '../components/ScreenHeader';
import { ColorScheme, useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';

const APPEARANCE_OPTIONS: { value: ColorScheme; label: string; detail: string; icon: typeof Monitor }[] = [
  { value: 'system', label: 'Système', detail: 'Suit le réglage de votre iPhone', icon: Monitor },
  { value: 'light', label: 'Clair', detail: 'Fond lavande lumineux', icon: Sun },
  { value: 'dark', label: 'Sombre', detail: 'Indigo profond, sans noir pur', icon: Moon },
];

export default function SettingsScreen() {
  const { colors, colorScheme, setTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: insets.bottom + 92 }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Paramètres"
        subtitle="Vos préférences, votre confidentialité, au même endroit."
        style={styles.header}
      />

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Apparence</Text>
      <View style={[styles.section, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
        {APPEARANCE_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          const selected = colorScheme === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setTheme(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.option, { opacity: pressed ? 0.62 : 1 }]}
            >
              <View style={[styles.optionIcon, { backgroundColor: selected ? `${colors.primary}18` : colors.surfaceLight }]}>
                <Icon size={19} color={selected ? colors.primary : colors.textMuted} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: selected ? colors.primary : colors.textPrimary }]}>{option.label}</Text>
                <Text style={[styles.optionDetail, { color: colors.textMuted }]}>{option.detail}</Text>
              </View>
              {selected ? <Check size={20} color={colors.primary} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Confidentialité</Text>
      <View style={[styles.section, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
        <View style={styles.infoRow}>
          <View style={[styles.optionIcon, { backgroundColor: colors.surfaceLight }]}><LockKeyhole size={19} color={colors.lavender} /></View>
          <View style={styles.optionCopy}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Journal privé</Text>
            <Text style={[styles.optionDetail, { color: colors.textMuted }]}>Vos visites, notes et photos restent sur cet appareil.</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={[styles.optionIcon, { backgroundColor: colors.surfaceLight }]}><ShieldCheck size={19} color={colors.accentGreen} /></View>
          <View style={styles.optionCopy}>
            <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Partages ciblés</Text>
            <Text style={[styles.optionDetail, { color: colors.textMuted }]}>Seules les listes que vous partagez volontairement peuvent être exportées.</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.version, { color: colors.textMuted }]}>RestoHub · vos adresses, vos souvenirs</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingTop: 2, paddingBottom: Spacing.xs },
  sectionTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm, fontFamily: FontFamily.bold, fontSize: FontSize.lg },
  section: { borderWidth: 1.5, borderRadius: 12 },
  option: { minHeight: 64, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  infoRow: { minHeight: 68, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  optionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md },
  optionCopy: { flex: 1, minWidth: 0 },
  optionTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  optionDetail: { marginTop: 3, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  version: { marginTop: Spacing.huge, textAlign: 'center', fontFamily: FontFamily.regular, fontSize: FontSize.xs },
});
