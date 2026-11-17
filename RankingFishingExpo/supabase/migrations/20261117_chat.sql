-- ════════════════════════════════════════════════════════════════════════════
-- Migration : chat 1:1, noms des conversations, non-lus, partage de capture
-- Issues : #7 (chat temps réel), #29 (noms vides), #33 (nouveau message),
--          #20 (partage de capture dans le chat), bouton « Message » du profil.
--
-- À exécuter dans Supabase > SQL Editor. Migration idempotente : on peut la
-- relancer sans erreur (create or replace, if not exists, drop policy if exists).
-- ════════════════════════════════════════════════════════════════════════════


-- ─── 0. Colonnes ─────────────────────────────────────────────────────────────
-- last_read_at : date du dernier passage de l'utilisateur dans la conversation.
-- Le nombre de non-lus est calculé à partir de cette date (plus fiable que le
-- compteur dénormalisé unread_count, qu'on continue toutefois à maintenir).
alter table public.conversation_participants
  add column if not exists last_read_at timestamptz default now();

create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id);

create index if not exists messages_conversation_sent_idx
  on public.messages (conversation_id, sent_at);


-- ─── 1. Helper : suis-je membre de cette conversation ? ──────────────────────
-- SECURITY DEFINER : la fonction lit conversation_participants sans repasser
-- par la RLS. Ça casse la récursion de l'ancienne policy "participants_select"
-- (qui interrogeait sa propre table → « infinite recursion detected in policy »),
-- cause principale des noms de conversation vides (#29).
create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_id = p_conversation_id
      and user_id = auth.uid()
  );
$$;


-- ─── 2. RLS ──────────────────────────────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Conversations : lecture réservée aux membres.
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select" on public.conversations
  for select using (public.is_conversation_member(id));

-- Création et mise à jour passent désormais uniquement par les RPC / triggers
-- SECURITY DEFINER ci-dessous : on retire les anciennes policies trop larges
-- (n'importe quel connecté pouvait créer une conversation ou modifier last_message).
drop policy if exists "conversations_insert" on public.conversations;
drop policy if exists "conversations_update" on public.conversations;

-- Participants : je vois les participants des conversations dont je suis membre.
drop policy if exists "participants_select" on public.conversation_participants;
create policy "participants_select" on public.conversation_participants
  for select using (public.is_conversation_member(conversation_id));

-- L'ancienne policy permettait à n'importe qui de s'ajouter à n'importe quelle
-- conversation. L'ajout de participants passe maintenant par
-- get_or_create_direct_conversation().
drop policy if exists "participants_insert" on public.conversation_participants;

-- Messages : lecture et envoi réservés aux membres, en son propre nom.
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (public.is_conversation_member(conversation_id));

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id
    and public.is_conversation_member(conversation_id)
  );
-- Pas de policy update/delete : is_read est mis à jour par mark_conversation_read().


-- ─── 3. Avant insertion d'un message : normalisation côté serveur ────────────
-- - sender_name / sender_avatar recopiés depuis users (impossible d'usurper un pseudo)
-- - sent_at et is_read forcés (l'ordre des messages ne dépend pas de l'horloge du téléphone)
-- - pour un message de type 'capture' : on vérifie que la capture est publiée
--   (sinon le destinataire ne pourrait pas la lire) et on reconstruit le snapshot
--   capture_ref à partir de la vraie capture.
create or replace function public.handle_message_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capture public.captures%rowtype;
  v_photo text;
begin
  select u.username, u.avatar_url
    into new.sender_name, new.sender_avatar
  from public.users u
  where u.id = new.sender_id;

  if new.sender_name is null then
    raise exception 'Expéditeur inconnu' using errcode = 'P0002';
  end if;

  new.sent_at := now();
  new.is_read := false;

  if new.type = 'capture' then
    if new.capture_ref is null or (new.capture_ref ->> 'captureId') is null then
      raise exception 'capture_ref.captureId requis pour un message de type capture'
        using errcode = '22023';
    end if;

    select * into v_capture
    from public.captures c
    where c.id = (new.capture_ref ->> 'captureId')::uuid
      and c.is_draft = false;

    if not found then
      raise exception 'Capture introuvable ou non publiée' using errcode = 'P0002';
    end if;

    select p.url into v_photo
    from public.capture_photos p
    where p.capture_id = v_capture.id
    order by p.sort_order
    limit 1;

    new.capture_ref := jsonb_build_object(
      'captureId',     v_capture.id,
      'species',       coalesce(v_capture.species_data ->> 'nameFr', v_capture.species_id),
      'speciesIcon',   v_capture.species_data ->> 'icon',
      'weightGrams',   v_capture.weight_grams,
      'sizeCm',        v_capture.size_cm,
      'score',         v_capture.score,
      'photoUrl',      v_photo,
      'ownerId',       v_capture.user_id,
      'ownerUsername', v_capture.username
    );

    if coalesce(btrim(new.content), '') = '' then
      new.content := 'a partagé une capture';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_message_before_insert on public.messages;
create trigger on_message_before_insert
  before insert on public.messages
  for each row execute function public.handle_message_before_insert();


-- ─── 4. Après insertion : aperçu de la conversation + compteurs ──────────────
-- Remplace la mise à jour de conversations.last_message faite côté client.
-- Le snapshot est au format camelCase du type TypeScript Message.
create or replace function public.handle_message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message = jsonb_build_object(
        'id',             new.id,
        'conversationId', new.conversation_id,
        'senderId',       new.sender_id,
        'senderName',     new.sender_name,
        'senderAvatar',   new.sender_avatar,
        'content',        new.content,
        'type',           new.type,
        'captureRef',     new.capture_ref,
        'sentAt',         new.sent_at,
        'isRead',         false
      ),
      updated_at = new.sent_at
  where id = new.conversation_id;

  -- L'expéditeur a forcément « lu » jusqu'à son propre message
  update public.conversation_participants
  set last_read_at = new.sent_at,
      unread_count = 0
  where conversation_id = new.conversation_id
    and user_id = new.sender_id;

  -- Compteur dénormalisé pour les autres participants
  update public.conversation_participants
  set unread_count = coalesce(unread_count, 0) + 1
  where conversation_id = new.conversation_id
    and user_id <> new.sender_id;

  return null;
end;
$$;

drop trigger if exists on_message_after_insert on public.messages;
create trigger on_message_after_insert
  after insert on public.messages
  for each row execute function public.handle_message_after_insert();


-- ─── 5. RPC : liste de mes conversations (noms + avatars résolus) ────────────
-- Renvoie, pour chaque conversation de l'utilisateur connecté :
--   - les participants (id, username, avatar_url) en jsonb
--   - le nombre de messages non lus (reçus après last_read_at)
-- p_conversation_id : optionnel, pour ne récupérer qu'une conversation.
-- Sans filtre, les conversations privées encore vides (créées mais sans message)
-- sont masquées de la liste.
create or replace function public.get_my_conversations(p_conversation_id uuid default null)
returns table (
  id uuid,
  type text,
  name text,
  avatar_url text,
  last_message jsonb,
  updated_at timestamptz,
  created_at timestamptz,
  last_read_at timestamptz,
  unread_count integer,
  participants jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.id,
    c.type,
    c.name,
    c.avatar_url,
    c.last_message,
    c.updated_at,
    c.created_at,
    me.last_read_at,
    (
      select count(*)::int
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id is distinct from auth.uid()
        and m.sent_at > coalesce(me.last_read_at, '-infinity'::timestamptz)
    ) as unread_count,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url)
          order by u.username
        ),
        '[]'::jsonb
      )
      from public.conversation_participants cp
      join public.users u on u.id = cp.user_id
      where cp.conversation_id = c.id
    ) as participants
  from public.conversation_participants me
  join public.conversations c on c.id = me.conversation_id
  where me.user_id = auth.uid()
    and (
      (p_conversation_id is not null and c.id = p_conversation_id)
      or (p_conversation_id is null and (c.last_message is not null or c.type = 'group'))
    )
  order by c.updated_at desc nulls last;
