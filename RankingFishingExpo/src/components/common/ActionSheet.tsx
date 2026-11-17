import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme';

// Feuille d'actions multiplateforme (iOS, Android, web). Remplace Alert.alert
// à boutons multiples, qui ne fonctionne pas sur react-native-web.

export interface ActionSheetOption {
  key: string;
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
  cancelLabel?: string;
  /** Contenu libre affiché à la place des options (ex. étape suivante) */
  children?: React.ReactNode;
  /** Contenu affiché sous les options (message de retour, note…) */
  footer?: React.ReactNode;
  testID?: string;
}

export default function ActionSheet({
  visible, title, message, options, onClose, cancelLabel = 'Annuler', children, footer, testID,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]} testID={testID}>
          <View style={styles.grabber} />
          {(title || message) && (
            <View style={styles.header}>
              {title && <Text style={styles.title} accessibilityRole="header">{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          )}

          {children ?? (
            <View style={styles.options}>
              {options.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed, opt.disabled && styles.optionDisabled]}
                  onPress={opt.onPress}
                  disabled={opt.disabled}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label}
                  accessibilityHint={opt.description}
                >
                  <View style={[styles.optionIcon, opt.destructive && styles.optionIconDanger]}>
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={opt.destructive ? colors.error : colors.primary}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, opt.destructive && styles.optionLabelDanger]}>
                      {opt.label}
                    </Text>
                    {opt.description && <Text style={styles.optionDesc}>{opt.description}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          {footer}

          <Pressable
            style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outline,
    marginBottom: spacing.sm,
  },
  header: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  title: { ...typography.headline, color: colors.ink },
  message: { ...typography.subhead, color: colors.inkSecondary, marginTop: 4 },

  options: { paddingVertical: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderRadius: borderRadius.control,
  },
  pressed: { backgroundColor: colors.pressed },
  optionDisabled: { opacity: 0.45 },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.control,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconDanger: { backgroundColor: colors.errorLight },
  optionText: { flex: 1 },
  optionLabel: { ...typography.body, fontWeight: '600', color: colors.ink },
  optionLabelDanger: { color: colors.error },
  optionDesc: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1 },

  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surfaceMuted,
  },
  cancelPressed: { backgroundColor: colors.hairline },
  cancelText: { ...typography.button, color: colors.ink },
});
