import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Link2, RotateCcw, Split } from '../components/FlaticonIcon';

import type { CollectionsStackParamList, DuplicateDecision, DuplicateReview, Restaurant } from '../types';
import {
  getDuplicateDecisions,
  getDuplicateReviews,
  getRestaurants,
  resolveDuplicate,
  undoDuplicate,
} from '../storage/storage';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';

type Props = NativeStackScreenProps<CollectionsStackParamList, 'DuplicateReview'>;

export default function DuplicateReviewScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<DuplicateReview[]>([]);
  const [decisions, setDecisions] = useState<DuplicateDecision[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const load = useCallback(async () => {
    const [nextReviews, nextDecisions, nextRestaurants] = await Promise.all([
      getDuplicateReviews(),
      getDuplicateDecisions(),
      getRestaurants(),
    ]);
    setReviews(nextReviews);
    setDecisions(nextDecisions.filter((item) => !item.revertedAt));
    setRestaurants(nextRestaurants);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const byPlace = (placeId: string) => restaurants.find((item) => (item.placeId || item.id) === placeId);
  const byReference = (referenceId: string) => restaurants.find((item) => item.referenceId === referenceId);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={styles.topAction}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.textPrimary }]}>Doublons à vérifier</Text>
        <View style={styles.topAction} />
      </View>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + 80 }}
        ListHeaderComponent={(
          <Text style={[styles.intro, { color: colors.textSecondary }]}>Reliez deux recommandations au même lieu sans mélanger les avis, photos ou provenances.</Text>
        )}
        renderItem={({ item }) => {
          const incoming = byReference(item.incomingReferenceId);
          return (
            <View style={[styles.review, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>ADRESSE IMPORTÉE</Text>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{incoming?.name || 'Adresse importée'}</Text>
              <Text style={[styles.address, { color: colors.textSecondary }]}>{incoming?.address || 'Adresse non renseignée'}</Text>
              <Text style={[styles.eyebrow, { color: colors.textMuted, marginTop: Spacing.md }]}>PEUT CORRESPONDRE À</Text>
              {item.candidatePlaceIds.map((placeId) => {
                const candidate = byPlace(placeId);
                return (
                  <View key={placeId} style={[styles.candidate, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.border }]}>
                    <View style={styles.copy}>
                      <Text style={[styles.candidateName, { color: colors.textPrimary }]}>{candidate?.name || 'Lieu existant'}</Text>
                      <Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={2}>{candidate?.address}</Text>
                    </View>
                    <Pressable
                      onPress={async () => { await resolveDuplicate(item.id, placeId); await load(); }}
                      accessibilityLabel={`Relier à ${candidate?.name || 'ce lieu'}`}
                      style={({ pressed }) => [
                        styles.iconButton,
                        Shadows.card,
                        { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
                      ]}
                    >
                      <Link2 size={18} color={colors.textOnPrimary} />
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                onPress={async () => { await resolveDuplicate(item.id, null); await load(); }}
                style={({ pressed }) => [styles.separateButton, { opacity: pressed ? 0.65 : 1 }]}
              >
                <Split size={17} color={colors.link} />
                <Text style={[styles.separateText, { color: colors.link }]}>Conserver séparément</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon={Link2} title="Tout est clair" subtitle="Aucun rapprochement ne demande votre confirmation." />}
        ListFooterComponent={decisions.length ? (
          <View style={[styles.history, Shadows.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Décisions récentes</Text>
            {decisions.slice(0, 5).map((decision) => (
              <Pressable
                key={decision.id}
                onPress={async () => { await undoDuplicate(decision.id); await load(); }}
                style={({ pressed }) => [styles.undoRow, { opacity: pressed ? 0.65 : 1 }]}
              >
                <RotateCcw size={16} color={colors.link} />
                <Text style={[styles.undoText, { color: colors.link }]}>Annuler « {decision.resolution === 'same' ? 'relier' : 'séparer'} »</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { minHeight: 50, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
  topAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: -0.2 },
  intro: { marginBottom: Spacing.lg, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 20 },
  review: { marginBottom: Spacing.lg, padding: Spacing.lg, borderWidth: 1, borderRadius: BorderRadius.xl },
  eyebrow: { marginBottom: 2, fontFamily: FontFamily.bold, fontSize: FontSize.xs - 1, letterSpacing: 0.96 },
  name: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, letterSpacing: -0.2 },
  address: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  candidate: { minHeight: 64, marginTop: Spacing.sm, padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: BorderRadius.lg },
  copy: { flex: 1 },
  candidateName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  iconButton: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  separateButton: { minHeight: 44, marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  separateText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  history: { marginTop: Spacing.xl, padding: Spacing.lg, borderWidth: 1, borderRadius: BorderRadius.xl },
  historyTitle: { marginBottom: Spacing.sm, fontFamily: FontFamily.bold, fontSize: FontSize.md },
  undoRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  undoText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },
});
