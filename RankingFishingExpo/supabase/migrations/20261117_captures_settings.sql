-- ════════════════════════════════════════════════════════════════════════════
-- Migration : captures, paramètres du compte et Premium
-- Issues #3 (date de la prise), #18 (feed paginé), #30 (suppression du compte),
-- #32 (liste d'attente Premium).
--
-- À exécuter dans Supabase > SQL Editor. Idempotente : peut être rejouée sans
-- casse (if not exists, create or replace, drop policy if exists).
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 1. Date et heure réelles de la prise (issue #3) ─────────────────────────
-- published_at = moment de la publication ; caught_at = moment de la prise,
-- saisi par le pêcheur (il peut publier le soir une prise du matin).
-- Les captures existantes reprennent published_at.
alter table public.captures
  add column if not exists caught_at timestamptz;

update public.captures
  set caught_at = published_at
  where caught_at is null;

alter table public.captures
  alter column caught_at set default now();

-- Une prise ne peut pas être datée dans le futur (5 min de tolérance pour les
-- horloges de téléphone décalées). Contrainte ajoutée seulement si absente.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'captures_caught_at_not_future'
  ) then
    alter table public.captures
      add constraint captures_caught_at_not_future
      check (caught_at is null or caught_at <= now() + interval '5 minutes')
      not valid; -- n'invalide pas d'anciennes lignes, s'applique aux nouvelles
  end if;
end $$;


-- ─── 2. Index du feed paginé par curseur (issue #18) ─────────────────────────
-- Le feed trie par (published_at desc, id desc) et filtre is_draft = false.
-- Index partiel : seules les captures publiées y figurent.
create index if not exists captures_feed_cursor_idx
  on public.captures (published_at desc, id desc)
  where is_draft = false;


-- ─── 3. Liste d'attente Premium (issue #32) ──────────────────────────────────
-- Le paiement n'est pas encore intégré : on enregistre seulement les pêcheurs
-- qui veulent être prévenus du lancement. Une ligne par utilisateur.
create table if not exists public.premium_waitlist (
  user_id uuid primary key references public.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.premium_waitlist enable row level security;

-- Chacun ne voit et ne gère que sa propre inscription
drop policy if exists "premium_waitlist_select_own" on public.premium_waitlist;
create policy "premium_waitlist_select_own" on public.premium_waitlist
  for select using (auth.uid() = user_id);

drop policy if exists "premium_waitlist_insert_own" on public.premium_waitlist;
create policy "premium_waitlist_insert_own" on public.premium_waitlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "premium_waitlist_update_own" on public.premium_waitlist;
create policy "premium_waitlist_update_own" on public.premium_waitlist
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "premium_waitlist_delete_own" on public.premium_waitlist;
create policy "premium_waitlist_delete_own" on public.premium_waitlist
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.premium_waitlist to authenticated;
grant all on public.premium_waitlist to service_role;


-- ─── 4. Suppression du compte (RGPD, issue #30) ──────────────────────────────
-- Appelée par l'app : supabase.rpc('delete_my_account').
-- SECURITY DEFINER : la fonction tourne avec les droits de son propriétaire
-- (postgres) pour pouvoir supprimer la ligne auth.users. Elle n'agit QUE sur
-- auth.uid() : aucun paramètre, impossible de supprimer le compte d'un autre.
--
-- Ordre des suppressions : on nettoie d'abord les tables dont les triggers
-- mettent à jour la ligne users (follows, captures…). Les laisser partir en
-- cascade pendant la suppression de users ferait modifier une ligne en cours
-- de suppression (erreur « tuple already modified »).
--
-- Les fichiers Storage (avatar, photos) sont supprimés par l'app avant
-- l'appel : le SQL ne peut pas effacer proprement les objets Storage.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Non authentifié' using errcode = '28000';
  end if;

  -- Likes donnés : on décrémente d'abord les compteurs des captures concernées
  update public.captures c
    set likes = greatest(0, c.likes - 1)
    where c.id in (select capture_id from public.capture_likes where user_id = v_uid)
      and c.user_id <> v_uid;
  delete from public.capture_likes where user_id = v_uid;

  -- Commentaires écrits (le trigger de compteur met à jour captures.comments)
  delete from public.comments where user_id = v_uid;

  -- Relations sociales (le trigger met à jour les compteurs des autres)
  delete from public.follows where follower_id = v_uid or followed_id = v_uid;
  delete from public.follow_requests where requester_id = v_uid or target_id = v_uid;

  -- Messages envoyés, puis participations ; les conversations devenues vides
  -- sont supprimées.
  delete from public.messages where sender_id = v_uid;
  delete from public.conversation_participants where user_id = v_uid;
  delete from public.conversations c
    where not exists (
      select 1 from public.conversation_participants p where p.conversation_id = c.id
    );

  -- Captures (photos en cascade) et données dérivées
  delete from public.captures where user_id = v_uid;
  delete from public.rankings where user_id = v_uid;
  delete from public.user_badges where user_id = v_uid;
  delete from public.user_specialties where user_id = v_uid;
  delete from public.premium_waitlist where user_id = v_uid;
  update public.spots set created_by = null where created_by = v_uid;

  -- Profil public puis compte d'authentification
  delete from public.user_stats where user_id = v_uid;
  delete from public.users where id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

-- Seuls les utilisateurs connectés peuvent l'appeler (pas anon, pas public)
revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;


-- ─── 5. Vérifications rapides (à lancer à la main si besoin) ─────────────────
-- select column_name from information_schema.columns
--   where table_name = 'captures' and column_name = 'caught_at';
-- select proname, prosecdef from pg_proc where proname = 'delete_my_account';
