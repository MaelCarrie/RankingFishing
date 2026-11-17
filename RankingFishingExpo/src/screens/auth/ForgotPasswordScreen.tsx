import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../store';
import { resetPassword } from '../../store/slices/authSlice';
import { validateEmail } from '../../utils/validation';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
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
          <View style={styles.iconTile}>
            <Ionicons name="mail-unread-outline" size={30} color={colors.primaryDark} />
          </View>
          <Text style={styles.title} accessibilityRole="header">Email envoyé</Text>
          <Text style={[styles.subtitle, styles.centerText]}>
            Si un compte existe pour{' '}
            <Text style={styles.strong}>{email}</Text>
            , tu recevras un lien de réinitialisation dans quelques minutes.
          </Text>
          <Button
            title="Retour à la connexion"
            onPress={() => navigation.navigate('Login')}
            variant="tonal"
            style={styles.backToLogin}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <View style={styles.topBar}>
          <IconButton icon="chevron-back" iconSize={26} accessibilityLabel="Retour" onPress={() => navigation.goBack()} />
        </View>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.iconTile}>
            <Ionicons name="key-outline" size={28} color={colors.primaryDark} />
          </View>
          <Text style={styles.title} accessibilityRole="header">Mot de passe oublié</Text>
          <Text style={styles.subtitle}>
            Saisis ton adresse email : nous t'enverrons un lien pour choisir un nouveau mot de passe.
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
            error={emailError}
            placeholder="ton@email.fr"
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />

          <Button
            title="Envoyer le lien"
            onPress={handleSend}
            loading={isLoading}
            fullWidth
            style={styles.send}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  topBar: { paddingHorizontal: spacing.xs, minHeight: 52, justifyContent: 'center' },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  centerText: { textAlign: 'center' },

  iconTile: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sheet,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.title1, color: colors.ink, marginBottom: spacing.sm },
  subtitle: { ...typography.body, color: colors.inkSecondary, marginBottom: spacing.xl, maxWidth: 420 },
  strong: { fontWeight: '600', color: colors.ink },
  send: { marginTop: spacing.sm },
  backToLogin: { alignSelf: 'center' },
});
