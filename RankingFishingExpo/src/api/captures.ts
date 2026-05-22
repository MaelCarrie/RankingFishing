import { Capture, NewCaptureForm } from '../store/types';
import { MOCK_FEED_CAPTURES, MOCK_MY_CAPTURES } from './mock/data';
import { delay, generateId } from '../utils/helpers'; // generateId utilisé uniquement en mode mock
import { calculateCaptureScore, FISH_SPECIES } from '../config/constants';
import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { uploadCapturePhoto } from './storage';

let mockFeed = [...MOCK_FEED_CAPTURES];
let mockMine = [...MOCK_MY_CAPTURES];

// ─── Feed public ──────────────────────────────────────────────────────────────

export async function fetchFeed(userId?: string): Promise<Capture[]> {
  if (USE_MOCK_DATA) {
    await delay(600);
    return [...mockFeed].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  const { data, error } = await supabase
    .from('captures')
    .select('*, capture_photos(*)')
    .eq('is_draft', false)
    .order('published_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  const likedSet = await fetchLikedSet(userId, (data ?? []).map((c) => c.id));
  return (data ?? []).map((row) => mapCapture(row, likedSet));
}

// ─── Mes captures ─────────────────────────────────────────────────────────────

export async function fetchMyCaptures(userId: string): Promise<Capture[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return mockMine.filter((c) => c.userId === userId);
  }

  const { data, error } = await supabase
    .from('captures')
    .select('*, capture_photos(*)')
    .eq('user_id', userId)
    .order('published_at', { ascending: false });

  if (error) throw error;

  const likedSet = await fetchLikedSet(userId, (data ?? []).map((c) => c.id));
  return (data ?? []).map((row) => mapCapture(row, likedSet));
}

// ─── Captures publiques d'un autre utilisateur ────────────────────────────────

export async function fetchUserPublicCaptures(userId: string): Promise<Capture[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return mockFeed.filter((c) => c.userId === userId && !c.isDraft);
  }

  const { data, error } = await supabase
    .from('captures')
    .select('*, capture_photos(*)')
    .eq('user_id', userId)
    .eq('is_draft', false)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapCapture(row));
}

// ─── Publier une capture ──────────────────────────────────────────────────────

export async function publishCapture(
  userId: string,
  form: NewCaptureForm,
  username: string,
  userAvatar?: string
): Promise<Capture> {
  if (USE_MOCK_DATA) {
    await delay(1200);
    if (!form.species) throw new Error('Espèce requise');
    const weightGrams =
      (parseFloat(form.weightKg.replace(',', '.')) || 0) * 1000 +
      (parseFloat(form.weightGrams.replace(',', '.')) || 0);
    const sizeCm = parseFloat(form.sizeCm.replace(',', '.')) || 0;

    const newCapture: Capture = {
      id: generateId(),
      userId,
      username,
      userAvatar,
      species: form.species,
      weightGrams,
      sizeCm,
      photos: form.photos.length > 0 ? form.photos : ['https://picsum.photos/seed/newcap/800/600'],
      description: form.description || undefined,
      weather: form.weather ?? undefined,
      publishedAt: new Date().toISOString(),
      isDraft: form.isDraft,
      validationScore: 0,
      score: calculateCaptureScore(weightGrams, form.species),
      likes: 0,
      comments: 0,
      isLiked: false,
    };

    if (!form.isDraft) mockFeed.unshift(newCapture);
    mockMine.unshift(newCapture);
    return newCapture;
  }

  if (!form.species) throw new Error('Espèce requise');

  const weightGrams =
    (parseFloat(form.weightKg.replace(',', '.')) || 0) * 1000 +
    (parseFloat(form.weightGrams.replace(',', '.')) || 0);
  const sizeCm = parseFloat(form.sizeCm.replace(',', '.')) || 0;
  const score = calculateCaptureScore(weightGrams, form.species);

  // 1. Insérer la capture — Supabase génère l'UUID
  const { data: capture, error: captureError } = await supabase
    .from('captures')
    .insert({
      user_id: userId,
      username,
      user_avatar: userAvatar ?? null,
      species_id: form.species.id,
      species_data: form.species,
      weight_grams: weightGrams,
      size_cm: sizeCm,
      description: form.description || null,
      weather: form.weather ?? null,
      latitude: form.location?.latitude ?? null,
      longitude: form.location?.longitude ?? null,
      location_name: null,
      is_draft: form.isDraft,
      score,
      validation_score: 0,
      likes: 0,
      comments: 0,
    })
    .select()
    .single();

  if (captureError) throw captureError;
  const captureId = capture.id; // UUID réel généré par Supabase

  // 2. Upload des photos et insertion dans capture_photos
  const photoUrls: string[] = [];
  for (let i = 0; i < form.photos.length; i++) {
    const url = await uploadCapturePhoto(userId, captureId, form.photos[i]);
    photoUrls.push(url);
    await supabase.from('capture_photos').insert({ capture_id: captureId, url, sort_order: i });
  }

  return {
    id: capture.id,
    userId: capture.user_id,
    username: capture.username,
    userAvatar: capture.user_avatar ?? undefined,
    species: form.species,
    weightGrams: capture.weight_grams,
    sizeCm: capture.size_cm,
    photos: photoUrls,
    description: capture.description ?? undefined,
    weather: capture.weather ?? undefined,
    location: form.location ?? undefined,
    locationName: undefined,
    publishedAt: capture.published_at,
    isDraft: capture.is_draft,
    validationScore: capture.validation_score,
    score: capture.score,
    likes: 0,
    comments: 0,
    isLiked: false,
  };
}

