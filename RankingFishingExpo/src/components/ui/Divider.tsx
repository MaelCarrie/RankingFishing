import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';

export interface DividerProps {
  /** Retrait à gauche (ex. 16, ou 60 pour s'aligner après une icône de ListRow). */
  inset?: number;
  vertical?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Séparateur hairline. */
export default function Divider({ inset = 0, vertical = false, color = colors.hairline, style }: DividerProps) {
  return (
    <View
      accessible={false}
      importantForAccessibility="no"
      style={[
        vertical
          ? { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' }
          : { height: StyleSheet.hairlineWidth, marginLeft: inset },
        { backgroundColor: color },
        style,
      ]}
    />
  );
}
