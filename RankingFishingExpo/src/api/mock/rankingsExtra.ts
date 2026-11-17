// ─── Mock déterministe : classements (global / régional / espèce / amis) et badges ───
//
// Utilisé quand USE_MOCK_DATA est vrai (EXPO_PUBLIC_USE_MOCK=1, tests Playwright).
// Aligné sur ./data.ts (pêcheurs, régions, scores, captures du compte démo) et
// sur ./db.ts (graphe d'abonnements vivant pour l'onglet « Amis »).
//
// Aucune valeur aléatoire ni dépendance à Date.now() dans les classements :
// deux appels identiques renvoient exactement la même chose.

import { Badge, Capture, RankingEntry, RankingPeriod, RankingType } from '../../store/types';
import { FISH_SPECIES, FR_REGIONS } from '../../config/constants';
import { MOCK_ALL_USERS, MOCK_BADGES, MOCK_CURRENT_USER, MOCK_MY_CAPTURES, MOCK_RANKINGS_GLOBAL } from './data';
import { follows } from './db';

// ─── Utilitaires ──────────────────────────────────────────────────────────────

// Hash FNV-1a 32 bits : stable d'une exécution à l'autre.
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const DAY_MS = 86400000;
const BASE_DATE_MS = Date.UTC(2024, 0, 1); // constante : pas de Date.now()

function isoFromOffset(days: number): string {
  return new Date(BASE_DATE_MS + days * DAY_MS).toISOString();
}

// ─── Joueurs simulés ──────────────────────────────────────────────────────────

interface MockPlayer {
  userId: string;
  username: string;
  avatar?: string;
  region: string;
  level: number;
  alltimeScore: number;
  totalCaptures: number;
  topSpecies: string;
  firstCaptureAt: string;
  // Scores fixés explicitement (sinon dérivés du hash)
  periodScores?: Partial<Record<RankingPeriod, number>>;
  speciesScores?: Record<string, number>;
}

export const MOCK_CURRENT_USER_ID = MOCK_CURRENT_USER.id;

// Régions métropolitaines (les 13 premières de FR_REGIONS)
const METRO_REGIONS = FR_REGIONS.slice(0, 13);

const NAME_A = ['Carpiste', 'Brochet', 'Sandre', 'Truite', 'Silure', 'Perche', 'Bass', 'Gardon', 'Bar', 'Aspe'];
const NAME_B = ['Breton', 'Normand', 'DuLac', 'Nocturne', 'Alpin', 'Sauvage', 'Pro', 'Libre', 'Matinal', 'Rhodanien'];

// Compte démo (PierreM) : scores fixés pour couvrir les deux cas d'affichage —
// dans le top (jour, semaine, mois, total : 12e mondial, 2e en Bretagne comme
// dans MOCK_CURRENT_USER.stats) et hors top 100 (année → ligne épinglée).
const DEMO_PERIOD_SCORES: Record<RankingPeriod, number> = {
  day: 48,
  week: 150,
  month: 260,
  year: 395,
  alltime: 1412,
};
const DEMO_SPECIES_SCORES: Record<string, number> = { carp: 520, pike: 160, zander: 120 };

// Pêcheurs nommés de data.ts (dont le compte démo), avec leurs vraies régions.
function namedPlayers(): MockPlayer[] {
  return MOCK_RANKINGS_GLOBAL.map((e) => {
    const u = MOCK_ALL_USERS.find((x) => x.id === e.userId);
    const isDemo = e.userId === MOCK_CURRENT_USER_ID;
    return {
      userId: e.userId,
      username: u?.username ?? e.username,
      avatar: u?.avatar ?? e.avatar,
      region: u?.region ?? e.region ?? '',
      level: u?.level ?? 1,
      alltimeScore: e.score,
      totalCaptures: u?.stats.totalCaptures ?? e.totalCaptures,
      topSpecies: e.topSpecies ?? 'Carpe',
      firstCaptureAt: u?.createdAt ?? isoFromOffset(hash(e.userId) % 300),
      periodScores: isDemo ? DEMO_PERIOD_SCORES : undefined,
      speciesScores: isDemo ? DEMO_SPECIES_SCORES : undefined,
    };
  });
}

