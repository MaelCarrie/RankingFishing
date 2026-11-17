import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal, View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Capture } from '../../store/types';
import { fetchMyCaptures } from '../../api/captures';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { formatWeight, formatRelativeDate } from '../../utils/formatting';

interface Props {
  visible: boolean;
  userId?: string;
  onClose: () => void;
  onSelect: (capture: Capture) => void;
}

// Choix d'une de mes captures publiées à partager dans la conversation (#20)
export default function CapturePickerModal({ visible, userId, onClose, onSelect }: Props) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMyCaptures(userId);
      setCaptures(list.filter((c) => !c.isDraft));
    } catch (e: any) {
      setError(e?.message ?? 'Impossible de charger tes captures');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const renderEmpty = () => {
    if (loading) {
      return <View style={styles.state}><ActivityIndicator color={colors.primary} /></View>;
    }
    if (error) {
      return (
        <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.stateTitle}>Chargement impossible</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load} accessibilityRole="button">
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.state}>
        <Ionicons name="fish-outline" size={40} color={colors.textSecondary} />
        <Text style={styles.stateTitle}>Aucune capture publiée</Text>
        <Text style={styles.stateText}>Publie une prise pour pouvoir la partager ici.</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>Partager une capture</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={loading ? [] : captures}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onSelect(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Partager ${item.species?.nameFr ?? 'capture'} de ${formatWeight(item.weightGrams)}`}
              testID={`capture-picker-${item.id}`}
            >
              {item.photos[0] ? (
                <Image source={{ uri: item.photos[0] }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="fish" size={24} color={colors.primary} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.species} numberOfLines={1}>{item.species?.nameFr ?? 'Capture'}</Text>
                <Text style={styles.details}>
                  {formatWeight(item.weightGrams)}{item.sizeCm ? ` · ${item.sizeCm} cm` : ''} · {item.score} pts
                </Text>
                <Text style={styles.date}>{formatRelativeDate(item.publishedAt)}</Text>
              </View>
              <Ionicons name="send" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h3, color: colors.textPrimary },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 92 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 76,
    backgroundColor: colors.surface,
  },
  thumb: { width: 60, height: 60, borderRadius: borderRadius.sm, backgroundColor: colors.surfaceVariant },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  species: { ...typography.h4, color: colors.textPrimary },
  details: { ...typography.bodySmall, color: colors.primary, fontWeight: '700', marginTop: 2 },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  state: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  stateTitle: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' },
  stateText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  retryText: { ...typography.button, color: '#FFFFFF' },
});
