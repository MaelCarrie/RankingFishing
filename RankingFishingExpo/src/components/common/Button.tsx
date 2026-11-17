import React from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import UIButton, { ButtonVariant } from '../ui/Button';
import type { IoniconName } from '../ui/types';

/**
 * Ancienne API de bouton, conservée pour les écrans existants.
 * Le rendu est délégué à la primitive `ui/Button` (fiche de pesée) :
 * primary → filled, secondary → tonal (jamais d'or sur un bouton),
 * outline → outline, ghost → text, danger → destructive. `lg` = `md` (48 pt).
 */
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IoniconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  /** Ignoré : la typographie des boutons est fixée par le design system. */
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

const VARIANT_MAP: Record<NonNullable<ButtonProps['variant']>, ButtonVariant> = {
  primary: 'filled',
  secondary: 'tonal',
  outline: 'outline',
  ghost: 'text',
  danger: 'destructive',
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  return (
    <UIButton
      title={title}
      onPress={onPress}
      variant={VARIANT_MAP[variant]}
      size={size === 'sm' ? 'sm' : 'md'}
      icon={icon}
      loading={loading}
      disabled={disabled}
      fullWidth={fullWidth}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
    />
  );
}
