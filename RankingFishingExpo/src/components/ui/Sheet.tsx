import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { borderRadius, colors } from '../../theme';
import Touchable from './Touchable';

export interface SheetProps {
  children?: React.ReactNode;
  /** Padding interne : true = 16, false = 0 (photo pleine largeur), ou valeur. */
  padding?: boolean | number;
  /** Rend la feuille pressable (ouvre un détail). */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Feuille blanche, liseré hairline, radius 14, sans ombre.
 * Ne jamais imbriquer une Sheet dans une autre : utiliser Divider ou ListGroup.
 */
export default function Sheet({ children, padding = true, onPress, accessibilityLabel, style, testID }: SheetProps) {
  const pad = padding === true ? 16 : padding === false ? 0 : padding;
  const base = [styles.sheet, { padding: pad }, style];
  if (onPress) {
    return (
      <Touchable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={base}
      >
        {children}
      </Touchable>
    );
  }
  return (
    <View testID={testID} style={base} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
});
