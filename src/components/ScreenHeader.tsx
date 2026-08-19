import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Plus } from './FlaticonIcon';

import { FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
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
  const { colors } = useTheme();
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
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={addAccessibilityLabel}
            hitSlop={4}
            style={({ pressed }) => [
              styles.addButton,
              Shadows.hard,
              { backgroundColor: colors.accentPink, borderColor: colors.textPrimary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Plus size={23} color={colors.textOnAccent} strokeWidth={2.2} />
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.subtitle, { color: colors.textSecondary }]}>
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
    gap: Spacing.md,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xxl,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: Spacing.xs,
    paddingRight: Spacing.xs,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  addButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
});
