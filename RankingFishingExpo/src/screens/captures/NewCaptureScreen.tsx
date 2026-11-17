import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Image, FlatList, Modal,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchFeed, fetchMyCaptures, publishCapture } from '../../store/slices/capturesSlice';
import { refreshUser } from '../../store/slices/authSlice';
import { checkNewlyUnlockedBadges } from '../../store/slices/badgesSlice';
import { FISH_SPECIES, calculateCaptureScore } from '../../config/constants';
import {
  captureWeightToGrams, validateCaptureSize, validateCaptureWeight, validateCaughtAt,
} from '../../utils/validation';
import { compressImages } from '../../utils/image';
import { WEATHER_META, WEATHER_ORDER } from '../../utils/weather';
import { formatWeight } from '../../utils/formatting';
import { Badge, Capture, FishSpecies, NewCaptureForm } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Chip from '../../components/ui/Chip';
import SpeciesMark from '../../components/ui/SpeciesMark';
import Metric from '../../components/ui/Metric';
import Input from '../../components/common/Input';
import ActionSheet from '../../components/common/ActionSheet';
import DateTimeField from '../../components/captures/DateTimeField';
import BadgeUnlockHost from '../../components/badges/BadgeUnlockHost';
import { formatInt } from '../../components/ui/format';
import { RankDelta } from '../../components/ui/RankBadge';
import { MainStackParamList, MainTabParamList } from '../../navigation/types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'NewCapture'>,
  NativeStackNavigationProp<MainStackParamList>
>;

// Limite imposée par le produit (la spec historique en autorisait 5)
export const MAX_CAPTURE_PHOTOS = 3;
const DESCRIPTION_MAX = 500;
const DRAFT_KEY_PREFIX = '@rankingfishing_new_capture_draft:';
const AUTOSAVE_DELAY_MS = 800;

type Phase = 'idle' | 'compressing' | 'sending';
type FieldErrors = Partial<Record<'photos' | 'species' | 'weight' | 'size' | 'date', string | null>>;

interface PublishedFeedback {
  capture: Capture;
  badges: Badge[];
  /** Rang mondial avant / après la publication (null si inconnu). */
  rankBefore: number | null;
  rankAfter: number | null;
}

function makeEmptyForm(): NewCaptureForm {
  return {
    species: null,
    weightKg: '',
    weightGrams: '',
    sizeCm: '',
    photos: [],
    description: '',
    weather: null,
    publishedAt: new Date().toISOString(),
    isDraft: false,
  };
}

function isFormDirty(f: NewCaptureForm): boolean {
  return !!(
    f.species || f.weightKg.trim() || f.weightGrams.trim() || f.sizeCm.trim() ||
    f.photos.length || f.description.trim() || f.weather || f.location
  );
}

/** Les URI blob: (web) ne survivent pas à un rechargement : on ne les restaure pas. */
function restorablePhotos(photos: string[]): string[] {
  return photos.filter((uri) => !uri.startsWith('blob:')).slice(0, MAX_CAPTURE_PHOTOS);
}

