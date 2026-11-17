import { Capture, NewCaptureForm } from '../store/types';
import { MOCK_FEED_CAPTURES, MOCK_MY_CAPTURES } from './mock/data';
import { MOCK_EXTRA_FEED_CAPTURES } from './mock/capturesExtra';
import { delay, generateId } from '../utils/helpers'; // generateId utilisé uniquement en mode mock
import { captureWeightToGrams, parseDecimalFr } from '../utils/validation';
import { calculateCaptureScore, FISH_SPECIES } from '../config/constants';
import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { uploadCapturePhoto } from './storage';

// Mêmes objets que MOCK_MY_CAPTURES dans le feed → un like reste synchronisé
let mockFeed: Capture[] = [...MOCK_FEED_CAPTURES, ...MOCK_EXTRA_FEED_CAPTURES];
let mockMine: Capture[] = [...MOCK_MY_CAPTURES];

// ─── Pagination du feed par curseur (issue #18) ───────────────────────────────
//
// Le curseur encode (published_at, id) de la dernière capture reçue. Le tri est
// published_at desc puis id desc : le couple est unique, donc pas de doublon ni
// de trou quand deux captures partagent le même horodatage.

export const FEED_PAGE_SIZE = USE_MOCK_DATA ? 8 : 20;

export interface FeedPage {
  items: Capture[];
  nextCursor: string | null; // null = plus rien à charger
}

export function encodeFeedCursor(capture: Pick<Capture, 'publishedAt' | 'id'>): string {
  return `${capture.publishedAt}|${capture.id}`;
}

function decodeFeedCursor(cursor: string): { publishedAt: string; id: string } | null {
  const sep = cursor.lastIndexOf('|');
  if (sep <= 0) return null;
  return { publishedAt: cursor.slice(0, sep), id: cursor.slice(sep + 1) };
}

