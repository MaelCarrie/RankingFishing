import React from 'react';
import { StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import { CaptureSkeleton } from '../ui/Skeleton';

// Silhouette d'une CaptureCard pendant le premier chargement du feed (issue #18) :
// ligne pêcheur, photo 4:3 et bande de pesée, aux mêmes marges que la carte.
export default function CaptureCardSkeleton() {
  return <CaptureSkeleton style={styles.card} />;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginBottom: spacing.ms },
});
