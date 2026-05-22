import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/types';
import { useAppSelector, useAppDispatch } from '../../store';
import { refreshUser, decrementPendingRequestsCount } from '../../store/slices/authSlice';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { fetchUserProfile } from '../../api/auth';
import { fetchUserPublicCaptures } from '../../api/captures';
import { fetchBadges } from '../../api/badges';
import {
  fetchRelationship, sendFollowRequest, cancelFollowRequest, unfollow,
  acceptFollowRequest, declineFollowRequest,
  FollowStatus, Relationship,
} from '../../api/follows';
import { Badge, BadgeTier, Capture, User } from '../../store/types';
import { formatWeight, formatRank, formatXP, formatRelativeDate } from '../../utils/formatting';
import { FISHING_TYPE_LABELS } from '../../config/constants';

type RouteParams = RouteProp<MainStackParamList, 'UserProfile'>;
type Nav = NativeStackNavigationProp<MainStackParamList>;

// Largeur minimale d'une tuile de capture. Au-dessous, on bascule en 1 par ligne (pleine largeur).
const GRID_ITEM_MIN_WIDTH = 140;

// Radius locaux (moins arrondis que le thème global)
const CARD_RADIUS = 12;
const ITEM_RADIUS = 8;
const HERO_RADIUS = 16;

const TIER_COLORS: Record<BadgeTier, string> = {
  bronze: colors.bronze,
  silver: colors.silver,
  gold: colors.gold,
  platinum: '#B4E8E0',
};

