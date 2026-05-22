-- ════════════════════════════════════════════════════════════════════════════
-- Migration : système de commentaires sur les captures (issue #11)
-- À exécuter dans Supabase > SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Table comments ───────────────────────────────────────────────────────
-- username / user_avatar dénormalisés (snapshot au moment du commentaire),
-- comme pour la table captures, pour éviter une jointure à chaque lecture.
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  capture_id uuid references public.captures(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  username text not null,
  user_avatar text,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz default now()
);

create index if not exists comments_capture_idx
  on public.comments (capture_id, created_at);

-- ─── 2. RLS ──────────────────────────────────────────────────────────────────
alter table public.comments enable row level security;

create policy "comments_select" on public.comments
  for select using (auth.uid() is not null);

create policy "comments_insert" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "comments_delete" on public.comments
  for delete using (auth.uid() = user_id);

-- ─── 3. Grants ───────────────────────────────────────────────────────────────
grant select, insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;

-- ─── 4. Compteur captures.comments synchronisé par trigger ───────────────────
create or replace function public.handle_comment_count()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.captures set comments = comments + 1 where id = new.capture_id;
  elsif (tg_op = 'DELETE') then
    update public.captures set comments = greatest(comments - 1, 0) where id = old.capture_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.handle_comment_count();
