import { Badge, BadgeCategory } from '../store/types';
import { mockCheckBadges, mockUnlockedSince } from './mock/rankingsExtra';
import { getUser as mockGetUser, patchUser as mockPatchUser } from './mock/db';
import { fetchMyCaptures } from './captures';
import { delay } from '../utils/helpers';
import { getLevelFromXP } from '../config/constants';
import { supabase, USE_MOCK_DATA } from '../config/supabase';

// Ordre d'affichage stable : catégorie, puis difficulté croissante, puis id.
const CATEGORY_ORDER: Record<BadgeCategory, number> = {
  progression: 0,
  excellence: 1,
  community: 2,
  seasonal: 3,
};

export function sortBadges(badges: Badge[]): Badge[] {
  return [...badges].sort((a, b) => {
    const ca = CATEGORY_ORDER[a.category] ?? 9;
    const cb = CATEGORY_ORDER[b.category] ?? 9;
    if (ca !== cb) return ca - cb;
    const ta = a.metric === 'global_rank' ? 0 : a.targetValue ?? 0;
    const tb = b.metric === 'global_rank' ? 0 : b.targetValue ?? 0;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

// ─── Mode mock ────────────────────────────────────────────────────────────────
// Équivalent de check_and_award_badges : progression calculée depuis les captures
// mock de l'utilisateur, déblocage horodaté une seule fois, XP créditée.
async function mockCheck(userId: string): Promise<Badge[]> {
  const captures = await fetchMyCaptures(userId);
  const { badges, awarded } = mockCheckBadges(userId, captures, new Date().toISOString());
  const xpGain = awarded.reduce((sum, b) => sum + (b.xpReward ?? 0), 0);
  if (xpGain > 0) {
    try {
      const u = await mockGetUser(userId);
      if (u) {
        const xp = (u.xp ?? 0) + xpGain;
        const lvl = getLevelFromXP(xp);
        // Le niveau ne redescend jamais (comme le SQL)
        const level = Math.max(u.level ?? 1, lvl.level);
        await mockPatchUser(userId, { xp, level, levelName: level === lvl.level ? lvl.name : u.levelName });
      }
    } catch {
      // non bloquant
    }
  }
  return badges;
}

function mapBadge(def: any, ub: any | null | undefined): Badge {
  const isUnlocked = ub?.is_unlocked ?? false;
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    tier: def.tier,
    xpReward: def.xp_reward ?? 0,
    target: def.target_label ?? '',
    progress: isUnlocked ? 100 : Math.max(0, Math.min(100, ub?.progress ?? 0)),
    isUnlocked,
    unlockedAt: ub?.unlocked_at ?? undefined,
    metric: def.target_metric ?? undefined,
    targetValue: def.target_value ?? undefined,
    targetSpecies: def.target_species ?? undefined,
    currentValue: ub?.current_value ?? null,
  };
}

/**
 * Toutes les définitions de badges + la progression de `userId`.
 * La progression est calculée côté serveur par check_and_award_badges.
 */
export async function fetchBadges(userId: string): Promise<Badge[]> {
  if (USE_MOCK_DATA) {
    await delay(150);
    return sortBadges(await mockCheck(userId));
  }

  // Deux requêtes simples plutôt qu'un embed filtré : plus robuste face à la RLS
  // et aux colonnes ajoutées par la migration (select('*')).
  const [defs, progress] = await Promise.all([
    supabase.from('badges').select('*'),
    supabase.from('user_badges').select('*').eq('user_id', userId),
  ]);
  if (defs.error) throw defs.error;
  if (progress.error) throw progress.error;

  const byBadge = new Map<string, any>();
  for (const row of progress.data ?? []) byBadge.set(row.badge_id, row);

  return sortBadges((defs.data ?? []).map((def) => mapBadge(def, byBadge.get(def.id))));
}

/**
 * Demande au serveur de recalculer les badges de l'utilisateur connecté
 * (RPC check_my_badges). Utile pour rafraîchir les progressions qui dépendent
 * du rang global. Renvoie les ids débloqués par cet appel. Ne lève jamais :
 * en cas d'échec (migration non appliquée, réseau), renvoie [].
 */
export async function refreshMyBadges(): Promise<string[]> {
  if (USE_MOCK_DATA) return [];
  try {
    const { data, error } = await supabase.rpc('check_my_badges');
    if (error) return [];
    return ((data as unknown[]) ?? []).filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

// Tolérance pour un décalage d'horloge entre le téléphone et le serveur.
const CLOCK_SKEW_MS = 2 * 60 * 1000;

/**
 * Badges débloqués par `userId` depuis `since` (inclus), du plus ancien au plus récent.
 *
 * À appeler juste après la publication d'une capture (non brouillon), avec
 * `since` = l'instant mesuré AVANT l'envoi de la publication. Le déblocage est
 * fait par le trigger SQL dans la même transaction que l'insert : les badges
 * sont donc disponibles dès le retour de la publication.
 *
 * Une marge de 2 min est appliquée à `since` (décalage d'horloge) ; le slice
 * badges dédoublonne ce qui a déjà été annoncé.
 *
 * Mode mock (compte démo, 47 captures) : publier un brochet de 8 kg ou plus
 * débloque « Chasseur de brochets » ; la 3e capture publiée de la session
 * débloque « Pêcheur assidu » (50 captures). Compte neuf : la 1re capture
 * débloque « Première prise ».
 */
export async function fetchNewlyUnlockedBadges(
  userId: string,
  since: string | Date
): Promise<Badge[]> {
  const sinceMs = (since instanceof Date ? since.getTime() : Date.parse(since)) - CLOCK_SKEW_MS;
  const safeSinceMs = Number.isNaN(sinceMs) ? Date.now() - CLOCK_SKEW_MS : sinceMs;

  if (USE_MOCK_DATA) {
    // Le trigger SQL n'existe pas en mock : la vérification est faite ici.
    const badges = await mockCheck(userId);
    return mockUnlockedSince(badges, safeSinceMs);
  }

  const sinceIso = new Date(safeSinceMs).toISOString();

  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badges(*)')
    .eq('user_id', userId)
    .eq('is_unlocked', true)
    .gte('unlocked_at', sinceIso)
    .order('unlocked_at', { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => row.badges)
    .map((row: any) => mapBadge(Array.isArray(row.badges) ? row.badges[0] : row.badges, row));
}
