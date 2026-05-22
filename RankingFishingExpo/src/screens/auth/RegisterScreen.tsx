import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store';
import { register, clearError } from '../../store/slices/authSlice';
import { validateEmail, validatePassword, validatePasswordConfirm, validateUsername } from '../../utils/validation';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { FISHING_TYPE_LABELS, FR_REGIONS } from '../../config/constants';
import { FishingType } from '../../store/types';
import Button from '../../components/common/Button';
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
      cgu: !cguAccepted ? 'Vous devez accepter les CGU' : null,
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Retour</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Créer un compte</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* Infos de base */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations</Text>
            <Input
              label="Nom d'utilisateur"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              leftIcon="person-outline"
              error={errors.username}
              placeholder="MonPseudo"
              hint="3-20 caractères, lettres et chiffres uniquement"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={errors.email}
              placeholder="vous@exemple.fr"
            />
            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon="lock-closed-outline"
              error={errors.password}
              placeholder="••••••••"
              hint="8 caractères min., 1 majuscule, 1 chiffre"
            />
            <Input
              label="Confirmer le mot de passe"
              value={confirm}
              onChangeText={setConfirm}
              isPassword
              leftIcon="lock-closed-outline"
              error={errors.confirm}
              placeholder="••••••••"
            />
          </View>

          {/* Spécialités */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes spécialités de pêche</Text>
            <Text style={styles.sectionHint}>Sélectionne autant que tu veux</Text>
            <View style={styles.typesGrid}>
              {FISHING_TYPES.map(([type, label]) => {
                const selected = selectedTypes.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    onPress={() => toggleType(type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Région */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ma région</Text>
            <Text style={styles.sectionHint}>Pour le classement régional (optionnel)</Text>
            <View style={styles.typesGrid}>
              {FR_REGIONS.map((r) => {
                const selected = region === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.typeChip, selected && styles.typeChipSelected]}
                    onPress={() => setRegion(selected ? null : r)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeChipText, selected && styles.typeChipTextSelected]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* CGU */}
          <TouchableOpacity style={styles.cguRow} onPress={() => setCguAccepted((v) => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, cguAccepted && styles.checkboxChecked]}>
              {cguAccepted && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.cguText}>
              J'accepte les{' '}
              <Text style={styles.cguLink}>Conditions Générales d'Utilisation</Text>
            </Text>
          </TouchableOpacity>
          {errors.cgu && <Text style={styles.errorText}>{errors.cgu}</Text>}

          <Button
            title="Créer mon compte"
            onPress={handleRegister}
            loading={isLoading}
            fullWidth
            size="lg"
            style={styles.registerBtn}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },

  header: { marginBottom: spacing.lg },
  backBtn: { marginBottom: spacing.md },
  backText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  title: { ...typography.h2, color: colors.textPrimary },

  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: { ...typography.bodySmall, color: colors.error },

  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
  sectionHint: { ...typography.bodySmall, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },

  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  typeChipSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceVariant },
  typeChipText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
  typeChipTextSelected: { color: colors.primary, fontWeight: '700' },

  cguRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxIcon: { color: '#fff', fontSize: 13, fontWeight: '700' },
  cguText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  cguLink: { color: colors.primary, fontWeight: '600' },
  errorText: { ...typography.caption, color: colors.error, marginBottom: spacing.md },

  registerBtn: { marginBottom: spacing.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: spacing.lg },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.body, color: colors.primary, fontWeight: '700' },
});
