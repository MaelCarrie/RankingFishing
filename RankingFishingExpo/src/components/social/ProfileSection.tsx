import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, hitSlop, spacing, typography } from '../../theme';

interface Props {
  title: string;
  /** Texte discret à droite du titre (compteur « 3 / 9 »). */
  meta?: string;
  /** Lien d'action à droite (« Tout voir »). */
  actionLabel?: string;
  onAction?: () => void;
  actionAccessibilityLabel?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Section d'écran racine : titre + liseré hairline, sans carte.
 * Remplace les empilements de cartes sur les profils.
 */
export default function ProfileSection({
  title, meta, actionLabel, onAction, actionAccessibilityLabel, children, style, testID,
}: Props) {
  return (
    <View style={[styles.section, style]} testID={testID}>
      <View style={styles.head}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.rule} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: spacing.sm },
  title: { ...typography.headline, color: colors.ink, flex: 1 },
  meta: { ...typography.footnote, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  action: { minHeight: 44, justifyContent: 'center', paddingLeft: spacing.sm },
  actionPressed: { opacity: 0.6 },
  actionText: { ...typography.subhead, color: colors.primary, fontWeight: '600' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong, opacity: 0.5, marginBottom: spacing.ms },
});