// 360 pêcheurs générés, tous sous le dernier pêcheur nommé en all-time (le démo,
// 1412 pts) : le top 12 all-time et le 2e rang breton de data.ts sont préservés.
function generatedPlayers(): MockPlayer[] {
  const players: MockPlayer[] = [];
  const TOTAL = 360;
  const TOP = 1390;
  const BOTTOM = 30;
  const scoreAt = (n: number) => TOP - Math.round((n * (TOP - BOTTOM)) / TOTAL);

  for (let n = 1; n <= TOTAL; n++) {
    const id = `mock_gen_${String(n).padStart(3, '0')}`;
    let score = scoreAt(n);
    let firstOffset = hash(id) % 600;
    // Égalités volontaires pour illustrer le départage déterministe (issue #34) :
    //  - 040 / 041 : même score, départagés par la date de première capture
    //  - 060 / 061 : même score ET même date, départagés par user_id
    if (n === 41) score = scoreAt(40);
    if (n === 61) score = scoreAt(60);
    if (n === 40) firstOffset = 200;
    if (n === 41) firstOffset = 100;
    if (n === 60 || n === 61) firstOffset = 150;

    const species = FISH_SPECIES[hash(`${id}:top`) % FISH_SPECIES.length];
    players.push({
      userId: id,
      username: `${NAME_A[n % NAME_A.length]}${NAME_B[Math.floor(n / NAME_A.length) % NAME_B.length]}${n}`,
      avatar: `https://i.pravatar.cc/150?u=${id}`,
      region: METRO_REGIONS[hash(`${id}:region`) % METRO_REGIONS.length],
      level: 1 + (hash(`${id}:level`) % 6),
      alltimeScore: score,
      totalCaptures: 5 + (hash(`${id}:count`) % 180),
      topSpecies: species.nameFr,
      firstCaptureAt: isoFromOffset(firstOffset),
    });
  }
  return players;
}

const PLAYERS: MockPlayer[] = [...namedPlayers(), ...generatedPlayers()];

const PERIOD_FACTOR: Record<RankingPeriod, number> = {
  day: 0.02,
  week: 0.08,
  month: 0.25,
  year: 0.7,
  alltime: 1,
};

// Un joueur n'a pas forcément pêché sur une fenêtre courte.
function isActive(p: MockPlayer, period: RankingPeriod): boolean {
  if (p.periodScores) return (p.periodScores[period] ?? 0) > 0;
  const h = hash(`${p.userId}:${period}`);
  switch (period) {
    case 'day': return h % 4 === 0;
    case 'week': return h % 2 === 0;
    case 'month': return h % 3 !== 0;
    case 'year': return h % 10 !== 0;
    default: return true;
  }
}

function periodScore(p: MockPlayer, period: RankingPeriod): number {
  if (p.periodScores?.[period] !== undefined) return p.periodScores[period]!;
  if (period === 'alltime') return p.alltimeScore;
  const jitter = 0.5 + (hash(`${p.userId}:${period}:s`) % 1000) / 1000;
  return Math.max(1, Math.round(p.alltimeScore * PERIOD_FACTOR[period] * jitter));
}

function speciesScore(p: MockPlayer, speciesId: string, period: RankingPeriod): number {
  if (p.speciesScores) {
    const base = p.speciesScores[speciesId] ?? 0;
    return period === 'alltime' ? base : Math.round(base * Math.min(1, PERIOD_FACTOR[period] * 4));
  }
  const sp = FISH_SPECIES.find((s) => s.id === speciesId);
  const fishesIt = (sp && sp.nameFr === p.topSpecies) || hash(`${p.userId}:${speciesId}`) % 3 === 0;
  if (!fishesIt || !isActive(p, period)) return 0;
  const share = 0.2 + (hash(`${p.userId}:${speciesId}:share`) % 500) / 1000;
  return Math.max(1, Math.round(periodScore(p, period) * share));
}

