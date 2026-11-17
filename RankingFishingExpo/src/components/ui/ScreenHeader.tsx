import React, { useContext } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';

export interface LargeTitleProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/** Grand titre 32 pt des écrans racines (rôle header). */
export function LargeTitle({ children, style }: LargeTitleProps) {
  return (
    <Text style={[styles.title, style]} accessibilityRole="header" numberOfLines={1}>
      {children}
    </Text>
  );
}

export interface ScreenHeaderProps {
  title: string;
  /** Ligne de contexte SOUS le titre (jamais au-dessus). */
  subtitle?: string;
  /** Actions à droite : des IconButton 44 pt. */
  actions?: React.ReactNode;
  /** Ajoute l'inset haut de la zone sûre (si l'écran n'est pas déjà dans un SafeAreaView). */
  safeTop?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** En-tête d'écran racine : grand titre à gauche, actions icônes à droite. */
export default function ScreenHeader({ title, subtitle, actions, safeTop = false, style }: ScreenHeaderProps) {
  const insets = useContext(SafeAreaInsetsContext);
  return (
    <View style={[styles.wrap, safeTop && { paddingTop: (insets?.top ?? 0) + spacing.sm }, style]}>
      <View style={styles.row}>
        <View style={styles.titles}>
          <LargeTitle>{title}</LargeTitle>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  titles: { flex: 1 },
  title: { ...typography.largeTitle, color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', marginRight: -spacing.sm },
  subtitle: { ...typography.subhead, color: colors.inkSecondary, marginTop: 2 },
});