$$;


-- ─── 6. RPC : ouvrir ou créer une conversation 1:1 ───────────────────────────
-- Renvoie l'id de la conversation privée entre auth.uid() et p_other,
-- en la créant si elle n'existe pas. Un verrou transactionnel sur la paire
-- d'utilisateurs évite les doublons si les deux lancent la conversation en même temps.
create or replace function public.get_or_create_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
begin
  if v_me is null then
    raise exception 'Non authentifié' using errcode = '28000';
  end if;

  if p_other is null or p_other = v_me then
    raise exception 'Destinataire invalide' using errcode = '22023';
  end if;

  if not exists (select 1 from public.users where id = p_other) then
    raise exception 'Utilisateur introuvable' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(least(v_me::text, p_other::text) || ':' || greatest(v_me::text, p_other::text), 0)
  );

  select c.id into v_conv
  from public.conversations c
  join public.conversation_participants a on a.conversation_id = c.id and a.user_id = v_me
  join public.conversation_participants b on b.conversation_id = c.id and b.user_id = p_other
  where c.type = 'private'
    and (select count(*) from public.conversation_participants p where p.conversation_id = c.id) = 2
  order by c.created_at
  limit 1;

  if v_conv is null then
    insert into public.conversations (type) values ('private')
    returning id into v_conv;

    insert into public.conversation_participants (conversation_id, user_id, last_read_at, unread_count)
    values (v_conv, v_me, now(), 0),
           (v_conv, p_other, now(), 0);
  end if;

  return v_conv;
end;
$$;


-- ─── 7. RPC : marquer une conversation comme lue ─────────────────────────────
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'Conversation inaccessible' using errcode = '42501';
  end if;

  update public.conversation_participants
  set last_read_at = now(),
      unread_count = 0
  where conversation_id = p_conversation_id
    and user_id = auth.uid();

  -- Accusé de lecture (✓✓) sur les messages reçus
  update public.messages
  set is_read = true
  where conversation_id = p_conversation_id
    and sender_id is distinct from auth.uid()
    and is_read = false;
end;
$$;


-- ─── 8. Grants ───────────────────────────────────────────────────────────────
grant select, insert on public.messages to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_participants to authenticated;
grant all on public.conversations, public.conversation_participants, public.messages to service_role;

revoke execute on function public.is_conversation_member(uuid) from public, anon;
revoke execute on function public.get_my_conversations(uuid) from public, anon;
revoke execute on function public.get_or_create_direct_conversation(uuid) from public, anon;
revoke execute on function public.mark_conversation_read(uuid) from public, anon;

grant execute on function public.is_conversation_member(uuid) to authenticated;
grant execute on function public.get_my_conversations(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;


-- ─── 9. Realtime ─────────────────────────────────────────────────────────────
-- messages doit être dans la publication supabase_realtime (INSERT = nouveaux
-- messages, UPDATE = accusés de lecture). Ajout seulement s'il n'y est pas déjà.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;


-- ─── 10. Rattrapage des données existantes ───────────────────────────────────
-- Les participants existants n'ont pas de last_read_at fiable : on les considère
-- à jour pour ne pas afficher d'anciens messages comme non lus.
update public.conversation_participants
set last_read_at = now()
where last_read_at is null;
