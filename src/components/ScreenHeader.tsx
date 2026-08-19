import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus } from './FlaticonIcon';

import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  title: string;
  subtitle: string;
  onAdd?: () => void;
  addAccessibilityLabel?: string;
  showAdd?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenHeader({
  title,
  subtitle,
  onAdd,
  addAccessibilityLabel = 'Ajouter',
  showAdd = true,
  style,
}: Props) {
  const { colors, isDark } = useTheme();
  const displaysAdd = Boolean(onAdd && showAdd);

  return (
    <View style={style}>
      <View style={styles.titleRow}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
        {displaysAdd ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              onAdd?.();
            }}
            accessibilityRole="button"
            accessibilityLabel={addAccessibilityLabel}
            hitSlop={4}
            style={({ pressed }) => [
              styles.addButton,
              Shadows.card,
              {
                backgroundColor: isDark ? '#4A154B' : colors.primary,
                borderColor: isDark ? '#6B2370' : 'transparent',
                borderWidth: isDark ? 1 : 0,
                transform: [{ scale: pressed ? 0.92 : 1 }],
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Plus size={20} color={colors.textOnPrimary} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.subtitle, { color: colors.textMuted }]}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.title,
    letterSpacing: -0.768,
  },
  subtitle: {
    marginTop: Spacing.xs,
    paddingRight: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  addButton: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
});