interface Scored {
  player: MockPlayer;
  score: number;
}

// Même règle que l'Edge Function : score desc, première capture asc, user_id asc.
function compareScored(a: Scored, b: Scored): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.player.firstCaptureAt !== b.player.firstCaptureAt) {
    return a.player.firstCaptureAt < b.player.firstCaptureAt ? -1 : 1;
  }
  return a.player.userId < b.player.userId ? -1 : a.player.userId > b.player.userId ? 1 : 0;
}

/**
 * Rang précédent (mock uniquement) : classement du même groupe sur le score d'avant
 * les gains récents (0 à 10 % du score, dérivés du hash). Un joueur dont le score
 * précédent est nul n'était pas classé : `previousRank` vaut alors null.
 * La vue `rankings` de production ne fournit pas cette donnée : rien n'y est affiché.
 */
function previousRanks(scored: Scored[], speciesId?: string): Map<string, number> {
  const before = scored
    .map((s) => {
      const gain = Math.round((s.score * (hash(`${s.player.userId}:${speciesId ?? ''}:gain`) % 101)) / 1000);
      return { player: s.player, score: s.score - gain };
    })
    .filter((s) => s.score > 0)
    .sort(compareScored);
  return new Map(before.map((s, i) => [s.player.userId, i + 1]));
}

function toEntries(scored: Scored[], currentUserId: string | undefined, speciesId?: string): RankingEntry[] {
  const sp = speciesId ? FISH_SPECIES.find((f) => f.id === speciesId) : undefined;
  const prev = previousRanks(scored.filter((s) => s.score > 0), speciesId);
  return [...scored]
    .filter((s) => s.score > 0)
    .sort(compareScored)
    .map((s, i) => ({
      rank: i + 1,
      userId: s.player.userId,
      username: s.player.username,
      avatar: s.player.avatar,
      score: s.score,
      totalCaptures: speciesId
        ? Math.max(1, Math.round(s.player.totalCaptures / 4))
        : s.player.totalCaptures,
      topSpecies: sp?.nameFr ?? s.player.topSpecies,
      region: s.player.region || undefined,
      species: speciesId,
      level: s.player.level,
      isCurrentUser: !!currentUserId && s.player.userId === currentUserId,
      previousRank: prev.get(s.player.userId) ?? null,
    }));
}

// ─── API mock : classements ───────────────────────────────────────────────────

export interface MockRankingUser {
  id: string;
  username: string;
  avatar?: string;
  region?: string;
}

export interface MockRankingFilters {
  region?: string;
  species?: string;
  currentUser?: MockRankingUser;
}

/** Abonnements actuels de `userId` (graphe vivant de db.ts : suivre / ne plus suivre se reflète). */
export function mockFollowingIds(userId: string): string[] {
  return follows.filter((f) => f.followerId === userId).map((f) => f.followedId);
}

/**
 * Classement complet (non tronqué) pour un type et une période.
 * Le découpage top N + ligne épinglée est fait par l'appelant (src/api/rankings.ts).
 *
 * - Le compte démo (user_me) a des scores fixes ; un compte inscrit en session
 *   n'est pas classé (aucune capture dans le jeu de données) : l'écran affiche
 *   alors « Tu n'es pas encore classé ».
 * - Le classement régional suit la région du profil connecté (filters.region).
 */
