import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toneFor } from './palette';

export interface SpeciesMarkProps {
  /** Nom affiché de l'espèce (« Truite fario »). Sert au monogramme et au libellé accessible. */
  name: string;
  /** Clé stable pour la couleur (id d'espèce) ; défaut : name. */
  speciesId?: string;
  size?: number;
  /** 'monogram' : 2 lettres (« Tf », « Ca ») ; 'glyph' : icône poisson. */
  variant?: 'monogram' | 'glyph';
  style?: StyleProp<ViewStyle>;
}

/** « Carpe » → « Ca » ; « Truite fario » → « Tf » ; « Black-bass » → « Bb ». */
export function speciesMonogram(name: string): string {
  const parts = name.trim().split(/[\s\-_']+/).filter(Boolean);
  if (parts.length >= 2) return parts[0][0].toUpperCase() + parts[1][0].toLowerCase();
  const w = parts[0] ?? '?';
  return w[0].toUpperCase() + (w[1] ?? '').toLowerCase();
}

/** Remplace l'emoji espèce : tuile arrondie sobre, couleur dérivée de l'espèce. */
export default function SpeciesMark({ name, speciesId, size = 32, variant = 'monogram', style }: SpeciesMarkProps) {
  const tone = toneFor(speciesId ?? name);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: Math.round(size * 0.28), backgroundColor: tone.bg },
        style,
      ]}
    >
      {variant === 'glyph' ? (
        <Ionicons name="fish-outline" size={Math.round(size * 0.56)} color={tone.ink} />
      ) : (
        <Text
          allowFontScaling={false}
          style={{ color: tone.ink, fontSize: Math.round(size * 0.4), fontWeight: '700', letterSpacing: -0.2 }}
        >
          {speciesMonogram(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
