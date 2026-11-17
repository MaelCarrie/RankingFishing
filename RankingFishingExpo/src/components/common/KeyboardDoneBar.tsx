import React from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

/**
 * Barre « OK » au-dessus du clavier iOS.
 *
 * Les claviers numériques iOS (decimal-pad, number-pad) et les champs
 * multilignes n'ont aucune touche pour fermer le clavier : on ajoute une barre
 * reliée aux champs via `inputAccessoryViewID={KEYBOARD_DONE_ID}`.
 * Sur Android, le bouton retour système ferme déjà le clavier : rien à rendre.
 *
 * À monter une fois par écran qui contient de tels champs.
 */
export const KEYBOARD_DONE_ID = 'rf-keyboard-done';

/** Props à étaler sur un TextInput numérique ou multiligne. */
export const keyboardDoneProps = Platform.OS === 'ios' ? { inputAccessoryViewID: KEYBOARD_DONE_ID } : {};

/** Comportement de fermeture du clavier au défilement, pour ScrollView / FlatList. */
export const dismissOnDrag = {
  keyboardDismissMode: (Platform.OS === 'ios' ? 'interactive' : 'on-drag') as 'interactive' | 'on-drag',
  keyboardShouldPersistTaps: 'handled' as const,
};

export default function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => Keyboard.dismiss()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Fermer le clavier"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.label}>OK</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outline,
    paddingHorizontal: spacing.sm,
  },
  button: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  label: { ...typography.headline, color: colors.primary },
});
