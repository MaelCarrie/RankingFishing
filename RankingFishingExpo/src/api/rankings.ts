import { RankingEntry, RankingType, RankingPeriod } from '../store/types';
import { MOCK_RANKINGS_GLOBAL } from './mock/data';
import { delay } from '../utils/helpers';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

export interface RankingFilters {
  region?: string;
  species?: string;
}

export async function fetchRankings(
  type: RankingType,
  period: RankingPeriod,
  filters: RankingFilters = {}
): Promise<RankingEntry[]> {
  if (USE_MOCK_DATA) {
    await delay(500);
    const base = [...MOCK_RANKINGS_GLOBAL];

    if (type === 'friends') return base.slice(0, 6);
    if (type === 'regional') return base.slice(0, 8);
    return base;
  }

  // Régional : sans région connue pour l'utilisateur, aucun classement possible
  if (type === 'regional' && !filters.region) return [];
  // Par espèce : une espèce doit être sélectionnée
  if (type === 'species' && !filters.species) return [];

  let query = supabase
    .from('rankings')
    .select('*')
    .eq('type', type)
    .eq('period', period);

  if (type === 'regional') query = query.eq('region', filters.region!);
  if (type === 'species') query = query.eq('species', filters.species!);

  const { data, error } = await query.order('rank', { ascending: true }).limit(50);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    rank: row.rank,
    userId: row.user_id,
    username: row.username,
    avatar: row.avatar_url ?? undefined,
    score: row.score,
    totalCaptures: row.capture_count ?? 0,
    topSpecies: row.top_species ?? undefined,
    region: row.region ?? undefined,
    species: row.species || undefined,
    isCurrentUser: false, // résolu dans le thunk fetchRankings (comparaison user_id)
  }));
}
