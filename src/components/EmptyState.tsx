import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Icon size={34} color={colors.accent} strokeWidth={1.7} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            Shadows.hard,
            { backgroundColor: colors.accentPink, borderColor: colors.textPrimary, borderWidth: 1.5, opacity: pressed ? 0.72 : 1 },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.textOnAccent }]}>{actionLabel}</Text>
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
    paddingVertical: 64,
  },
  title: {
    marginTop: Spacing.lg,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.sm,
    maxWidth: 290,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 21,
    textAlign: 'center',
  },
  action: {
    minHeight: 44,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
});
