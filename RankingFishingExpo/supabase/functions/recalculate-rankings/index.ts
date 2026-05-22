import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PERIODS: Record<string, number | null> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
  alltime: null,
};

type Agg = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  score: number;
  capture_count: number;
  species_counts: Record<string, number>;
};

function rankByScore(entries: Agg[]) {
  return entries
    .sort((a, b) => b.score - a.score)
    .map((e, i) => {
      const topSpecies =
        Object.entries(e.species_counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
      return { agg: e, rank: i + 1, topSpecies };
    });
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Niveau + région de chaque utilisateur
  const { data: users } = await supabase
    .from('users')
    .select('id, level, region');

  const levelMap: Record<string, number> = {};
  const regionMap: Record<string, string | null> = {};
  for (const u of users ?? []) {
    levelMap[u.id] = u.level;
    regionMap[u.id] = u.region ?? null;
  }

  const allEntries: any[] = [];

  for (const [period, days] of Object.entries(PERIODS)) {
    let query = supabase
      .from('captures')
      .select('user_id, username, user_avatar, score, species_id, species_data')
      .eq('is_draft', false);

    if (days !== null) {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      query = query.gte('published_at', since);
    }

    const { data: captures, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Agrégat par utilisateur (utilisé pour global + regional)
    const userAgg: Record<string, Agg> = {};
    // Agrégat par (espèce, utilisateur) (utilisé pour species)
    const speciesAgg: Record<string, Agg> = {};
    // species_id -> nom affichable
    const speciesLabel: Record<string, string> = {};

    for (const c of captures ?? []) {
      const speciesName = c.species_data?.nameFr ?? c.species_data?.name ?? c.species_id;

      if (!userAgg[c.user_id]) {
        userAgg[c.user_id] = {
          user_id: c.user_id,
          username: c.username,
          avatar_url: c.user_avatar,
          score: 0,
          capture_count: 0,
          species_counts: {},
        };
      }
      userAgg[c.user_id].score += c.score ?? 0;
      userAgg[c.user_id].capture_count += 1;
      if (speciesName) {
        userAgg[c.user_id].species_counts[speciesName] =
          (userAgg[c.user_id].species_counts[speciesName] ?? 0) + 1;
      }

      // Agrégat espèce (clé species_id)
      if (c.species_id) {
        const key = `${c.species_id}__${c.user_id}`;
        if (!speciesAgg[key]) {
          speciesAgg[key] = {
            user_id: c.user_id,
            username: c.username,
            avatar_url: c.user_avatar,
            score: 0,
            capture_count: 0,
            species_counts: {},
          };
        }
        speciesAgg[key].score += c.score ?? 0;
        speciesAgg[key].capture_count += 1;
        speciesLabel[c.species_id] = speciesName;
      }
    }

    const baseRow = (a: Agg, rank: number, topSpecies: string | null) => ({
      user_id: a.user_id,
      username: a.username,
      avatar_url: a.avatar_url,
      score: a.score,
      capture_count: a.capture_count,
      top_species: topSpecies,
      level: levelMap[a.user_id] ?? 1,
      rank,
      period,
      updated_at: new Date().toISOString(),
    });

    // ── Global ──
    for (const { agg, rank, topSpecies } of rankByScore(Object.values(userAgg))) {
      allEntries.push({ ...baseRow(agg, rank, topSpecies), type: 'global', species: '', region: null });
    }

    // ── Régional : regroupé par région du pêcheur ──
    const byRegion: Record<string, Agg[]> = {};
    for (const agg of Object.values(userAgg)) {
      const region = regionMap[agg.user_id];
      if (!region) continue; // utilisateur sans région : exclu du classement régional
      (byRegion[region] ??= []).push(agg);
    }
    for (const [region, aggs] of Object.entries(byRegion)) {
      for (const { agg, rank, topSpecies } of rankByScore(aggs)) {
        allEntries.push({ ...baseRow(agg, rank, topSpecies), type: 'regional', species: '', region });
      }
    }

    // ── Par espèce : regroupé par species_id ──
    const bySpecies: Record<string, Agg[]> = {};
    for (const [key, agg] of Object.entries(speciesAgg)) {
      const speciesId = key.split('__')[0];
      (bySpecies[speciesId] ??= []).push(agg);
    }
    for (const [speciesId, aggs] of Object.entries(bySpecies)) {
      for (const { agg, rank } of rankByScore(aggs)) {
        allEntries.push({
          ...baseRow(agg, rank, speciesLabel[speciesId] ?? speciesId),
          type: 'species',
          species: speciesId,
          region: null,
        });
      }
    }
  }

  // Purge des anciennes lignes : la fonction recalcule TOUS les types/périodes à
  // chaque exécution. Sans ça, un utilisateur sorti d'une fenêtre glissante
  // (ex: capture de la veille hors période 'day') garderait son ancienne ligne
  // avec son ancien rang → rangs en double et scores périmés à l'affichage.
  const { error: deleteError } = await supabase.from('rankings').delete().gte('rank', 0);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  const { error: upsertError } = await supabase
    .from('rankings')
    .upsert(allEntries, { onConflict: 'type,period,species,user_id' });

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
  }

  // Synchroniser global_rank (classement global alltime)
  const globalAlltime = allEntries.filter((e) => e.type === 'global' && e.period === 'alltime');
  for (const entry of globalAlltime) {
    await supabase.from('user_stats').update({ global_rank: entry.rank }).eq('user_id', entry.user_id);
  }

  // Synchroniser regional_rank (classement régional alltime)
  const regionalAlltime = allEntries.filter((e) => e.type === 'regional' && e.period === 'alltime');
  for (const entry of regionalAlltime) {
    await supabase.from('user_stats').update({ regional_rank: entry.rank }).eq('user_id', entry.user_id);
  }

  return new Response(
    JSON.stringify({
      updated: allEntries.length,
      global_synced: globalAlltime.length,
      regional_synced: regionalAlltime.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
