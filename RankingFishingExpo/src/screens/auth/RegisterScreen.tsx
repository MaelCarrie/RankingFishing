import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store';
import { register, clearError } from '../../store/slices/authSlice';
import { validateEmail, validatePassword, validatePasswordConfirm, validateUsername } from '../../utils/validation';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { FISHING_TYPE_LABELS, FR_REGIONS } from '../../config/constants';
import { FishingType } from '../../store/types';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import IconButton from '../../components/ui/IconButton';
import Input from '../../components/common/Input';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'> };

const FISHING_TYPES = Object.entries(FISHING_TYPE_LABELS) as [FishingType, string][];

export default function RegisterScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<FishingType[]>([]);
  const [region, setRegion] = useState<string | null>(null);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  function toggleType(type: FishingType) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function validate() {
    const e = {
      email: validateEmail(email),
      username: validateUsername(username),
      password: validatePassword(password),
      confirm: validatePasswordConfirm(password, confirm),
      cgu: !cguAccepted ? 'Accepte les CGU pour continuer' : null,
    };
    setErrors(e);
    return Object.values(e).every((v) => !v);
  }

  async function handleRegister() {
    if (!validate()) return;
    dispatch(clearError());
    dispatch(register({ email, password, username, region: region ?? undefined }));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" iconSize={26} accessibilityLabel="Retour" onPress={() => navigation.goBack()} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} accessibilityRole="header">Créer un compte</Text>
          <Text style={styles.subtitle}>Publie tes prises et entre au classement de ta région.</Text>

          {error && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Compte */}
          <View style={styles.section}>
            <Input
              label="Nom d'utilisateur"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              leftIcon="person-outline"
              error={errors.username}
              placeholder="MonPseudo"
              hint="3 à 20 caractères, lettres et chiffres uniquement"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={errors.email}
              placeholder="ton@email.fr"
            />
            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoComplete="new-password"
              leftIcon="lock-closed-outline"
              error={errors.password}
              placeholder="••••••••"
              hint="8 caractères minimum, dont 1 majuscule et 1 chiffre"
            />
            <Input
              label="Confirmer le mot de passe"
              value={confirm}
              onChangeText={setConfirm}
              isPassword
              autoComplete="new-password"
              leftIcon="lock-closed-outline"
              error={errors.confirm}
              placeholder="••••••••"
              containerStyle={styles.lastField}
            />
          </View>

          {/* Spécialités */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Tes spécialités</Text>
            <Text style={styles.sectionHint}>Choisis-en autant que tu veux.</Text>
            <View style={styles.chips}>
              {FISHING_TYPES.map(([type, label]) => (
                <Chip
                  key={type}
                  label={label}
                  selected={selectedTypes.includes(type)}
                  onPress={() => toggleType(type)}
                />
              ))}
            </View>
          </View>

          {/* Région */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">Ta région</Text>
            <Text style={styles.sectionHint}>Facultatif. Elle sert au classement régional.</Text>
            <View style={styles.chips}>
              {FR_REGIONS.map((r) => {
                const selected = region === r;
                return (
                  <Chip key={r} label={r} selected={selected} onPress={() => setRegion(selected ? null : r)} />
                );
              })}
            </View>
          </View>

          {/* CGU */}
          <Pressable
            style={({ pressed }) => [styles.cguRow, pressed && styles.cguRowPressed]}
            onPress={() => setCguAccepted((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: cguAccepted }}
            aria-checked={cguAccepted}
            accessibilityLabel="J'accepte les Conditions Générales d'Utilisation"
          >
            <View style={[styles.checkbox, cguAccepted && styles.checkboxChecked, !!errors.cgu && !cguAccepted && styles.checkboxError]}>
              {cguAccepted && <Ionicons name="checkmark" size={18} color={colors.textOnPrimary} />}
            </View>
            <Text style={styles.cguText}>
              J'accepte les{' '}
              <Text style={styles.cguLink}>Conditions Générales d'Utilisation</Text>
            </Text>
          </Pressable>
          {errors.cgu && <Text style={styles.errorText}>{errors.cgu}</Text>}

          <Button
            title="Créer mon compte"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            style={styles.registerBtn}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ?</Text>
            <Button title="Se connecter" variant="text" size="sm" onPress={() => navigation.navigate('Login')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  topBar: { paddingHorizontal: spacing.xs, minHeight: 52, justifyContent: 'center' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  title: { ...typography.largeTitle, color: colors.ink },
  subtitle: { ...typography.callout, color: colors.inkSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.control,
    padding: spacing.ms,
    marginBottom: spacing.md,
  },
  errorBannerText: { ...typography.subhead, color: colors.error, flex: 1 },

  section: { marginBottom: spacing.xl },
  lastField: { marginBottom: 0 },
  sectionTitle: { ...typography.headline, color: colors.ink },
  sectionHint: { ...typography.subhead, color: colors.inkSecondary, marginTop: 2, marginBottom: spacing.ms },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  cguRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.control,
    gap: spacing.ms,
  },
  cguRowPressed: { backgroundColor: colors.pressed },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxError: { borderColor: colors.error },
  cguText: { ...typography.subhead, color: colors.ink, flex: 1 },
  cguLink: { color: colors.primaryDark, fontWeight: '600' },
  errorText: { ...typography.footnote, color: colors.error, marginTop: spacing.xs },

  registerBtn: { marginTop: spacing.lg },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.lg,
  },
  footerText: { ...typography.callout, color: colors.inkSecondary },
});
