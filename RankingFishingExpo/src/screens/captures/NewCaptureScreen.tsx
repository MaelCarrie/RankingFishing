import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, FlatList, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAppDispatch, useAppSelector } from '../../store';
import { publishCapture } from '../../store/slices/capturesSlice';
import { FISH_SPECIES, MAX_PHOTOS_PER_CAPTURE, WEATHER_LABELS } from '../../config/constants';
import { validateWeight, validateSize } from '../../utils/validation';
import { FishSpecies, NewCaptureForm, WeatherCondition } from '../../store/types';
import { colors, spacing, typography, borderRadius } from '../../theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { MainTabParamList } from '../../navigation/types';

type Nav = BottomTabNavigationProp<MainTabParamList>;

const WEATHER_OPTIONS = Object.entries(WEATHER_LABELS) as [WeatherCondition, string][];

const INITIAL_FORM: NewCaptureForm = {
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

export default function NewCaptureScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user } = useAppSelector((s) => s.auth);
  const { isSubmitting, error } = useAppSelector((s) => s.captures);

  const [form, setForm] = useState<NewCaptureForm>(INITIAL_FORM);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  function update<K extends keyof NewCaptureForm>(key: K, value: NewCaptureForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function pickImage() {
    if (form.photos.length >= MAX_PHOTOS_PER_CAPTURE) {
      Alert.alert('Limite atteinte', `Maximum ${MAX_PHOTOS_PER_CAPTURE} photos par capture.`);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      update('photos', [...form.photos, result.assets[0].uri]);
    }
  }

  function removePhoto(index: number) {
    update('photos', form.photos.filter((_, i) => i !== index));
  }

  function validate() {
    const e: Record<string, string | null> = {
      species: !form.species ? 'Veuillez sélectionner une espèce' : null,
      weight: validateWeight(form.weightKg || '0'),
      size: validateSize(form.sizeCm),
    };
    setErrors(e);
    return Object.values(e).every((v) => !v);
  }

  async function handleSubmit(isDraft: boolean) {
    if (!isDraft && !validate()) return;
    if (!user) return;

    const result = await dispatch(publishCapture({
      userId: user.id,
      form: { ...form, isDraft },
      username: user.username,
      userAvatar: user.avatar,
    }));

    if (publishCapture.fulfilled.match(result)) {
      setForm(INITIAL_FORM);
      Alert.alert(
        isDraft ? 'Brouillon sauvegardé' : 'Capture publiée !',
        isDraft ? 'Ta capture a été sauvegardée en brouillon.' : 'Ta capture est maintenant visible sur le feed.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } else {
      Alert.alert('Erreur', error ?? 'Une erreur est survenue.');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Photos <Text style={styles.required}>*</Text></Text>
          <Text style={styles.sectionHint}>Min. 1 photo, max. {MAX_PHOTOS_PER_CAPTURE}</Text>

          <View style={styles.photosRow}>
            {form.photos.map((uri, idx) => (
              <View key={uri} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.photoImage} />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(idx)}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {form.photos.length < MAX_PHOTOS_PER_CAPTURE && (
              <TouchableOpacity style={styles.photoAdd} onPress={pickImage}>
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={styles.photoAddText}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Espèce */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🐟 Espèce <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.pickerBtn, !!errors.species && styles.pickerBtnError]}
            onPress={() => setShowSpeciesPicker(true)}
          >
            <Text style={form.species ? styles.pickerValue : styles.pickerPlaceholder}>
              {form.species ? `${form.species.icon} ${form.species.nameFr}` : 'Sélectionner une espèce'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {errors.species && <Text style={styles.errorText}>{errors.species}</Text>}
        </View>

        {/* Poids */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ Poids <Text style={styles.required}>*</Text></Text>
          <View style={styles.weightRow}>
            <Input
              value={form.weightKg}
              onChangeText={(v) => update('weightKg', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              error={errors.weight}
              containerStyle={styles.weightInput}
              rightIcon="logo-euro"
            />
            <Text style={styles.weightUnit}>kg</Text>
            <Input
              value={form.weightGrams}
              onChangeText={(v) => update('weightGrams', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              containerStyle={styles.weightInput}
            />
            <Text style={styles.weightUnit}>g</Text>
          </View>
        </View>

        {/* Taille */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Taille <Text style={styles.required}>*</Text></Text>
          <View style={styles.weightRow}>
            <Input
              value={form.sizeCm}
              onChangeText={(v) => update('sizeCm', v)}
              keyboardType="decimal-pad"
              placeholder="0"
              error={errors.size}
              containerStyle={styles.weightInput}
            />
            <Text style={styles.weightUnit}>cm</Text>
          </View>
        </View>

        {/* Météo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌤️ Conditions météo</Text>
          <View style={styles.weatherGrid}>
            {WEATHER_OPTIONS.map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.weatherChip, form.weather === value && styles.weatherChipSelected]}
                onPress={() => update('weather', form.weather === value ? null : value)}
              >
                <Text style={[styles.weatherChipText, form.weather === value && styles.weatherChipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Description</Text>
          <Input
            value={form.description}
            onChangeText={(v) => update('description', v)}
            multiline
            numberOfLines={3}
            placeholder="Conditions, technique utilisée, anecdote..."
            style={styles.textarea}
          />
        </View>

        {/* Localisation Premium */}
        <View style={styles.premiumSection}>
          <Ionicons name="lock-closed" size={16} color={colors.secondary} />
          <View style={styles.premiumContent}>
            <Text style={styles.premiumTitle}>📍 Localisation — Premium</Text>
            <Text style={styles.premiumDesc}>Partage l'emplacement exact de ta capture. Disponible avec un abonnement Premium.</Text>
          </View>
        </View>

        {/* Boutons */}
        <View style={styles.actions}>
          <Button
            title="Sauvegarder le brouillon"
            onPress={() => handleSubmit(true)}
            variant="outline"
            fullWidth
            style={styles.draftBtn}
            loading={isSubmitting}
          />
          <Button
            title="Publier la capture"
            onPress={() => handleSubmit(false)}
            fullWidth
            size="lg"
            loading={isSubmitting}
          />
        </View>
      </ScrollView>

      {/* Modal sélection espèce */}
      <Modal visible={showSpeciesPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choisir une espèce</Text>
              <TouchableOpacity onPress={() => setShowSpeciesPicker(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={FISH_SPECIES}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.speciesItem, form.species?.id === item.id && styles.speciesItemSelected]}
                  onPress={() => { update('species', item); setShowSpeciesPicker(false); }}
                >
                  <Text style={styles.speciesItemIcon}>{item.icon}</Text>
                  <View>
                    <Text style={styles.speciesItemName}>{item.nameFr}</Text>
                    <Text style={styles.speciesItemCategory}>
                      {item.category === 'freshwater' ? 'Eau douce' : item.category === 'saltwater' ? 'Eau salée' : 'Migrateur'}
                    </Text>
                  </View>
                  {form.species?.id === item.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} style={styles.speciesCheck} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const THUMB_SIZE = 90;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.sm },
  sectionHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: -4 },
  required: { color: colors.error },
  errorText: { ...typography.caption, color: colors.error, marginTop: 4 },

  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumb: { width: THUMB_SIZE, height: THUMB_SIZE, position: 'relative' },
  photoImage: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: borderRadius.md },
  photoRemove: { position: 'absolute', top: -6, right: -6 },
  photoAdd: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddText: { ...typography.caption, color: colors.primary, marginTop: 4, fontWeight: '600' },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 50,
  },
  pickerBtnError: { borderColor: colors.error },
  pickerValue: { ...typography.body, color: colors.textPrimary },
  pickerPlaceholder: { ...typography.body, color: colors.textDisabled },

  weightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weightInput: { flex: 1, marginBottom: 0 },
  weightUnit: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },

  weatherGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  weatherChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  weatherChipSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceVariant },
  weatherChipText: { ...typography.bodySmall, color: colors.textSecondary },
  weatherChipTextSelected: { color: colors.primary, fontWeight: '700' },

  textarea: { minHeight: 70, textAlignVertical: 'top' },

  premiumSection: {
    flexDirection: 'row',
    backgroundColor: colors.premiumBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  premiumContent: { flex: 1 },
  premiumTitle: { ...typography.h4, color: colors.secondaryDark, marginBottom: 4 },
  premiumDesc: { ...typography.bodySmall, color: colors.textSecondary },

  actions: { gap: spacing.sm },
  draftBtn: { marginBottom: 0 },

  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  speciesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  speciesItemSelected: { backgroundColor: colors.surfaceVariant },
  speciesItemIcon: { fontSize: 28 },
  speciesItemName: { ...typography.h4, color: colors.textPrimary },
  speciesItemCategory: { ...typography.caption, color: colors.textSecondary },
  speciesCheck: { marginLeft: 'auto' },
});