export default function NewCaptureScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const user = useAppSelector((s) => s.auth.user);
  const isPremium = user?.isPremium ?? false;
  const draftKey = user ? `${DRAFT_KEY_PREFIX}${user.id}` : null;

  const [form, setForm] = useState<NewCaptureForm>(makeEmptyForm);
  const [photoDims, setPhotoDims] = useState<Record<string, { width: number; height: number }>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingDraft, setPendingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishedFeedback | null>(null);

  const [speciesPickerOpen, setSpeciesPickerOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const isBusy = phase !== 'idle';
  const { width: windowWidth } = useWindowDimensions();
  // 3 vignettes carrées sur la largeur du formulaire (marges 16 + 2 espaces de 8)
  const thumbSize = Math.floor((Math.min(windowWidth, 560) - spacing.md * 2 - spacing.sm * 2) / 3);

  // ─── Brouillon local (sauvegarde automatique, issue #3) ─────────────────────

  useEffect(() => {
    if (!draftKey) return;
    let active = true;
    AsyncStorage.getItem(draftKey)
      .then((json) => {
        if (!active || !json) return;
        const saved = JSON.parse(json) as NewCaptureForm;
        const restored: NewCaptureForm = { ...makeEmptyForm(), ...saved, photos: restorablePhotos(saved.photos ?? []), isDraft: false };
        if (isFormDirty(restored)) {
          setForm(restored);
          setDraftRestored(true);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setDraftLoaded(true); });
    return () => { active = false; };
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftLoaded) return;
    const t = setTimeout(() => {
      const op = isFormDirty(form)
        ? AsyncStorage.setItem(draftKey, JSON.stringify(form))
        : AsyncStorage.removeItem(draftKey);
      op.catch(() => {});
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [form, draftKey, draftLoaded]);

  // Formulaire vierge : la date suit l'heure courante quand on revient sur l'onglet
  useFocusEffect(
    useCallback(() => {
      setForm((f) => (isFormDirty(f) ? f : { ...f, publishedAt: new Date().toISOString() }));
    }, [])
  );

  function update<K extends keyof NewCaptureForm>(key: K, value: NewCaptureForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
    if (published) setPublished(null);
  }

  function clearField(key: keyof FieldErrors) {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  }

  function discardDraft() {
    setForm(makeEmptyForm());
    setErrors({});
    setDraftRestored(false);
    setLocationError(null);
    if (draftKey) AsyncStorage.removeItem(draftKey).catch(() => {});
  }

  // ─── Photos ─────────────────────────────────────────────────────────────────

  const remainingPhotos = MAX_CAPTURE_PHOTOS - form.photos.length;

  function addAssets(assets: ImagePicker.ImagePickerAsset[]) {
    const picked = assets.slice(0, remainingPhotos);
    if (picked.length === 0) return;
    setPhotoDims((d) => {
      const next = { ...d };
      for (const a of picked) next[a.uri] = { width: a.width, height: a.height };
      return next;
    });
    update('photos', [...form.photos, ...picked.map((a) => a.uri)]);
    clearField('photos');
  }

  async function pickFromLibrary() {
    setPhotoSheetOpen(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: remainingPhotos > 1,
        selectionLimit: remainingPhotos,
      });
      if (!result.canceled) addAssets(result.assets);
    } catch {
      setErrors((e) => ({ ...e, photos: "La galerie n'a pas pu s'ouvrir." }));
    }
  }

  async function takePhoto() {
    setPhotoSheetOpen(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setErrors((e) => ({ ...e, photos: "Autorise l'appareil photo dans les réglages pour photographier ta prise." }));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (!result.canceled) addAssets(result.assets);
    } catch {
      setErrors((e) => ({ ...e, photos: "L'appareil photo n'a pas pu s'ouvrir." }));
    }
  }

  function handleAddPhoto() {
    if (remainingPhotos <= 0) return;
    // Pas d'appareil photo sur web : ouverture directe du sélecteur de fichiers
    if (Platform.OS === 'web') pickFromLibrary();
    else setPhotoSheetOpen(true);
  }

  function removePhoto(index: number) {
    update('photos', form.photos.filter((_, i) => i !== index));
  }

  // ─── Localisation (Premium) ─────────────────────────────────────────────────

  async function addLocation() {
    if (!isPremium) {
      navigation.navigate('Premium');
      return;
    }
    setLocating(true);
    setLocationError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocationError('Autorise la localisation dans les réglages pour géolocaliser ta prise.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      let name: string | undefined;
      // Géocodage inverse indisponible sur web
      if (Platform.OS !== 'web') {
        try {
          const [place] = await Location.reverseGeocodeAsync(point);
          if (place) {
            name = [place.city ?? place.subregion ?? place.district, place.region]
              .filter(Boolean)
              .join(', ') || undefined;
          }
        } catch {
          // les coordonnées suffisent
        }
      }
      setForm((f) => ({ ...f, location: point, locationName: name }));
    } catch {
      setLocationError("Position introuvable. Vérifie que le GPS est activé puis réessaie.");
    } finally {
      setLocating(false);
    }
  }

  function removeLocation() {
    setForm((f) => ({ ...f, location: undefined, locationName: undefined }));
  }

  // ─── Validation & envoi ─────────────────────────────────────────────────────

  function validate(isDraft: boolean): boolean {
    const e: FieldErrors = {
      photos: null, // Photo facultative (décision produit du 2026-11-17)
      species: !form.species ? 'Choisis une espèce' : null,
      // Le poids est requis même en brouillon (contrainte weight_grams > 0 en base)
      weight: validateCaptureWeight(form.weightKg, form.weightGrams),
      size: validateCaptureSize(form.sizeCm, !isDraft),
      date: validateCaughtAt(form.publishedAt),
    };
    setErrors(e);
    const ok = Object.values(e).every((v) => !v);
    if (!ok) scrollRef.current?.scrollTo({ y: 0, animated: true });
    return ok;
  }

  async function handleSubmit(isDraft: boolean) {
    if (!user || isBusy) return;
    setSubmitError(null);
    setPublished(null);
    if (!validate(isDraft)) return;

    const since = new Date().toISOString(); // avant l'envoi (badges débloqués ensuite)
    setPendingDraft(isDraft);

    try {
      // 1. Compression des photos (issue #19)
      setPhase('compressing');
      const photos = await compressImages(form.photos, photoDims);

      // 2. Publication
      setPhase('sending');
      const result = await dispatch(publishCapture({
        userId: user.id,
        form: { ...form, photos, isDraft },
        username: user.username,
        userAvatar: user.avatar,
      }));

      if (!publishCapture.fulfilled.match(result)) {
        setSubmitError((result.payload as string) ?? 'La publication a échoué. Réessaie dans un instant.');
        return;
      }

      const capture = result.payload;
      let badges: Badge[] = [];
      const rankBefore = user.stats?.globalRank ?? null;
      let rankAfter: number | null = rankBefore;

      // 3. Rafraîchir feed, profil et mes captures ; vérifier les badges
      dispatch(fetchMyCaptures(user.id));
      if (!isDraft) {
        dispatch(fetchFeed({ refresh: true }));
        const badgeResult = await dispatch(checkNewlyUnlockedBadges({ userId: user.id, since }));
        if (checkNewlyUnlockedBadges.fulfilled.match(badgeResult)) badges = badgeResult.payload;
        // Recharger le profil après les badges (XP créditée) pour lire le nouveau rang
        const refreshed = await dispatch(refreshUser(user.id));
        if (refreshUser.fulfilled.match(refreshed)) {
          rankAfter = refreshed.payload?.stats?.globalRank ?? rankBefore;
        }
      }

      // 4. Reset du formulaire + suppression du brouillon local
      setForm(makeEmptyForm());
      setPhotoDims({});
      setErrors({});
      setDraftRestored(false);
      setLocationError(null);
      if (draftKey) AsyncStorage.removeItem(draftKey).catch(() => {});
      setPublished({ capture, badges, rankBefore, rankAfter });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e: any) {
      setSubmitError(e?.message ?? 'La publication a échoué. Réessaie dans un instant.');
    } finally {
      setPhase('idle');
    }
  }

  // Aperçu du score (même formule que le serveur)
  const previewScore = useMemo(() => {
    const grams = captureWeightToGrams(form.weightKg, form.weightGrams);
    if (!form.species || !grams) return null;
    return calculateCaptureScore(grams, form.species);
  }, [form.species, form.weightKg, form.weightGrams]);

  if (!user) return null;

  // XP de la prise elle-même (même règle que le trigger SQL : max(10, score/5)),
  // distincte du bonus des badges, affiché à part dans la feuille de déblocage.
  const catchXp = published && !published.capture.isDraft
    ? Math.max(10, Math.floor(published.capture.score / 5))
    : 0;
  const badgeXp = published ? published.badges.reduce((sum, b) => sum + (b.xpReward ?? 0), 0) : 0;
  const rankGain = published && published.rankBefore != null && published.rankAfter != null
    ? published.rankBefore - published.rankAfter
    : 0;

  const phaseLabel = phase === 'compressing'
    ? 'Optimisation des photos…'
    : phase === 'sending'
      ? 'Envoi de ta prise…'
      : null;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          testID="new-capture-form"
        >
          {/* Retour après publication */}
          {published && (
            <View style={styles.success} accessibilityRole="alert" testID="publish-success">
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.successTitle}>
                  {published.capture.isDraft ? 'Brouillon enregistré' : 'Prise publiée'}
                </Text>
                <Text style={styles.successText}>
                  {published.capture.isDraft
                    ? 'Retrouve-le dans Profil, Mes captures.'
                    : `${published.capture.species.nameFr} de ${formatWeight(published.capture.weightGrams)} · `}
                  {!published.capture.isDraft && (
                    <Text style={styles.successScore}>{`${formatInt(published.capture.score)}\u00A0pts`}</Text>
                  )}
                  {!published.capture.isDraft && catchXp > 0 && (
                    <Text>
                      {' · '}
                      <Text style={styles.successScore}>{`+${formatInt(catchXp)}\u00A0XP`}</Text>
                    </Text>
                  )}
                </Text>
                {!published.capture.isDraft && published.rankAfter != null && (
                  <View style={styles.successRankRow}>
                    <Text style={styles.successText}>
                      {`Rang mondial\u00A0: `}
                      <Text style={styles.successRank}>{`${formatInt(published.rankAfter)}e`}</Text>
                    </Text>
                    {rankGain > 0 && <RankDelta delta={rankGain} />}
                  </View>
                )}
                {!published.capture.isDraft && badgeXp > 0 && (
                  <Text style={styles.successText}>
                    {`Bonus badge${published.badges.length > 1 ? 's' : ''}\u00A0: `}
                    <Text style={styles.successScore}>{`+${formatInt(badgeXp)}\u00A0XP`}</Text>
                  </Text>
                )}
                {!published.capture.isDraft && (
                  <Button
                    title="Voir ma prise dans le fil"
                    variant="text"
                    size="sm"
                    onPress={() => navigation.navigate('Home')}
                    style={styles.successLink}
                  />
                )}
              </View>
              <IconButton
                icon="close"
                iconSize={20}
                color={colors.inkSecondary}
                accessibilityLabel="Masquer la confirmation"
                onPress={() => setPublished(null)}
                style={styles.successClose}
              />
            </View>
          )}

          {/* Brouillon local restauré */}
          {draftRestored && !published && (
            <View style={styles.draftBanner} testID="draft-restored">
              <Ionicons name="document-text-outline" size={20} color={colors.inkSecondary} />
              <Text style={styles.draftBannerText}>Ta saisie précédente a été restaurée.</Text>
              <Button title="Effacer la saisie" variant="text" size="sm" onPress={discardDraft} />
            </View>
          )}

          {/* Photos */}
          <View style={styles.section}>
            <FieldLabel title="Photos" detail={`${form.photos.length}/${MAX_CAPTURE_PHOTOS}`} />
            <View style={styles.photosRow}>
              {form.photos.map((uri, idx) => (
                <View key={`${uri}-${idx}`} style={{ width: thumbSize, height: thumbSize }}>
                  <Image source={{ uri }} style={[styles.photoImage, { width: thumbSize, height: thumbSize }]} />
                  {idx === 0 && (
                    <View style={styles.coverTag}><Text style={styles.coverTagText}>Couverture</Text></View>
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.photoRemove, pressed && styles.photoRemovePressed]}
                    onPress={() => removePhoto(idx)}
                    disabled={isBusy}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer la photo ${idx + 1}`}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
              {remainingPhotos > 0 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.photoAdd,
                    { width: thumbSize, height: thumbSize },
                    pressed && styles.photoAddPressed,
                    !!errors.photos && styles.photoAddError,
                  ]}
                  onPress={handleAddPhoto}
                  disabled={isBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Ajouter une photo"
                  testID="add-photo"
                >
                  <Ionicons name="camera-outline" size={28} color={colors.primaryDark} />
                  <Text style={styles.photoAddText}>Ajouter</Text>
                </Pressable>
              )}
            </View>
            {errors.photos
              ? <Text style={styles.errorText}>{errors.photos}</Text>
              : <Text style={styles.fieldHint}>Facultatives mais conseillées. Elles sont optimisées avant l'envoi.</Text>}
          </View>

          {/* Espèce */}
          <View style={styles.section}>
            <FieldLabel title="Espèce" required />
            <Pressable
              style={({ pressed }) => [styles.pickerBtn, pressed && styles.pickerBtnPressed, !!errors.species && styles.pickerBtnError]}
              onPress={() => setSpeciesPickerOpen(true)}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel={form.species ? `Espèce : ${form.species.nameFr}. Changer` : 'Choisir une espèce'}
              testID="species-picker"
            >
              {form.species ? (
                <SpeciesMark name={form.species.nameFr} speciesId={form.species.id} size={32} />
              ) : (
                <Ionicons name="fish-outline" size={22} color={colors.inkSecondary} />
              )}
              <Text style={[styles.pickerText, form.species ? styles.pickerValue : styles.pickerPlaceholder]}>
                {form.species ? form.species.nameFr : 'Choisir une espèce'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.inkSecondary} />
            </Pressable>
            {errors.species && <Text style={styles.errorText}>{errors.species}</Text>}
          </View>

          {/* Poids */}
          <View style={styles.section}>
            <FieldLabel title="Poids" required />
            <View style={styles.measureRow}>
              <Input
                value={form.weightKg}
                onChangeText={(v) => { update('weightKg', v); clearField('weight'); }}
                keyboardType="decimal-pad"
                placeholder="0"
                suffix="kg"
                containerStyle={styles.measureInput}
                style={styles.measureText}
                accessibilityLabel="Poids en kilos"
                editable={!isBusy}
                testID="weight-kg"
              />
              <Input
                value={form.weightGrams}
                onChangeText={(v) => { update('weightGrams', v); clearField('weight'); }}
                keyboardType="number-pad"
                placeholder="0"
                suffix="g"
                containerStyle={styles.measureInput}
                style={styles.measureText}
                accessibilityLabel="Grammes en plus"
                editable={!isBusy}
                testID="weight-g"
              />
            </View>
            {errors.weight
              ? <Text style={styles.errorText}>{errors.weight}</Text>
              : <Text style={styles.fieldHint}>Virgule acceptée : 7,2 kg ou 7 kg 200 g.</Text>}
          </View>

          {/* Taille */}
          <View style={styles.section}>
            <FieldLabel title="Taille" required />
            <View style={styles.measureRow}>
              <Input
                value={form.sizeCm}
                onChangeText={(v) => { update('sizeCm', v); clearField('size'); }}
                keyboardType="decimal-pad"
                placeholder="0"
                suffix="cm"
                containerStyle={styles.measureInput}
                style={styles.measureText}
                accessibilityLabel="Taille en centimètres"
                editable={!isBusy}
                testID="size-cm"
              />
              <View style={styles.measureInput} />
            </View>
            {errors.size && <Text style={styles.errorText}>{errors.size}</Text>}

            {previewScore !== null && (
              <View style={styles.scorePreview} accessibilityLiveRegion="polite">
                <Ionicons name="trophy-outline" size={18} color={colors.goldInk} />
                <Text style={styles.scorePreviewText}>Score estimé</Text>
                <Metric value={previewScore} unit="pts" size="sm" tone="gold" />
              </View>
            )}
          </View>

          {/* Date et heure */}
          <View style={styles.section}>
            <FieldLabel title="Date et heure de la prise" />
            <DateTimeField
              value={form.publishedAt}
              onChange={(iso) => { update('publishedAt', iso); clearField('date'); }}
              error={errors.date}
            />
          </View>

          {/* Météo */}
          <View style={styles.section}>
            <FieldLabel title="Météo" optional />
            <View style={styles.chips}>
              {WEATHER_ORDER.map((value) => {
                const meta = WEATHER_META[value];
                const selected = form.weather === value;
                return (
                  <Chip
                    key={value}
                    label={meta.label}
                    icon={meta.icon}
                    selected={selected}
                    disabled={isBusy}
                    onPress={() => update('weather', selected ? null : value)}
                  />
                );
              })}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <FieldLabel title="Description" optional />
            <Input
              value={form.description}
              onChangeText={(v) => update('description', v.slice(0, DESCRIPTION_MAX))}
              multiline
              numberOfLines={3}
              placeholder="Technique, appât, conditions, anecdote…"
              style={styles.textarea}
              containerStyle={styles.noMargin}
              editable={!isBusy}
              accessibilityLabel="Description"
              hint={`${form.description.length}/${DESCRIPTION_MAX}`}
            />
          </View>

          {/* Localisation (Premium) */}
          <View style={styles.section} testID="location-section">
            <FieldLabel title="Lieu de la prise" optional premium />

            {isPremium ? (
              form.location ? (
                <View style={styles.locationValue}>
                  <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                  <Text style={styles.locationValueText} numberOfLines={1}>
                    {form.locationName ??
                      `${form.location.latitude.toFixed(4)}, ${form.location.longitude.toFixed(4)}`}
                  </Text>
                  <Button title="Retirer le lieu" variant="text" size="sm" onPress={removeLocation} />
                </View>
              ) : (
                <>
                  <Text style={styles.sectionHint}>
                    Seuls toi et les membres Premium verront ce lieu.
                  </Text>
                  <Button
                    title={locating ? 'Localisation…' : 'Ajouter ma position actuelle'}
                    icon="navigate-outline"
                    onPress={addLocation}
                    variant="tonal"
                    loading={locating}
                    disabled={isBusy}
                    fullWidth
                  />
                </>
              )
            ) : (
              <View style={styles.lockedBox}>
                <View style={styles.lockedRow} accessibilityState={{ disabled: true }}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.goldInk} />
                  <Text style={styles.lockedText}>
                    Géolocaliser tes prises est réservé aux membres Premium. Sans Premium, ta prise est
                    publiée sans lieu, ce qui protège tes coins de pêche.
                  </Text>
                </View>
                <Button
                  title="Découvrir Premium"
                  variant="text"
                  size="sm"
                  onPress={() => navigation.navigate('Premium')}
                  style={styles.lockedLink}
                />
              </View>
            )}
            {locationError && <Text style={styles.errorText}>{locationError}</Text>}
          </View>

          {/* Brouillon */}
          <View style={styles.draftActions}>
            <Button
              title="Enregistrer en brouillon"
              icon="document-outline"
              onPress={() => handleSubmit(true)}
              variant="text"
              loading={isBusy && pendingDraft}
              disabled={isBusy}
            />
            <Text style={styles.autosaveHint}>
              Ta saisie est aussi gardée sur cet appareil si tu quittes l'écran.
            </Text>
          </View>
        </ScrollView>

        {/* Barre d'action fixe, au-dessus du clavier */}
        <View style={styles.bottomBar}>
          {submitError && (
            <View style={styles.submitError} accessibilityRole="alert" testID="publish-error">
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.submitErrorText}>{submitError}</Text>
            </View>
          )}
          {phaseLabel && (
            <Text style={styles.phaseText} accessibilityLiveRegion="polite">{phaseLabel}</Text>
          )}
          <Button
            title="Publier la prise"
            icon="checkmark"
            onPress={() => handleSubmit(false)}
            fullWidth
            loading={isBusy && !pendingDraft}
            disabled={isBusy}
            testID="publish-capture"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Source de la photo (natif uniquement) */}
      <ActionSheet
        visible={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        title="Ajouter une photo"
        options={[
          { key: 'camera', label: 'Prendre une photo', icon: 'camera-outline', onPress: takePhoto },
          {
            key: 'library',
            label: 'Choisir dans la galerie',
            description: remainingPhotos > 1 ? `Jusqu'à ${remainingPhotos} photos` : undefined,
            icon: 'images-outline',
            onPress: pickFromLibrary,
          },
        ]}
      />

      <SpeciesPicker
        visible={speciesPickerOpen}
        selectedId={form.species?.id}
        onClose={() => setSpeciesPickerOpen(false)}
        onSelect={(s) => { update('species', s); clearField('species'); setSpeciesPickerOpen(false); }}
      />

      {/* Moment signature : feuille à liseré or, un badge à la fois */}
      <BadgeUnlockHost />
    </SafeAreaView>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function FieldLabel({
  title, required, optional, premium, detail,
}: { title: string; required?: boolean; optional?: boolean; premium?: boolean; detail?: string }) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label} accessibilityRole="header">
        {title}
        {required && <Text style={styles.required} accessibilityLabel="obligatoire"> *</Text>}
      </Text>
      {premium && (
        <View style={styles.premiumTag}>
          <Ionicons name="star" size={11} color={colors.goldInk} />
          <Text style={styles.premiumTagText}>Premium</Text>
        </View>
      )}
      <View style={styles.flex} />
      {optional && <Text style={styles.optional}>Facultatif</Text>}
      {detail && <Text style={styles.labelDetail}>{detail}</Text>}
    </View>
  );
}

