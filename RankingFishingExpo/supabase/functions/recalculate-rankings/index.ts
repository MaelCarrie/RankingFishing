// Edge Function recalculate-rankings (Deno)
// Recalcule tous les classements (global, régional, par espèce) pour les 5
// périodes, réécrit la table `rankings` et synchronise user_stats.global_rank /
// user_stats.regional_rank.
//
// Ordre de classement DÉTERMINISTE (issue #34) :
//   1. score décroissant
//   2. date de la plus ancienne capture de la fenêtre (la plus ancienne gagne)
//   3. user_id croissant
// Deux exécutions successives sur les mêmes données produisent exactement les
// mêmes rangs.
//
// Après modification : `supabase functions deploy recalculate-rankings`.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PERIODS: Record<string, number | null> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
  alltime: null,
};

// PostgREST plafonne chaque select (1000 lignes par défaut) : on pagine.
const PAGE_SIZE = 1000;
// Taille des lots d'insertion dans `rankings`.
const UPSERT_CHUNK = 500;

type CaptureRow = {
  id: string;
  user_id: string;
  username: string;
  user_avatar: string | null;
  score: number | null;
  species_id: string | null;
  species_data: { nameFr?: string; name?: string } | null;
  published_at: string;
  published_ms?: number; // published_at en millisecondes (calculé)
};

type UserRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  level: number | null;
  region: string | null;
};

type Agg = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  score: number;
  capture_count: number;
  first_capture_ms: number; // plus ancienne capture de la fenêtre (ms epoch)
  species_counts: Record<string, number>;
};

// Comparateur stable et total : score desc, première capture asc, user_id asc.
function compareAgg(a: Agg, b: Agg): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.first_capture_ms !== b.first_capture_ms) return a.first_capture_ms - b.first_capture_ms;
  return a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0;
}

// Espèce la plus pêchée ; égalité départagée par ordre alphabétique.
function topSpeciesOf(counts: Record<string, number>): string | null {
  const sorted = Object.entries(counts).sort(([na, ca], [nb, cb]) =>
    cb !== ca ? cb - ca : na.localeCompare(nb, 'fr')
  );
  return sorted[0]?.[0] ?? null;
}

function rankAggs(entries: Agg[]) {
  return [...entries].sort(compareAgg).map((agg, i) => ({ agg, rank: i + 1 }));
}

function newAgg(c: CaptureRow, users: Record<string, UserRow>): Agg {
  const u = users[c.user_id];
  return {
    user_id: c.user_id,
    // Profil actuel en priorité (le snapshot de la capture peut être périmé)
    username: u?.username ?? c.username,
    avatar_url: u?.avatar_url ?? c.user_avatar ?? null,
    score: 0,
    capture_count: 0,
    first_capture_ms: c.published_ms ?? Number.MAX_SAFE_INTEGER,
    species_counts: {},
  };
}

