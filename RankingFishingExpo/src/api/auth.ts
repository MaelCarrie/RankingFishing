import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, FishingSpecialty } from '../store/types';
import { MOCK_CURRENT_USER } from './mock/data';
import { delay, generateId } from '../utils/helpers';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

const USER_STORAGE_KEY = '@rankingfishing_user';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  specialties?: string[];
}

// ─── Persistance locale ───────────────────────────────────────────────────────

export async function getStoredUser(): Promise<User | null> {
  try {
    const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

async function storeUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
}

// ─── Helper : récupérer le profil complet depuis Supabase ────────────────────

export async function refreshAndStoreUser(userId: string): Promise<User> {
  const user = await fetchUserProfile(userId);
  await storeUser(user);
  return user;
}

export async function fetchUserProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*, user_stats(*), user_specialties(*)')
    .eq('id', userId)
    .single();

  if (error) throw error;

  const specialties: FishingSpecialty[] = (data.user_specialties ?? []).map((s: any) => ({
    type: s.type,
    level: s.level,
  }));

  return {
    id: data.id,
    email: data.email,
    username: data.username,
    avatar: data.avatar_url ?? undefined,
    bio: data.bio ?? '',
    location: data.location ?? '',
    isPremium: data.is_premium ?? false,
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    levelName: data.level_name ?? 'Novice',
    specialties,
    stats: {
      totalCaptures: data.user_stats?.total_captures ?? 0,
      totalWeightGrams: data.user_stats?.total_weight_grams ?? 0,
      biggestFish: data.user_stats?.biggest_fish ?? null,
      globalRank: data.user_stats?.global_rank ?? null,
      regionalRank: data.user_stats?.regional_rank ?? null,
      challengesWon: data.user_stats?.challenges_won ?? 0,
    },
    createdAt: data.created_at,
  };
}

// ─── Connexion ────────────────────────────────────────────────────────────────

export async function signIn(credentials: AuthCredentials): Promise<User> {
  if (USE_MOCK_DATA) {
    await delay(800);
    const user = { ...MOCK_CURRENT_USER, email: credentials.email };
    await storeUser(user);
    return user;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) throw error;

  const user = await fetchUserProfile(data.user.id);
  await storeUser(user);
  return user;
}

// ─── Inscription ──────────────────────────────────────────────────────────────

export async function register(data: RegisterData): Promise<User> {
  if (USE_MOCK_DATA) {
    await delay(1000);
    const newUser: User = {
      ...MOCK_CURRENT_USER,
      id: generateId(),
      email: data.email,
      username: data.username,
      xp: 0,
      level: 1,
      levelName: 'Novice',
      specialties: (data.specialties ?? []).map((type) => ({
        type: type as any,
        level: 'beginner',
      })),
      stats: {
        totalCaptures: 0,
        totalWeightGrams: 0,
        biggestFish: null,
        globalRank: null,
        regionalRank: null,
        challengesWon: 0,
      },
      createdAt: new Date().toISOString(),
    };
    await storeUser(newUser);
    return newUser;
  }

  // 1. Créer le compte auth Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (authError) throw authError;
  const userId = authData.user!.id;

  // 2. Mettre à jour le profil créé par le trigger (username réel + champs complets)
  const { error: profileError } = await supabase.from('users').upsert({
    id: userId,
    email: data.email,
    username: data.username,
    xp: 0,
    level: 1,
    level_name: 'Novice',
    is_premium: false,
  }, { onConflict: 'id' });

  if (profileError) throw profileError;

  // 3. S'assurer que les stats existent (le trigger les crée, mais au cas où)
  await supabase.from('user_stats').upsert({ user_id: userId }, { onConflict: 'user_id' });

  // 4. Créer les spécialités si fournies
  if (data.specialties && data.specialties.length > 0) {
    await supabase.from('user_specialties').insert(
      data.specialties.map((type) => ({ user_id: userId, type, level: 'beginner' }))
    );
  }

  const newUser = await fetchUserProfile(userId);
  await storeUser(newUser);
  return newUser;
}

// ─── Déconnexion ─────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(300);
    await clearStoredUser();
    return;
  }

  await supabase.auth.signOut();
  await clearStoredUser();
}

// ─── Réinitialisation du mot de passe ────────────────────────────────────────

export async function resetPassword(email: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(800);
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
