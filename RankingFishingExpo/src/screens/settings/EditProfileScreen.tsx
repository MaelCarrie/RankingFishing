import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../../store';
import { saveProfileSettings } from '../../store/slices/authSlice';
import { BIO_MAX_LENGTH, LOCATION_MAX_LENGTH } from '../../api/profile';
import { FISHING_TYPE_LABELS, FR_REGIONS } from '../../config/constants';
import { ExpertiseLevel, FishingSpecialty, FishingType } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import SegmentedControl from '../../components/ui/SegmentedControl';
import { useToast } from '../../components/ui/Toast';
import ActionSheet from '../../components/common/ActionSheet';
import { confirmAction } from '../../utils/dialog';

const FISHING_TYPES = Object.keys(FISHING_TYPE_LABELS) as FishingType[];
const LEVEL_OPTIONS: { value: ExpertiseLevel; label: string }[] = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'expert', label: 'Expert' },
];

function sameSpecialties(a: FishingSpecialty[], b: FishingSpecialty[]): boolean {
  if (a.length !== b.length) return false;
  const key = (s: FishingSpecialty) => `${s.type}:${s.level}`;
  const setA = new Set(a.map(key));
  return b.every((s) => setA.has(key(s)));
}

export default function EditProfileScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const toast = useToast();
  const user = useAppSelector((s) => s.auth.user);

  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined); // nouvelle photo locale
  const [bio, setBio] = useState(user?.bio ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [region, setRegion] = useState<string | null>(user?.region ?? null);
  const [specialties, setSpecialties] = useState<FishingSpecialty[]>(user?.specialties ?? []);
  const [regionOpen, setRegionOpen] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowLeave = useRef(false);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      !!avatarUri ||
      bio.trim() !== (user.bio ?? '').trim() ||
      location.trim() !== (user.location ?? '').trim() ||
      (region ?? null) !== (user.region ?? null) ||
      !sameSpecialties(specialties, user.specialties)
    );
  }, [user, avatarUri, bio, location, region, specialties]);

  // Quitter avec des modifications non enregistrées : confirmation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!dirty || saving || allowLeave.current) return;
      e.preventDefault();
      confirmAction({
        title: 'Abandonner les modifications ?',
        message: "Tes changements de profil ne seront pas enregistrés.",
        confirmLabel: 'Abandonner',
        cancelLabel: 'Continuer la saisie',
        destructive: true,
      }).then((ok) => { if (ok) navigation.dispatch(e.data.action); });
    });
    return unsubscribe;
  }, [navigation, dirty, saving]);

  if (!user) return null;

  // ─── Avatar ─────────────────────────────────────────────────────────────────

  async function pickFromLibrary() {
    setPhotoSheetOpen(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch {
      setError("La galerie n'a pas pu s'ouvrir.");
    }
  }

  async function takePhoto() {
    setPhotoSheetOpen(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setError("Autorise l'appareil photo dans les réglages pour changer ta photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
    } catch {
      setError("L'appareil photo n'a pas pu s'ouvrir.");
    }
  }

  function handleChangePhoto() {
    if (Platform.OS === 'web') pickFromLibrary();
    else setPhotoSheetOpen(true);
  }

  // ─── Spécialités ────────────────────────────────────────────────────────────

  function toggleSpecialty(type: FishingType) {
    setSpecialties((prev) =>
      prev.some((s) => s.type === type)
        ? prev.filter((s) => s.type !== type)
        : [...prev, { type, level: 'beginner' }]
    );
  }

  function setLevel(type: FishingType, level: ExpertiseLevel) {
    setSpecialties((prev) => prev.map((s) => (s.type === type ? { ...s, level } : s)));
  }

  // ─── Enregistrement ─────────────────────────────────────────────────────────

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    const result = await dispatch(saveProfileSettings({
      userId: user!.id,
      update: {
        bio,
        location,
        region,
        avatarLocalUri: avatarUri,
        specialties: sameSpecialties(specialties, user!.specialties) ? undefined : specialties,
      },
    }));
    if (saveProfileSettings.fulfilled.match(result)) {
      toast.show('Profil enregistré', { tone: 'success' });
      allowLeave.current = true;
      navigation.goBack();
      return;
    }
    setError((result.payload as string) ?? "L'enregistrement a échoué. Réessaie dans un instant.");
    setSaving(false);
  }

  const selected = new Map(specialties.map((s) => [s.type, s.level]));

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="edit-profile">
          {/* Photo */}
          <View style={styles.avatarBlock}>
            <Avatar username={user.username} uri={avatarUri ?? user.avatar} size={96} premium={user.isPremium} />
            <Button
              title="Changer la photo"
              icon="camera-outline"
              variant="text"
              onPress={handleChangePhoto}
              disabled={saving}
              testID="edit-avatar"
            />
          </View>

          {/* Pseudo (lecture seule) */}
          <View style={styles.section}>
            <Text style={styles.label}>Pseudo</Text>
            <View style={styles.readonly}>
              <Text style={styles.readonlyText}>{user.username}</Text>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            </View>
            <Text style={styles.hint}>
              Ton pseudo apparaît sur tes captures et dans les classements : il ne se modifie pas pour l'instant.
            </Text>
          </View>

          {/* Bio */}
          <View style={styles.section}>
            <Text style={styles.label} nativeID="bioLabel">Bio</Text>
            <TextInput
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, BIO_MAX_LENGTH))}
              placeholder="Ta pêche en quelques mots : techniques, eaux favorites…"
              placeholderTextColor={colors.textDisabled}
              multiline
              style={[styles.input, styles.textarea]}
              editable={!saving}
              accessibilityLabelledBy="bioLabel"
              accessibilityLabel="Bio"
              testID="edit-bio"
            />
            <Text style={styles.counter}>{bio.length}/{BIO_MAX_LENGTH}</Text>
          </View>

          {/* Localisation */}
          <View style={styles.section}>
            <Text style={styles.label}>Localisation</Text>
            <TextInput
              value={location}
              onChangeText={(v) => setLocation(v.slice(0, LOCATION_MAX_LENGTH))}
              placeholder="Ex. Nantes, Loire-Atlantique"
              placeholderTextColor={colors.textDisabled}
              style={styles.input}
              editable={!saving}
              accessibilityLabel="Localisation"
              testID="edit-location"
            />
            <Text style={styles.hint}>Affichée sur ton profil public.</Text>
          </View>

          {/* Région */}
          <View style={styles.section}>
            <Text style={styles.label}>Région</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setRegionOpen((v) => !v)}
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ expanded: regionOpen }}
              accessibilityLabel={`Région : ${region ?? 'non renseignée'}. Changer`}
              testID="edit-region"
            >
              <Text style={region ? styles.selectValue : styles.selectPlaceholder}>
                {region ?? 'Choisir ma région'}
              </Text>
              <Ionicons name={regionOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {regionOpen && (
              <View style={styles.chips}>
                {FR_REGIONS.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    selected={region === r}
                    onPress={() => { setRegion(r); setRegionOpen(false); }}
                  />
                ))}
                {region && (
                  <Chip label="Ne pas indiquer" icon="close" onPress={() => { setRegion(null); setRegionOpen(false); }} />
                )}
              </View>
            )}
            <Text style={styles.hint}>Sert au classement régional.</Text>
          </View>

          {/* Spécialités */}
          <View style={styles.section}>
            <Text style={styles.label}>Spécialités</Text>
            <Text style={styles.hint}>Choisis tes pêches, puis ton niveau pour chacune.</Text>
            <View style={styles.chips}>
              {FISHING_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={FISHING_TYPE_LABELS[type]}
                  selected={selected.has(type)}
                  icon={selected.has(type) ? 'checkmark' : undefined}
                  onPress={() => toggleSpecialty(type)}
                  disabled={saving}
                  testID={`specialty-${type}`}
                />
              ))}
            </View>
            {specialties.map((s) => (
              <View key={s.type} style={styles.levelRow}>
                <Text style={styles.levelLabel}>{FISHING_TYPE_LABELS[s.type]}</Text>
                <SegmentedControl
                  options={LEVEL_OPTIONS}
                  value={s.level}
                  onChange={(lvl) => setLevel(s.type, lvl)}
                  accessibilityLabel={`Niveau en ${FISHING_TYPE_LABELS[s.type]}`}
                />
              </View>
            ))}
          </View>

          {error && (
            <View style={styles.error} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title="Enregistrer le profil"
            onPress={handleSave}
            loading={saving}
            disabled={!dirty || saving}
            fullWidth
            testID="edit-save"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionSheet
        visible={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        title="Photo de profil"
        options={[
          { key: 'camera', label: 'Prendre une photo', icon: 'camera-outline', onPress: takePhoto },
          { key: 'library', label: 'Choisir dans la galerie', icon: 'images-outline', onPress: pickFromLibrary },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  avatarBlock: { alignItems: 'center', marginBottom: spacing.md, gap: spacing.xs },

  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  label: { ...typography.headline, color: colors.textPrimary, marginBottom: spacing.sm },
  hint: { ...typography.footnote, color: colors.textSecondary, marginTop: spacing.xs },
  counter: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },

  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.control,
    paddingHorizontal: spacing.ms,
    paddingVertical: spacing.sm,
    minHeight: 44,
    backgroundColor: colors.surface,
  },
  textarea: { minHeight: 88, textAlignVertical: 'top' },

  readonly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.ms,
    borderRadius: borderRadius.control,
    backgroundColor: colors.surfaceMuted,
  },
  readonlyText: { ...typography.body, color: colors.textSecondary },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.ms,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.control,
  },
  selectValue: { ...typography.body, color: colors.textPrimary },
  selectPlaceholder: { ...typography.body, color: colors.textDisabled },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },

  levelRow: { marginTop: spacing.md },
  levelLabel: { ...typography.subhead, color: colors.textPrimary, marginBottom: spacing.xs, fontWeight: '600' },

  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: borderRadius.md,
    padding: spacing.ms,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.callout, color: colors.error, flex: 1 },
});