// ─── Toggle like ──────────────────────────────────────────────────────────────

export async function toggleLike(
  captureId: string,
  userId: string
): Promise<{ likes: number; isLiked: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(200);
    const capture = mockFeed.find((c) => c.id === captureId);
    if (!capture) throw new Error('Capture introuvable');
    capture.isLiked = !capture.isLiked;
    capture.likes += capture.isLiked ? 1 : -1;
    return { likes: capture.likes, isLiked: capture.isLiked };
  }

  // Vérifier si déjà liké
  const { data: existing } = await supabase
    .from('capture_likes')
    .select('capture_id')
    .eq('capture_id', captureId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Unliker
    await supabase
      .from('capture_likes')
      .delete()
      .eq('capture_id', captureId)
      .eq('user_id', userId);

    await supabase.rpc('decrement_likes', { p_capture_id: captureId });

    const { data } = await supabase
      .from('captures')
      .select('likes')
      .eq('id', captureId)
      .single();

    return { likes: data?.likes ?? 0, isLiked: false };
  } else {
    // Liker
    await supabase.from('capture_likes').insert({ capture_id: captureId, user_id: userId });
    await supabase.rpc('increment_likes', { p_capture_id: captureId });

    const { data } = await supabase
      .from('captures')
      .select('likes')
      .eq('id', captureId)
      .single();

    return { likes: data?.likes ?? 0, isLiked: true };
  }
}

// ─── Supprimer une capture ────────────────────────────────────────────────────

export async function deleteCapture(captureId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(400);
    mockFeed = mockFeed.filter((c) => c.id !== captureId);
    mockMine = mockMine.filter((c) => c.id !== captureId);
    return;
  }

  const { error } = await supabase.from('captures').delete().eq('id', captureId);
  if (error) throw error;
}

// ─── Helper : IDs des captures likées par l'utilisateur courant ───────────────

async function fetchLikedSet(userId: string | undefined, captureIds: string[]): Promise<Set<string>> {
  if (!userId || captureIds.length === 0) return new Set();

  const { data } = await supabase
    .from('capture_likes')
    .select('capture_id')
    .eq('user_id', userId)
    .in('capture_id', captureIds);

  return new Set((data ?? []).map((l: any) => l.capture_id));
}

// ─── Mapper une ligne Supabase → type Capture ─────────────────────────────────

function mapCapture(row: any, likedSet: Set<string> = new Set()): Capture {
  const photos = (row.capture_photos ?? [])
    .sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((p: any) => p.url);

  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    userAvatar: row.user_avatar ?? undefined,
    species: row.species_data ?? FISH_SPECIES.find((s) => s.id === row.species_id) ?? FISH_SPECIES[0],
    weightGrams: row.weight_grams,
    sizeCm: row.size_cm,
    photos,
    description: row.description ?? undefined,
    weather: row.weather ?? undefined,
    location: (row.latitude != null && row.longitude != null)
      ? { latitude: row.latitude, longitude: row.longitude }
      : undefined,
    locationName: row.location_name ?? undefined,
    publishedAt: row.published_at,
    isDraft: row.is_draft,
    validationScore: row.validation_score ?? 0,
    score: row.score ?? 0,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    isLiked: likedSet.has(row.id),
  };
}
