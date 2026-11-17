import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, typography } from '../../theme';
import Touchable from './Touchable';
import type { IoniconName } from './types';

export type ButtonVariant = 'filled' | 'tonal' | 'outline' | 'text' | 'destructive';
export type ButtonSize = 'md' | 'sm';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icône Ionicons à gauche du libellé. */
  icon?: IoniconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

interface VariantSpec {
  bg: string;
  bgPressed: string;
  fg: string;
  border?: string;
}

const VARIANTS: Record<ButtonVariant, VariantSpec> = {
  filled: { bg: colors.primary, bgPressed: colors.primaryDark, fg: colors.textOnPrimary },
  tonal: { bg: colors.primaryTint, bgPressed: '#DFEBDD', fg: colors.primaryDark },
  outline: { bg: 'transparent', bgPressed: colors.primaryTint, fg: colors.primary, border: colors.primary },
  text: { bg: 'transparent', bgPressed: colors.pressed, fg: colors.primary },
  destructive: { bg: colors.error, bgPressed: '#A61F1F', fg: colors.textOnPrimary },
};

const HEIGHT: Record<ButtonSize, number> = { md: 48, sm: 36 };

/**
 * Bouton. md = 48 pt ; sm = 36 pt avec hitSlop vertical qui porte la cible à 44 pt.
 * Le vert reste la couleur d'action : jamais d'or sur un bouton.
 */
export default function Button({
  title,
  onPress,
  variant = 'filled',
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
  const spec = VARIANTS[variant];
  const isDisabled = disabled || loading;
  const height = HEIGHT[size];
  const slop = Math.max(0, (44 - height) / 2);
  const iconSize = size === 'md' ? 20 : 17;

  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      hitSlop={slop ? { top: slop, bottom: slop, left: 4, right: 4 } : undefined}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={(pressed) => [
        styles.base,
        {
          height,
          paddingHorizontal: size === 'md' ? 20 : 14,
          backgroundColor: pressed && !isDisabled ? spec.bgPressed : spec.bg,
        },
        spec.border ? { borderWidth: 1, borderColor: spec.border } : null,
        fullWidth && styles.fullWidth,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {icon ? <Ionicons name={icon} size={iconSize} color={spec.fg} style={styles.icon} /> : null}
        <Text
          numberOfLines={1}
          style={[size === 'md' ? styles.labelMd : styles.labelSm, { color: spec.fg }]}
        >
          {title}
        </Text>
      </View>
      {loading ? (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.center}>
            <ActivityIndicator size="small" color={spec.fg} />
          </View>
        </View>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.control,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  hidden: { opacity: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { marginRight: 8 },
  labelMd: { ...typography.button },
  labelSm: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
});
