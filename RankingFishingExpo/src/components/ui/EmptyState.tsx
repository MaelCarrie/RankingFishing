import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import Button from './Button';
import type { IoniconName } from './types';

export interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  /** Explique quoi faire pour remplir l'écran (pas « rien ici »). */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** État vide qui enseigne : icône, titre, texte, action optionnelle. */
export default function EmptyState({ icon, title, message, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.tile}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="tonal" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  tile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.headline, color: colors.ink, textAlign: 'center' },
  message: { ...typography.callout, color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 320 },
  action: { marginTop: spacing.lg, alignSelf: 'center' },
});
