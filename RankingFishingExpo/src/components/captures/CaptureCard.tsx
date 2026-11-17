import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Capture } from '../../store/types';
import { MainStackParamList, RootStackParamList } from '../../navigation/types';
import { useAppSelector } from '../../store';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Avatar from '../ui/Avatar';
import Sheet from '../ui/Sheet';
import SpeciesMark from '../ui/SpeciesMark';
import WeighInStrip from '../ui/WeighInStrip';
import LikeButton from '../ui/LikeButton';
import { formatInt } from '../ui/format';
import ShareCaptureSheet from './ShareCaptureSheet';
import { formatWeight, formatRelativeDate } from '../../utils/formatting';
import { WEATHER_META } from '../../utils/weather';

type Nav = NativeStackNavigationProp<MainStackParamList & RootStackParamList>;

interface Props {
  capture: Capture;
  /** Par défaut : utilisateur connecté (store) */
  currentUserId?: string;
  onLike?: (captureId: string) => void;
  onPress?: (capture: Capture) => void;
  /** Par défaut : ouvre le détail avec le champ commentaire actif */
  onCommentPress?: (captureId: string) => void;
  isPremium?: boolean;
}

/**
 * Feuille de capture du fil (« fiche de pesée ») : ligne pêcheur, photo 4:3,
 * espèce, bande de pesée (le héros), puis actions sur une rangée de 44 pt.
 */
export default function CaptureCard({
  capture,
  currentUserId,
  onLike,
  onPress,
  onCommentPress,
  isPremium,
}: Props) {
  const me = useAppSelector((s) => s.auth.user);
  const myId = currentUserId ?? me?.id;
  const premium = isPremium ?? me?.isPremium ?? false;
  const canSeeLocation = premium || capture.userId === myId;
  const navigation = useNavigation<Nav>();
  const [shareOpen, setShareOpen] = useState(false);

  const goToProfile = () => navigation.navigate('UserProfile', { userId: capture.userId });
  const openComments = () => {
    if (onCommentPress) onCommentPress(capture.id);
    else navigation.navigate('CaptureDetail', { capture, focusComment: true });
  };
  const weather = capture.weather ? WEATHER_META[capture.weather] : null;
  const speciesName = capture.species?.nameFr ?? 'Espèce inconnue';
  const summary = `${speciesName} de ${formatWeight(capture.weightGrams)} par ${capture.username}`;
  const validated = capture.validationScore >= 90;
  const commentLabel = `Commenter, ${capture.comments} commentaire${capture.comments > 1 ? 's' : ''}`;

  return (
    <>
      <Sheet
        padding={false}
        style={styles.card}
        accessibilityLabel={summary}
        testID={`capture-card-${capture.id}`}
      >
        {/* Ligne pêcheur */}
        <Pressable
          onPress={goToProfile}
          style={({ pressed }) => [styles.angler, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel={`Voir le profil de ${capture.username}`}
        >
          <Avatar username={capture.username} uri={capture.userAvatar} size={40} />
          <View style={styles.anglerText}>
            <Text style={styles.username} numberOfLines={1}>{capture.username}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {formatRelativeDate(capture.publishedAt)}
              {canSeeLocation && capture.locationName ? ` · ${capture.locationName}` : ''}
            </Text>
          </View>
          {validated && (
            <View style={styles.validated} accessible accessibilityLabel="Prise validée">
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.validatedText}>Validée</Text>
            </View>
          )}
        </Pressable>

        {/* Photo + pesée : ouvre le détail */}
        <Pressable
          onPress={() => onPress?.(capture)}
          disabled={!onPress}
          accessibilityRole="button"
          accessibilityLabel={`Voir le détail : ${summary}`}
          style={({ pressed }) => pressed && styles.bodyPressed}
        >
          {capture.photos.length > 0 && (
            <View>
              <Image
                source={{ uri: capture.photos[0] }}
                style={styles.photo}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              {capture.photos.length > 1 && (
                <View style={styles.photoCount}>
                  <Ionicons name="images-outline" size={13} color="#FFFFFF" />
                  <Text style={styles.photoCountText}>{capture.photos.length}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.body}>
            <View style={styles.speciesRow}>
              <SpeciesMark name={speciesName} speciesId={capture.species?.id} size={32} />
              <Text style={styles.speciesName} numberOfLines={1}>{speciesName}</Text>
              {weather && (
                <View style={styles.weather}>
                  <Ionicons name={weather.icon} size={15} color={colors.inkSecondary} />
                  <Text style={styles.weatherText}>{weather.label}</Text>
                </View>
              )}
            </View>

            <WeighInStrip
              weightGrams={capture.weightGrams}
              lengthCm={capture.sizeCm}
              score={capture.score}
              ruled
              style={styles.strip}
            />

            {capture.description ? (
              <Text style={styles.description} numberOfLines={2}>{capture.description}</Text>
            ) : null}

          </View>
        </Pressable>

        {/* Actions : rangée de 44 pt, alignée à gauche */}
        <View style={styles.actions}>
          <LikeButton
            liked={capture.isLiked}
            count={capture.likes}
            onToggle={() => onLike?.(capture.id)}
            testID="capture-like"
          />
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={openComments}
            accessibilityRole="button"
            accessibilityLabel={commentLabel}
            testID="capture-comment"
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.ink} />
            <Text style={styles.actionText}>{formatInt(capture.comments)}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            onPress={() => setShareOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Partager la prise"
            testID="capture-share"
          >
            <Ionicons name="share-outline" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </Sheet>
      {shareOpen && (
        <ShareCaptureSheet capture={capture} visible={shareOpen} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: spacing.md, marginBottom: spacing.ms },
  pressed: { backgroundColor: colors.pressed },
  bodyPressed: { opacity: 0.92 },

  angler: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    minHeight: 64,
  },
  anglerText: { flex: 1, marginLeft: spacing.ms },
  username: { ...typography.headline, color: colors.ink },
  meta: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1 },
  validated: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: spacing.sm },
  validatedText: { ...typography.footnote, color: colors.primary, fontWeight: '600' },

  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.surfaceMuted },
  photoCount: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(21,34,26,0.62)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  photoCountText: { ...typography.footnote, color: '#FFFFFF', fontWeight: '600', fontVariant: ['tabular-nums'] },

  body: { paddingHorizontal: spacing.md, paddingTop: spacing.ms },
  speciesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  speciesName: { ...typography.headline, color: colors.ink, flex: 1, marginLeft: spacing.sm },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: spacing.sm },
  weatherText: { ...typography.footnote, color: colors.inkSecondary },

  strip: { marginBottom: spacing.xs },

  description: { ...typography.callout, color: colors.ink, marginTop: spacing.sm },


  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 6,
    justifyContent: 'center',
    borderRadius: borderRadius.control,
  },
  actionText: { ...typography.subhead, fontWeight: '600', color: colors.ink, fontVariant: ['tabular-nums'] },
});