export function mockFullRanking(
  type: RankingType,
  period: RankingPeriod,
  filters: MockRankingFilters
): RankingEntry[] {
  const meId = filters.currentUser?.id;
  // Pseudo / avatar / région du profil connecté (peuvent avoir été modifiés en session)
  const all = PLAYERS.map((p) =>
    p.userId === meId && filters.currentUser
      ? {
          ...p,
          username: filters.currentUser.username || p.username,
          avatar: filters.currentUser.avatar ?? p.avatar,
          region: filters.currentUser.region ?? p.region,
        }
      : p
  );

  if (type === 'species') {
    const speciesId = filters.species;
    if (!speciesId) return [];
    return toEntries(
      all.map((p) => ({ player: p, score: speciesScore(p, speciesId, period) })),
      meId,
      speciesId
    );
  }

  let pool = all;
  if (type === 'regional') {
    if (!filters.region) return [];
    pool = all.filter((p) => p.region === filters.region);
  } else if (type === 'friends') {
    if (!meId) return [];
    const ids = new Set([meId, ...mockFollowingIds(meId)]);
    pool = all.filter((p) => ids.has(p.userId));
  }

  return toEntries(
    pool.filter((p) => isActive(p, period)).map((p) => ({ player: p, score: periodScore(p, period) })),
    meId
  );
}

/** Rang global all-time de `userId` (null = non classé). */
function mockGlobalRank(userId: string): number | null {
  const entry = mockFullRanking('global', 'alltime', { currentUser: { id: userId, username: '' } }).find(
    (e) => e.userId === userId
  );
  return entry?.rank ?? null;
}

// ─── API mock : badges ────────────────────────────────────────────────────────
//
// Reproduit check_and_award_badges (migration 20261117_rankings_badges.sql) :
// mêmes critères, même formule de progression, déblocage définitif et horodaté.

// Critères identiques au seed SQL (seed_data.sql) + target_species de la migration.
export const MOCK_BADGE_CRITERIA: Record<string, { metric: string; targetValue: number; targetSpecies?: string }> = {
  badge_first_catch: { metric: 'total_captures', targetValue: 1 },
  badge_10_catches: { metric: 'total_captures', targetValue: 10 },
  badge_50_catches: { metric: 'total_captures', targetValue: 50 },
  badge_100_catches: { metric: 'total_captures', targetValue: 100 },
  badge_big_carp: { metric: 'species_weight', targetValue: 15000, targetSpecies: 'carp' },
  badge_big_pike: { metric: 'species_weight', targetValue: 8000, targetSpecies: 'pike' },
  badge_top100: { metric: 'global_rank', targetValue: 100 },
  badge_validator: { metric: 'validations', targetValue: 20 },
  badge_spring: { metric: 'seasonal_captures', targetValue: 5 },
};

// Historique du compte démo antérieur aux captures listées dans MOCK_MY_CAPTURES
// (cohérent avec MOCK_CURRENT_USER.stats et la progression de MOCK_BADGES).
const DEMO_BASE = {
  totalCaptures: MOCK_CURRENT_USER.stats.totalCaptures, // 47 (inclut MOCK_MY_CAPTURES publiées)
  validations: 20,
  springCaptures: 3,
};
const DEMO_SEED_IDS = new Set(MOCK_MY_CAPTURES.map((c) => c.id));

interface BadgeStats {
  totalCaptures: number;
  biggest: Record<string, number>;
  globalRank: number | null;
  validations: number;
  springCaptures: number;
}

// Mois de mars à mai (heure de Paris, comme le SQL : published_at).
function isSpring(iso: string): boolean {
  const month = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', month: 'numeric' }).format(new Date(iso))
  );
  return month >= 3 && month <= 5;
}

function statsFor(userId: string, captures: Capture[]): BadgeStats {
  const isDemo = userId === MOCK_CURRENT_USER_ID;
  const published = captures.filter((c) => c.userId === userId && !c.isDraft);
  // Captures publiées pendant la session (les captures seed sont déjà dans DEMO_BASE)
  const fresh = isDemo ? published.filter((c) => !DEMO_SEED_IDS.has(c.id)) : published;

  const biggest: Record<string, number> = {};
  for (const c of published) {
    const sid = c.species?.id;
    if (sid) biggest[sid] = Math.max(biggest[sid] ?? 0, c.weightGrams);
  }

  return {
    totalCaptures: (isDemo ? DEMO_BASE.totalCaptures : 0) + fresh.length,
    biggest,
    globalRank: mockGlobalRank(userId),
    validations: isDemo ? DEMO_BASE.validations : 0,
    springCaptures:
      (isDemo ? DEMO_BASE.springCaptures : 0) + fresh.filter((c) => isSpring(c.publishedAt)).length,
  };
}

