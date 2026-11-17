import React, { forwardRef, useState } from 'react';
import { View, TextInput, Text, Pressable, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  /** Unité affichée à droite du champ (« kg », « cm »). */
  suffix?: string;
}

/**
 * Champ de saisie : libellé en casse normale au-dessus, contour `borderStrong`
 * (≥ 3:1), contour vert de 2 pt au focus, rouge en erreur. Hauteur 52 pt
 * (utilisable dehors, à une main).
 */
const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    isPassword = false,
    suffix,
    style,
    onFocus,
    onBlur,
    editable = true,
    ...props
  },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const passwordIcon: keyof typeof Ionicons.glyphMap = showPassword ? 'eye-off-outline' : 'eye-outline';

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focused,
          !!error && styles.errorBorder,
          !editable && styles.disabled,
        ]}
      >
        {leftIcon && (
          <Ionicons name={leftIcon} size={20} color={colors.inkSecondary} style={styles.leftIcon} />
        )}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.inkTertiary}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          secureTextEntry={isPassword && !showPassword}
          editable={editable}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? undefined}
          onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
          {...props}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            style={({ pressed }) => [styles.rightIcon, pressed && styles.iconPressed]}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            <Ionicons name={passwordIcon} size={20} color={colors.inkSecondary} />
          </Pressable>
        )}
        {!isPassword && rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={({ pressed }) => [styles.rightIcon, pressed && styles.iconPressed]}
          >
            <Ionicons name={rightIcon} size={20} color={colors.inkSecondary} />
          </Pressable>
        )}
      </View>

      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      {!error && hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    ...typography.subhead,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.xs + 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md - 1,
    minHeight: 52,
  },
  // 2 pt au focus, padding compensé : pas de saut de mise en page
  focused: { borderColor: colors.primary, borderWidth: 2, paddingHorizontal: spacing.md - 2 },
  errorBorder: { borderColor: colors.error },
  disabled: { backgroundColor: colors.surfaceMuted },
  leftIcon: { marginRight: spacing.sm },
  rightIcon: {
    width: 44,
    height: 44,
    marginRight: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.control,
  },
  iconPressed: { backgroundColor: colors.pressed },
  suffix: { ...typography.body, fontWeight: '500', color: colors.inkSecondary, marginLeft: spacing.sm },
  input: {
    flex: 1,
    // Web : un <input> a une largeur intrinsèque ; sans minWidth 0 il pousse l'unité hors du cadre
    minWidth: 0,
    ...typography.body,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: spacing.sm + 2,
    // Web : pas de contour navigateur, le focus est porté par le cadre
    outlineStyle: 'none',
  } as any,
  error: { ...typography.footnote, color: colors.error, marginTop: spacing.xs },
  hint: { ...typography.footnote, color: colors.inkSecondary, marginTop: spacing.xs },
});
