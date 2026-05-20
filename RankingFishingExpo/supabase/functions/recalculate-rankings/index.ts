import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PERIODS: Record<string, number | null> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
  alltime: null,
};

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Récupérer les niveaux des utilisateurs
  const { data: users } = await supabase
    .from('users')
    .select('id, level');

  const levelMap: Record<string, number> = {};
  for (const u of users ?? []) levelMap[u.id] = u.level;

  const allEntries: any[] = [];

  for (const [period, days] of Object.entries(PERIODS)) {
    let query = supabase
      .from('captures')
      .select('user_id, username, user_avatar, score, species_data')
      .eq('is_draft', false);

    if (days !== null) {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      query = query.gte('published_at', since);
    }

    const { data: captures, error } = await query;
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // Agréger par utilisateur
    const scoreMap: Record<string, any> = {};
    for (const c of captures ?? []) {
      if (!scoreMap[c.user_id]) {
        scoreMap[c.user_id] = {
          user_id: c.user_id,
          username: c.username,
          avatar_url: c.user_avatar,
          score: 0,
          capture_count: 0,
          species_counts: {} as Record<string, number>,
        };
      }
      scoreMap[c.user_id].score += c.score ?? 0;
      scoreMap[c.user_id].capture_count += 1;

      // Compter les espèces pour top_species
      const speciesName = c.species_data?.nameFr ?? c.species_data?.name;
      if (speciesName) {
        scoreMap[c.user_id].species_counts[speciesName] =
          (scoreMap[c.user_id].species_counts[speciesName] ?? 0) + 1;
      }
    }

    const periodEntries = Object.values(scoreMap)
      .sort((a: any, b: any) => b.score - a.score)
      .map((e: any, i: number) => {
        const topSpecies =
          Object.entries(e.species_counts as Record<string, number>)
            .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

        return {
          user_id: e.user_id,
          username: e.username,
          avatar_url: e.avatar_url,
          score: e.score,
          capture_count: e.capture_count,
          top_species: topSpecies,
          level: levelMap[e.user_id] ?? 1,
          rank: i + 1,
          type: 'global',
          period,
          updated_at: new Date().toISOString(),
        };
      });

    allEntries.push(...periodEntries);
  }

  const { error: upsertError } = await supabase
    .from('rankings')
    .upsert(allEntries, { onConflict: 'type,period,user_id' });

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
  }

  // Synchroniser global_rank dans user_stats depuis le classement global alltime
  const globalAlltime = allEntries.filter(
    (e) => e.type === 'global' && e.period === 'alltime'
  );

  for (const entry of globalAlltime) {
    await supabase
      .from('user_stats')
      .update({ global_rank: entry.rank })
      .eq('user_id', entry.user_id);
  }

  return new Response(
    JSON.stringify({ updated: allEntries.length, ranks_synced: globalAlltime.length }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
