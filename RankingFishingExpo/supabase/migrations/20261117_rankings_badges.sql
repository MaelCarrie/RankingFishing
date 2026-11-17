-- ════════════════════════════════════════════════════════════════════════════
-- Migration : classements (RLS) + déblocage automatique des badges
-- Issues : #15 (badges), #23 (régional), #28 / #34 (classements déterministes)
--
-- À exécuter dans Supabase > SQL Editor, APRÈS 20260602_rankings_region_species.sql.
-- Script idempotent : il peut être rejoué sans casse.
--
-- Contenu :
--   1. Colonnes complémentaires (badges.target_species, user_badges.current_value)
--   2. Fonction utilitaire de calcul du niveau depuis l'XP
--   3. check_and_award_badges(p_user)  — SECURITY DEFINER, idempotente
--   4. check_my_badges()               — RPC appelable par l'app (auth.uid())
--   5. Triggers (captures + user_stats.global_rank)
--   6. RLS + grants (user_badges, rankings)
--   7. Rattrapage : calcul initial des badges pour tous les utilisateurs
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 1. Colonnes complémentaires ─────────────────────────────────────────────

-- Espèce visée par les badges de métrique 'species_weight' (ex : carpe 15 kg+).
-- Le schéma d'origine ne stocke que target_value / target_metric : sans cette
-- colonne, impossible de savoir quelle espèce compte pour badge_big_carp.
alter table public.badges
  add column if not exists target_species text references public.species(id);

update public.badges set target_species = 'carp' where id = 'badge_big_carp' and target_species is distinct from 'carp';
update public.badges set target_species = 'pike' where id = 'badge_big_pike' and target_species is distinct from 'pike';

-- Valeur brute courante de la métrique (ex : 47 captures, 12 400 g, rang 342).
-- Permet d'afficher « 47 / 50 » dans l'app en plus du pourcentage.
alter table public.user_badges
  add column if not exists current_value integer;

-- Index pour fetchNewlyUnlockedBadges (badges débloqués depuis une date).
create index if not exists user_badges_unlocked_idx
  on public.user_badges (user_id, unlocked_at desc)
  where is_unlocked;


-- ─── 2. Niveau depuis l'XP (mêmes paliers que LEVEL_THRESHOLDS côté app) ─────

create or replace function public.rf_level_from_xp(p_xp integer)
returns integer
language sql
immutable
as $$
  select case
    when p_xp >= 8000 then 7
    when p_xp >= 4000 then 6
    when p_xp >= 2000 then 5
    when p_xp >= 1000 then 4
    when p_xp >= 500  then 3
    when p_xp >= 200  then 2
    else 1
  end;
$$;

create or replace function public.rf_level_name(p_level integer)
returns text
language sql
immutable
as $$
  select (array['Novice', 'Apprenti pêcheur', 'Amateur', 'Confirmé',
                'Expert', 'Maître pêcheur', 'Légende'])[greatest(1, least(7, p_level))];
$$;


-- ─── 3. check_and_award_badges(p_user) ───────────────────────────────────────
-- Recalcule la progression de TOUS les badges d'un utilisateur à partir des
-- critères de la table `badges` (target_metric / target_value / target_species),
-- débloque ceux dont la condition est remplie et crédite leur xp_reward.
--
-- Métriques gérées :
--   total_captures     : nombre de captures publiées
--   species_weight     : poids max (g) d'une capture publiée de target_species
--   global_rank        : user_stats.global_rank <= target_value (rang global)
--   seasonal_captures  : max, sur une même année, des captures publiées en
--                        mars-avril-mai (heure de Paris)
--   validations        : nombre de lignes dans public.capture_validations si la
--                        table existe (fonctionnalité pas encore construite → 0)
-- Une métrique inconnue est ignorée (aucune ligne écrite).
--
-- Idempotente :
--   - un badge débloqué le reste (is_unlocked ne repasse jamais à false) ;
--   - unlocked_at garde la date du premier déblocage ;
--   - l'XP n'est créditée qu'au passage non débloqué → débloqué ;
--   - aucune écriture si rien n'a changé.
-- Un verrou consultatif par utilisateur évite une double attribution d'XP en
-- cas d'appels concurrents (deux captures publiées en même temps).
--
-- Retourne les ids des badges débloqués PAR CET APPEL.

