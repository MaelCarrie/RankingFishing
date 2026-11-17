import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store';
import { refreshUser, decrementPendingRequestsCount } from '../../store/slices/authSlice';
import { openDirectConversation } from '../../store/slices/chatSlice';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button, ErrorState, Skeleton } from '../../components/ui';
import ProfileHeader from '../../components/social/ProfileHeader';
import ProfileRecords from '../../components/social/ProfileRecords';
import ProfileSection from '../../components/social/ProfileSection';
import ProfileBadgesStrip from '../../components/social/ProfileBadgesStrip';
import ProfileCaptureList from '../../components/social/ProfileCaptureList';
import { fetchUserProfile } from '../../api/auth';
import { fetchUserPublicCaptures } from '../../api/captures';
import { fetchBadges } from '../../api/badges';
import { confirmAction, notify } from '../../utils/dialog';
import {
  fetchRelationship, sendFollowRequest, cancelFollowRequest, unfollow,
  acceptFollowRequest, declineFollowRequest,
  FollowStatus, Relationship,
} from '../../api/follows';
import { Badge, Capture, User } from '../../store/types';

type RouteParams = RouteProp<MainStackParamList, 'UserProfile'>;
type Nav = NativeStackNavigationProp<MainStackParamList>;

export default function UserProfileScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { userId } = route.params;
  const currentUser = useAppSelector((s) => s.auth.user);
  const isOwnProfile = currentUser?.id === userId;

  const [profile, setProfile] = useState<User | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [followStatus, setFollowStatus] = useState<FollowStatus>('not_following');
  const [theyFollowMe, setTheyFollowMe] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const promises: [Promise<User>, Promise<Capture[]>, Promise<Badge[]>, Promise<Relationship>] = [
        fetchUserProfile(userId),
        fetchUserPublicCaptures(userId),
        fetchBadges(userId),
        currentUser
          ? fetchRelationship(currentUser.id, userId)
          : Promise.resolve({ myStatus: 'not_following', theyFollowMe: false, incomingRequest: false } as Relationship),
      ];
      const [p, c, b, rel] = await Promise.all(promises);
      setProfile(p);
      setCaptures(c);
      setBadges(b);
      setFollowStatus(rel.myStatus);
      setTheyFollowMe(rel.theyFollowMe);
      setIncomingRequest(rel.incomingRequest);
      navigation.setOptions({ title: p.username });
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de charger le profil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, navigation, currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleAcceptIncoming = useCallback(async () => {
    if (!currentUser || !profile || followBusy) return;
    setFollowBusy(true);
    try {
      await acceptFollowRequest(profile.id);
      setIncomingRequest(false);
      setTheyFollowMe(true);
      // ils me suivent maintenant → mes followers +1, leur following +1
      setProfile((p) => p ? { ...p, followingCount: p.followingCount + 1 } : p);
      dispatch(refreshUser(currentUser.id));
      dispatch(decrementPendingRequestsCount());
    } catch (e: any) {
      notify('Erreur', e?.message ?? 'Impossible d\'accepter');
    } finally {
      setFollowBusy(false);
    }
  }, [currentUser, profile, followBusy, dispatch]);

  const handleDeclineIncoming = useCallback(async () => {
    if (!currentUser || !profile || followBusy) return;
    setFollowBusy(true);
    try {
      await declineFollowRequest(profile.id);
      setIncomingRequest(false);
      dispatch(decrementPendingRequestsCount());
    } catch (e: any) {
      notify('Erreur', e?.message ?? 'Impossible de refuser');
    } finally {
      setFollowBusy(false);
    }
  }, [currentUser, profile, followBusy, dispatch]);

  const handleFollowPress = useCallback(async () => {
    if (!currentUser || !profile || followBusy || isOwnProfile) return;

    if (followStatus === 'not_following') {
      setFollowBusy(true);
      try {
        await sendFollowRequest(currentUser.id, profile.id);
        setFollowStatus('requested');
      } catch (e: any) {
        notify('Erreur', e?.message ?? 'Impossible d\'envoyer la demande');
      } finally {
        setFollowBusy(false);
      }
      return;
    }

    if (followStatus === 'requested') {
      const ok = await confirmAction({
        title: 'Annuler la demande ?',
        message: `Veux-tu annuler ta demande de suivi à ${profile.username} ?`,
        confirmLabel: 'Annuler la demande',
        cancelLabel: 'Non',
        destructive: true,
      });
      if (!ok) return;
      setFollowBusy(true);
      try {
        await cancelFollowRequest(currentUser.id, profile.id);
        setFollowStatus('not_following');
      } catch (e: any) {
        notify('Erreur', e?.message ?? 'Impossible d\'annuler');
      } finally {
        setFollowBusy(false);
      }
      return;
    }

    if (followStatus === 'following') {
      const ok = await confirmAction({
        title: 'Se désabonner ?',
        message: `Tu ne suivras plus ${profile.username}.`,
        confirmLabel: 'Se désabonner',
        destructive: true,
      });
      if (!ok) return;
      setFollowBusy(true);
      try {
        await unfollow(currentUser.id, profile.id);
        setFollowStatus('not_following');
        setProfile((p) => p ? { ...p, followersCount: Math.max(0, p.followersCount - 1) } : p);
        dispatch(refreshUser(currentUser.id));
      } catch (e: any) {
        notify('Erreur', e?.message ?? 'Impossible de se désabonner');
      } finally {
        setFollowBusy(false);
      }
    }
  }, [currentUser, profile, followStatus, followBusy, isOwnProfile, dispatch]);

  // Bouton « Message » : ouvre (ou crée) la conversation 1:1 puis bascule sur
  // l'onglet Messages → Conversation. popTo revient sur les onglets au lieu
  // d'empiler un second navigateur d'onglets ; initial: false garde la liste
  // des conversations sous l'écran (le bouton retour y ramène).
  const handleMessagePress = useCallback(async () => {
    if (!currentUser || !profile || messageBusy || isOwnProfile) return;
    setMessageBusy(true);
    try {
      const conversation = await dispatch(openDirectConversation({
        me: { id: currentUser.id, username: currentUser.username, avatar: currentUser.avatar },
        other: { id: profile.id, username: profile.username, avatar: profile.avatar },
      })).unwrap();
      navigation.popTo('Tabs', {
        screen: 'Chat',
        params: { screen: 'Conversation', params: { conversation }, initial: false },
      });
    } catch (e: any) {
      notify('Erreur', typeof e === 'string' ? e : e?.message ?? 'Impossible d\'ouvrir la conversation');
    } finally {
      setMessageBusy(false);
    }
  }, [currentUser, profile, messageBusy, isOwnProfile, dispatch, navigation]);

  if (isLoading) {
    return (
      <View
        style={styles.skeleton}
        accessible
        accessibilityLabel="Chargement du profil"
        accessibilityState={{ busy: true }}
      >
        <View style={styles.skeletonIdentity}>
          <Skeleton width={76} height={76} radius={38} />
          <View style={styles.skeletonLines}>
            <Skeleton width="60%" height={20} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
        <Skeleton height={14} style={styles.skeletonGap} />
        <Skeleton width="70%" height={14} style={styles.skeletonGapSm} />
        <Skeleton height={44} radius={10} style={styles.skeletonGap} />
        <Skeleton height={160} radius={14} style={styles.skeletonGap} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <ErrorState
          title="Profil indisponible"
          message={error ? `${error}\nVérifie ta connexion puis réessaie.` : 'Ce profil est introuvable.'}
          onRetry={() => { setLoading(true); load(); }}
        />
      </View>
    );
  }

  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const totalBadges = badges.length;
  const bestScore = profile.stats.biggestFish
    ? captures.find((c) => c.id === profile.stats.biggestFish!.captureId)?.score ?? null
    : null;
  const openCapture = (capture: Capture) => (navigation as any).navigate('CaptureDetail', { capture });

  // Suivre (plein) tant qu'on ne suit pas ; ensuite Abonné(e) en contour et Message devient l'action pleine
  const followButton = (() => {
    if (followStatus === 'following') {
      return { title: 'Abonné(e)', icon: 'checkmark' as const, variant: 'outline' as const };
    }
    if (followStatus === 'requested') {
      return { title: 'Demande envoyée', icon: 'time-outline' as const, variant: 'outline' as const };
    }
    return {
      title: theyFollowMe ? 'Suivre en retour' : 'Suivre',
      icon: 'person-add-outline' as const,
      variant: 'filled' as const,
    };
  })();

  const actions = !isOwnProfile ? (
    <>
      <Button
        title={followButton.title}
        icon={followButton.icon}
        variant={followButton.variant}
        onPress={handleFollowPress}
        loading={followBusy && !incomingRequest}
        disabled={followBusy}
        style={styles.actionBtn}
        accessibilityHint={
          followStatus === 'following' ? 'Te désabonner' : followStatus === 'requested' ? 'Annuler la demande' : undefined
        }
        testID="profile-follow-button"
      />
      <Button
        title="Message"
        icon="chatbubble-outline"
        variant={followStatus === 'not_following' ? 'tonal' : 'filled'}
        onPress={handleMessagePress}
        loading={messageBusy}
        disabled={messageBusy}
        style={styles.actionBtn}
        accessibilityLabel={`Envoyer un message à ${profile.username}`}
        testID="profile-message-button"
      />
    </>
  ) : null;

  const notice = !isOwnProfile && incomingRequest ? (
    <View style={styles.request} accessibilityLiveRegion="polite">
      <Text style={styles.requestTitle}>{profile.username} souhaite te suivre</Text>
      <View style={styles.requestActions}>
        <Button
          title="Accepter"
          variant="tonal"
          size="sm"
          onPress={handleAcceptIncoming}
          loading={followBusy}
          disabled={followBusy}
          style={styles.actionBtn}
        />
        <Button
          title="Refuser"
          variant="outline"
          size="sm"
          onPress={handleDeclineIncoming}
          disabled={followBusy}
          style={styles.actionBtn}
        />
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <ProfileHeader
          user={profile}
          actions={actions}
          notice={notice}
          onPressFollowers={() => navigation.navigate('FollowList', { userId: profile.id, type: 'followers' })}
          onPressFollowing={() => navigation.navigate('FollowList', { userId: profile.id, type: 'following' })}
        />

        <ProfileSection title="Records">
          <ProfileRecords stats={profile.stats} bestScore={bestScore} />
        </ProfileSection>

        <ProfileSection
          title="Badges"
          meta={totalBadges ? `${unlockedBadges.length} / ${totalBadges}` : undefined}
        >
          <ProfileBadgesStrip
            badges={unlockedBadges}
            emptyText={`${profile.username} n'a pas encore de badge.`}
          />
        </ProfileSection>

        <ProfileSection title="Captures publiques" meta={captures.length ? String(captures.length) : undefined}>
          {captures.length === 0 ? (
            <Text style={styles.note}>
              {isOwnProfile ? "Tu n'as pas encore de capture publique." : 'Aucune capture publique pour le moment.'}
            </Text>
          ) : (
            <ProfileCaptureList captures={captures} onPress={openCapture} />
          )}
        </ProfileSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.ml, paddingBottom: spacing.xxl },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  note: { ...typography.subhead, color: colors.inkSecondary },
  actionBtn: { flex: 1 },

  request: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sheet,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    gap: spacing.ms,
  },
  requestTitle: { ...typography.headline, color: colors.ink },
  requestActions: { flexDirection: 'row', gap: spacing.sm },

  skeleton: { flex: 1, backgroundColor: colors.background, padding: spacing.md, paddingTop: spacing.ml },
  skeletonIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  skeletonLines: { flex: 1, gap: spacing.sm },
  skeletonGap: { marginTop: spacing.lg },
  skeletonGapSm: { marginTop: spacing.sm },
});
