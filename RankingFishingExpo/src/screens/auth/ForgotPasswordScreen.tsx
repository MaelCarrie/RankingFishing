import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store';
import { resetPassword } from '../../store/slices/authSlice';
import { validateEmail } from '../../utils/validation';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

export default function ForgotPasswordScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    await dispatch(resetPassword(email));
    setSent(true);
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.successIcon}>📬</Text>
          <Text style={styles.successTitle}>Email envoyé !</Text>
          <Text style={styles.successText}>
            Si un compte existe pour{' '}
            <Text style={{ fontWeight: '700' }}>{email}</Text>
            , tu recevras un lien de réinitialisation dans quelques minutes.
          </Text>
          <Button
            title="Retour à la connexion"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            Saisis ton adresse email et nous t'enverrons un lien pour réinitialiser ton mot de passe.
          </Text>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={emailError}
              placeholder="vous@exemple.fr"
            />

            <Button
              title="Envoyer le lien"
              onPress={handleSend}
              loading={isLoading}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },

  backBtn: { marginBottom: spacing.xl },
  backText: { ...typography.body, color: colors.primary, fontWeight: '600' },

  icon: { fontSize: 56, marginBottom: spacing.lg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 24 },

  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },

  successIcon: { fontSize: 72, marginBottom: spacing.lg },
  successTitle: { ...typography.h2, color: colors.primary, marginBottom: spacing.md },
  successText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 24 },
});
