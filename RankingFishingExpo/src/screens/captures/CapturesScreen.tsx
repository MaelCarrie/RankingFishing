import React, { useCallback, useEffect, useState } from 'react';
import {
  View, FlatList, StyleSheet, Text, Pressable, Image, RefreshControl,
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchMyCaptures } from '../../store/slices/capturesSlice';
import { Capture } from '../../store/types';
import { ProfileStackParamList, RootStackParamList } from '../../navigation/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatWeight, formatRelativeDate } from '../../utils/formatting';
import EmptyState from '../../components/ui/EmptyState';
import Sheet from '../../components/ui/Sheet';
import Metric from '../../components/ui/Metric';
import Skeleton from '../../components/ui/Skeleton';
import { formatInt, splitLength, splitWeight } from '../../components/ui/format';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<ProfileStackParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

function CaptureRow({ capture, onPress, first }: { capture: Capture; onPress: (c: Capture) => void; first: boolean }) {
  const w = capture.weightGrams > 0 ? splitWeight(capture.weightGrams) : null;
  const l = capture.sizeCm > 0 ? splitLength(capture.sizeCm) : null;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, pressed && styles.rowPressed]}
      onPress={() => onPress(capture)}
      accessibilityRole="button"
      accessibilityLabel={`${capture.species?.nameFr ?? 'Capture'}, ${formatWeight(capture.weightGrams)}${capture.isDraft ? ', brouillon' : ''}`}
    >
      {capture.photos[0] ? (
        <Image source={{ uri: capture.photos[0] }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Ionicons name="image-outline" size={22} color={colors.inkTertiary} />
        </View>
      )}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.speciesName} numberOfLines={1}>{capture.species?.nameFr ?? 'Espèce inconnue'}</Text>
          {capture.isDraft && (
            <View style={styles.draftBadge}><Text style={styles.draftText}>Brouillon</Text></View>
          )}
        </View>
        <Text style={styles.rowStats} numberOfLines={1}>
          <Text style={styles.rowStatStrong}>{w ? `${w.value} ${w.unit}` : '—'}</Text>
          {'  ·  '}
          {l ? `${l.value} ${l.unit}` : '—'}
          {'  ·  '}
          <Text style={styles.rowScore}>{formatInt(capture.score)} pts</Text>
        </Text>
        <View style={styles.rowBottom}>
          <Text style={styles.rowDate}>{formatRelativeDate(capture.publishedAt)}</Text>
          <View style={styles.rowActions}>
            <Ionicons name="heart-outline" size={14} color={colors.inkSecondary} />
            <Text style={styles.rowActionCount}>{formatInt(capture.likes)}</Text>
            <Ionicons name="chatbubble-outline" size={13} color={colors.inkSecondary} style={styles.rowActionGap} />
            <Text style={styles.rowActionCount}>{formatInt(capture.comments)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.inkTertiary} />
    </Pressable>
  );
}

export default function CapturesScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { myCaptures, isLoading } = useAppSelector((s) => s.captures);
  const { user } = useAppSelector((s) => s.auth);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) dispatch(fetchMyCaptures(user.id));
  }, [dispatch, user?.id]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await dispatch(fetchMyCaptures(user.id));
    setRefreshing(false);
  }, [dispatch, user?.id]);

  const handlePress = (capture: Capture) => navigation.navigate('CaptureDetail', { capture });

  const published = myCaptures.filter((c) => !c.isDraft);
  const drafts = myCaptures.filter((c) => c.isDraft);

  if (isLoading && myCaptures.length === 0) {
    return (
      <View style={[styles.container, styles.list]} accessibilityLabel="Chargement de tes captures">
        <Skeleton height={84} radius={borderRadius.sheet} style={styles.skeletonStats} />
        <Skeleton height={260} radius={borderRadius.sheet} style={styles.skeletonList} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={myCaptures}
        keyExtractor={(c) => c.id}
        renderItem={({ item, index }) => (
          <View style={[styles.listCell, index === 0 && styles.listCellFirst, index === myCaptures.length - 1 && styles.listCellLast]}>
            <CaptureRow capture={item} onPress={handlePress} first={index === 0} />
          </View>
        )}
        ListHeaderComponent={
          <Sheet style={styles.statsBar}>
            <Metric value={formatInt(published.length)} label="Publiées" size="md" align="center" style={styles.statItem} />
            <View style={styles.statDivider} />
            <Metric value={formatInt(drafts.length)} label="Brouillons" size="md" align="center" style={styles.statItem} />
            <View style={styles.statDivider} />
            <Metric
              value={formatInt(myCaptures.reduce((s, c) => s + c.likes, 0))}
              label="J'aime reçus"
              size="md"
              align="center"
              style={styles.statItem}
            />
          </Sheet>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="fish-outline"
            title="Aucune capture"
            message="Publie ta première prise : elle apparaîtra ici, avec tes brouillons."
            actionLabel="Publier une prise"
            onAction={() => navigation.getParent()?.navigate('NewCapture')}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  skeletonStats: { marginBottom: spacing.md },
  skeletonList: {},

  statsBar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, paddingVertical: spacing.ms },
  statItem: { flex: 1 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.hairline },

  // Une seule feuille pour toute la liste : cellules collées, bords arrondis aux extrémités
  listCell: {
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },
  listCellFirst: { borderTopWidth: 1, borderTopLeftRadius: borderRadius.sheet, borderTopRightRadius: borderRadius.sheet },
  listCellLast: { borderBottomWidth: 1, borderBottomLeftRadius: borderRadius.sheet, borderBottomRightRadius: borderRadius.sheet },

  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.ms, gap: spacing.ms, minHeight: 88 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  rowPressed: { backgroundColor: colors.pressed },
  thumb: { width: 64, height: 64, borderRadius: borderRadius.control },
  thumbEmpty: { backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  speciesName: { ...typography.headline, color: colors.ink, flexShrink: 1 },
  draftBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  draftText: { ...typography.caption, color: colors.warning, fontWeight: '600' },

  rowStats: { ...typography.subhead, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  rowStatStrong: { color: colors.ink, fontWeight: '600' },
  rowScore: { color: colors.goldInk, fontWeight: '600' },

  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rowDate: { ...typography.footnote, color: colors.inkSecondary },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowActionGap: { marginLeft: spacing.sm },
  rowActionCount: { ...typography.footnote, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
});
