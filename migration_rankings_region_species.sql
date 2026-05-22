-- ════════════════════════════════════════════════════════════════════════════
-- Migration : classements régionaux + par espèce (issue #6)
-- À exécuter dans Supabase > SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Région normalisée sur le profil utilisateur ──────────────────────────
-- `location` reste le texte libre d'affichage ("Bretagne, France").
-- `region` est la valeur normalisée (clé de regroupement) choisie dans une liste.
alter table public.users
  add column if not exists region text;

-- ─── 2. Dimensions region + species sur les classements ──────────────────────
-- species : '' pour les types non liés à une espèce (global, regional, friends),
--           sinon l'id de l'espèce (ex: 'carp', 'pike').
-- region  : null sauf pour les lignes de type 'regional'.
alter table public.rankings
  add column if not exists species text not null default '';

alter table public.rankings
  add column if not exists region text;

-- ─── 3. Nouvelle clé d'unicité incluant l'espèce ─────────────────────────────
-- Un utilisateur peut apparaître dans plusieurs classements d'espèce pour une
-- même période ; l'ancienne clé (type, period, user_id) l'empêchait.
alter table public.rankings
  drop constraint if exists rankings_type_period_user_id_key;

alter table public.rankings
  add constraint rankings_type_period_species_user_id_key
  unique (type, period, species, user_id);

-- ─── 4. Index pour les requêtes régionales et par espèce ─────────────────────
create index if not exists rankings_regional_idx
  on public.rankings (type, period, region, rank asc);

create index if not exists rankings_species_idx
  on public.rankings (type, period, species, rank asc);
