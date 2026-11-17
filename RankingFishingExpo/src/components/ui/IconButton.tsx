import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors } from '../../theme';
import { formatInt } from './format';
import Touchable from './Touchable';
import type { IoniconName } from './types';

export interface IconButtonProps {
  icon: IoniconName;
  /** Obligatoire : décrit l'action (« Rechercher », « Notifications »…). */
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'plain' | 'tonal' | 'filled';
  color?: string;
  iconSize?: number;
  /** Pastille de compteur (notifications non lues). 0 ou undefined = masquée. */
  badgeCount?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Bouton icône 44×44 pt. */
export default function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  color,
  iconSize = 22,
  badgeCount,
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const fg = color ?? (variant === 'filled' ? colors.textOnPrimary : variant === 'tonal' ? colors.primaryDark : colors.ink);
  const bg = variant === 'filled' ? colors.primary : variant === 'tonal' ? colors.primaryTint : 'transparent';
  const showBadge = !!badgeCount && badgeCount > 0;

  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={showBadge ? `${accessibilityLabel}, ${badgeCount} non lues` : accessibilityLabel}
      accessibilityState={{ disabled }}
      style={(pressed) => [
        styles.base,
        { backgroundColor: pressed && variant === 'plain' ? colors.pressed : bg },
        pressed && variant === 'filled' && { backgroundColor: colors.primaryDark },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={fg} />
      {showBadge ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{badgeCount! > 99 ? '99+' : formatInt(badgeCount!)}</Text>
        </View>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  badge: {
    position: 'absolute',
    top: 5,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
