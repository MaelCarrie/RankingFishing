import React from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, typography } from '../../theme';
import { formatInt } from './format';
import Touchable from './Touchable';
import type { IoniconName } from './types';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Icône à gauche (remplacée par une coche quand la puce est sélectionnée). */
  icon?: IoniconName;
  /** Compteur optionnel à droite du libellé. */
  count?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Puce de filtre sélectionnable (espèce, région…). 36 pt + hitSlop → 44 pt.
 * La sélection est portée par la coche ET la couleur (jamais la couleur seule).
 */
export default function Chip({ label, selected = false, onPress, icon, count, disabled = false, style, testID }: ChipProps) {
  const fg = selected ? colors.primaryDark : colors.ink;
  const leadIcon: IoniconName | undefined = selected ? 'checkmark' : icon;
  return (
    <Touchable
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      accessibilityState={{ selected, disabled }}
      style={(pressed) => [
        styles.chip,
        selected ? styles.selected : null,
        pressed && !selected ? { backgroundColor: colors.pressed } : null,
        disabled && styles.disabled,
        style,
      ]}
    >
      {leadIcon ? <Ionicons name={leadIcon} size={16} color={selected ? colors.primary : colors.inkSecondary} style={styles.icon} /> : null}
      <Text style={[styles.label, { color: fg }, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text style={[styles.count, selected && { color: colors.primaryDark }]}>{formatInt(count)}</Text>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  disabled: { opacity: 0.4 },
  icon: { marginRight: 6 },
  label: { ...typography.subhead, fontWeight: '500' },
  labelSelected: { fontWeight: '600' },
  count: { ...typography.footnote, color: colors.inkSecondary, marginLeft: 6, fontVariant: ['tabular-nums'] },
});