const EXPERTISE_COLORS = { beginner: colors.success, intermediate: colors.info, expert: colors.secondary };
const EXPERTISE_LABELS = { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' };

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
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'accepter');
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
      Alert.alert('Erreur', e?.message ?? 'Impossible de refuser');
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
        Alert.alert('Erreur', e?.message ?? 'Impossible d\'envoyer la demande');
      } finally {
        setFollowBusy(false);
      }
      return;
    }

    if (followStatus === 'requested') {
      Alert.alert(
        'Annuler la demande ?',
        `Veux-tu annuler ta demande de suivi à ${profile.username} ?`,
        [
          { text: 'Non', style: 'cancel' },
          {
            text: 'Annuler', style: 'destructive',
            onPress: async () => {
              setFollowBusy(true);
              try {
                await cancelFollowRequest(currentUser.id, profile.id);
                setFollowStatus('not_following');
              } catch (e: any) {
                Alert.alert('Erreur', e?.message ?? 'Impossible d\'annuler');
              } finally {
                setFollowBusy(false);
              }
            },
          },
        ],
      );
      return;
    }

    if (followStatus === 'following') {
      Alert.alert(
        'Se désabonner ?',
        `Tu ne suivras plus ${profile.username}.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Se désabonner', style: 'destructive',
            onPress: async () => {
              setFollowBusy(true);
              try {
                await unfollow(currentUser.id, profile.id);
                setFollowStatus('not_following');
                setProfile((p) => p ? { ...p, followersCount: Math.max(0, p.followersCount - 1) } : p);
                dispatch(refreshUser(currentUser.id));
              } catch (e: any) {
                Alert.alert('Erreur', e?.message ?? 'Impossible de se désabonner');
              } finally {
                setFollowBusy(false);
              }
            },
          },
        ],
      );
    }
  }, [currentUser, profile, followStatus, followBusy, isOwnProfile, dispatch]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.loading}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error ?? 'Profil introuvable'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const unlockedBadges = badges.filter((b) => b.isUnlocked);
  const totalBadges = badges.length;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBackground} />
          <View style={styles.heroContent}>
            <Avatar
              username={profile.username}
              uri={profile.avatar}
              size={96}
              showBorder
              isPremium={profile.isPremium}
              borderColor="#FFFFFF"
            />
            <Text style={styles.username}>{profile.username}</Text>
            {profile.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={13} color="#FFFFFF" />
                <Text style={styles.location}>{profile.location}</Text>
              </View>
            ) : null}
            {profile.bio ? (
              <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
            ) : null}

            <View style={styles.levelPill}>
              <Ionicons name="trophy" size={13} color={colors.secondary} />
              <Text style={styles.levelPillText}>
                Niveau {profile.level} · {profile.levelName} · {formatXP(profile.xp)}
              </Text>
            </View>
          </View>
        </View>

        {/* Compteurs sociaux */}
        <View style={styles.socialRow}>
          <View style={styles.socialCell}>
            <Text style={styles.socialValue}>{profile.stats.totalCaptures}</Text>
            <Text style={styles.socialLabel}>Captures</Text>
          </View>
          <TouchableOpacity
            style={styles.socialCell}
            onPress={() => navigation.navigate('FollowList', { userId: profile.id, type: 'followers' })}
            activeOpacity={0.7}
          >
            <Text style={styles.socialValue}>{profile.followersCount}</Text>
            <Text style={styles.socialLabel}>Abonnés</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialCell}
            onPress={() => navigation.navigate('FollowList', { userId: profile.id, type: 'following' })}
            activeOpacity={0.7}
          >
            <Text style={styles.socialValue}>{profile.followingCount}</Text>
            <Text style={styles.socialLabel}>Abonnements</Text>
          </TouchableOpacity>
        </View>

        {/* Banner : demande entrante — Accepter / Refuser direct */}
        {!isOwnProfile && incomingRequest && (
          <View style={styles.requestBanner}>
            <View style={styles.requestBannerHead}>
              <Ionicons name="person-add" size={18} color={colors.primary} />
              <Text style={styles.requestBannerTitle} numberOfLines={2}>
                {profile.username} souhaite te suivre
              </Text>
            </View>
            <View style={styles.requestBannerActions}>
              <TouchableOpacity
                style={[styles.requestBtn, styles.requestBtnAccept]}
                onPress={handleAcceptIncoming}
                disabled={followBusy}
                activeOpacity={0.85}
              >
                {followBusy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.requestBtnAcceptText}>Accepter</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.requestBtn, styles.requestBtnDecline]}
                onPress={handleDeclineIncoming}
                disabled={followBusy}
                activeOpacity={0.85}
              >
                <Text style={styles.requestBtnDeclineText}>Refuser</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bouton Suivre / Demande / Abonné / Suivre en retour */}
        {!isOwnProfile && (
          <View style={styles.followRow}>
            <TouchableOpacity
              style={[
                styles.followBtn,
                followStatus === 'not_following' && styles.followBtnPrimary,
                followStatus !== 'not_following' && styles.followBtnOutline,
              ]}
              onPress={handleFollowPress}
              disabled={followBusy}
              activeOpacity={0.8}
            >
              {followBusy && !incomingRequest ? (
                <ActivityIndicator color={followStatus === 'not_following' ? '#fff' : colors.textPrimary} />
              ) : followStatus === 'following' ? (
                <>
                  <Ionicons name="checkmark" size={18} color={colors.textPrimary} />
                  <Text style={[styles.followBtnText, styles.followBtnTextOutline]}>Abonné(e)</Text>
                </>
              ) : followStatus === 'requested' ? (
                <>
                  <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.followBtnText, styles.followBtnTextOutline]}>Demande envoyée</Text>
                </>
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={18} color="#fff" />
                  <Text style={[styles.followBtnText, styles.followBtnTextPrimary]}>
                    {theyFollowMe ? 'Suivre en retour' : 'Suivre'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{profile.stats.totalCaptures}</Text>
            <Text style={styles.statLabel}>Captures</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{formatWeight(profile.stats.totalWeightGrams)}</Text>
            <Text style={styles.statLabel}>Poids total</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>
              {profile.stats.globalRank ? formatRank(profile.stats.globalRank) : '—'}
            </Text>
            <Text style={styles.statLabel}>Rang</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statCell}>
            <Text style={styles.statValue}>
              {profile.stats.biggestFish ? formatWeight(profile.stats.biggestFish.weightGrams) : '—'}
            </Text>
            <Text style={styles.statLabel}>Record</Text>
          </View>
        </View>

        {/* Meilleure prise */}
        {profile.stats.biggestFish && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🏆 Meilleure prise</Text>
            </View>
            <View style={styles.bestFishRow}>
              <View style={styles.bestFishStat}>
                <Text style={styles.bestFishLabel}>Espèce</Text>
                <Text style={styles.bestFishValue}>{profile.stats.biggestFish.species}</Text>
              </View>
              <View style={styles.bestFishStat}>
                <Text style={styles.bestFishLabel}>Poids</Text>
                <Text style={styles.bestFishValue}>{formatWeight(profile.stats.biggestFish.weightGrams)}</Text>
              </View>
              <View style={styles.bestFishStat}>
                <Text style={styles.bestFishLabel}>Taille</Text>
                <Text style={styles.bestFishValue}>{profile.stats.biggestFish.sizeCm} cm</Text>
              </View>
            </View>
          </View>
        )}

        {/* Spécialités */}
        {profile.specialties.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🎣 Spécialités</Text>
            </View>
            <View style={styles.specialtiesWrap}>
              {profile.specialties.map((s, i) => (
                <View key={i} style={[styles.specialtyChip, { borderColor: EXPERTISE_COLORS[s.level] + '50' }]}>
                  <View style={[styles.specialtyDot, { backgroundColor: EXPERTISE_COLORS[s.level] }]} />
                  <Text style={styles.specialtyName}>{FISHING_TYPE_LABELS[s.type]}</Text>
                  <Text style={[styles.specialtyLevel, { color: EXPERTISE_COLORS[s.level] }]}>
                    {EXPERTISE_LABELS[s.level]}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Badges débloqués */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🏅 Badges débloqués</Text>
            <Text style={styles.cardCount}>{unlockedBadges.length} / {totalBadges}</Text>
          </View>
          {unlockedBadges.length === 0 ? (
            <Text style={styles.emptyText}>Aucun badge débloqué pour l'instant</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {unlockedBadges.map((b) => {
                const tierColor = TIER_COLORS[b.tier];
                return (
                  <View key={b.id} style={styles.badgeItem}>
                    <View style={[styles.badgeIcon, { borderColor: tierColor }]}>
                      <Text style={styles.badgeEmoji}>{b.icon}</Text>
                    </View>
                    <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Captures */}
        <View style={[styles.card, styles.capturesCard]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🐟 Captures publiques</Text>
            <Text style={styles.cardCount}>{captures.length}</Text>
          </View>
          {captures.length === 0 ? (
            <Text style={styles.emptyText}>
              {isOwnProfile ? 'Tu n\'as pas encore de capture publique' : 'Aucune capture publique'}
            </Text>
          ) : (
            <View style={styles.grid}>
              {captures.map((c) => (
                <View key={c.id} style={styles.gridItem}>
                  {c.photos[0] ? (
                    <Image source={{ uri: c.photos[0] }} style={styles.gridPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.gridPhoto, styles.gridPhotoPlaceholder]}>
                      <Text style={styles.gridPlaceholderIcon}>{c.species?.icon ?? '🐟'}</Text>
                    </View>
                  )}
                  <View style={styles.gridOverlay}>
                    <Text style={styles.gridSpecies} numberOfLines={1}>
                      {c.species?.icon ?? '🐟'} {c.species?.nameFr ?? 'Inconnue'}
                    </Text>
                    <View style={styles.gridStatsRow}>
                      <Text style={styles.gridStat}>{formatWeight(c.weightGrams)}</Text>
                      <Text style={styles.gridDot}>·</Text>
                      <Text style={styles.gridStat}>{c.score} pts</Text>
                    </View>
                    <Text style={styles.gridDate}>{formatRelativeDate(c.publishedAt)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  loading: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background, gap: spacing.md,
  },
  errorText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  retryText: { ...typography.button, color: '#FFFFFF' },

  // Hero
  hero: { position: 'relative', paddingBottom: spacing.lg },
  heroBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary,
    bottom: 40,
    borderBottomLeftRadius: HERO_RADIUS,
    borderBottomRightRadius: HERO_RADIUS,
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  username: {
    ...typography.h1,
    color: '#FFFFFF',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  location: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  bio: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    lineHeight: 20,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  levelPillText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },

  // Compteurs sociaux (Captures / Abonnés / Abonnements)
  socialRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    paddingVertical: spacing.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialCell: { flex: 1, alignItems: 'center' },
  socialValue: { ...typography.h3, color: colors.textPrimary },
  socialLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  // Banner demande entrante
  requestBanner: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    ...shadows.sm,
  },
  requestBannerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  requestBannerTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  requestBannerActions: { flexDirection: 'row', gap: spacing.sm },
  requestBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  requestBtnAccept: { backgroundColor: colors.primary },
  requestBtnAcceptText: { ...typography.button, color: '#fff', fontWeight: '700' },
  requestBtnDecline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestBtnDeclineText: { ...typography.button, color: colors.textSecondary, fontWeight: '600' },

  // Bouton Suivre / Demande / Abonné
  followRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: spacing.sm + 4,
    minHeight: 42,
  },
  followBtnPrimary: { backgroundColor: colors.primary },
  followBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followBtnText: { ...typography.button, fontWeight: '700' },
  followBtnTextPrimary: { color: '#FFFFFF' },
  followBtnTextOutline: { color: colors.textPrimary },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: CARD_RADIUS,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h3, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statSep: { width: 1, backgroundColor: colors.border, marginHorizontal: 4 },

  // Cards génériques
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: CARD_RADIUS,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  capturesCard: { padding: spacing.md, paddingTop: spacing.lg },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { ...typography.h4, color: colors.textPrimary },
  cardCount: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },

  // Meilleure prise
  bestFishRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bestFishStat: { alignItems: 'center' },
  bestFishLabel: { ...typography.caption, color: colors.textSecondary },
  bestFishValue: { ...typography.h4, color: colors.primary, marginTop: 2 },

  // Spécialités
  specialtiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
  },
  specialtyDot: { width: 7, height: 7, borderRadius: 4 },
  specialtyName: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
  specialtyLevel: { ...typography.caption, fontWeight: '700' },

  // Badges
  badgesScroll: { gap: spacing.md, paddingRight: spacing.md },
  badgeItem: { alignItems: 'center', width: 72 },
  badgeIcon: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: 6,
  },
  badgeEmoji: { fontSize: 26 },
  badgeName: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Captures grid — adaptatif : 2 par ligne si la place le permet, sinon 1 pleine largeur
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridItem: {
    flexBasis: GRID_ITEM_MIN_WIDTH,
    flexGrow: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: ITEM_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridPhoto: { width: '100%', aspectRatio: 1 },
  gridPhotoPlaceholder: {
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPlaceholderIcon: { fontSize: 36 },
  gridOverlay: { padding: spacing.sm },
  gridSpecies: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700' },
  gridStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  gridStat: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  gridDot: { ...typography.caption, color: colors.textSecondary },
  gridDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
