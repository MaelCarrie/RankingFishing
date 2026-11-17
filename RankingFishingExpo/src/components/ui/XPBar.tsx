import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, motion, typography } from '../../theme';
import { formatInt } from './format';
import { useReduceMotion } from './hooks';

export interface XPBarProps {
  /** XP actuels. */
  xp: number;
  /** XP du palier suivant. */
  nextXp: number;
  /** XP du palier courant (début de la barre), défaut 0. */
  levelXp?: number;
  level?: number;
  levelName?: string;
  /** Masque la ligne de texte (barre seule). */
  compact?: boolean;
  /** Ajoute sous la barre l'XP totale cumulée (« 1 250 XP au total »). */
  showTotal?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Progression de niveau : remplissage or (réussite), valeurs en chiffres tabulaires.
 * Le libellé et le remplissage disent la même chose : l'XP acquise DANS le niveau
 * en cours sur l'XP que demande ce niveau (« 250 / 1 000 XP » pour 25 %).
 */
export default function XPBar({
  xp, nextXp, levelXp = 0, level, levelName, compact = false, showTotal = false, style,
}: XPBarProps) {
  const reduceMotion = useReduceMotion();
  const span = Math.max(1, nextXp - levelXp);
  const inLevel = Math.min(span, Math.max(0, xp - levelXp));
  const ratio = inLevel / span;
  const pct = Math.round(ratio * 100);
  const [trackW, setTrackW] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trackW) return;
    const to = trackW * ratio;
    if (reduceMotion) {
      anim.setValue(to);
      return;
    }
    Animated.timing(anim, { toValue: to, duration: motion.slow, easing: motion.easeOut, useNativeDriver: false }).start();
  }, [ratio, trackW, reduceMotion, anim]);

  const title = [level !== undefined ? `Niveau ${level}` : null, levelName].filter(Boolean).join(' · ');

  return (
    <View style={style}>
      {!compact ? (
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.value}>
            <Text style={styles.valueStrong}>{formatInt(inLevel)}</Text>
            {` / ${formatInt(span)} XP`}
          </Text>
        </View>
      ) : null}
      <View
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => setTrackW(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={title ? `Progression ${title}` : 'Progression de niveau'}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: pct,
          text: `${formatInt(inLevel)} sur ${formatInt(span)} XP dans ce niveau, ${formatInt(xp)} XP au total`,
        }}
      >
        <Animated.View style={[styles.fill, { width: anim }]} />
      </View>
      {showTotal ? <Text style={styles.total}>{`${formatInt(xp)} XP au total`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  title: { ...typography.subhead, fontWeight: '600', color: colors.ink, flexShrink: 1, marginRight: 8 },
  value: { ...typography.footnote, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  valueStrong: { color: colors.goldInk, fontWeight: '600' },
  total: { ...typography.footnote, color: colors.inkSecondary, fontVariant: ['tabular-nums'], marginTop: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.secondary },
});
