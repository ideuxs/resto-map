import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FlaticonIcon } from './FlaticonIcon';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';

type Props = {
  icon: FlaticonIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: Props) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrapper, { backgroundColor: isDark ? colors.surfaceLight : colors.surfaceLight }]}>
        <Icon size={32} color={colors.primary} strokeWidth={1.8} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
            onAction();
          }}
          style={({ pressed }) => [
            styles.action,
            Shadows.card,
            {
              backgroundColor: colors.primary,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.textOnPrimary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: 56,
  },
  iconWrapper: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  title: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.sm,
    maxWidth: 290,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
  action: {
    minHeight: 46,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    borderRadius: BorderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    letterSpacing: 0.1,
  },
});
