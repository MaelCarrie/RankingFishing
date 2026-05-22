import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Dimensions, FlatList, Modal, Alert, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleLike, deleteCapture, adjustCommentCount } from '../../store/slices/capturesSlice';
import * as commentsApi from '../../api/comments';
import { RootStackParamList } from '../../navigation/types';
import { Capture, Comment } from '../../store/types';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { formatWeight, formatSize, formatDate, formatRelativeDate } from '../../utils/formatting';
import { WEATHER_LABELS } from '../../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.8;

type DetailRoute = RouteProp<RootStackParamList, 'CaptureDetail'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CaptureDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  // Version live depuis le store (likes à jour), fallback sur le param de navigation
  const fromStore = useAppSelector((s) =>
    [...s.captures.feed, ...s.captures.myCaptures].find((c) => c.id === route.params.capture.id)
  );
  const capture: Capture = fromStore ?? route.params.capture;

  const [activePhoto, setActivePhoto] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const isOwner = capture.userId === user?.id;
  const canSeeLocation = (user?.isPremium ?? false) || isOwner;
  const photos = capture.photos;

  useEffect(() => {
    let active = true;
    commentsApi
      .fetchComments(capture.id)
      .then((list) => { if (active) setComments(list); })
      .catch(() => { if (active) setComments([]); })
      .finally(() => { if (active) setCommentsLoading(false); });
    return () => { active = false; };
  }, [capture.id]);

  function handleLike() {
    if (!user) return;
    dispatch(toggleLike({ captureId: capture.id, userId: user.id }));
  }

  async function handlePostComment() {
    const content = draft.trim();
    if (!content || !user || posting) return;
    setPosting(true);
    setDraft('');
    try {
      const comment = await commentsApi.postComment(
        capture.id, user.id, user.username, content, user.avatar
      );
      setComments((prev) => [...prev, comment]);
      dispatch(adjustCommentCount({ captureId: capture.id, delta: 1 }));
    } catch (e: any) {
      setDraft(content);
      Alert.alert('Erreur', "Le commentaire n'a pas pu être publié.");
    } finally {
      setPosting(false);
    }
  }

  function handleDeleteComment(comment: Comment) {
    Alert.alert('Supprimer le commentaire', 'Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await commentsApi.deleteComment(comment.id);
            setComments((prev) => prev.filter((c) => c.id !== comment.id));
            dispatch(adjustCommentCount({ captureId: capture.id, delta: -1 }));
          } catch {
            Alert.alert('Erreur', "Le commentaire n'a pas pu être supprimé.");
          }
        },
      },
    ]);
  }

  function handleDelete() {
    Alert.alert('Supprimer la capture', 'Cette action est irréversible. Continuer ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deleteCapture(capture.id));
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Galerie photos */}
        {photos.length > 0 ? (
          <View>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              onMomentumScrollEnd={(e) =>
                setActivePhoto(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))
              }
              renderItem={({ item }) => (
                <TouchableOpacity activeOpacity={0.95} onPress={() => setViewerOpen(true)}>
                  <Image source={{ uri: item }} style={styles.galleryPhoto} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />
            {photos.length > 1 && (
              <View style={styles.dots}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activePhoto && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoIcon}>🎣</Text>
          </View>
        )}

        {/* En-tête utilisateur */}
        <View style={styles.header}>
          <Avatar username={capture.username} uri={capture.userAvatar} size={44} />
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{capture.username}</Text>
            <Text style={styles.date}>{formatDate(capture.publishedAt)}</Text>
          </View>
          {capture.validationScore >= 90 && (
            <View style={styles.validatedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.validatedText}>Validé</Text>
            </View>
          )}
        </View>

        {/* Espèce + météo */}
        <View style={styles.speciesRow}>
          <Text style={styles.speciesIcon}>{capture.species?.icon ?? '🐟'}</Text>
          <Text style={styles.speciesName}>{capture.species?.nameFr ?? 'Espèce inconnue'}</Text>
          {capture.weather && <Text style={styles.weather}>{WEATHER_LABELS[capture.weather]}</Text>}
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="scale-outline" size={18} color={colors.primary} />
            <Text style={styles.statValue}>{formatWeight(capture.weightGrams)}</Text>
            <Text style={styles.statLabel}>Poids</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="resize-outline" size={18} color={colors.primary} />
            <Text style={styles.statValue}>{formatSize(capture.sizeCm)}</Text>
            <Text style={styles.statLabel}>Taille</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Ionicons name="star-outline" size={18} color={colors.secondary} />
            <Text style={[styles.statValue, { color: colors.secondary }]}>{capture.score}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* Description */}
        {capture.description ? (
          <Text style={styles.description}>{capture.description}</Text>
        ) : null}

        {/* Localisation */}
        <View style={styles.locationRow}>
          <Ionicons
            name={canSeeLocation ? 'location-outline' : 'lock-closed-outline'}
            size={16}
            color={canSeeLocation ? colors.textSecondary : colors.secondary}
          />
          {canSeeLocation && capture.locationName ? (
            <Text style={styles.locationText}>{capture.locationName}</Text>
          ) : canSeeLocation && capture.location ? (
            <Text style={styles.locationText}>
              {capture.location.latitude.toFixed(4)}, {capture.location.longitude.toFixed(4)}
            </Text>
          ) : (
            <Text style={[styles.locationText, styles.lockedText]}>
              {canSeeLocation
                ? 'Localisation non renseignée'
                : 'Premium — Déverrouillez la localisation'}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.action} onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={capture.isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={capture.isLiked ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.actionText, capture.isLiked && styles.likedText]}>
              {capture.likes}
            </Text>
          </TouchableOpacity>

          <View style={styles.action}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.actionText}>{capture.comments}</Text>
          </View>

          <TouchableOpacity style={styles.action} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Suppression (propriétaire) */}
        {isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={styles.deleteText}>Supprimer la capture</Text>
          </TouchableOpacity>
        )}

        {/* Commentaires */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Commentaires {comments.length > 0 ? `(${comments.length})` : ''}
          </Text>

          {commentsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : comments.length === 0 ? (
            <Text style={styles.commentsEmpty}>Aucun commentaire. Sois le premier à réagir !</Text>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.comment}>
                <Avatar username={c.username} uri={c.userAvatar} size={34} />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername}>{c.username}</Text>
                    <Text style={styles.commentDate}>{formatRelativeDate(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
                {c.userId === user?.id && (
                  <TouchableOpacity onPress={() => handleDeleteComment(c)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Barre de saisie */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ajouter un commentaire..."
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || posting) && styles.sendBtnDisabled]}
          onPress={handlePostComment}
          disabled={!draft.trim() || posting}
        >
          <Ionicons name="send" size={18} color={draft.trim() && !posting ? '#fff' : colors.textDisabled} />
        </TouchableOpacity>
      </View>

      {/* Visionneuse plein écran */}
      <Modal
        visible={viewerOpen}
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View style={styles.viewer}>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={activePhoto}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.viewerPage}>
                <Image source={{ uri: item }} style={styles.viewerPhoto} resizeMode="contain" />
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerOpen(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxl },

  galleryPhoto: { width: SCREEN_WIDTH, height: GALLERY_HEIGHT, backgroundColor: colors.surfaceVariant },
  noPhoto: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotoIcon: { fontSize: 56 },
  dots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFFFFF80' },
  dotActive: { backgroundColor: '#FFFFFF' },

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

  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  speciesIcon: { fontSize: 24, marginRight: spacing.xs },
  speciesName: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  weather: { ...typography.bodySmall, color: colors.textSecondary },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { ...typography.h4, color: colors.textPrimary },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },

  description: {
    ...typography.body,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    lineHeight: 22,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: 6,
  },
  locationText: { ...typography.bodySmall, color: colors.textSecondary },
  lockedText: { color: colors.secondary, fontWeight: '600' },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xl,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { ...typography.body, color: colors.textSecondary },
  likedText: { color: colors.error },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  deleteText: { ...typography.body, color: colors.error, fontWeight: '700' },

  commentsSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentsTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.sm },
  commentsEmpty: { ...typography.bodySmall, color: colors.textSecondary, paddingVertical: spacing.md },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  commentUsername: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '700' },
  commentDate: { ...typography.caption, color: colors.textSecondary },
  commentContent: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 19 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },

  viewer: { flex: 1, backgroundColor: '#000' },
  viewerPage: { width: SCREEN_WIDTH, flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerPhoto: { width: SCREEN_WIDTH, height: '100%' },
  viewerClose: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00000080',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
