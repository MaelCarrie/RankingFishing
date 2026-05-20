import { Badge } from '../store/types';
import { MOCK_BADGES } from './mock/data';
import { delay } from '../utils/helpers';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

export async function fetchBadges(userId: string): Promise<Badge[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return [...MOCK_BADGES];
  }

  // Récupérer toutes les définitions + la progression de cet utilisateur
  const { data, error } = await supabase
    .from('badges')
    .select('*, user_badges!left(progress, is_unlocked, unlocked_at)')
    .eq('user_badges.user_id', userId);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const ub = row.user_badges?.[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      category: row.category,
      tier: row.tier,
      xpReward: row.xp_reward ?? 0,
      target: row.target_label ?? '',
      progress: ub?.progress ?? 0,
      isUnlocked: ub?.is_unlocked ?? false,
      unlockedAt: ub?.unlocked_at ?? undefined,
    };
  });
}