const CATEGORY_LABELS: Record<FishSpecies['category'], string> = {
  freshwater: 'Eau douce',
  saltwater: 'Mer',
  migratory: 'Migrateur',
};

function SpeciesPicker({
  visible, selectedId, onClose, onSelect,
}: { visible: boolean; selectedId?: string; onClose: () => void; onSelect: (s: FishSpecies) => void }) {
  const insets = useSafeAreaInsets();
  const sorted = useMemo(
    () => [...FISH_SPECIES].sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr')),
    []
  );
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer la liste des espèces" />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.grabber} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} accessibilityRole="header">Choisir une espèce</Text>
            <IconButton icon="close" accessibilityLabel="Fermer" onPress={onClose} />
          </View>
          <FlatList
            data={sorted}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => {
              const selected = selectedId === item.id;
              return (
                <Pressable
                  style={({ pressed }) => [styles.speciesItem, selected && styles.speciesItemSelected, pressed && styles.speciesItemPressed]}
                  onPress={() => onSelect(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`species-${item.id}`}
                >
                  <SpeciesMark name={item.nameFr} speciesId={item.id} size={36} />
                  <View style={styles.flex}>
                    <Text style={styles.speciesItemName}>{item.nameFr}</Text>
                    <Text style={styles.speciesItemCategory}>
                      {CATEGORY_LABELS[item.category]} · coefficient ×{String(item.scoreCoefficient).replace('.', ',')}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={22} color={colors.primary} />}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  noMargin: { marginBottom: 0 },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },

  section: { marginBottom: spacing.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm, minHeight: 22 },
  label: { ...typography.headline, color: colors.ink },
  labelDetail: { ...typography.subhead, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
  required: { color: colors.error },
  optional: { ...typography.footnote, color: colors.inkSecondary },
  sectionHint: { ...typography.subhead, color: colors.inkSecondary, marginBottom: spacing.ms },
  errorText: { ...typography.footnote, color: colors.error, marginTop: spacing.xs },
  fieldHint: { ...typography.footnote, color: colors.inkSecondary, marginTop: spacing.xs },

  photosRow: { flexDirection: 'row', gap: spacing.sm },
  photoImage: { borderRadius: borderRadius.control, backgroundColor: colors.surfaceMuted },
  coverTag: {
    position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(21,34,26,0.7)',
    borderRadius: borderRadius.xs, paddingHorizontal: 6, paddingVertical: 2,
  },
  coverTagText: { ...typography.caption, color: '#FFFFFF', fontWeight: '600' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4, width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(21,34,26,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  photoRemovePressed: { backgroundColor: 'rgba(21,34,26,0.9)' },
  photoAdd: {
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  photoAddPressed: { backgroundColor: colors.primaryTint },
  photoAddError: { borderColor: colors.error },
  photoAddText: { ...typography.subhead, color: colors.primaryDark, fontWeight: '600' },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.ms,
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md - 1,
    minHeight: 56,
  },
  pickerBtnPressed: { backgroundColor: colors.surfaceMuted },
  pickerBtnError: { borderColor: colors.error },
  pickerText: { ...typography.body, fontSize: 17, flex: 1 },
  pickerValue: { color: colors.ink, fontWeight: '600' },
  pickerPlaceholder: { color: colors.inkTertiary },

  measureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  measureInput: { flex: 1, marginBottom: 0 },
  measureText: { fontVariant: ['tabular-nums'], fontSize: 20, fontWeight: '600' },

  scorePreview: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.ms,
    backgroundColor: colors.goldTint, borderRadius: borderRadius.control,
    paddingHorizontal: spacing.ms, minHeight: 48,
  },
  scorePreviewText: { ...typography.subhead, color: colors.ink, flex: 1 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  textarea: { minHeight: 88, textAlignVertical: 'top', fontSize: 16, fontWeight: '400' },

  premiumTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.goldTint,
    borderRadius: borderRadius.xs, paddingHorizontal: 6, paddingVertical: 2,
  },
  premiumTagText: { ...typography.caption, color: colors.goldInk, fontWeight: '600' },
  lockedBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.control,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.ms,
    paddingBottom: spacing.xs,
  },
  lockedRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  lockedText: { ...typography.subhead, color: colors.inkSecondary, flex: 1 },
  lockedLink: { marginLeft: spacing.lg, marginTop: spacing.xs },
  locationValue: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationValueText: { ...typography.body, color: colors.ink, flex: 1 },

  draftActions: { alignItems: 'center', gap: spacing.xs },
  autosaveHint: { ...typography.footnote, color: colors.inkSecondary, textAlign: 'center' },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    gap: spacing.sm,
  },
  submitError: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.errorLight, borderRadius: borderRadius.control, padding: spacing.ms,
  },
  submitErrorText: { ...typography.subhead, color: colors.error, flex: 1 },
  phaseText: { ...typography.footnote, color: colors.inkSecondary, textAlign: 'center' },

  success: {
    flexDirection: 'row', gap: spacing.ms, alignItems: 'flex-start',
    backgroundColor: colors.surface, borderRadius: borderRadius.sheet, padding: spacing.md,
    paddingRight: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.hairline,
  },
  successIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { ...typography.headline, color: colors.ink },
  successText: { ...typography.subhead, color: colors.inkSecondary, marginTop: 2, fontVariant: ['tabular-nums'] },
  successScore: { color: colors.goldInk, fontWeight: '600' },
  successRankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  successRank: { ...typography.numeric, color: colors.ink, fontWeight: '600' },
  successLink: { marginLeft: -spacing.ms, marginTop: spacing.xs },
  successClose: { marginTop: -spacing.sm },

  draftBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap',
    backgroundColor: colors.surfaceMuted, borderRadius: borderRadius.control, paddingLeft: spacing.ms,
    paddingVertical: spacing.xs, marginBottom: spacing.lg,
  },
  draftBannerText: { ...typography.subhead, color: colors.ink, flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grabber: {
    alignSelf: 'center', width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.outline, marginTop: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  modalTitle: { ...typography.headline, color: colors.ink },
  speciesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: spacing.ms,
  },
  speciesItemSelected: { backgroundColor: colors.primaryTint },
  speciesItemPressed: { backgroundColor: colors.pressed },
  speciesItemName: { ...typography.body, fontWeight: '600', color: colors.ink },
  speciesItemCategory: { ...typography.footnote, color: colors.inkSecondary, fontVariant: ['tabular-nums'] },
});
