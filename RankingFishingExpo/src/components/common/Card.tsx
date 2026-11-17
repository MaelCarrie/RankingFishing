import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'flat';
  padding?: boolean;
}

export default function Card({ children, style, variant = 'default', padding = true }: CardProps) {
  return (
    <View style={[
      styles.card,
      variant === 'flat' && styles.flat,
      padding && styles.padding,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  flat: { borderWidth: 0 },
  padding: {
    padding: spacing.md,
  },
});