function metricValue(stats: BadgeStats, metric: string, targetSpecies?: string): number | null {
  switch (metric) {
    case 'total_captures': return stats.totalCaptures;
    case 'species_weight': return targetSpecies ? stats.biggest[targetSpecies] ?? 0 : 0;
    case 'global_rank': return stats.globalRank;
    case 'validations': return stats.validations;
    case 'seasonal_captures': return stats.springCaptures;
    default: return 0;
  }
}

// Même formule de progression que check_and_award_badges (SQL).
function evaluate(metric: string, target: number, value: number | null): { unlocked: boolean; progress: number } {
  if (metric === 'global_rank') {
    const unlocked = value !== null && value > 0 && value <= target;
    const progress = unlocked ? 100 : value === null || value <= 0 ? 0 : Math.min(99, Math.floor((100 * target) / value));
    return { unlocked, progress };
  }
  const v = value ?? 0;
  const unlocked = v >= target;
  const progress = unlocked ? 100 : target <= 0 ? 0 : Math.min(99, Math.floor((100 * v) / target));
  return { unlocked, progress };
}

// Déblocages enregistrés par utilisateur : badgeId → unlocked_at (équivalent de user_badges).
const unlockedByUser = new Map<string, Record<string, string>>();

function unlockedFor(userId: string): Record<string, string> {
  let rec = unlockedByUser.get(userId);
  if (!rec) {
    rec = {};
    if (userId === MOCK_CURRENT_USER_ID) {
      for (const b of MOCK_BADGES) if (b.isUnlocked && b.unlockedAt) rec[b.id] = b.unlockedAt;
    }
    unlockedByUser.set(userId, rec);
  }
  return rec;
}

/** Réinitialise l'état des badges mock (tests). */
export function resetMockBadgesState() {
  unlockedByUser.clear();
}

export interface MockBadgeCheck {
  badges: Badge[];
  /** Badges débloqués par CET appel (pour le crédit d'XP côté appelant). */
  awarded: Badge[];
}

/**
 * Équivalent mock de check_and_award_badges(p_user) : recalcule la progression
 * de tous les badges à partir des captures de l'utilisateur, enregistre (une
 * seule fois, horodatés) ceux qui sont atteints, et renvoie l'état complet.
 */
export function mockCheckBadges(userId: string, captures: Capture[], nowIso: string): MockBadgeCheck {
  const stats = statsFor(userId, captures);
  const unlocked = unlockedFor(userId);
  const awarded: Badge[] = [];

  const badges = MOCK_BADGES.map((b): Badge => {
    const c = MOCK_BADGE_CRITERIA[b.id];
    if (!c) return { ...b };
    const value = metricValue(stats, c.metric, c.targetSpecies);
    const res = evaluate(c.metric, c.targetValue, value);
    let justUnlocked = false;
    if (res.unlocked && !unlocked[b.id]) {
      unlocked[b.id] = nowIso;
      justUnlocked = true;
    }
    const isUnlocked = !!unlocked[b.id];
    const badge: Badge = {
      ...b,
      metric: c.metric,
      targetValue: c.targetValue,
      targetSpecies: c.targetSpecies,
      currentValue: value,
      isUnlocked,
      progress: isUnlocked ? 100 : res.progress,
      unlockedAt: isUnlocked ? unlocked[b.id] : undefined,
    };
    if (justUnlocked) awarded.push(badge);
    return badge;
  });

  return { badges, awarded };
}

/** Badges de `userId` débloqués à partir de `sinceMs` (comme la requête SQL sur unlocked_at). */
export function mockUnlockedSince(badges: Badge[], sinceMs: number): Badge[] {
  return badges
    .filter((b) => b.isUnlocked && b.unlockedAt && Date.parse(b.unlockedAt) >= sinceMs)
    .sort((a, b) => Date.parse(a.unlockedAt!) - Date.parse(b.unlockedAt!));
}
