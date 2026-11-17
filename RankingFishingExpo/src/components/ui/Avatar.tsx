import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { toneFor } from './palette';

export interface AvatarProps {
  username: string;
  uri?: string | null;
  size?: number;
  /** Petite pastille étoile or (Premium). */
  premium?: boolean;
  /** Libellé accessible ; sans libellé, l'avatar est décoratif (le nom est lu à côté). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

function initials(username: string): string {
  const parts = username.trim().split(/[\s_.\-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? '?').slice(0, 2).toUpperCase();
}

/** Avatar : photo, ou initiales sur fond teinté sobre (pas de couleur criarde). */
export default function Avatar({ username, uri, size = 40, premium = false, accessibilityLabel, style }: AvatarProps) {
  const tone = toneFor(username);
  const r = size / 2;
  const dot = Math.max(14, Math.round(size * 0.36));
  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
    >
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityIgnoresInvertColors
          style={{ width: size, height: size, borderRadius: r, backgroundColor: colors.surfaceMuted }}
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: r, backgroundColor: tone.bg }]}>
          <Text allowFontScaling={false} style={{ color: tone.ink, fontSize: Math.round(size * 0.38), fontWeight: '600' }}>
            {initials(username)}
          </Text>
        </View>
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, { borderRadius: r }]} />
      {premium ? (
        <View style={[styles.premium, { width: dot, height: dot, borderRadius: dot / 2 }]}>
          <Ionicons name="star" size={Math.round(dot * 0.6)} color={colors.ink} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(21,34,26,0.10)' },
  premium: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
