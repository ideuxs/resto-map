import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { FlaticonIcon } from './FlaticonIcon';

type Props = {
  color: string;
  icon: FlaticonIcon;
};

export default function CollectionCardPattern({ color, icon: Icon }: Props) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.clip}
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: `${color}08` }]} />
      <View style={[styles.motif, styles.large]}>
        <Icon size={96} color={color} />
      </View>
      <View style={[styles.motif, styles.medium]}>
        <Icon size={58} color={color} />
      </View>
      <View style={[styles.motif, styles.small]}>
        <Icon size={34} color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 12,
  },
  motif: { position: 'absolute', opacity: 0.055 },
  large: { right: -24, bottom: -18, transform: [{ rotate: '-12deg' }] },
  medium: { right: 92, top: 12, opacity: 0.038, transform: [{ rotate: '16deg' }] },
  small: { right: 26, top: 20, opacity: 0.032, transform: [{ rotate: '-8deg' }] },
});
