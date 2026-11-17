import React from 'react';
import { View, Text, Image, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CaptureRef, SharedCapturePreview } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatWeight, formatSize } from '../../utils/formatting';
import { SpeciesMark, formatInt } from '../ui';

interface Props {
  captureRef: CaptureRef;
  preview?: SharedCapturePreview;
  isOwn?: boolean;
  onPress?: () => void;
  loading?: boolean;
}

// Carte compacte d'une capture partagée dans une conversation
export default function SharedCaptureCard({ captureRef, preview, isOwn = false, onPress, loading = false }: Props) {
  const details = [
    captureRef.weightGrams ? formatWeight(captureRef.weightGrams) : null,
    captureRef.sizeCm ? formatSize(captureRef.sizeCm) : null,
  ].filter(Boolean).join(' · ');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, isOwn && styles.cardOwn, pressed && styles.cardPressed]}
      onPress={onPress}
      disabled={!onPress || loading}
      accessibilityState={{ busy: loading, disabled: !onPress || loading }}
      accessibilityRole="button"
      accessibilityLabel={`Capture partagée : ${captureRef.species}${details ? `, ${details}` : ''}. Ouvrir le détail`}
      testID="shared-capture-card"
    >
      {preview?.photoUrl ? (
        <Image source={{ uri: preview.photoUrl }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <SpeciesMark name={captureRef.species} size={THUMB} variant="glyph" />
      )}

      <View style={styles.info}>
        <Text style={styles.species} numberOfLines={1}>{captureRef.species}</Text>
        {details ? <Text style={styles.details} numberOfLines={1}>{details}</Text> : null}
        <Text style={styles.owner} numberOfLines={1}>
          {preview?.ownerUsername ? `Prise de ${preview.ownerUsername}` : 'Capture partagée'}
        </Text>
      </View>

      {preview?.score != null && preview.score > 0 ? (
        <Text style={styles.score} numberOfLines={1}>
          {formatInt(preview.score)}
          <Text style={styles.scoreUnit}> pts</Text>
        </Text>
      ) : null}

      {loading
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <Ionicons name="chevron-forward" size={16} color={colors.inkTertiary} />}
    </Pressable>
  );
}

const THUMB = 48;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    minHeight: 64,
    width: 264,
    maxWidth: '100%',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.ms,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  cardOwn: { borderColor: colors.outline },
  cardPressed: { backgroundColor: colors.background },
  thumb: { width: THUMB, height: THUMB, borderRadius: borderRadius.sm, backgroundColor: colors.surfaceMuted },
  info: { flex: 1, minWidth: 0 },
  species: { ...typography.headline, color: colors.ink },
  details: { ...typography.subhead, color: colors.ink, fontVariant: ['tabular-nums'] },
  owner: { ...typography.caption, color: colors.inkSecondary, marginTop: 1 },
  score: { ...typography.subhead, color: colors.goldInk, fontWeight: '600', fontVariant: ['tabular-nums'] },
  scoreUnit: { ...typography.caption, fontWeight: '500' },
});
