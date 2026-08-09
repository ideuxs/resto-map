import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Link2, RotateCcw, Split } from 'lucide-react-native';

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
  const { colors } = useTheme();
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
      <View style={[styles.topBar, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Retour" style={styles.topAction}>
          <ArrowLeft size={23} color={colors.textPrimary} />
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
            <View style={[styles.review, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Adresse importée</Text>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{incoming?.name || 'Adresse importée'}</Text>
              <Text style={[styles.address, { color: colors.textSecondary }]}>{incoming?.address || 'Adresse non renseignée'}</Text>
              <Text style={[styles.eyebrow, { color: colors.textMuted }]}>Peut correspondre à</Text>
              {item.candidatePlaceIds.map((placeId) => {
                const candidate = byPlace(placeId);
                return (
                  <View key={placeId} style={[styles.candidate, { backgroundColor: colors.surfaceLight }]}>
                    <View style={styles.copy}>
                      <Text style={[styles.candidateName, { color: colors.textPrimary }]}>{candidate?.name || 'Lieu existant'}</Text>
                      <Text style={[styles.address, { color: colors.textMuted }]} numberOfLines={2}>{candidate?.address}</Text>
                    </View>
                    <Pressable
                      onPress={async () => { await resolveDuplicate(item.id, placeId); await load(); }}
                      accessibilityLabel={`Relier à ${candidate?.name || 'ce lieu'}`}
                      style={[styles.iconButton, { backgroundColor: colors.accent }]}
                    >
                      <Link2 size={18} color={colors.textOnAccent} />
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                onPress={async () => { await resolveDuplicate(item.id, null); await load(); }}
                style={styles.separateButton}
              >
                <Split size={18} color={colors.textSecondary} />
                <Text style={[styles.separateText, { color: colors.textSecondary }]}>Conserver séparément</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState icon={Link2} title="Tout est clair" subtitle="Aucun rapprochement ne demande votre confirmation." />}
        ListFooterComponent={decisions.length ? (
          <View style={[styles.history, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
            <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>Décisions récentes</Text>
            {decisions.slice(0, 5).map((decision) => (
              <Pressable
                key={decision.id}
                onPress={async () => { await undoDuplicate(decision.id); await load(); }}
                style={styles.undoRow}
              >
                <RotateCcw size={17} color={colors.accent} />
                <Text style={[styles.undoText, { color: colors.accent }]}>Annuler « {decision.resolution === 'same' ? 'relier' : 'séparer'} »</Text>
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
  topBar: { minHeight: 54, paddingHorizontal: Spacing.sm, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 6, borderBottomWidth: 0 },
  topAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, paddingBottom: 12, textAlign: 'center', fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  intro: { marginBottom: Spacing.xl, fontFamily: FontFamily.regular, fontSize: FontSize.sm, lineHeight: 21 },
  review: { marginBottom: Spacing.lg, padding: Spacing.lg, borderWidth: 1.5, borderRadius: 12 },
  eyebrow: { marginTop: Spacing.sm, marginBottom: 4, fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, textTransform: 'uppercase', letterSpacing: 0.7 },
  name: { fontFamily: FontFamily.semiBold, fontSize: FontSize.lg },
  address: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  candidate: { minHeight: 68, marginTop: Spacing.sm, padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: 8 },
  copy: { flex: 1 },
  candidateName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  iconButton: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  separateButton: { minHeight: 44, marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  separateText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  history: { marginTop: Spacing.xxl, padding: Spacing.lg, borderWidth: 1.5, borderRadius: 12 },
  historyTitle: { marginBottom: Spacing.sm, fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  undoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  undoText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },
});
