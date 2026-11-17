import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { signOut, refreshUser, refreshPendingCount } from '../../store/slices/authSlice';
import { ProfileStackParamList, MainStackParamList } from '../../navigation/types';
import { Badge, Capture } from '../../store/types';
import { colors, spacing, typography } from '../../theme';
import { IconButton, ListGroup, ListRow } from '../../components/ui';
import { fetchBadges } from '../../api/badges';
import { fetchMyCaptures } from '../../api/captures';
import { confirmAction } from '../../utils/dialog';
import { RootHeader } from '../../navigation/headers';
import ProfileHeader from '../../components/social/ProfileHeader';
import ProfileRecords from '../../components/social/ProfileRecords';
import ProfileSection from '../../components/social/ProfileSection';
import ProfileBadgesStrip from '../../components/social/ProfileBadgesStrip';
import ProfileCaptureList from '../../components/social/ProfileCaptureList';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;
type MainNav = NativeStackNavigationProp<MainStackParamList>;

const PREVIEW_COUNT = 3;

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user, pendingRequestsCount } = useAppSelector((s) => s.auth);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const mainNav = navigation.getParent<MainNav>();

  // Paramètres : icône d'en-tête (plus de bouton flottant)
  useLayoutEffect(() => {
    // L'en-tête racine (RootHeader, restyle A) ne lit pas headerRight : on le
    // reconstruit ici avec l'action, en gardant le même composant.
    const settingsButton = (
      <IconButton
        icon="settings-outline"
        accessibilityLabel="Paramètres"
        onPress={() => navigation.getParent<MainNav>()?.navigate('Settings')}
        testID="profile-header-settings"
      />
    );
    navigation.setOptions({
      headerRight: () => settingsButton,
      header: () => <RootHeader title="Mon profil" actions={settingsButton} />,
    });
  }, [navigation]);

  const loadExtras = useCallback(async (userId: string) => {
    const [b, c] = await Promise.all([
      fetchBadges(userId).catch(() => null),
      fetchMyCaptures(userId).catch(() => null),
    ]);
    if (b) setBadges(b);
    if (c) setCaptures(c);
  }, []);

  // Re-fetch demandes + user (compteurs follow) à chaque fois qu'on revient sur cet écran
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      dispatch(refreshPendingCount(user.id));
      dispatch(refreshUser(user.id));
      loadExtras(user.id);
    }, [user?.id, dispatch, loadExtras])
  );

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.all([dispatch(refreshUser(user.id)), loadExtras(user.id)]);
    setRefreshing(false);
  }, [user?.id, dispatch, loadExtras]);

  if (!user) return null;

  async function handleSignOut() {
    const ok = await confirmAction({
      title: 'Se déconnecter ?',
      message: 'Tu pourras te reconnecter à tout moment avec ton e-mail.',
      confirmLabel: 'Se déconnecter',
      destructive: true,
    });
    if (ok) dispatch(signOut());
  }

  const unlocked = badges.filter((b) => b.isUnlocked);
  const published = captures.filter((c) => !c.isDraft);
  const bestScore = user.stats.biggestFish
    ? captures.find((c) => c.id === user.stats.biggestFish!.captureId)?.score ?? null
    : null;
  const openCapture = (capture: Capture) => (navigation as any).navigate('CaptureDetail', { capture });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <ProfileHeader
          user={user}
          onPressFollowers={() => mainNav?.navigate('FollowList', { userId: user.id, type: 'followers' })}
          onPressFollowing={() => mainNav?.navigate('FollowList', { userId: user.id, type: 'following' })}
        />

        <ProfileSection title="Records">
          <ProfileRecords stats={user.stats} bestScore={bestScore} />
          {!user.region ? (
            <Text style={styles.note}>
              Choisis ta région dans « Modifier le profil » pour entrer au classement régional.
            </Text>
          ) : null}
        </ProfileSection>

        <ProfileSection
          title="Badges"
          meta={badges.length ? `${unlocked.length} / ${badges.length}` : undefined}
          actionLabel="Tout voir"
          actionAccessibilityLabel="Voir tous mes badges"
          onAction={() => navigation.navigate('Badges')}
        >
          <ProfileBadgesStrip
            badges={unlocked}
            emptyText="Aucun badge obtenu pour l'instant. Publie une prise pour lancer ta progression."
            onPress={() => navigation.navigate('Badges')}
          />
        </ProfileSection>

        <ProfileSection
          title="Captures"
          actionLabel="Tout voir"
          actionAccessibilityLabel="Voir toutes mes captures"
          onAction={() => navigation.navigate('MyCaptures')}
        >
          {published.length > 0 ? (
            <ProfileCaptureList captures={published.slice(0, PREVIEW_COUNT)} onPress={openCapture} />
          ) : (
            <Text style={styles.note}>Aucune capture publiée. Appuie sur + pour peser ta première prise.</Text>
          )}
        </ProfileSection>

        <ProfileSection title="Compte">
          <ListGroup>
            <ListRow
              title="Modifier le profil"
              subtitle="Photo, bio, région et spécialités"
              icon="create-outline"
              onPress={() => mainNav?.navigate('EditProfile')}
              testID="profile-edit"
            />
            <ListRow
              title="Demandes d'abonnement"
              icon="person-add-outline"
              onPress={() => mainNav?.navigate('FollowRequests')}
              right={pendingRequestsCount > 0 ? (
                <View style={styles.countBadge} accessibilityLabel={`${pendingRequestsCount} en attente`}>
                  <Text style={styles.countBadgeText}>{pendingRequestsCount > 99 ? '99+' : pendingRequestsCount}</Text>
                </View>
              ) : undefined}
              testID="profile-requests"
            />
            <ListRow
              title={user.isPremium ? 'Mon abonnement Premium' : 'Découvrir Premium'}
              icon="star-outline"
              onPress={() => mainNav?.navigate('Premium')}
              testID="profile-premium"
            />
            <ListRow
              title="Paramètres"
              icon="settings-outline"
              iconTone="neutral"
              onPress={() => mainNav?.navigate('Settings')}
              testID="profile-settings"
            />
          </ListGroup>
        </ProfileSection>

        <ListGroup style={styles.group}>
          <ListRow
            title="Se déconnecter"
            icon="log-out-outline"
            destructive
            chevron={false}
            onPress={handleSignOut}
            testID="profile-sign-out"
          />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.ml, paddingBottom: spacing.xxl },
  note: { ...typography.footnote, color: colors.inkSecondary, marginTop: spacing.sm },
  group: { marginTop: spacing.lg },
  countBadge: {
    backgroundColor: colors.error,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { ...typography.caption, color: '#FFFFFF', fontWeight: '700', fontVariant: ['tabular-nums'] },
});
