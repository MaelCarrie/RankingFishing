// ─── Paramètres du profil (issue #30) ────────────────────────────────────────
//
// Complète src/api/auth.ts (possédé par un autre agent) : avatar, spécialités,
// liste d'attente Premium et suppression du compte.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FishingSpecialty, User } from '../store/types';
import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { delay } from '../utils/helpers';
import { compressImage } from '../utils/image';
import { refreshAndStoreUser, signOut } from './auth';
import { uploadAvatar } from './storage';
import * as mockDb from './mock/db';

export interface ProfileUpdate {
  bio?: string;
  location?: string;
  region?: string | null;
  /** URI locale d'une nouvelle photo (image-picker) ; undefined = inchangée */
  avatarLocalUri?: string;
  /** Liste complète des spécialités ; undefined = inchangées */
  specialties?: FishingSpecialty[];
}

export const BIO_MAX_LENGTH = 160;
export const LOCATION_MAX_LENGTH = 60;

async function storeMockUser(user: User): Promise<void> {
  try {
    await AsyncStorage.setItem(mockDb.USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // stockage indisponible (navigation privée) : l'état Redux reste à jour
  }
}

export async function updateMyProfile(userId: string, update: ProfileUpdate): Promise<User> {
  if (USE_MOCK_DATA) {
    await delay(500);
    const fields: Partial<User> = {};
    if (update.bio !== undefined) fields.bio = update.bio.trim();
    if (update.location !== undefined) fields.location = update.location.trim();
    if (update.region !== undefined) fields.region = update.region ?? undefined;
    if (update.avatarLocalUri) fields.avatar = update.avatarLocalUri;
    if (update.specialties) fields.specialties = update.specialties;
    const updated = await mockDb.patchUser(userId, fields);
    if (!updated) throw new Error('Utilisateur introuvable');
    await storeMockUser(updated);
    return updated;
  }

  const fields: Record<string, unknown> = {};
  if (update.bio !== undefined) fields.bio = update.bio.trim().slice(0, BIO_MAX_LENGTH);
  if (update.location !== undefined) fields.location = update.location.trim().slice(0, LOCATION_MAX_LENGTH);
  if (update.region !== undefined) fields.region = update.region;

  if (update.avatarLocalUri) {
    // Avatar affiché en petit : 512 px suffisent largement
    const { uri } = await compressImage(update.avatarLocalUri, { maxDimension: 512, quality: 0.8 });
    const publicUrl = await uploadAvatar(userId, uri);
    // Même chemin de fichier à chaque upload : on casse le cache des <Image>
    fields.avatar_url = `${publicUrl}?v=${Date.now()}`;
  }

  if (Object.keys(fields).length > 0) {
    const { error } = await supabase.from('users').update(fields).eq('id', userId);
    if (error) throw error;
  }

  if (update.specialties) {
    const { error: delError } = await supabase.from('user_specialties').delete().eq('user_id', userId);
    if (delError) throw delError;
    if (update.specialties.length > 0) {
      const { error: insError } = await supabase
        .from('user_specialties')
        .insert(update.specialties.map((s) => ({ user_id: userId, type: s.type, level: s.level })));
      if (insError) throw insError;
    }
  }

  return refreshAndStoreUser(userId);
}

// ─── Liste d'attente Premium (issue #32) ──────────────────────────────────────
//
// Le paiement (#22) n'est pas intégré : on enregistre seulement l'intérêt.
// Table premium_waitlist créée par la migration 20261117_captures_settings.sql.

const WAITLIST_LOCAL_KEY = '@rankingfishing_premium_waitlist';

export async function isOnPremiumWaitlist(userId: string): Promise<boolean> {
  try {
    if ((await AsyncStorage.getItem(WAITLIST_LOCAL_KEY)) === userId) return true;
  } catch {
    // ignore
  }
  if (USE_MOCK_DATA) return false;

  const { data, error } = await supabase
    .from('premium_waitlist')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) return false; // table absente : on considère « pas inscrit »
  return !!data;
}

export async function joinPremiumWaitlist(userId: string, email: string): Promise<void> {
  if (!USE_MOCK_DATA) {
    const { error } = await supabase
      .from('premium_waitlist')
      .upsert({ user_id: userId, email }, { onConflict: 'user_id' });
    if (error) throw error;
  } else {
    await delay(400);
  }
  try {
    await AsyncStorage.setItem(WAITLIST_LOCAL_KEY, userId);
  } catch {
    // ignore
  }
}

// ─── Suppression du compte (RGPD) ─────────────────────────────────────────────
//
// 1. Best effort : suppression des fichiers Storage de l'utilisateur (le SQL ne
//    peut pas effacer les objets Storage proprement).
// 2. RPC delete_my_account (SECURITY DEFINER) : supprime auth.users → cascade.
// 3. Déconnexion locale.

async function removeStorageFolder(bucket: string, userId: string): Promise<void> {
  const { data: entries } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
  if (!entries || entries.length === 0) return;

  const paths: string[] = [];
  for (const entry of entries) {
    // Un « dossier » Storage n'a pas d'id
    if (entry.id) {
      paths.push(`${userId}/${entry.name}`);
    } else {
      const { data: files } = await supabase.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 });
      for (const f of files ?? []) paths.push(`${userId}/${entry.name}/${f.name}`);
    }
  }
  if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
}

export async function deleteMyAccount(userId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(600);
    await signOut();
    return;
  }

  try {
    await removeStorageFolder('avatars', userId);
    await removeStorageFolder('captures', userId);
  } catch {
    // Les fichiers orphelins ne doivent pas bloquer la suppression du compte
  }

  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;

  try {
    await signOut();
  } catch {
    // La session n'existe plus côté serveur : seul le nettoyage local compte
  }
}
