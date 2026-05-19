import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'premium' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: colors.surfaceVariant, text: colors.primary },
  secondary: { bg: '#FFF8E1', text: colors.secondaryDark },
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  error: { bg: colors.errorLight, text: colors.error },
  info: { bg: '#E3F2FD', text: colors.info },
  premium: { bg: colors.premiumBg, text: colors.secondaryDark },
  neutral: { bg: '#F5F5F5', text: colors.textSecondary },
};

export default function Badge({ label, variant = 'primary', size = 'sm', style }: BadgeProps) {
  const vs = variantStyles[variant];
  return (
    <View style={[
      styles.badge,
      { backgroundColor: vs.bg },
      size === 'md' && styles.md,
      style,
    ]}>
      <Text style={[
        styles.label,
        { color: vs.text },
        size === 'md' && styles.labelMd,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
  labelMd: {
    fontSize: 13,
  },
});
