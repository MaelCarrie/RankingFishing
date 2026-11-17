import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { useAppDispatch, useAppSelector } from '../../store';
import { deleteAccount, resetPassword, signOut } from '../../store/slices/authSlice';
import { MainStackParamList } from '../../navigation/types';
import { APP_VERSION, FISHING_TYPE_LABELS } from '../../config/constants';
import { colors, spacing, typography } from '../../theme';
import { ListGroup, ListRow } from '../../components/ui/ListGroup';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/Toast';
import ActionSheet from '../../components/common/ActionSheet';
import { confirmAction } from '../../utils/dialog';
import {
  DEFAULT_NOTIFICATION_PREFS, NotificationPrefs, loadNotificationPrefs, saveNotificationPrefs,
} from '../../utils/preferences';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const APP_DISPLAY_VERSION = Constants.expoConfig?.version ?? APP_VERSION;

const NOTIF_ROWS: { key: keyof NotificationPrefs; title: string; icon: React.ComponentProps<typeof ListRow>['icon'] }[] = [
  { key: 'messages', title: 'Nouveaux messages', icon: 'chatbubbles-outline' },
  { key: 'followRequests', title: "Demandes d'abonnement", icon: 'person-add-outline' },
  { key: 'likesAndComments', title: "J'aime et commentaires", icon: 'heart-outline' },
  { key: 'badges', title: 'Badges débloqués', icon: 'ribbon-outline' },
];

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [sendingReset, setSendingReset] = useState(false);
  const [deleteSheetOpen, setDeleteSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadNotificationPrefs(user.id).then((p) => { if (active) setPrefs(p); });
    return () => { active = false; };
  }, [user?.id]);

  if (!user) return null;

  function togglePref(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotificationPrefs(user!.id, next);
  }

  async function handleResetPassword() {
    const ok = await confirmAction({
      title: 'Changer ton mot de passe ?',
      message: `On envoie un lien de réinitialisation à ${user!.email}.`,
      confirmLabel: 'Envoyer le lien',
    });
    if (!ok) return;
    setSendingReset(true);
    const result = await dispatch(resetPassword(user!.email));
    setSendingReset(false);
    if (resetPassword.fulfilled.match(result)) {
      toast.show(`Lien envoyé à ${user!.email}. Vérifie aussi tes spams.`, { tone: 'success' });
    } else {
      toast.show("L'e-mail n'a pas pu partir. Réessaie dans un instant.", { tone: 'error' });
    }
  }

  async function handleSignOut() {
    const ok = await confirmAction({
      title: 'Se déconnecter ?',
      message: 'Tu pourras te reconnecter à tout moment avec ton e-mail.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
    });
    if (ok) dispatch(signOut());
  }

  async function handleDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await dispatch(deleteAccount(user!.id));
    if (!deleteAccount.fulfilled.match(result)) {
      setDeleting(false);
      setDeleteError((result.payload as string) ?? 'Suppression impossible. Réessaie dans un instant.');
    }
    // Succès : l'état auth est vidé, AppNavigator bascule sur l'écran de connexion
  }

  const specialtiesSummary = user.specialties.length > 0
    ? user.specialties.map((s) => FISHING_TYPE_LABELS[s.type]).join(', ')
    : 'Aucune spécialité';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} testID="settings-screen">
        {/* Profil */}
        <ListGroup header="Profil" style={styles.group}>
          <ListRow
            title={user.username}
            subtitle={user.email}
            left={<Avatar username={user.username} uri={user.avatar} size={44} premium={user.isPremium} />}
            onPress={() => navigation.navigate('EditProfile')}
            accessibilityHint="Ouvre la modification du profil"
            testID="settings-edit-profile"
          />
          <ListRow
            title="Photo, bio et localisation"
            icon="create-outline"
            iconTone="neutral"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <ListRow
            title="Région"
            icon="map-outline"
            iconTone="neutral"
            value={user.region ?? 'Non renseignée'}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <ListRow
            title="Spécialités"
            subtitle={specialtiesSummary}
            icon="fish-outline"
            iconTone="neutral"
            onPress={() => navigation.navigate('EditProfile')}
          />
        </ListGroup>

        {/* Notifications (préférences locales) */}
        <ListGroup
          header="Notifications"
          footer="Choix enregistrés sur cet appareil. Les notifications push arrivent dans une prochaine version : elles suivront ces réglages."
          style={styles.group}
        >
          {NOTIF_ROWS.map((row) => (
            <ListRow
              key={row.key}
              title={row.title}
              icon={row.icon}
              iconTone="neutral"
              switchValue={prefs[row.key]}
              onSwitchChange={(v) => togglePref(row.key, v)}
              testID={`settings-notif-${row.key}`}
            />
          ))}
        </ListGroup>

        {/* Confidentialité : informations réelles du fonctionnement actuel */}
        <ListGroup
          header="Confidentialité"
          footer="Le lieu de tes prises n'est visible que par toi et les membres Premium. Pour te suivre, un pêcheur doit t'envoyer une demande que tu acceptes."
          style={styles.group}
        >
          <ListRow
            title="Demandes d'abonnement"
            icon="people-outline"
            iconTone="neutral"
            onPress={() => navigation.navigate('FollowRequests')}
          />
        </ListGroup>

        {/* Compte */}
        <ListGroup header="Compte" style={styles.group}>
          <ListRow
            title="Premium"
            icon="star-outline"
            value={user.isPremium ? 'Actif' : 'Bientôt disponible'}
            onPress={() => navigation.navigate('Premium')}
            testID="settings-premium"
          />
          <ListRow
            title="Changer mon mot de passe"
            subtitle="Lien envoyé par e-mail"
            icon="key-outline"
            iconTone="neutral"
            onPress={handleResetPassword}
            right={sendingReset ? <ActivityIndicator color={colors.primary} /> : undefined}
            disabled={sendingReset}
            testID="settings-reset-password"
          />
          <ListRow
            title="Revoir la présentation"
            icon="play-circle-outline"
            iconTone="neutral"
            onPress={() => navigation.navigate('Onboarding')}
          />
        </ListGroup>

        <ListGroup style={styles.group}>
          <ListRow
            title="Se déconnecter"
            icon="log-out-outline"
            iconTone="neutral"
            onPress={handleSignOut}
            chevron={false}
            testID="settings-sign-out"
          />
        </ListGroup>

        <ListGroup
          header="Zone sensible"
          footer="Supprime définitivement ton profil, tes captures, photos, commentaires, messages et badges."
          style={styles.group}
        >
          <ListRow
            title="Supprimer mon compte"
            icon="trash-outline"
            destructive
            chevron={false}
            onPress={() => { setDeleteError(null); setDeleteSheetOpen(true); }}
            testID="settings-delete-account"
          />
        </ListGroup>

        <Text style={styles.version} testID="settings-version">
          RankingFishing · version {APP_DISPLAY_VERSION}
        </Text>
      </ScrollView>

      <ActionSheet
        visible={deleteSheetOpen}
        onClose={() => { if (!deleting) setDeleteSheetOpen(false); }}
        title="Supprimer ton compte ?"
        message={
          `Ton profil ${user.username}, tes ${user.stats.totalCaptures} captures, tes photos, commentaires, ` +
          'messages et badges seront effacés. Cette action est définitive.'
        }
        cancelLabel="Garder mon compte"
        options={[
          {
            key: 'delete',
            label: deleting ? 'Suppression en cours…' : 'Supprimer définitivement',
            icon: 'trash-outline',
            destructive: true,
            disabled: deleting,
            onPress: handleDeleteAccount,
          },
        ]}
        footer={deleteError ? (
          <View style={styles.deleteError} accessibilityRole="alert">
            <Text style={styles.deleteErrorText}>{deleteError}</Text>
          </View>
        ) : undefined}
        testID="delete-account-sheet"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  group: { marginBottom: spacing.lg },
  version: {
    ...typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  deleteError: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  deleteErrorText: { ...typography.footnote, color: colors.error, textAlign: 'center' },
});
