import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Image,
  Dimensions, FlatList, Modal, TextInput, KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { toggleLike, deleteCapture, adjustCommentCount } from '../../store/slices/capturesSlice';
import * as commentsApi from '../../api/comments';
import { RootStackParamList } from '../../navigation/types';
import { Capture, Comment } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Avatar from '../../components/ui/Avatar';
import Sheet from '../../components/ui/Sheet';
import SpeciesMark from '../../components/ui/SpeciesMark';
import WeighInStrip from '../../components/ui/WeighInStrip';
import LikeButton from '../../components/ui/LikeButton';
import IconButton from '../../components/ui/IconButton';
import Skeleton from '../../components/ui/Skeleton';
import { ListGroup, ListRow } from '../../components/ui/ListGroup';
import { formatInt } from '../../components/ui/format';
import ShareCaptureSheet from '../../components/captures/ShareCaptureSheet';
import { confirmAction, notify } from '../../utils/dialog';
import { WEATHER_META } from '../../utils/weather';
import { formatDate, formatRelativeDate } from '../../utils/formatting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GALLERY_HEIGHT = SCREEN_WIDTH * 0.75; // photo 4:3

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
  const [shareOpen, setShareOpen] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const isOwner = capture.userId === user?.id;
  const canSeeLocation = (user?.isPremium ?? false) || isOwner;
  const photos = capture.photos;
  const weather = capture.weather ? WEATHER_META[capture.weather] : null;
  const speciesName = capture.species?.nameFr ?? 'Espèce inconnue';

  // En-tête inline de l'app (fond crème, liseré) ; l'espèce est le titre de la fiche
  useLayoutEffect(() => {
    navigation.setOptions({ title: 'Prise' });
  }, [navigation]);

  // Ouvert depuis le bouton commentaire du feed : focus direct sur le champ (issue #31).
  // Petit délai pour laisser la transition de navigation se terminer.
  useEffect(() => {
    if (!route.params.focusComment) return;
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [route.params.focusComment]);

  function focusComment() {
    scrollRef.current?.scrollToEnd({ animated: true });
    inputRef.current?.focus();
  }

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
      notify('Commentaire non publié', 'Vérifie ta connexion puis réessaie : ton texte est conservé.');
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(comment: Comment) {
    const ok = await confirmAction({
      title: 'Supprimer ce commentaire ?',
      confirmLabel: 'Supprimer le commentaire',
      destructive: true,
    });
    if (!ok) return;
    try {
      await commentsApi.deleteComment(comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
      dispatch(adjustCommentCount({ captureId: capture.id, delta: -1 }));
    } catch {
      notify('Suppression impossible', "Le commentaire n'a pas pu être supprimé. Réessaie.");
    }
  }

  async function handleDelete() {
    const ok = await confirmAction({
      title: 'Supprimer cette capture ?',
      message: 'Elle disparaîtra du fil, de ton profil et des classements. Cette action est définitive.',
      confirmLabel: 'Supprimer la capture',
      destructive: true,
    });
    if (!ok) return;
    const result = await dispatch(deleteCapture(capture.id));
    if (deleteCapture.fulfilled.match(result)) navigation.goBack();
    else notify('Suppression impossible', 'La capture n\'a pas pu être supprimée. Réessaie.');
  }

  const canSend = !!draft.trim() && !posting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Galerie photos (4:3, pleine largeur) */}
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
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => setViewerOpen(true)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`Agrandir la photo ${index + 1} sur ${photos.length}`}
                >
                  <Image source={{ uri: item }} style={styles.galleryPhoto} resizeMode="cover" />
                </Pressable>
              )}
            />
            {photos.length > 1 && (
              <View style={styles.dots} pointerEvents="none">
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activePhoto && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noPhoto}>
            <Ionicons name="image-outline" size={40} color={colors.inkTertiary} />
            <Text style={styles.noPhotoText}>Pas de photo</Text>
          </View>
        )}

        {/* Fiche de pesée */}
        <Sheet padding={false} style={styles.slip}>
          <View style={styles.angler}>
            <Avatar username={capture.username} uri={capture.userAvatar} size={40} />
            <View style={styles.anglerText}>
              <Text style={styles.username} numberOfLines={1}>{capture.username}</Text>
              <Text style={styles.meta}>{formatDate(capture.publishedAt)}</Text>
            </View>
            {capture.validationScore >= 90 && (
              <View style={styles.validated} accessible accessibilityLabel="Prise validée">
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.validatedText}>Validée</Text>
              </View>
            )}
          </View>

          <View style={styles.slipBody}>
            <View style={styles.speciesRow}>
              <SpeciesMark name={speciesName} speciesId={capture.species?.id} size={40} />
              <Text style={styles.speciesName} numberOfLines={2}>{speciesName}</Text>
            </View>

            <WeighInStrip
              weightGrams={capture.weightGrams}
              lengthCm={capture.sizeCm}
              score={capture.score}
              ruled
            />

            {/* Conditions : météo et lieu */}
            <View style={styles.facts}>
              {weather && (
                <View style={styles.fact}>
                  <Ionicons name={weather.icon} size={16} color={colors.inkSecondary} />
                  <Text style={styles.factText}>{weather.label}</Text>
                </View>
              )}
              <View style={styles.fact}>
                <Ionicons
                  name={canSeeLocation ? 'location-outline' : 'lock-closed-outline'}
                  size={16}
                  color={canSeeLocation ? colors.inkSecondary : colors.goldInk}
                />
                {canSeeLocation && capture.locationName ? (
                  <Text style={styles.factText}>{capture.locationName}</Text>
                ) : canSeeLocation && capture.location ? (
                  <Text style={[styles.factText, styles.numeric]}>
                    {capture.location.latitude.toFixed(4)}, {capture.location.longitude.toFixed(4)}
                  </Text>
                ) : (
                  <Text style={[styles.factText, !canSeeLocation && styles.lockedText]}>
                    {canSeeLocation
                      ? 'Localisation non renseignée'
                      : 'Lieu réservé aux membres Premium'}
                  </Text>
                )}
              </View>
            </View>

            {capture.description ? (
              <Text style={styles.description}>{capture.description}</Text>
            ) : null}
          </View>

          {/* Actions : rangée de 44 pt */}
          <View style={styles.actions}>
            <LikeButton liked={capture.isLiked} count={capture.likes} onToggle={handleLike} />
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={focusComment}
              accessibilityRole="button"
              accessibilityLabel="Écrire un commentaire"
              testID="detail-comment"
            >
              <Ionicons name="chatbubble-outline" size={22} color={colors.ink} />
              <Text style={styles.actionText}>{formatInt(capture.comments)}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
              onPress={() => setShareOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Partager la prise"
              testID="detail-share"
            >
              <Ionicons name="share-outline" size={22} color={colors.ink} />
            </Pressable>
          </View>
        </Sheet>

        {/* Commentaires */}
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle} accessibilityRole="header">Commentaires</Text>
          {comments.length > 0 && <Text style={styles.commentsCount}>{formatInt(comments.length)}</Text>}
        </View>
        <Sheet padding={false} style={styles.commentsSheet}>
          {commentsLoading ? (
            <View style={styles.commentsLoading} accessibilityLabel="Chargement des commentaires">
              {[0, 1].map((i) => (
                <View key={i} style={styles.comment}>
                  <Skeleton width={32} height={32} radius={16} />
                  <View style={styles.commentBody}>
                    <Skeleton width="35%" height={12} />
                    <Skeleton width="80%" height={12} style={{ marginTop: 6 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : comments.length === 0 ? (
            <Text style={styles.commentsEmpty}>Aucun commentaire pour l'instant. Sois le premier à réagir.</Text>
          ) : (
            comments.map((c, i) => (
              <View key={c.id} style={[styles.comment, i > 0 && styles.commentDivider]}>
                <Avatar username={c.username} uri={c.userAvatar} size={32} />
                <View style={styles.commentBody}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername} numberOfLines={1}>{c.username}</Text>
                    <Text style={styles.commentDate}>{formatRelativeDate(c.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
                {c.userId === user?.id && (
                  <IconButton
                    icon="trash-outline"
                    iconSize={18}
                    color={colors.inkSecondary}
                    accessibilityLabel="Supprimer mon commentaire"
                    onPress={() => handleDeleteComment(c)}
                    style={styles.commentDelete}
                  />
                )}
              </View>
            ))
          )}
        </Sheet>

        {/* Suppression (propriétaire) */}
        {isOwner && (
          <ListGroup style={styles.dangerZone}>
            <ListRow
              icon="trash-outline"
              title="Supprimer la capture"
              destructive
              chevron={false}
              onPress={handleDelete}
            />
          </ListGroup>
        )}
      </ScrollView>

      {/* Barre de saisie */}
      <View style={[styles.inputBar, { paddingBottom: spacing.sm + (Platform.OS === 'ios' ? 0 : insets.bottom) }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, inputFocused && styles.inputFocused]}
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="Ajouter un commentaire…"
          placeholderTextColor={colors.inkTertiary}
          selectionColor={colors.primary}
          multiline
          maxLength={1000}
          accessibilityLabel="Ton commentaire"
          testID="comment-input"
        />
        <IconButton
          icon="arrow-up"
          variant="filled"
          accessibilityLabel="Publier le commentaire"
          onPress={handlePostComment}
          disabled={!canSend}
        />
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
          <Pressable
            style={({ pressed }) => [styles.viewerClose, { top: insets.top + spacing.sm }, pressed && styles.viewerClosePressed]}
            onPress={() => setViewerOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Fermer la photo"
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>
      </Modal>

      {shareOpen && (
        <ShareCaptureSheet capture={capture} visible={shareOpen} onClose={() => setShareOpen(false)} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl },
  pressed: { backgroundColor: colors.pressed },
  numeric: { fontVariant: ['tabular-nums'] },

  galleryPhoto: { width: SCREEN_WIDTH, height: GALLERY_HEIGHT, backgroundColor: colors.surfaceMuted },
  noPhoto: {
    width: SCREEN_WIDTH,
    height: GALLERY_HEIGHT * 0.6,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPhotoText: { ...typography.subhead, color: colors.inkSecondary, marginTop: spacing.xs },
  dots: {
    position: 'absolute',
    bottom: spacing.lg + spacing.ms, // au-dessus de la fiche qui chevauche la photo
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: '#FFFFFF' },

  slip: { marginHorizontal: spacing.md, marginTop: -spacing.lg },
  angler: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
    minHeight: 64,
  },
  anglerText: { flex: 1, marginLeft: spacing.ms },
  username: { ...typography.headline, color: colors.ink },
  meta: { ...typography.footnote, color: colors.inkSecondary, marginTop: 1, fontVariant: ['tabular-nums'] },
  validated: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: spacing.sm },
  validatedText: { ...typography.footnote, color: colors.primary, fontWeight: '600' },

  slipBody: { paddingHorizontal: spacing.md },
  speciesRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  speciesName: { ...typography.title2, color: colors.ink, flex: 1, marginLeft: spacing.ms },

  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs, marginTop: spacing.ms },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: { ...typography.subhead, color: colors.inkSecondary },
  lockedText: { color: colors.goldInk, fontWeight: '600' },

  description: { ...typography.body, color: colors.ink, marginTop: spacing.ms },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
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

  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingHorizontal: spacing.md + spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  commentsTitle: { ...typography.headline, color: colors.ink },
  commentsCount: { ...typography.subhead, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  commentsSheet: { marginHorizontal: spacing.md },
  commentsLoading: { paddingVertical: spacing.xs },
  commentsEmpty: { ...typography.subhead, color: colors.inkSecondary, padding: spacing.md },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.ms,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.ms,
  },
  commentDivider: { borderTopWidth: 1, borderTopColor: colors.hairline },
  commentBody: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: 2 },
  commentUsername: { ...typography.subhead, color: colors.ink, fontWeight: '600', flexShrink: 1 },
  commentDate: { ...typography.footnote, color: colors.inkSecondary },
  commentContent: { ...typography.subhead, color: colors.ink },
  commentDelete: { marginTop: -spacing.sm, marginRight: -spacing.sm },

  dangerZone: { marginHorizontal: spacing.md, marginTop: spacing.lg },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.ms,
    paddingTop: 11,
    paddingBottom: 11,
    ...typography.callout,
    color: colors.ink,
    outlineStyle: 'none',
  } as any,
  inputFocused: { borderColor: colors.primary, borderWidth: 2, paddingHorizontal: spacing.ms - 1 },

  viewer: { flex: 1, backgroundColor: '#000' },
  viewerPage: { width: SCREEN_WIDTH, flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewerPhoto: { width: SCREEN_WIDTH, height: '100%' },
  viewerClose: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClosePressed: { backgroundColor: 'rgba(0,0,0,0.75)' },
});
