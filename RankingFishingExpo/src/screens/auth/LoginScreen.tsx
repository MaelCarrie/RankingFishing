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
import { signIn, clearError } from '../../store/slices/authSlice';
import { validateEmail, validatePassword } from '../../utils/validation';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import Input from '../../components/common/Input';
import { USE_MOCK_DATA } from '../../config/supabase';
import { MOCK_DEMO_EMAIL, MOCK_DEMO_PASSWORD } from '../../api/mock/data';
import { dismissOnDrag } from '../../components/common/KeyboardDoneBar';

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
    // En mode mock, le compte démo n'a pas à respecter les règles de création de mot de passe
    const pe = USE_MOCK_DATA
      ? (password ? null : 'Le mot de passe est requis')
      : validatePassword(password);
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
        <ScrollView contentContainerStyle={styles.scroll} {...dismissOnDrag}>
          {/* Marque */}
          <View style={styles.header}>
            <Logo size={72} />
            <Text style={styles.appName} accessibilityRole="header">RankingFishing</Text>
            <Text style={styles.tagline}>Enregistre tes prises, grimpe au classement.</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.form}>
            {USE_MOCK_DATA && (
              <Pressable
                style={({ pressed }) => [styles.demoHint, pressed && styles.demoHintPressed]}
                onPress={() => { setEmail(MOCK_DEMO_EMAIL); setPassword(MOCK_DEMO_PASSWORD); }}
                accessibilityRole="button"
                accessibilityLabel="Remplir le compte démo"
                testID="login-demo-hint"
              >
                <Ionicons name="person-circle-outline" size={22} color={colors.primaryDark} />
                <View style={styles.demoHintBody}>
                  <Text style={styles.demoHintTitle}>Mode démo : remplir le compte</Text>
                  <Text style={styles.demoHintText} numberOfLines={1}>
                    {MOCK_DEMO_EMAIL} / {MOCK_DEMO_PASSWORD}
                  </Text>
                </View>
              </Pressable>
            )}

            {error && (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
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
              textContentType="emailAddress"
              leftIcon="mail-outline"
              error={emailError}
              placeholder="ton@email.fr"
              accessibilityLabel="Email"
              testID="login-email"
            />

            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoComplete="password"
              textContentType="password"
              leftIcon="lock-closed-outline"
              error={passwordError}
              placeholder="••••••••"
              accessibilityLabel="Mot de passe"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
              testID="login-password"
              containerStyle={styles.passwordField}
            />

            <Button
              title="Mot de passe oublié ?"
              variant="text"
              size="sm"
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotLink}
            />

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
              style={styles.loginBtn}
            />
          </View>

          {/* Inscription */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Button
              title="S'inscrire"
              variant="text"
              size="sm"
              onPress={() => navigation.navigate('Register')}
              accessibilityLabel="S'inscrire : créer un compte"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },

  header: { alignItems: 'center', marginBottom: spacing.xl },
  appName: { ...typography.title1, color: colors.ink, marginTop: spacing.md },
  tagline: { ...typography.callout, color: colors.inkSecondary, marginTop: spacing.xs, textAlign: 'center' },

  form: {},

  demoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.control,
    backgroundColor: colors.primaryTint,
  },
  demoHintPressed: { backgroundColor: '#DFEBDD' },
  demoHintBody: { flex: 1 },
  demoHintTitle: { ...typography.subhead, fontWeight: '600', color: colors.primaryDark },
  demoHintText: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1 },

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

  passwordField: { marginBottom: spacing.xs },
  forgotLink: { alignSelf: 'flex-end', marginRight: -spacing.ms, marginBottom: spacing.md },

  loginBtn: {},

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xl,
  },
  footerText: { ...typography.callout, color: colors.inkSecondary },
});