create or replace function public.check_and_award_badges(p_user uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
declare
  b              record;
  v_total        integer;
  v_rank         integer;
  v_spring       integer;
  v_validations  integer := 0;
  v_value        integer;
  v_progress     integer;
  v_unlocked     boolean;
  v_was_unlocked boolean;
  v_xp_gain      integer := 0;
begin
  if p_user is null then
    return;
  end if;

  if not exists (select 1 from public.users where id = p_user) then
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('rf_badges:' || p_user::text));

  -- Métriques communes, calculées une seule fois
  select count(*) into v_total
  from public.captures
  where user_id = p_user and is_draft = false;

  select global_rank into v_rank
  from public.user_stats
  where user_id = p_user;

  select coalesce(max(cnt), 0) into v_spring
  from (
    select count(*) as cnt
    from public.captures
    where user_id = p_user
      and is_draft = false
      and extract(month from (published_at at time zone 'Europe/Paris')) between 3 and 5
    group by extract(year from (published_at at time zone 'Europe/Paris'))
  ) s;

  if to_regclass('public.capture_validations') is not null then
    execute 'select count(*) from public.capture_validations where user_id = $1'
      into v_validations
      using p_user;
  end if;

  for b in
    select id, target_metric, target_value, target_species, coalesce(xp_reward, 0) as xp_reward
    from public.badges
  loop
    -- Valeur courante de la métrique
    if b.target_metric = 'total_captures' then
      v_value := v_total;
    elsif b.target_metric = 'species_weight' then
      select coalesce(max(weight_grams), 0) into v_value
      from public.captures
      where user_id = p_user and is_draft = false and species_id = b.target_species;
    elsif b.target_metric = 'global_rank' then
      v_value := v_rank; -- peut être null (pas encore classé)
    elsif b.target_metric = 'seasonal_captures' then
      v_value := v_spring;
    elsif b.target_metric = 'validations' then
      v_value := v_validations;
    else
      continue; -- métrique inconnue : on n'écrit rien
    end if;

    -- Condition + progression (0-100, 100 réservé au badge débloqué)
    if b.target_metric = 'global_rank' then
      -- Rang : plus petit = meilleur. Progression = cible / rang actuel.
      v_unlocked := v_value is not null and v_value > 0 and v_value <= b.target_value;
      v_progress := case
        when v_unlocked then 100
        when v_value is null or v_value <= 0 then 0
        else least(99, floor(100.0 * b.target_value / v_value))::integer
      end;
    else
      v_value := coalesce(v_value, 0);
      v_unlocked := v_value >= b.target_value;
      v_progress := case
        when v_unlocked then 100
        when b.target_value <= 0 then 0
        else least(99, floor(100.0 * v_value / b.target_value))::integer
      end;
    end if;

    select is_unlocked into v_was_unlocked
    from public.user_badges
    where user_id = p_user and badge_id = b.id;

    insert into public.user_badges (user_id, badge_id, progress, current_value, is_unlocked, unlocked_at)
    values (p_user, b.id, v_progress, v_value, v_unlocked, case when v_unlocked then now() end)
    on conflict (user_id, badge_id) do update set
      progress      = case when user_badges.is_unlocked then 100 else excluded.progress end,
      current_value = excluded.current_value,
      is_unlocked   = user_badges.is_unlocked or excluded.is_unlocked,
      unlocked_at   = coalesce(user_badges.unlocked_at, excluded.unlocked_at)
    where (user_badges.progress, user_badges.current_value, user_badges.is_unlocked)
          is distinct from
          (case when user_badges.is_unlocked then 100 else excluded.progress end,
           excluded.current_value,
           user_badges.is_unlocked or excluded.is_unlocked);

    if v_unlocked and not coalesce(v_was_unlocked, false) then
      v_xp_gain := v_xp_gain + b.xp_reward;
      return next b.id;
    end if;
  end loop;

  -- Crédit d'XP + niveau (le niveau ne redescend jamais)
  if v_xp_gain > 0 then
    update public.users
    set xp         = coalesce(xp, 0) + v_xp_gain,
        level      = greatest(coalesce(level, 1), public.rf_level_from_xp(coalesce(xp, 0) + v_xp_gain)),
        level_name = public.rf_level_name(
                       greatest(coalesce(level, 1), public.rf_level_from_xp(coalesce(xp, 0) + v_xp_gain)))
    where id = p_user;
  end if;

  return;
end;
$$;

comment on function public.check_and_award_badges(uuid) is
  'Recalcule la progression des badges d''un utilisateur, débloque ceux atteints et crédite leur XP. Idempotente. Retourne les ids débloqués par l''appel.';


-- ─── 4. RPC check_my_badges() — appelée par l'app à l'ouverture des badges ───
-- Toujours limitée à l'utilisateur connecté : un client ne peut pas déclencher
-- le calcul pour quelqu'un d'autre.

