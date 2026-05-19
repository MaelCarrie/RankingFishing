import React, { useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMyCaptures } from '../../store/slices/capturesSlice';
import { Capture } from '../../store/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { formatWeight, formatSize, formatRelativeDate } from '../../utils/formatting';

function CaptureRow({ capture }: { capture: Capture }) {
  return (
    <View style={styles.row}>
      <Image source={{ uri: capture.photos[0] }} style={styles.thumb} />
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.speciesIcon}>{capture.species.icon}</Text>
          <Text style={styles.speciesName}>{capture.species.nameFr}</Text>
          {capture.isDraft && (
            <View style={styles.draftBadge}><Text style={styles.draftText}>Brouillon</Text></View>
          )}
        </View>
        <View style={styles.rowStats}>
          <View style={styles.rowStat}>
            <Ionicons name="scale-outline" size={13} color={colors.primary} />
            <Text style={styles.rowStatText}>{formatWeight(capture.weightGrams)}</Text>
          </View>
          <Text style={styles.rowStatSep}>·</Text>
          <View style={styles.rowStat}>
            <Ionicons name="resize-outline" size={13} color={colors.primary} />
            <Text style={styles.rowStatText}>{formatSize(capture.sizeCm)}</Text>
          </View>
          <Text style={styles.rowStatSep}>·</Text>
          <Text style={styles.rowStatText}>{capture.score} pts</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={styles.rowDate}>{formatRelativeDate(capture.publishedAt)}</Text>
          <View style={styles.rowActions}>
            <Ionicons name="heart-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.rowActionCount}>{capture.likes}</Text>
            <Ionicons name="chatbubble-outline" size={13} color={colors.textSecondary} style={{ marginLeft: 8 }} />
            <Text style={styles.rowActionCount}>{capture.comments}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CapturesScreen() {
  const dispatch = useAppDispatch();
  const { myCaptures, isLoading } = useAppSelector((s) => s.captures);
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (user) dispatch(fetchMyCaptures(user.id));
  }, [dispatch, user]);

  const published = myCaptures.filter((c) => !c.isDraft);
  const drafts = myCaptures.filter((c) => c.isDraft);

  if (isLoading && myCaptures.length === 0) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={myCaptures}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CaptureRow capture={item} />}
        ListHeaderComponent={
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{published.length}</Text>
              <Text style={styles.statLabel}>Publiées</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{drafts.length}</Text>
              <Text style={styles.statLabel}>Brouillons</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>
                {myCaptures.reduce((s, c) => s + c.likes, 0)}
              </Text>
              <Text style={styles.statLabel}>J'aime reçus</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎣</Text>
            <Text style={styles.emptyTitle}>Aucune capture</Text>
            <Text style={styles.emptyText}>Appuie sur + pour ajouter ta première prise !</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: spacing.xxl },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { ...typography.h2, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 90, height: 90 },
  rowContent: { flex: 1, padding: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  speciesIcon: { fontSize: 16, marginRight: 4 },
  speciesName: { ...typography.h4, color: colors.textPrimary, flex: 1 },
  draftBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  draftText: { ...typography.caption, color: colors.warning, fontWeight: '700' },

  rowStats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  rowStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowStatText: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
  rowStatSep: { ...typography.caption, color: colors.textSecondary },

  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowDate: { ...typography.caption, color: colors.textSecondary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowActionCount: { ...typography.caption, color: colors.textSecondary },

  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },
});
