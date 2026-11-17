import React from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Provenance : Documentations/Logo/logo.png (logo du projet), redimensionné.
// Voir assets/brand/provenance.json.
const TILE = require('../../../assets/brand/logo-tile.png');

export interface LogoProps {
  /** Côté de la tuile en pt (défaut 72). */
  size?: number;
  /** Ajoute le nom « RankingFishing » sous la tuile. */
  withWordmark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Logo RankingFishing : tuile marine arrondie (poisson couronné). Login, onboarding. */
export default function Logo({ size = 72, withWordmark = false, style }: LogoProps) {
  return (
    <View style={[styles.wrap, style]} accessible accessibilityRole="image" accessibilityLabel="RankingFishing">
      <Image
        source={TILE}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.225), backgroundColor: colors.brandNavy }}
      />
      {withWordmark ? <Text style={styles.wordmark}>RankingFishing</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  wordmark: { ...typography.title1, color: colors.ink, marginTop: spacing.ms },
});