create or replace function public.check_my_badges()
returns setof text
language sql
security definer
set search_path = public
as $$
  select * from public.check_and_award_badges(auth.uid());
$$;


-- ─── 5. Triggers ─────────────────────────────────────────────────────────────

-- 5a. Après insert / update / delete d'une capture.
-- Nom préfixé « zz » : les triggers d'un même évènement s'exécutent par ordre
-- alphabétique, celui-ci passe donc APRÈS on_capture_stats (handle_capture_stats
-- + refresh_global_ranks), et voit le global_rank à jour.
-- Les UPDATE ne déclenchent que sur les colonnes utiles (pas sur likes/comments).
create or replace function public.handle_capture_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.check_and_award_badges(old.user_id);
  elsif new.is_draft = false or (tg_op = 'UPDATE' and old.is_draft = false) then
    perform public.check_and_award_badges(new.user_id);
  end if;
  return null;
end;
$$;

drop trigger if exists on_capture_zz_badges on public.captures;
create trigger on_capture_zz_badges
  after insert or delete or update of is_draft, weight_grams, species_id, published_at, user_id
  on public.captures
  for each row execute function public.handle_capture_badges();

-- 5b. Quand le rang global change (refresh_global_ranks ou Edge Function
-- recalculate-rankings) et entre dans la zone de déblocage du badge Top 100.
-- Restreint aux rangs <= 100 pour ne pas recalculer tous les badges de tous les
-- utilisateurs à chaque capture ; la progression des autres est rafraîchie à
-- leur prochaine capture ou à l'ouverture de l'écran Badges (check_my_badges).
create or replace function public.handle_rank_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_award_badges(new.user_id);
  return null;
end;
$$;

drop trigger if exists on_user_stats_rank_badges on public.user_stats;
create trigger on_user_stats_rank_badges
  after update of global_rank on public.user_stats
  for each row
  when (new.global_rank is distinct from old.global_rank
        and new.global_rank is not null
        and new.global_rank <= 100)
  execute function public.handle_rank_badges();


-- ─── 6. RLS + grants ─────────────────────────────────────────────────────────

-- user_badges : lecture par tout utilisateur connecté (badges visibles sur les
-- profils publics). L'écriture n'est plus possible depuis le client : seule la
-- fonction SECURITY DEFINER attribue les badges (anti-triche).
alter table public.user_badges enable row level security;

drop policy if exists "user_badges_select" on public.user_badges;
create policy "user_badges_select" on public.user_badges
  for select to authenticated using (true);

drop policy if exists "user_badges_insert" on public.user_badges;
drop policy if exists "user_badges_update" on public.user_badges;

grant select on public.user_badges to authenticated;

-- badges : définitions en lecture seule
alter table public.badges enable row level security;
drop policy if exists "badges_select" on public.badges;
create policy "badges_select" on public.badges
  for select to authenticated using (true);
grant select on public.badges to authenticated;

-- rankings : lecture pour les connectés, écriture réservée au service_role
-- (Edge Function recalculate-rankings, qui contourne la RLS).
alter table public.rankings enable row level security;
drop policy if exists "rankings_select" on public.rankings;
create policy "rankings_select" on public.rankings
  for select to authenticated using (true);
grant select on public.rankings to authenticated;
grant all on public.rankings to service_role;

-- follows : lecture déjà ouverte aux connectés (section 12 de SUPABASE.md),
-- nécessaire pour l'onglet « Amis ». Rappel idempotent du grant.
grant select on public.follows to authenticated;

-- Fonctions : la fonction interne n'est pas appelable par les clients
-- (sinon n'importe qui pourrait la lancer pour n'importe quel user_id).
revoke all on function public.check_and_award_badges(uuid) from public, anon, authenticated;
grant execute on function public.check_and_award_badges(uuid) to service_role;

revoke all on function public.check_my_badges() from public, anon;
grant execute on function public.check_my_badges() to authenticated;

revoke all on function public.handle_capture_badges() from public, anon, authenticated;
revoke all on function public.handle_rank_badges() from public, anon, authenticated;


-- ─── 7. Rattrapage initial ───────────────────────────────────────────────────
-- Calcule la progression de tous les utilisateurs existants et débloque les
-- badges déjà mérités (avec crédit d'XP, une seule fois grâce à l'idempotence).
do $$
declare
  u record;
begin
  for u in select id from public.users loop
    perform public.check_and_award_badges(u.id);
  end loop;
end;
$$;
