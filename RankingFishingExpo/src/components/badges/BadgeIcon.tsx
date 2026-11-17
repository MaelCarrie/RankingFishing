import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../../store/types';
import { colors } from '../../theme';
import { TIER_TONES, badgeIconName } from './badgeVisuals';

interface BadgeIconProps {
  badge: Pick<Badge, 'id' | 'metric' | 'tier' | 'isUnlocked'>;
  size?: number;
}

// Médaillon d'un badge : icône Ionicons dans un anneau à la couleur du palier.
// Verrouillé : anneau et icône neutres + petit cadenas.
export default function BadgeIcon({ badge, size = 64 }: BadgeIconProps) {
  const tone = TIER_TONES[badge.tier] ?? TIER_TONES.bronze;
  const locked = !badge.isUnlocked;
  const ring = Math.max(2, Math.round(size / 20));

  return (
    <View
      style={[
        styles.medal,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: ring,
          borderColor: locked ? colors.border : tone.ring,
          backgroundColor: locked ? colors.background : tone.bg,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons
        name={badgeIconName(badge)}
        size={Math.round(size * 0.46)}
        color={locked ? colors.textDisabled : tone.fg}
      />
      {locked && (
        <View style={[styles.lock, { width: size * 0.36, height: size * 0.36, borderRadius: size * 0.18 }]}>
          <Ionicons name="lock-closed" size={Math.round(size * 0.18)} color={colors.textSecondary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  medal: { alignItems: 'center', justifyContent: 'center' },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