function addCapture(agg: Agg, c: CaptureRow, speciesName: string | null) {
  agg.score += c.score ?? 0;
  agg.capture_count += 1;
  const ms = c.published_ms ?? Number.MAX_SAFE_INTEGER;
  if (ms < agg.first_capture_ms) agg.first_capture_ms = ms;
  if (speciesName) agg.species_counts[speciesName] = (agg.species_counts[speciesName] ?? 0) + 1;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // ── Profils (niveau, région, pseudo/avatar à jour) ──
  const users: Record<string, UserRow> = {};
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, level, region')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return json({ error: error.message }, 500);
    for (const u of (data ?? []) as UserRow[]) users[u.id] = u;
    if (!data || data.length < PAGE_SIZE) break;
  }

  // ── Toutes les captures publiées, une seule fois (ordre stable) ──
  const allCaptures: CaptureRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('captures')
      .select('id, user_id, username, user_avatar, score, species_id, species_data, published_at')
      .eq('is_draft', false)
      .order('published_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return json({ error: error.message }, 500);
    for (const c of (data ?? []) as CaptureRow[]) {
      // Les dates Postgres (+00:00, microsecondes) et JS (Z) ne se comparent
      // pas en chaîne : on passe tout en millisecondes.
      const ms = Date.parse(c.published_at);
      c.published_ms = Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
      allCaptures.push(c);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  const now = Date.now();
  const updatedAt = new Date(now).toISOString();
  const allEntries: Record<string, unknown>[] = [];

  for (const [period, days] of Object.entries(PERIODS)) {
    const sinceMs = days === null ? null : now - days * 86400000;
    const captures =
      sinceMs === null ? allCaptures : allCaptures.filter((c) => (c.published_ms ?? 0) >= sinceMs);

    const userAgg: Record<string, Agg> = {};
    const speciesAgg: Record<string, Record<string, Agg>> = {}; // species_id -> user_id -> agg
    const speciesLabel: Record<string, string> = {};

    for (const c of captures) {
      const speciesName = c.species_data?.nameFr ?? c.species_data?.name ?? c.species_id;

      addCapture((userAgg[c.user_id] ??= newAgg(c, users)), c, speciesName);

      if (c.species_id) {
        const bucket = (speciesAgg[c.species_id] ??= {});
        addCapture((bucket[c.user_id] ??= newAgg(c, users)), c, speciesName);
        if (speciesName) speciesLabel[c.species_id] = speciesName;
      }
    }

    const baseRow = (a: Agg, rank: number, topSpecies: string | null) => ({
      user_id: a.user_id,
      username: a.username,
      avatar_url: a.avatar_url,
      score: a.score,
      capture_count: a.capture_count,
      top_species: topSpecies,
      level: users[a.user_id]?.level ?? 1,
      rank,
      period,
      updated_at: updatedAt,
    });

    // ── Global ──
    for (const { agg, rank } of rankAggs(Object.values(userAgg))) {
      allEntries.push({
        ...baseRow(agg, rank, topSpeciesOf(agg.species_counts)),
        type: 'global',
        species: '',
        region: null,
      });
    }

    // ── Régional : regroupé par région normalisée du pêcheur ──
    const byRegion: Record<string, Agg[]> = {};
    for (const agg of Object.values(userAgg)) {
      const region = users[agg.user_id]?.region;
      if (!region) continue; // sans région : absent du classement régional
      (byRegion[region] ??= []).push(agg);
    }
    for (const [region, aggs] of Object.entries(byRegion)) {
      for (const { agg, rank } of rankAggs(aggs)) {
        allEntries.push({
          ...baseRow(agg, rank, topSpeciesOf(agg.species_counts)),
          type: 'regional',
          species: '',
          region,
        });
      }
    }

    // ── Par espèce ──
    for (const [speciesId, bucket] of Object.entries(speciesAgg)) {
      for (const { agg, rank } of rankAggs(Object.values(bucket))) {
        allEntries.push({
          ...baseRow(agg, rank, speciesLabel[speciesId] ?? speciesId),
          type: 'species',
          species: speciesId,
          region: null,
        });
      }
    }
  }

  // Purge puis réécriture complète : un utilisateur sorti d'une fenêtre
  // glissante (ex : plus de capture sur 'day') ne doit pas garder son ancienne
  // ligne avec un rang en double.
  const { error: deleteError } = await supabase.from('rankings').delete().gte('rank', 0);
  if (deleteError) return json({ error: deleteError.message }, 500);

  for (let i = 0; i < allEntries.length; i += UPSERT_CHUNK) {
    const { error } = await supabase
      .from('rankings')
      .upsert(allEntries.slice(i, i + UPSERT_CHUNK), { onConflict: 'type,period,species,user_id' });
    if (error) return json({ error: error.message }, 500);
  }

  // ── Synchronisation user_stats (alltime) ──
  // Rang global / régional attendu pour chaque utilisateur (null = non classé).
  const expectedGlobal: Record<string, number> = {};
  const expectedRegional: Record<string, number> = {};
  for (const e of allEntries) {
    if (e.period !== 'alltime') continue;
    if (e.type === 'global') expectedGlobal[e.user_id as string] = e.rank as number;
    if (e.type === 'regional') expectedRegional[e.user_id as string] = e.rank as number;
  }

  // On n'écrit que les lignes qui changent : moins d'écritures, et le trigger
  // on_user_stats_rank_badges (badge Top 100) ne se déclenche qu'à bon escient.
  let synced = 0;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('user_stats')
      .select('user_id, global_rank, regional_rank')
      .order('user_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return json({ error: error.message }, 500);

    for (const s of data ?? []) {
      const globalRank = expectedGlobal[s.user_id] ?? null;
      const regionalRank = expectedRegional[s.user_id] ?? null;
      if (s.global_rank === globalRank && s.regional_rank === regionalRank) continue;
      const { error: updError } = await supabase
        .from('user_stats')
        .update({ global_rank: globalRank, regional_rank: regionalRank })
        .eq('user_id', s.user_id);
      if (updError) return json({ error: updError.message }, 500);
      synced += 1;
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  return json({
    updated: allEntries.length,
    captures: allCaptures.length,
    global_ranked: Object.keys(expectedGlobal).length,
    regional_ranked: Object.keys(expectedRegional).length,
    user_stats_synced: synced,
  });
});