function compareFeedDesc(a: Capture, b: Capture): number {
  const diff = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  if (diff !== 0) return diff;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export async function fetchFeedPage(params: {
  userId?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<FeedPage> {
  const limit = params.limit ?? FEED_PAGE_SIZE;
  const cursor = params.cursor ? decodeFeedCursor(params.cursor) : null;

  if (USE_MOCK_DATA) {
    await delay(params.cursor ? 500 : 600);
    const sorted = mockFeed.filter((c) => !c.isDraft).sort(compareFeedDesc);
    let start = 0;
    if (cursor) {
      const cursorTime = new Date(cursor.publishedAt).getTime();
      start = sorted.findIndex((c) => {
        const t = new Date(c.publishedAt).getTime();
        return t < cursorTime || (t === cursorTime && c.id < cursor.id);
      });
      if (start === -1) start = sorted.length;
    }
    const items = sorted.slice(start, start + limit);
    const hasMore = start + limit < sorted.length;
    return {
      items,
      nextCursor: hasMore && items.length > 0 ? encodeFeedCursor(items[items.length - 1]) : null,
    };
  }

  let query = supabase
    .from('captures')
    .select('*, capture_photos(*)')
    .eq('is_draft', false)
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1); // +1 pour savoir s'il reste une page

  if (cursor) {
    // Valeurs entre guillemets : l'horodatage contient « : . + » réservés par PostgREST
    query = query.or(
      `published_at.lt."${cursor.publishedAt}",and(published_at.eq."${cursor.publishedAt}",id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const pageRows = rows.slice(0, limit);
  const likedSet = await fetchLikedSet(params.userId, pageRows.map((c) => c.id));
  const items = pageRows.map((row) => mapCapture(row, likedSet));
  return {
    items,
    nextCursor: rows.length > limit && items.length > 0 ? encodeFeedCursor(items[items.length - 1]) : null,
  };
}

// ─── Feed public (première page, conservé pour compatibilité) ─────────────────

export async function fetchFeed(userId?: string): Promise<Capture[]> {
  const page = await fetchFeedPage({ userId });
  return page.items;
}

// ─── Une capture par id (détail ouvert depuis un lien ou le chat) ─────────────

export async function fetchCaptureById(captureId: string, userId?: string): Promise<Capture | null> {
  if (USE_MOCK_DATA) {
    await delay(250);
    return mockFeed.find((c) => c.id === captureId) ?? mockMine.find((c) => c.id === captureId) ?? null;
  }

  const { data, error } = await supabase
    .from('captures')
    .select('*, capture_photos(*)')
    .eq('id', captureId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const likedSet = await fetchLikedSet(userId, [data.id]);
  return mapCapture(data, likedSet);
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
//
// Les photos de `form.photos` doivent déjà être compressées (src/utils/image.ts),
// ce que fait NewCaptureScreen avant de dispatcher.

export class PublishCaptureError extends Error {}

function computeFormNumbers(form: NewCaptureForm) {
  if (!form.species) throw new PublishCaptureError('Choisis une espèce avant de publier.');
  const weightGrams = captureWeightToGrams(form.weightKg, form.weightGrams);
  if (!weightGrams) throw new PublishCaptureError('Le poids de la prise est invalide.');
  const sizeCm = parseDecimalFr(form.sizeCm) ?? 0;
  return { species: form.species, weightGrams, sizeCm };
}

export async function publishCapture(
  userId: string,
  form: NewCaptureForm,
  username: string,
  userAvatar?: string
): Promise<Capture> {
  const { species, weightGrams, sizeCm } = computeFormNumbers(form);
  const score = calculateCaptureScore(weightGrams, species);
  const caughtAt = form.publishedAt || new Date().toISOString();

  if (USE_MOCK_DATA) {
    await delay(1000);
    const newCapture: Capture = {
      id: generateId(),
      userId,
      username,
      userAvatar,
      species,
      weightGrams,
      sizeCm,
      photos: form.photos.length > 0 ? form.photos : [],
      description: form.description.trim() || undefined,
      weather: form.weather ?? undefined,
      location: form.location,
      locationName: form.locationName,
      publishedAt: new Date().toISOString(),
      caughtAt,
      isDraft: form.isDraft,
      validationScore: 0,
      score,
      likes: 0,
      comments: 0,
      isLiked: false,
    };

    if (!form.isDraft) mockFeed.unshift(newCapture);
    mockMine.unshift(newCapture);
    return newCapture;
  }

  // 1. Insérer la capture — Supabase génère l'UUID
  const row: Record<string, unknown> = {
    user_id: userId,
    username,
    user_avatar: userAvatar ?? null,
    species_id: species.id,
    species_data: species,
    weight_grams: weightGrams,
    size_cm: sizeCm > 0 ? sizeCm : null,
    description: form.description.trim() || null,
    weather: form.weather ?? null,
    latitude: form.location?.latitude ?? null,
    longitude: form.location?.longitude ?? null,
    location_name: form.locationName ?? null,
    caught_at: caughtAt,
    is_draft: form.isDraft,
    score,
    validation_score: 0,
    likes: 0,
    comments: 0,
  };

  let { data: capture, error: captureError } = await supabase.from('captures').insert(row).select().single();

  // Migration 20261117 pas encore appliquée : colonne caught_at absente → on réessaie sans
  if (captureError && (captureError.code === 'PGRST204' || /caught_at/.test(captureError.message ?? ''))) {
    delete row.caught_at;
    ({ data: capture, error: captureError } = await supabase.from('captures').insert(row).select().single());
  }

  if (captureError || !capture) throw captureError ?? new PublishCaptureError('Publication impossible.');
  const captureId: string = capture.id;

  // 2. Upload des photos et insertion dans capture_photos.
  //    En cas d'échec, on supprime la capture pour ne pas laisser une prise sans photo.
  const photoUrls: string[] = [];
  try {
    for (let i = 0; i < form.photos.length; i++) {
      const url = await uploadCapturePhoto(userId, captureId, form.photos[i]);
      photoUrls.push(url);
      const { error: photoError } = await supabase
        .from('capture_photos')
        .insert({ capture_id: captureId, url, sort_order: i });
      if (photoError) throw photoError;
    }
  } catch (e) {
    await supabase.from('captures').delete().eq('id', captureId);
    throw new PublishCaptureError(
      "Les photos n'ont pas pu être envoyées. Vérifie ta connexion puis réessaie : ta saisie est conservée."
    );
  }

  return {
    ...mapCapture({ ...capture, capture_photos: [] }),
    photos: photoUrls,
    species,
    caughtAt: capture.caught_at ?? caughtAt,
  };
}

// ─── Toggle like ──────────────────────────────────────────────────────────────

export async function toggleLike(
  captureId: string,
  userId: string
): Promise<{ likes: number; isLiked: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(200);
    // Les objets peuvent être gelés par Immer (partagés avec le store) :
    // on remplace l'entrée par une copie au lieu de la muter.
    const list = mockFeed.some((c) => c.id === captureId) ? mockFeed : mockMine;
    const i = list.findIndex((c) => c.id === captureId);
    if (i < 0) throw new Error('Capture introuvable');
    const prev = list[i];
    const isLiked = !prev.isLiked;
    const likes = Math.max(0, prev.likes + (isLiked ? 1 : -1));
    list[i] = { ...prev, isLiked, likes };
    // Garder l'autre liste cohérente si la capture y figure aussi
    const other = list === mockFeed ? mockMine : mockFeed;
    const j = other.findIndex((c) => c.id === captureId);
    if (j >= 0) other[j] = { ...other[j], isLiked, likes };
    return { likes, isLiked };
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
    caughtAt: row.caught_at ?? undefined,
    isDraft: row.is_draft,
    validationScore: row.validation_score ?? 0,
    score: row.score ?? 0,
    likes: row.likes ?? 0,
    comments: row.comments ?? 0,
    isLiked: likedSet.has(row.id),
  };
}
