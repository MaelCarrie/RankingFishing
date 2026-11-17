import React, { useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { colors, motion, spacing, typography } from '../../theme';
import Button from './Button';
import Metric from './Metric';
import { formatInt } from './format';
import { hapticSuccess } from './haptics';
import { useReduceMotion } from './hooks';
import type { IoniconName } from './types';

export type BadgeCategoryKey = 'progression' | 'excellence' | 'community' | 'seasonal';

/** Icône Ionicons par catégorie de badge (remplace les emoji stockés en base). */
export function badgeIconFor(category?: BadgeCategoryKey | string): IoniconName {
  switch (category) {
    case 'progression': return 'trending-up-outline';
    case 'excellence': return 'trophy-outline';
    case 'community': return 'people-outline';
    case 'seasonal': return 'leaf-outline';
    default: return 'ribbon-outline';
  }
}

export interface BadgeUnlockSheetProps {
  visible: boolean;
  /** Ferme la feuille (bouton Continuer, fond, retour Android). */
  onClose: () => void;
  badgeName: string;
  description?: string;
  xpGained: number;
  /** Icône Ionicons ; défaut : dérivée de `category`. */
  icon?: IoniconName;
  category?: BadgeCategoryKey | string;
}

/**
 * Moment signature : après une publication, la feuille monte avec un liseré or,
 * le badge, son nom et l'XP gagnée. Fondu enchaîné si « Réduire les animations ».
 */
export default function BadgeUnlockSheet({
  visible,
  onClose,
  badgeName,
  description,
  xpGained,
  icon,
  category,
}: BadgeUnlockSheetProps) {
  const reduceMotion = useReduceMotion();
  const insets = useContext(SafeAreaInsetsContext);
  const [mounted, setMounted] = useState(visible);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: motion.slow, easing: motion.easeOut, useNativeDriver: true }).start();
      hapticSuccess();
      AccessibilityInfo.announceForAccessibility(`Badge débloqué : ${badgeName}, plus ${xpGained} XP`);
    } else if (mounted) {
      Animated.timing(v, { toValue: 0, duration: motion.base, easing: motion.easeInOut, useNativeDriver: true }).start(
        () => setMounted(false),
      );
    }
    // badgeName : badges enchaînés (file de plusieurs déblocages), la feuille rejoue son entrée
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, badgeName]);

  if (!mounted) return null;

  const translateY = reduceMotion ? 0 : v.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });
  const badgeScale = reduceMotion ? 1 : v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.85, 1.04, 1] });

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: v }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" accessibilityRole="button" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: (insets?.bottom ?? 0) + spacing.md, opacity: v, transform: [{ translateY }] },
          ]}
        >
          <Animated.View style={[styles.medal, { transform: [{ scale: badgeScale }] }]}>
            <Ionicons name={icon ?? badgeIconFor(category)} size={36} color={colors.goldInk} />
          </Animated.View>
          <Text style={styles.name} accessibilityRole="header">{badgeName}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <Metric value={`+${formatInt(xpGained)}`} unit="XP" size="lg" tone="gold" align="center" style={styles.xp} />
          <Button title="Continuer" onPress={onClose} fullWidth />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: colors.secondary,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  medal: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.goldTint,
    borderWidth: 2,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  name: { ...typography.title2, color: colors.ink, textAlign: 'center' },
  description: { ...typography.callout, color: colors.inkSecondary, textAlign: 'center', marginTop: spacing.xs, maxWidth: 320 },
  xp: { marginTop: spacing.md, marginBottom: spacing.lg },
});
