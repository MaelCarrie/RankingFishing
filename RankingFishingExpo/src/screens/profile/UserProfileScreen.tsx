import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/types';
import { useAppSelector } from '../../store';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { fetchUserProfile } from '../../api/auth';
import { fetchUserPublicCaptures } from '../../api/captures';
import { fetchBadges } from '../../api/badges';
import { Badge, BadgeTier, Capture, User } from '../../store/types';
import { formatWeight, formatRank, formatXP, formatRelativeDate } from '../../utils/formatting';
import { FISHING_TYPE_LABELS } from '../../config/constants';

type RouteParams = RouteProp<MainStackParamList, 'UserProfile'>;

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
  const navigation = useNavigation();
  const { userId } = route.params;
  const currentUser = useAppSelector((s) => s.auth.user);
  const isOwnProfile = currentUser?.id === userId;

  const [profile, setProfile] = useState<User | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [p, c, b] = await Promise.all([
        fetchUserProfile(userId),
        fetchUserPublicCaptures(userId),
        fetchBadges(userId),
      ]);
      setProfile(p);
      setCaptures(c);
      setBadges(b);
      navigation.setOptions({ title: p.username });
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de charger le profil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

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

        {/* Boutons d'action */}
        {!isOwnProfile && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDisabled]} disabled activeOpacity={0.6}>
              <Ionicons name="person-add-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Suivre</Text>
              <View style={styles.soonChip}><Text style={styles.soonText}>Bientôt</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDisabled]} disabled activeOpacity={0.6}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.actionBtnText}>Message</Text>
              <View style={styles.soonChip}><Text style={styles.soonText}>Bientôt</Text></View>
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

  // Actions
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  soonChip: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  soonText: { ...typography.caption, color: '#FFFFFF', fontWeight: '700', fontSize: 9 },

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
