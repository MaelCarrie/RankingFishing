import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import Button from './Button';
import type { IoniconName } from './types';

export interface ErrorStateProps {
  /** Nomme le problème (« Impossible de charger le classement »). */
  title?: string;
  /** Nomme la reprise (« Vérifie ta connexion puis réessaie. »). */
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  icon?: IoniconName;
  style?: StyleProp<ViewStyle>;
}

/** Erreur de chargement avec bouton Réessayer. */
export default function ErrorState({
  title = 'Impossible de charger',
  message = 'Vérifie ta connexion puis réessaie.',
  onRetry,
  retryLabel = 'Réessayer',
  retrying = false,
  icon = 'cloud-offline-outline',
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.wrap, style]} accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={32} color={colors.inkSecondary} />
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="outline"
          icon="refresh"
          loading={retrying}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  title: { ...typography.headline, color: colors.ink, textAlign: 'center', marginTop: spacing.ms },
  message: { ...typography.callout, color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 320 },
  action: { marginTop: spacing.lg, alignSelf: 'center' },
});
