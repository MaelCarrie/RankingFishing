import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { signOut, refreshUser, refreshPendingCount } from '../../store/slices/authSlice';
import { ProfileStackParamList, MainStackParamList } from '../../navigation/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { formatWeight, formatRank, formatXP } from '../../utils/formatting';
import { FISHING_TYPE_LABELS } from '../../config/constants';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;
type MainNav = NativeStackNavigationProp<MainStackParamList>;

const EXPERTISE_COLORS = { beginner: colors.success, intermediate: colors.info, expert: colors.secondary };
const EXPERTISE_LABELS = { beginner: 'Débutant', intermediate: 'Intermédiaire', expert: 'Expert' };

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user, pendingRequestsCount } = useAppSelector((s) => s.auth);

  // Re-fetch demandes + user (compteurs follow) à chaque fois qu'on revient sur cet écran
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      dispatch(refreshPendingCount(user.id));
      dispatch(refreshUser(user.id));
    }, [user?.id, dispatch])
  );

  if (!user) return null;

  const mainNav = navigation.getParent<MainNav>();

  const xpNextLevel = [0, 200, 500, 1000, 2000, 4000, 8000];
  const currentLevelXp = xpNextLevel[user.level - 1] ?? 0;
  const nextLevelXp = xpNextLevel[user.level] ?? user.xp;
  const xpProgress = nextLevelXp === currentLevelXp
    ? 100
    : Math.round(((user.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100);

  function handleSignOut() {
    Alert.alert('Déconnexion', 'Es-tu sûr de vouloir te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => dispatch(signOut()) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header profil */}
        <View style={styles.header}>
          <Avatar username={user.username} uri={user.avatar} size={80} showBorder isPremium={user.isPremium} />
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{user.username}</Text>
            {user.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.location}>{user.location}</Text>
              </View>
            )}
            {user.bio && <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>}
          </View>
          {user.isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color={colors.secondary} />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>

        {/* Niveau & XP */}
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <View style={styles.levelInfo}>
              <Text style={styles.levelLabel}>Niveau {user.level}</Text>
              <Text style={styles.levelName}>{user.levelName}</Text>
            </View>
            <Text style={styles.xp}>{formatXP(user.xp)}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${xpProgress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {user.xp} / {nextLevelXp} XP · {xpProgress}% vers niveau {user.level + 1}
          </Text>
        </View>

        {/* Compteurs sociaux */}
        <View style={styles.socialRow}>
          <View style={styles.socialCell}>
            <Text style={styles.socialValue}>{user.stats.totalCaptures}</Text>
            <Text style={styles.socialLabel}>Captures</Text>
          </View>
          <TouchableOpacity
            style={styles.socialCell}
            onPress={() => mainNav?.navigate('FollowList', { userId: user.id, type: 'followers' })}
            activeOpacity={0.7}
          >
            <Text style={styles.socialValue}>{user.followersCount}</Text>
            <Text style={styles.socialLabel}>Abonnés</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialCell}
            onPress={() => mainNav?.navigate('FollowList', { userId: user.id, type: 'following' })}
            activeOpacity={0.7}
          >
            <Text style={styles.socialValue}>{user.followingCount}</Text>
            <Text style={styles.socialLabel}>Abonnements</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{user.stats.totalCaptures}</Text>
            <Text style={styles.statLabel}>Captures</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{formatWeight(user.stats.totalWeightGrams)}</Text>
            <Text style={styles.statLabel}>Poids total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>
              {user.stats.globalRank ? formatRank(user.stats.globalRank) : '—'}
            </Text>
            <Text style={styles.statLabel}>Rang mondial</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>
              {user.stats.regionalRank ? formatRank(user.stats.regionalRank) : '—'}
            </Text>
            <Text style={styles.statLabel}>Rang régional</Text>
          </View>
        </View>

        {/* Meilleure prise */}
        {user.stats.biggestFish && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Meilleure prise</Text>
            <View style={styles.bestFishRow}>
              <View style={styles.bestFishStat}>
                <Text style={styles.bestFishLabel}>Espèce</Text>
                <Text style={styles.bestFishValue}>{user.stats.biggestFish.species}</Text>
              </View>
              <View style={styles.bestFishStat}>
                <Text style={styles.bestFishLabel}>Poids</Text>
                <Text style={styles.bestFishValue}>{formatWeight(user.stats.biggestFish.weightGrams)}</Text>
              </View>
              <View style={styles.bestFishStat}>
                <Text style={styles.bestFishLabel}>Taille</Text>
                <Text style={styles.bestFishValue}>{user.stats.biggestFish.sizeCm} cm</Text>
              </View>
            </View>
          </View>
        )}

        {/* Spécialités */}
        {user.specialties.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎣 Spécialités</Text>
            {user.specialties.map((s, i) => (
              <View key={i} style={styles.specialtyRow}>
                <Text style={styles.specialtyName}>{FISHING_TYPE_LABELS[s.type]}</Text>
                <View style={[styles.expertiseChip, { backgroundColor: EXPERTISE_COLORS[s.level] + '20' }]}>
                  <View style={[styles.expertiseDot, { backgroundColor: EXPERTISE_COLORS[s.level] }]} />
                  <Text style={[styles.expertiseLabel, { color: EXPERTISE_COLORS[s.level] }]}>
                    {EXPERTISE_LABELS[s.level]}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Navigation */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => mainNav?.navigate('FollowRequests')}>
            <Ionicons name="notifications-outline" size={22} color={colors.primary} />
            <Text style={styles.menuLabel}>Demandes</Text>
            {pendingRequestsCount > 0 ? (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingRequestsCount}</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
          <View style={styles.menuSep} />
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Badges')}>
            <Ionicons name="medal-outline" size={22} color={colors.primary} />
            <Text style={styles.menuLabel}>Mes badges</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.menuSep} />
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyCaptures')}>
            <Ionicons name="fish-outline" size={22} color={colors.primary} />
            <Text style={styles.menuLabel}>Mes captures</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.menuSep} />
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="star-outline" size={22} color={colors.secondary} />
            <Text style={styles.menuLabel}>Passer Premium</Text>
            <View style={styles.premiumChip}><Text style={styles.premiumChipText}>Nouveau</Text></View>
          </TouchableOpacity>
          <View style={styles.menuSep} />
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.menuLabel}>Paramètres</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.menuSep} />
          <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>Déconnexion</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  headerInfo: { flex: 1 },
  username: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  location: { ...typography.bodySmall, color: colors.textSecondary },
  bio: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.premiumBg,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  premiumText: { ...typography.caption, color: colors.secondaryDark, fontWeight: '700' },

  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  levelInfo: {},
  levelLabel: { ...typography.bodySmall, color: colors.textSecondary },
  levelName: { ...typography.h3, color: colors.primary },
  xp: { ...typography.h4, color: colors.secondary },
  progressBar: { height: 8, backgroundColor: colors.border, borderRadius: 4, marginBottom: spacing.xs, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressLabel: { ...typography.caption, color: colors.textSecondary },

  socialRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  socialCell: { flex: 1, alignItems: 'center' },
  socialValue: { ...typography.h3, color: colors.textPrimary },
  socialLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  countBadge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { ...typography.caption, color: '#FFFFFF', fontWeight: '700' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNum: { ...typography.h3, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
  bestFishRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bestFishStat: { alignItems: 'center' },
  bestFishLabel: { ...typography.caption, color: colors.textSecondary },
  bestFishValue: { ...typography.h4, color: colors.primary, marginTop: 2 },

  specialtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  specialtyName: { ...typography.body, color: colors.textPrimary },
  expertiseChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  expertiseDot: { width: 6, height: 6, borderRadius: 3 },
  expertiseLabel: { ...typography.caption, fontWeight: '700' },

  menu: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md },
  menuItemDanger: {},
  menuLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  menuLabelDanger: { color: colors.error },
  menuSep: { height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 22 + spacing.md },
  premiumChip: { backgroundColor: colors.secondary, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  premiumChipText: { ...typography.caption, color: '#fff', fontWeight: '700' },
});
