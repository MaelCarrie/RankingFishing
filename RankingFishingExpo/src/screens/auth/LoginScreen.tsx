import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store';
import { signIn, clearError } from '../../store/slices/authSlice';
import { validateEmail, validatePassword } from '../../utils/validation';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export default function LoginScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function validate() {
    const ee = validateEmail(email);
    const pe = validatePassword(password);
    setEmailError(ee);
    setPasswordError(pe);
    return !ee && !pe;
  }

  async function handleLogin() {
    if (!validate()) return;
    dispatch(clearError());
    dispatch(signIn({ email, password }));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🎣</Text>
            <Text style={styles.appName}>RankingFishing</Text>
            <Text style={styles.tagline}>Pêchez, partagez, classez-vous !</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            <Text style={styles.title}>Connexion</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={emailError}
              placeholder="vous@exemple.fr"
            />

            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon="lock-closed-outline"
              error={passwordError}
              placeholder="••••••••"
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.loginBtn}
            />

            {/* Séparateur */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Boutons OAuth (UI only) */}
            <Button
              title="Continuer avec Google"
              onPress={() => Alert.alert('Bientôt disponible', 'La connexion Google sera disponible après configuration Firebase.')}
              variant="outline"
              fullWidth
              style={styles.oauthBtn}
            />
            <Button
              title="Continuer avec Facebook"
              onPress={() => Alert.alert('Bientôt disponible', 'La connexion Facebook sera disponible après configuration Firebase.')}
              variant="outline"
              fullWidth
              style={styles.oauthBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>S'inscrire</Text>
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
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 64, marginBottom: spacing.sm },
  appName: { ...typography.h1, color: colors.primary },
  tagline: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },

  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#1B2631',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },

  errorBanner: {
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorBannerText: { ...typography.bodySmall, color: colors.error },

  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.lg, marginTop: -spacing.sm },
  forgotText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },

  loginBtn: { marginBottom: spacing.md },

  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { ...typography.bodySmall, color: colors.textSecondary, marginHorizontal: spacing.md },

  oauthBtn: { marginBottom: spacing.sm },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { ...typography.body, color: colors.textSecondary },
  footerLink: { ...typography.body, color: colors.primary, fontWeight: '700' },
});
