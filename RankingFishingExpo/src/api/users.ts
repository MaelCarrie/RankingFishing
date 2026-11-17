import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { User } from '../store/types';
import * as mockDb from './mock/db';
import { delay } from '../utils/helpers';

export interface UserSearchResult {
  id: string;
  username: string;
  avatar?: string;
  location?: string;
  level: number;
  levelName: string;
  isPremium: boolean;
  xp: number;
}

function mapUser(row: any): UserSearchResult {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar_url ?? undefined,
    location: row.location ?? undefined,
    level: row.level ?? 1,
    levelName: row.level_name ?? 'Novice',
    isPremium: row.is_premium ?? false,
    xp: row.xp ?? 0,
  };
}

export function userToSearchResult(u: User): UserSearchResult {
  return {
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    location: u.location || undefined,
    level: u.level,
    levelName: u.levelName,
    isPremium: u.isPremium,
    xp: u.xp,
  };
}

async function mockUsersByXp(): Promise<UserSearchResult[]> {
  const all = await mockDb.getAllUsers();
  return all.sort((a, b) => b.xp - a.xp).map(userToSearchResult);
}

const USER_COLUMNS = 'id, username, avatar_url, location, level, level_name, is_premium, xp';

// ─── Recherche d'utilisateurs par username (case-insensitive, substring) ──────

export async function searchUsers(query: string, limit = 20): Promise<UserSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (USE_MOCK_DATA) {
    await delay(200);
    const needle = q.toLowerCase();
    return (await mockUsersByXp())
      .filter((u) => u.username.toLowerCase().includes(needle))
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from('users')
    .select(USER_COLUMNS)
    .ilike('username', `%${q}%`)
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapUser);
}

// ─── Top pêcheurs (par XP) pour l'état vide de la recherche ───────────────────

export async function fetchTopUsers(limit = 10): Promise<UserSearchResult[]> {
  if (USE_MOCK_DATA) {
    await delay(200);
    return (await mockUsersByXp()).slice(0, limit);
  }

  const { data, error } = await supabase
    .from('users')
    .select(USER_COLUMNS)
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapUser);
}
