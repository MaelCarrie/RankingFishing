import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Capture } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { SpeciesMark, formatInt, splitWeight } from '../ui';
import { formatRelativeDate } from '../../utils/formatting';

interface Props {
  captures: Capture[];
  onPress?: (capture: Capture) => void;
}

function CaptureLine({ capture, onPress, last }: { capture: Capture; onPress?: (c: Capture) => void; last: boolean }) {
  const species = capture.species?.nameFr ?? 'Espèce inconnue';
  const w = capture.weightGrams > 0 ? splitWeight(capture.weightGrams) : null;
  const label = `${species}${w ? `, ${w.value.replace(/ /g, '')} ${w.unit}` : ''}, ${capture.score} points, ${formatRelativeDate(capture.publishedAt)}`;

  const body = (
    <>
      {capture.photos[0] ? (
        <Image source={{ uri: capture.photos[0] }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <SpeciesMark name={species} speciesId={capture.species?.id} size={52} />
      )}
      <View style={styles.text}>
        <Text style={styles.species} numberOfLines={1}>{species}</Text>
        <Text style={styles.date} numberOfLines={1}>{formatRelativeDate(capture.publishedAt)}</Text>
      </View>
      <View style={styles.figures}>
        <Text style={styles.weight}>
          {w ? w.value : '—'}
          {w ? <Text style={styles.unit}> {w.unit}</Text> : null}
        </Text>
        <Text style={styles.score}>
          {formatInt(capture.score)}
          <Text style={styles.scoreUnit}> pts</Text>
        </Text>
      </View>
    </>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={() => onPress(capture)}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          {body}
        </Pressable>
      ) : (
        <View style={styles.row} accessible accessibilityLabel={label}>{body}</View>
      )}
      {!last ? <View style={styles.divider} /> : null}
    </View>
  );
}

/** Liste compacte de prises : vignette, espèce, date, poids et score alignés à droite. */
export default function ProfileCaptureList({ captures, onPress }: Props) {
  return (
    <View style={styles.sheet}>
      {captures.map((c, i) => (
        <CaptureLine key={c.id} capture={c} onPress={onPress} last={i === captures.length - 1} />
      ))}
    </View>
  );
}

const THUMB = 52;

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.ms, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 68 },
  pressed: { backgroundColor: colors.pressed },
  thumb: { width: THUMB, height: THUMB, borderRadius: borderRadius.sm, backgroundColor: colors.surfaceMuted },
  text: { flex: 1, minWidth: 0 },
  species: { ...typography.headline, color: colors.ink },
  date: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1 },
  figures: { alignItems: 'flex-end' },
  weight: { ...typography.headline, color: colors.ink, fontVariant: ['tabular-nums'] },
  unit: { ...typography.footnote, color: colors.inkSecondary, fontWeight: '500' },
  score: { ...typography.footnote, color: colors.goldInk, fontWeight: '600', fontVariant: ['tabular-nums'], marginTop: 1 },
  scoreUnit: { fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline, marginLeft: spacing.md + THUMB + spacing.ms },
});
