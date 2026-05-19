import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Capture } from '../../store/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Avatar from '../common/Avatar';
import { formatWeight, formatSize, formatRelativeDate } from '../../utils/formatting';
import { WEATHER_LABELS } from '../../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_WIDTH * 0.65;

interface Props {
  capture: Capture;
  onLike?: (captureId: string) => void;
  isPremium?: boolean;
}

export default function CaptureCard({ capture, onLike, isPremium = false }: Props) {
  const canSeeLocation = isPremium || capture.userId === 'user_me';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar username={capture.username} uri={capture.userAvatar} size={42} />
        <View style={styles.headerInfo}>
          <Text style={styles.username}>{capture.username}</Text>
          <Text style={styles.date}>{formatRelativeDate(capture.publishedAt)}</Text>
        </View>
        {capture.validationScore >= 90 && (
          <View style={styles.validatedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.validatedText}>Validé</Text>
          </View>
        )}
      </View>

      {/* Photo */}
      {capture.photos.length > 0 && (
        <Image source={{ uri: capture.photos[0] }} style={styles.photo} resizeMode="cover" />
      )}

      {/* Info poisson */}
      <View style={styles.fishInfo}>
        <View style={styles.speciesRow}>
          <Text style={styles.speciesIcon}>{capture.species.icon}</Text>
          <Text style={styles.speciesName}>{capture.species.nameFr}</Text>
          {capture.weather && (
            <Text style={styles.weather}>{WEATHER_LABELS[capture.weather]}</Text>
          )}
        </View>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="scale-outline" size={15} color={colors.primary} />
            <Text style={styles.statValue}>{formatWeight(capture.weightGrams)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="resize-outline" size={15} color={colors.primary} />
            <Text style={styles.statValue}>{formatSize(capture.sizeCm)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="star-outline" size={15} color={colors.secondary} />
            <Text style={[styles.statValue, { color: colors.secondary }]}>{capture.score} pts</Text>
          </View>
        </View>
      </View>

      {/* Description */}
      {capture.description && (
        <Text style={styles.description} numberOfLines={2}>{capture.description}</Text>
      )}

      {/* Localisation */}
      <View style={styles.locationRow}>
        <Ionicons
          name={canSeeLocation ? 'location-outline' : 'lock-closed-outline'}
          size={14}
          color={canSeeLocation ? colors.textSecondary : colors.secondary}
        />
        {canSeeLocation && capture.locationName ? (
          <Text style={styles.locationText}>{capture.locationName}</Text>
        ) : (
          <Text style={[styles.locationText, styles.lockedText]}>
            {canSeeLocation ? 'Localisation non renseignée' : 'Premium — Déverrouillez la localisation'}
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.action}
          onPress={() => onLike?.(capture.id)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={capture.isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={capture.isLiked ? colors.error : colors.textSecondary}
          />
          <Text style={[styles.actionText, capture.isLiked && styles.likedText]}>{capture.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.actionText}>{capture.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerInfo: { flex: 1, marginLeft: spacing.sm },
  username: { ...typography.h4, color: colors.textPrimary },
  date: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  validatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    gap: 3,
  },
  validatedText: { ...typography.caption, color: colors.success, fontWeight: '600' },

  photo: { width: '100%', height: PHOTO_HEIGHT },

  fishInfo: { padding: spacing.md, paddingBottom: 0 },
  speciesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  speciesIcon: { fontSize: 20, marginRight: spacing.xs },
  speciesName: { ...typography.h4, color: colors.textPrimary, flex: 1 },
  weather: { ...typography.caption, color: colors.textSecondary },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  statValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700' },
  statDivider: { width: 1, height: 16, backgroundColor: colors.border },

  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    lineHeight: 20,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 4,
  },
  locationText: { ...typography.caption, color: colors.textSecondary },
  lockedText: { color: colors.secondary, fontWeight: '600' },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.lg,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { ...typography.bodySmall, color: colors.textSecondary },
  likedText: { color: colors.error },
});
