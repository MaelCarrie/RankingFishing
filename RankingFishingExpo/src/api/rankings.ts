import { RankingEntry, RankingType, RankingPeriod } from '../store/types';
import { mockFullRanking } from './mock/rankingsExtra';
import { delay } from '../utils/helpers';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

// Taille des listes affichées (cahier des charges : top 100 mondial, top 50 régional).
export const RANKING_LIMITS: Record<RankingType, number> = {
  global: 100,
  regional: 50,
  species: 50,
  friends: 200, // cercle d'amis : liste complète, bornée par sécurité
};

export interface RankingFilters {
  region?: string;
  species?: string;
}

export interface RankingViewer {
  id: string;
  username: string;
  avatar?: string;
  region?: string;
}

export interface RankingBoardOptions extends RankingFilters {
  /** Utilisateur connecté : sert à marquer sa ligne et à la récupérer hors du top. */
  currentUser?: RankingViewer | null;
}

export interface RankingBoard {
  /** Top N trié de façon déterministe (rang asc, puis user_id). */
  entries: RankingEntry[];
  /** Ligne de l'utilisateur connecté, qu'il soit dans le top ou non (null = pas classé). */
  currentUser: RankingEntry | null;
  /** true si `currentUser` fait partie de `entries` (sinon à épingler en bas). */
  isCurrentUserInList: boolean;
  /** Taille max de la liste demandée. */
  limit: number;
}

const RANKING_COLS =
  'user_id, username, avatar_url, score, capture_count, top_species, species, region, level, rank';

function mapRow(row: any, currentUserId?: string): RankingEntry {
  return {
    rank: row.rank,
    userId: row.user_id,
    username: row.username,
    avatar: row.avatar_url ?? undefined,
    score: row.score ?? 0,
    totalCaptures: row.capture_count ?? 0,
    topSpecies: row.top_species ?? undefined,
    region: row.region ?? undefined,
    species: row.species || undefined,
    level: row.level ?? undefined,
    isCurrentUser: !!currentUserId && row.user_id === currentUserId,
  };
}

// Tri défensif et total : rang asc puis user_id asc (les rangs calculés par
// l'Edge Function sont déjà uniques et déterministes — issue #34).
function sortEntries(entries: RankingEntry[]): RankingEntry[] {
  return [...entries].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  });
}

function buildBoard(entries: RankingEntry[], me: RankingEntry | null, limit: number): RankingBoard {
  const inList = !!me && entries.some((e) => e.userId === me.userId);
  return { entries, currentUser: me, isCurrentUserInList: inList, limit };
}

const EMPTY = (limit: number): RankingBoard => ({
  entries: [],
  currentUser: null,
  isCurrentUserInList: false,
  limit,
});

/**
 * Classement complet pour l'écran : top N + ligne de l'utilisateur connecté.
 * - global   : top 100, toutes régions
 * - regional : top 50 de `region` (région normalisée du profil) ; vide sans région
 * - species  : top 50 pour `species` (id d'espèce)
 * - friends  : l'utilisateur + les personnes qu'il suit (table follows), re-classés
 *              entre eux dans l'ordre du classement global de la période
 */
export async function fetchRankingBoard(
  type: RankingType,
  period: RankingPeriod,
  options: RankingBoardOptions = {}
): Promise<RankingBoard> {
  const limit = RANKING_LIMITS[type];
  const me = options.currentUser ?? null;

  if (type === 'regional' && !options.region) return EMPTY(limit);
  if (type === 'species' && !options.species) return EMPTY(limit);

  if (USE_MOCK_DATA) {
    await delay(300);
    const full = mockFullRanking(type, period, {
      region: options.region,
      species: options.species,
      currentUser: me ?? undefined,
    });
    const entries = full.slice(0, limit);
    const mine = full.find((e) => e.isCurrentUser) ?? null;
    return buildBoard(entries, mine, limit);
  }

  if (type === 'friends') {
    if (!me) return EMPTY(limit);

    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', me.id)
      .limit(limit);
    if (followsError) throw followsError;

    const ids = [me.id, ...(follows ?? []).map((f: any) => f.followed_id as string)];

    const { data, error } = await supabase
      .from('rankings')
      .select(RANKING_COLS)
      .eq('type', 'global')
      .eq('period', period)
      .in('user_id', ids)
      .order('rank', { ascending: true })
      .order('user_id', { ascending: true })
      .limit(limit);
    if (error) throw error;

    // Re-classement 1..n dans le cercle, en gardant l'ordre global (déterministe).
    const entries = sortEntries((data ?? []).map((r) => mapRow(r, me.id))).map((e, i) => ({
      ...e,
      rank: i + 1,
    }));
    const mine = entries.find((e) => e.isCurrentUser) ?? null;
    return buildBoard(entries, mine, limit);
  }

  const applyFilters = (q: any) => {
    let query = q.eq('type', type).eq('period', period);
    if (type === 'regional') query = query.eq('region', options.region!);
    if (type === 'species') query = query.eq('species', options.species!);
    return query;
  };

  const { data, error } = await applyFilters(supabase.from('rankings').select(RANKING_COLS))
    .order('rank', { ascending: true })
    .order('user_id', { ascending: true })
    .limit(limit);
  if (error) throw error;

  const entries = sortEntries(((data as any[]) ?? []).map((r) => mapRow(r, me?.id)));
  let mine = entries.find((e) => e.isCurrentUser) ?? null;

  // Hors du top affiché : on va chercher sa propre ligne pour l'épingler en bas.
  if (!mine && me) {
    const { data: own, error: ownError } = await applyFilters(
      supabase.from('rankings').select(RANKING_COLS)
    )
      .eq('user_id', me.id)
      .maybeSingle();
    if (ownError) throw ownError;
    if (own) mine = mapRow(own, me.id);
  }

  return buildBoard(entries, mine, limit);
}

/**
 * Compatibilité : renvoie uniquement la liste (top N).
 * Préférer fetchRankingBoard, qui fournit aussi la ligne de l'utilisateur.
 */
export async function fetchRankings(
  type: RankingType,
  period: RankingPeriod,
  filters: RankingFilters & { currentUser?: RankingViewer | null } = {}
): Promise<RankingEntry[]> {
  const board = await fetchRankingBoard(type, period, filters);
  return board.entries;
}
