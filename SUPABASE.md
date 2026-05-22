# SUPABASE.md — Guide complet d'intégration Supabase

> Guide de A à Z pour brancher Supabase à RankingFishing.
> Supabase = Auth + PostgreSQL + Storage + Realtime. Gratuit sans carte bancaire.

---

## Table des matières

1. [Créer le projet Supabase](#1-créer-le-projet-supabase)
2. [Installer le SDK](#2-installer-le-sdk)
3. [Configurer les clés](#3-configurer-les-clés)
4. [Créer les tables SQL](#4-créer-les-tables-sql)
5. [Row Level Security (RLS)](#5-row-level-security-rls)
6. [Authentification](#6-authentification)
7. [Storage — Upload de photos](#7-storage--upload-de-photos)
8. [Implémenter les services API](#8-implémenter-les-services-api)
9. [Temps réel — Chat](#9-temps-réel--chat)
10. [Edge Functions — Rankings automatiques](#10-edge-functions--rankings-automatiques)
11. [Checklist de mise en production](#11-checklist-de-mise-en-production)
12. [Système social — Recherche et follow](#12-système-social--recherche-et-follow-issues-12--14)

---

## 1. Créer le projet Supabase

1. Aller sur **[supabase.com](https://supabase.com)**
2. Cliquer **"Start your project"** — se connecter avec GitHub (recommandé)
3. Cliquer **"New project"**
4. Remplir :
   - **Name** : `rankingfishing`
   - **Database password** : générer un mot de passe fort et le noter (tu en auras besoin)
   - **Region** : `West EU (Ireland)` — le plus proche de la France
5. Cliquer **"Create new project"** — attendre ~2 minutes

Une fois le projet créé, aller dans **Project Settings > API** et noter :
- **Project URL** : `https://flhqlktregfwvomzprlo.supabase.co`
- **anon public** key : `sb_publishable_icl1RPff0HOzIpW2DkLZTw_YcTmZx1G` (longue chaîne)

---

## 2. Installer le SDK

Dans le dossier `RankingFishingExpo/`, lancer :

```bash
npm install
```

> `@supabase/supabase-js` est déjà dans `package.json` — le `npm install` l'installera.

---

## 3. Configurer les clés

Ouvrir `RankingFishingExpo/src/config/supabase.ts` et remplacer les placeholders :

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxxxx.supabase.co';        // ← ta Project URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ← ton anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const USE_MOCK_DATA = false; // ← passer à false !
```

---

## 4. Créer les tables SQL

Dans la console Supabase → **SQL Editor** → **New query**, coller et exécuter ce script :

```sql
-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  username text unique not null,
  avatar_url text,
  bio text default '',
  location text default '',         -- texte libre ex: "Bretagne, France"
  is_premium boolean default false,
  xp integer default 0,
  level integer default 1 check (level between 1 and 7),
  level_name text default 'Novice' check (level_name in (
    'Novice', 'Apprenti pêcheur', 'Amateur',
    'Confirmé', 'Expert', 'Maître pêcheur', 'Légende'
  )),
  created_at timestamptz default now()
);

-- Stats de pêche (séparées pour faciliter les mises à jour fréquentes)
create table public.user_stats (
  user_id uuid references public.users(id) on delete cascade primary key,
  total_captures integer default 0,
  total_weight_grams integer default 0,
  -- CaptureRef complet : { captureId, species, weightGrams, sizeCm }
  biggest_fish jsonb default null,
  global_rank integer,
  regional_rank integer,
  challenges_won integer default 0
);

-- Spécialités de pêche par utilisateur
create table public.user_specialties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  type text not null check (type in (
    'carp', 'predators', 'sea', 'trout',
    'catfish', 'coarse', 'streetfishing', 'fly'
  )),
  level text not null check (level in ('beginner', 'intermediate', 'expert')) default 'beginner',
  unique (user_id, type)
);

-- ─── Espèces ─────────────────────────────────────────────────────────────────
create table public.species (
  id text primary key,
  name text not null,
  name_fr text not null,
  category text not null check (category in ('freshwater', 'saltwater', 'migratory')),
  icon text not null,
  score_coefficient float not null default 1.0,
  rarity_score integer default 0 check (rarity_score between 0 and 20)
);

-- ─── Spots de pêche (Premium) ─────────────────────────────────────────────────
create table public.spots (
  id uuid default gen_random_uuid() primary key,
  name text,
  latitude float not null,
  longitude float not null,
  created_by uuid references public.users(id) on delete set null,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- ─── Captures ────────────────────────────────────────────────────────────────
create table public.captures (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade,
  username text not null,
  user_avatar text,
  species_id text references public.species(id),
  species_data jsonb not null,      -- snapshot FishSpecies au moment de la capture
  weight_grams integer not null check (weight_grams > 0),
  size_cm float check (size_cm > 0),
  description text,
  weather text check (weather in ('sunny', 'cloudy', 'rainy', 'windy', 'stormy', 'foggy')),
  -- Localisation Premium : coordonnées brutes + spot nommé optionnel
  latitude float,
  longitude float,
  location_name text,               -- ex: "Loire (premium)"
  spot_id uuid references public.spots(id) on delete set null,
  published_at timestamptz default now(),
  is_draft boolean default false,
  validation_score integer default 0 check (validation_score between 0 and 100),
  score integer default 0,
  likes integer default 0,
  comments integer default 0
);

-- Photos d'une capture
create table public.capture_photos (
  id uuid default gen_random_uuid() primary key,
  capture_id uuid references public.captures(id) on delete cascade,
  url text not null,
  sort_order integer default 0
);

-- Likes
create table public.capture_likes (
  capture_id uuid references public.captures(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (capture_id, user_id)
);

-- ─── Chat ────────────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('private', 'group')) default 'private',
  name text,
  avatar_url text,
  last_message jsonb,               -- snapshot Message pour l'affichage en liste
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  unread_count integer default 0,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.users(id),
  sender_name text not null,
  sender_avatar text,
  content text not null,
  type text not null check (type in ('text', 'image', 'capture')) default 'text',
  -- Si type = 'capture' : snapshot CaptureRef { captureId, species, weightGrams, sizeCm }
  capture_ref jsonb default null,
  sent_at timestamptz default now(),
  is_read boolean default false
);

-- ─── Badges ──────────────────────────────────────────────────────────────────
create table public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  category text not null check (category in ('progression', 'excellence', 'community', 'seasonal')),
  tier text not null check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  xp_reward integer default 0,
  -- Condition de déblocage exploitable automatiquement
  target_value integer not null,    -- ex: 10
  target_metric text not null,      -- ex: 'total_captures', 'total_weight_grams', 'species_id'
  target_label text not null        -- ex: "10 captures" (affiché dans l'app)
);

create table public.user_badges (
  user_id uuid references public.users(id) on delete cascade,
  badge_id text references public.badges(id),
  progress integer default 0 check (progress between 0 and 100),
  is_unlocked boolean default false,
  unlocked_at timestamptz,
  primary key (user_id, badge_id)
);

-- ─── Rankings ────────────────────────────────────────────────────────────────
create table public.rankings (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('global', 'regional', 'species', 'friends')),
  period text not null check (period in ('day', 'week', 'month', 'year', 'alltime')),
  user_id uuid references public.users(id),
  username text not null,
  avatar_url text,
  score integer default 0,
  capture_count integer default 0,
  top_species text,
  level integer default 1,
  rank integer not null,
  updated_at timestamptz default now(),
  unique (type, period, user_id)
);

-- ─── Index pour les performances ─────────────────────────────────────────────
create index on public.captures(user_id);
create index on public.captures(is_draft, published_at desc);
create index on public.messages(conversation_id, sent_at asc);
create index on public.rankings(type, period, rank asc);
create index on public.conversation_participants(user_id);
create index on public.spots(created_by);
```

---

## 5. Row Level Security (RLS)

Le RLS est l'équivalent des règles Firestore — il contrôle qui peut lire/écrire quoi.

Dans **SQL Editor**, exécuter :

```sql
-- ─── Activer RLS sur toutes les tables ───────────────────────────────────────
alter table public.users enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_specialties enable row level security;
alter table public.captures enable row level security;
alter table public.capture_photos enable row level security;
alter table public.capture_likes enable row level security;
alter table public.spots enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.rankings enable row level security;

-- ─── Users ───────────────────────────────────────────────────────────────────
create policy "users_select" on public.users
  for select using (auth.uid() is not null);

create policy "users_insert" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);  -- empêche de modifier l'id d'un autre

-- ─── User stats ──────────────────────────────────────────────────────────────
-- Lecture : tout connecté peut voir les stats (pour les profils publics)
create policy "user_stats_select" on public.user_stats
  for select using (auth.uid() is not null);

-- Écriture : uniquement ses propres stats
create policy "user_stats_insert" on public.user_stats
  for insert with check (auth.uid() = user_id);

create policy "user_stats_update" on public.user_stats
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── User specialties ────────────────────────────────────────────────────────
create policy "user_specialties_select" on public.user_specialties
  for select using (auth.uid() is not null);

create policy "user_specialties_insert" on public.user_specialties
  for insert with check (auth.uid() = user_id);

create policy "user_specialties_update" on public.user_specialties
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_specialties_delete" on public.user_specialties
  for delete using (auth.uid() = user_id);

-- ─── Captures ────────────────────────────────────────────────────────────────
-- Lecture : captures publiées lisibles par tous + ses propres brouillons
create policy "captures_select" on public.captures
  for select using (
    auth.uid() is not null and
    (is_draft = false or user_id = auth.uid())
  );

create policy "captures_insert" on public.captures
  for insert with check (auth.uid() = user_id);

create policy "captures_update" on public.captures
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "captures_delete" on public.captures
  for delete using (auth.uid() = user_id);

-- ─── Photos de captures ──────────────────────────────────────────────────────
-- Lecture : visible si la capture parente est visible
create policy "capture_photos_select" on public.capture_photos
  for select using (
    exists (
      select 1 from public.captures
      where id = capture_id
        and (is_draft = false or user_id = auth.uid())
    )
  );

create policy "capture_photos_insert" on public.capture_photos
  for insert with check (
    auth.uid() = (select user_id from public.captures where id = capture_id)
  );

create policy "capture_photos_delete" on public.capture_photos
  for delete using (
    auth.uid() = (select user_id from public.captures where id = capture_id)
  );

-- ─── Likes ───────────────────────────────────────────────────────────────────
create policy "likes_select" on public.capture_likes
  for select using (auth.uid() is not null);

create policy "likes_insert" on public.capture_likes
  for insert with check (auth.uid() = user_id);

create policy "likes_delete" on public.capture_likes
  for delete using (auth.uid() = user_id);

-- ─── Spots (Premium) ─────────────────────────────────────────────────────────
-- Lecture : spots publics lisibles par tous, spots privés uniquement par leur créateur
create policy "spots_select" on public.spots
  for select using (
    auth.uid() is not null and
    (is_public = true or created_by = auth.uid())
  );

create policy "spots_insert" on public.spots
  for insert with check (auth.uid() = created_by);

create policy "spots_update" on public.spots
  for update using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "spots_delete" on public.spots
  for delete using (auth.uid() = created_by);

-- ─── Conversations ───────────────────────────────────────────────────────────
-- Lecture : uniquement les conversations où l'utilisateur est participant
create policy "conversations_select" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversations.id and user_id = auth.uid()
    )
  );

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() is not null);

-- Mise à jour du lastMessage par n'importe quel participant
create policy "conversations_update" on public.conversations
  for update using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversations.id and user_id = auth.uid()
    )
  );

-- ─── Participants ─────────────────────────────────────────────────────────────
create policy "participants_select" on public.conversation_participants
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy "participants_insert" on public.conversation_participants
  for insert with check (auth.uid() is not null);

-- ─── Messages ────────────────────────────────────────────────────────────────
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id and user_id = auth.uid()
    )
  );

-- ─── Badges : définitions lisibles par tous les connectés ────────────────────
create policy "badges_select" on public.badges
  for select using (auth.uid() is not null);

-- ─── User badges ─────────────────────────────────────────────────────────────
create policy "user_badges_select" on public.user_badges
  for select using (auth.uid() = user_id);

create policy "user_badges_insert" on public.user_badges
  for insert with check (auth.uid() = user_id);

create policy "user_badges_update" on public.user_badges
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Rankings ────────────────────────────────────────────────────────────────
-- Lecture seule — l'écriture est réservée aux Edge Functions (service role)
create policy "rankings_select" on public.rankings
  for select using (auth.uid() is not null);
```

---

## 6. Authentification

### 6.1 Activer les providers

Dans **Authentication > Providers** :
- **Email** → activer (déjà activé par défaut)
- **Google** → activer → renseigner Client ID et Secret depuis Google Cloud Console

### 6.2 Réécrire `src/api/auth.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { User } from '../store/types';
import { MOCK_CURRENT_USER } from './mock/data';
import { delay, generateId } from '../utils/helpers';

const USER_STORAGE_KEY = '@rankingfishing_user';

// ─── Persistance locale ───────────────────────────────────────────────────────

export async function getStoredUser(): Promise<User | null> {
  try {
    const json = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

async function storeUser(user: User): Promise<void> {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_STORAGE_KEY);
}

// ─── Helper : récupérer le profil depuis Supabase ────────────────────────────

async function fetchUserProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*, user_stats(*), user_specialties(*)')
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Mapper les données Supabase vers le type User du projet
  return {
    id: data.id,
    email: data.email,
    username: data.username,
    avatar: data.avatar_url,
    bio: data.bio,
    location: data.location,
    isPremium: data.is_premium,
    xp: data.xp,
    level: data.level,
    levelName: data.level_name,
    specialties: (data.user_specialties ?? []).map((s: any) => ({
      type: s.type,
      level: s.level,
    })),
    stats: {
      totalCaptures: data.user_stats?.total_captures ?? 0,
      totalWeightGrams: data.user_stats?.total_weight_grams ?? 0,
      biggestFish: null,
      globalRank: data.user_stats?.global_rank ?? null,
      regionalRank: data.user_stats?.regional_rank ?? null,
      challengesWon: data.user_stats?.challenges_won ?? 0,
    },
    createdAt: data.created_at,
  };
}

// ─── Connexion ────────────────────────────────────────────────────────────────

export async function signIn(credentials: { email: string; password: string }): Promise<User> {
  if (USE_MOCK_DATA) {
    await delay(800);
    const user = { ...MOCK_CURRENT_USER, email: credentials.email };
    await storeUser(user);
    return user;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) throw error;

  const user = await fetchUserProfile(data.user.id);
  await storeUser(user);
  return user;
}

// ─── Inscription ──────────────────────────────────────────────────────────────

export async function register(data: {
  email: string;
  password: string;
  username: string;
  specialties?: string[];
}): Promise<User> {
  if (USE_MOCK_DATA) {
    await delay(1000);
    const newUser: User = {
      ...MOCK_CURRENT_USER,
      id: generateId(),
      email: data.email,
      username: data.username,
      xp: 0,
      level: 1,
      levelName: 'Novice',
      stats: {
        totalCaptures: 0,
        totalWeightGrams: 0,
        biggestFish: null,
        globalRank: null,
        regionalRank: null,
        challengesWon: 0,
      },
      createdAt: new Date().toISOString(),
    };
    await storeUser(newUser);
    return newUser;
  }

  // 1. Créer le compte auth Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (authError) throw authError;
  const userId = authData.user!.id;

  // 2. Créer le profil dans public.users
  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    email: data.email,
    username: data.username,
    xp: 0,
    level: 1,
    level_name: 'Novice',
    is_premium: false,
  });

  if (profileError) throw profileError;

  // 3. Créer les stats initiales
  await supabase.from('user_stats').insert({ user_id: userId });

  // 4. Créer les spécialités si fournies
  if (data.specialties && data.specialties.length > 0) {
    await supabase.from('user_specialties').insert(
      data.specialties.map((type) => ({ user_id: userId, type, level: 1 }))
    );
  }

  const newUser = await fetchUserProfile(userId);
  await storeUser(newUser);
  return newUser;
}

// ─── Déconnexion ─────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(300);
    await clearStoredUser();
    return;
  }
  await supabase.auth.signOut();
  await clearStoredUser();
}

// ─── Réinitialisation du mot de passe ────────────────────────────────────────

export async function resetPassword(email: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(800);
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
```

---

## 7. Storage — Upload de photos

### 7.1 Créer les buckets

Dans **Storage** → **New bucket** :
- Nom : `captures` — **Public bucket** (les photos sont lisibles par tous)
- Nom : `avatars` — **Public bucket**

### 7.2 Policies Storage

Dans **Storage > Policies**, pour chaque bucket :

```sql
-- Bucket "captures" : lecture publique, upload par l'auteur uniquement
create policy "captures_storage_select"
  on storage.objects for select
  using (bucket_id = 'captures');

create policy "captures_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'captures' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Bucket "avatars" : idem
create policy "avatars_storage_select"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_storage_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### 7.3 Fonction d'upload dans l'app

Créer `src/api/storage.ts` :

```typescript
import { supabase } from '../config/supabase';

export async function uploadCapturePhoto(
  userId: string,
  captureId: string,
  localUri: string
): Promise<string> {
  // Convertir l'URI local en ArrayBuffer
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const fileName = `${userId}/${captureId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from('captures')
    .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from('captures').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();

  const fileName = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
  return data.publicUrl;
}
```

---

## 8. Implémenter les services API

### 8.1 `src/api/captures.ts` ✅ Implémenté

Voir le fichier source — points clés :
- Supabase génère l'UUID de la capture (pas de `generateId()`)
- `latitude` / `longitude` / `location_name` remplacent l'ancien `location jsonb`
- `.maybeSingle()` pour le check de like (pas `.single()` qui planterait si absent)
- RPC `p_capture_id` comme paramètre nommé
- `mapCapture` reconstruit `location: { latitude, longitude }` depuis les colonnes plates

> **À exécuter dans Supabase SQL Editor** — fonctions RPC pour les likes :

```sql
create or replace function increment_likes(p_capture_id uuid)
returns void as $$
  update public.captures set likes = likes + 1 where id = p_capture_id;
$$ language sql security definer;

create or replace function decrement_likes(p_capture_id uuid)
returns void as $$
  update public.captures set likes = greatest(likes - 1, 0) where id = p_capture_id;
$$ language sql security definer;
```

---

### 8.2 `src/api/rankings.ts` ✅ Implémenté

Voir le fichier source — points clés :
- Mappe `totalCaptures` (pas `captureCount`) pour correspondre au type `RankingEntry`
- `isCurrentUser: false` résolu côté slice Redux en comparant avec l'utilisateur connecté

---

### 8.3 `src/api/badges.ts` ✅ Implémenté

Voir le fichier source — points clés :
- Jointure `user_badges!left` pour avoir la progression même si l'utilisateur n'a pas encore de ligne
- Mappe `target: row.target_label` (colonne renommée lors de la refonte des badges)

---

## 9. Temps réel — Chat

Supabase propose un système de **Realtime** basé sur les changements PostgreSQL.

### 9.1 `src/api/chat.ts`

```typescript
import { supabase, USE_MOCK_DATA } from '../config/supabase';
import { Conversation, Message } from '../store/types';

// ─── Conversations ────────────────────────────────────────────────────────────

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  if (USE_MOCK_DATA) { /* ... mock ... */ }

  const { data, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id, unread_count, conversations(*)')
    .eq('user_id', userId)
    .order('conversations(updated_at)', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.conversations.id,
    type: row.conversations.type,
    name: row.conversations.name,
    avatar: row.conversations.avatar_url,
    lastMessage: row.conversations.last_message,
    unreadCount: row.unread_count,
    participantIds: [],   // à compléter si besoin
    participantNames: [],
    updatedAt: row.conversations.updated_at,
  }));
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  if (USE_MOCK_DATA) { /* ... mock ... */ }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

// ─── Écouter les messages en temps réel ──────────────────────────────────────

export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(mapMessage(payload.new));
      }
    )
    .subscribe();

  // Retourner la fonction de cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}

// ─── Envoyer un message ───────────────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string,
  senderAvatar?: string
): Promise<Message> {
  if (USE_MOCK_DATA) { /* ... mock ... */ }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar ?? null,
      content,
      type: 'text',
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Mettre à jour le lastMessage de la conversation
  await supabase.from('conversations').update({
    last_message: {
      senderId,
      senderName,
      content,
      sentAt: data.sent_at,
    },
    updated_at: new Date().toISOString(),
  }).eq('id', conversationId);

  return mapMessage(data);
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    content: row.content,
    type: row.type,
    sentAt: row.sent_at,
    isRead: row.is_read,
  };
}create or replace function increment_likes(p_capture_id uuid)
  returns void as $$
    update public.captures set likes = likes + 1 where id = p_capture_id;
  $$ language sql security definer;

  create or replace function decrement_likes(p_capture_id uuid)
  returns void as $$
    update public.captures set likes = greatest(likes - 1, 0) where id =
  p_capture_id;
  $$ language sql security definer;

```

### 9.2 Utiliser `subscribeToMessages` dans `ConversationScreen.tsx`

```typescript
// Dans ConversationScreen
useEffect(() => {
  // Charger les messages existants
  dispatch(fetchMessagesThunk(conversationId));

  // S'abonner aux nouveaux messages en temps réel
  const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
    dispatch(addMessage(newMessage)); // action Redux à créer dans chatSlice
  });

  // Cleanup quand on quitte l'écran
  return () => unsubscribe();
}, [conversationId]);
```

---

## 10. Edge Functions — Rankings automatiques

Les Edge Functions Supabase s'exécutent côté serveur (Deno). Elles remplacent les Cloud Functions Firebase.

### 10.1 Installer Supabase CLI

```bash
npm install -g supabase
supabase login 
supabase init
```

### 10.2 Créer la fonction de recalcul des rankings

```bash
supabase functions new recalculate-rankings
```

Dans `supabase/functions/recalculate-rankings/index.ts` :

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // clé service (pas anon)
  );

  // Calculer les scores globaux all-time
  const { data: captures } = await supabase
    .from('captures')
    .select('user_id, username, user_avatar, score')
    .eq('is_draft', false);

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
      };
    }
    scoreMap[c.user_id].score += c.score;
    scoreMap[c.user_id].capture_count += 1;
  }

  const entries = Object.values(scoreMap)
    .sort((a: any, b: any) => b.score - a.score)
    .map((e: any, i: number) => ({
      ...e,
      rank: i + 1,
      type: 'global',
      period: 'alltime',
      level: 1,
      updated_at: new Date().toISOString(),
    }));

  // Upsert dans la table rankings
  await supabase.from('rankings').upsert(entries, {
    onConflict: 'type,period,user_id',
  });

  return new Response(JSON.stringify({ updated: entries.length }));
});
```

### 10.3 Déployer

```bash
supabase functions deploy recalculate-rankings
```

---

## 11. Checklist de mise en production

### Supabase Console
- [ ] RLS activé sur toutes les tables
- [ ] Toutes les policies testées (onglet **Auth > Policies > Simulate**)
- [ ] Buckets Storage créés (`captures`, `avatars`) en mode **public**
- [ ] Policies Storage configurées
- [ ] Email templates personnalisés (**Authentication > Email Templates**)
- [ ] URL de redirection configurée (**Authentication > URL Configuration**)

### Code
- [ ] `USE_MOCK_DATA = false` dans `supabase.ts`
- [ ] Aucune clé en dur dans le code
- [ ] Toutes les fonctions mock remplacées par les vraies
- [ ] `subscribeToMessages` avec cleanup dans `ConversationScreen`
- [ ] Gestion des erreurs sur tous les appels `supabase.*`

### Performance
- [ ] Index SQL créés (déjà dans le script section 4)
- [ ] Fonctions SQL `increment_likes`/`decrement_likes` créées
- [ ] Pagination sur le feed (`.range(0, 29)` + curseur)
- [ ] Compression des images avant upload (`expo-image-manipulator`)

---
create or replace function increment_likes(p_capture_id uuid)
  returns void as $$
    update public.captures set likes = likes + 1 where id = p_capture_id;
  $$ language sql security definer;

  create or replace function decrement_likes(p_capture_id uuid)
  returns void as $$
    update public.captures set likes = greatest(likes - 1, 0) where id =
  p_capture_id;
  $$ language sql security definer;

## 12. Système social — Recherche et follow (issues #12 — #14)

Ajouts BD pour les fonctionnalités sociales : profil public, recherche d'utilisateurs, système de follow avec demandes d'acceptation.

### 12.1 SQL à exécuter (idempotent — rejouable sans casse)

```sql
-- ─── 1. Compteurs sur users ─────────────────────────────────────────────────
alter table users add column if not exists followers_count int not null default 0;
alter table users add column if not exists following_count int not null default 0;

-- ─── 2. Table follows (relations acceptées) ─────────────────────────────────
create table if not exists follows (
  follower_id uuid not null references users(id) on delete cascade,
  followed_id uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id != followed_id)
);
create index if not exists follows_followed_id_idx on follows(followed_id);
create index if not exists follows_follower_id_idx on follows(follower_id);

-- ─── 3. Table follow_requests (en attente d'acceptation) ────────────────────
create table if not exists follow_requests (
  requester_id uuid not null references users(id) on delete cascade,
  target_id    uuid not null references users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (requester_id, target_id),
  check (requester_id != target_id)
);
create index if not exists follow_requests_target_id_idx on follow_requests(target_id);

-- ─── 4. Trigger : maj des compteurs (SECURITY DEFINER pour contourner RLS) ──
create or replace function handle_follow_change() returns trigger
language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update users set following_count = following_count + 1 where id = new.follower_id;
    update users set followers_count = followers_count + 1 where id = new.followed_id;
  elsif (tg_op = 'DELETE') then
    update users set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    update users set followers_count = greatest(followers_count - 1, 0) where id = old.followed_id;
  end if;
  return null;
end;
$$;

drop trigger if exists follows_count_trigger on follows;
create trigger follows_count_trigger
after insert or delete on follows
for each row execute function handle_follow_change();

-- ─── 5. RPC : accepter une demande (atomique, SECURITY DEFINER) ─────────────
create or replace function accept_follow_request(p_requester uuid)
returns void language plpgsql security definer as $$
declare v_target uuid := auth.uid();
begin
  if v_target is null then raise exception 'Non authentifié'; end if;
  if not exists (select 1 from follow_requests
                 where requester_id = p_requester and target_id = v_target) then
    raise exception 'Demande introuvable';
  end if;
  delete from follow_requests where requester_id = p_requester and target_id = v_target;
  insert into follows (follower_id, followed_id) values (p_requester, v_target)
    on conflict do nothing;
end;
$$;

-- ─── 6. RPC : refuser une demande ───────────────────────────────────────────
create or replace function decline_follow_request(p_requester uuid)
returns void language plpgsql security definer as $$
declare v_target uuid := auth.uid();
begin
  if v_target is null then raise exception 'Non authentifié'; end if;
  delete from follow_requests where requester_id = p_requester and target_id = v_target;
end;
$$;

-- ─── 7. Row Level Security ──────────────────────────────────────────────────
alter table follows enable row level security;
alter table follow_requests enable row level security;

drop policy if exists follows_select on follows;
create policy follows_select on follows for select to authenticated using (true);

drop policy if exists follows_delete on follows;
create policy follows_delete on follows for delete to authenticated using (auth.uid() = follower_id);

drop policy if exists follow_requests_select on follow_requests;
create policy follow_requests_select on follow_requests for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists follow_requests_insert on follow_requests;
create policy follow_requests_insert on follow_requests for insert to authenticated
  with check (auth.uid() = requester_id);

drop policy if exists follow_requests_delete on follow_requests;
create policy follow_requests_delete on follow_requests for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = target_id);

-- ─── 8. Réconciliation des compteurs (à exécuter une seule fois si désynchro)
update users u set
  followers_count = (select count(*) from follows where followed_id = u.id),
  following_count = (select count(*) from follows where follower_id = u.id);
```

### 12.2 Architecture côté app

| Couche               | Fichier                                                        |
| -------------------- | -------------------------------------------------------------- |
| API recherche        | `src/api/users.ts` (`searchUsers`, `fetchTopUsers`)            |
| API follow           | `src/api/follows.ts` (10 fonctions, incluant `fetchRelationship`) |
| State Redux          | `auth.pendingRequestsCount` + thunk `refreshPendingCount`     |
| Composant partagé    | `src/components/social/UserRow.tsx`                            |
| Profil public        | `src/screens/profile/UserProfileScreen.tsx`                    |
| Recherche            | `src/screens/search/UserSearchScreen.tsx`                      |
| Listes               | `src/screens/social/FollowListScreen.tsx`                      |
| Demandes pendantes   | `src/screens/social/FollowRequestsScreen.tsx`                  |

### 12.3 Flux complet

1. **A** ouvre le profil de **B** (tap sur avatar dans une capture, ou via recherche)
2. **A** tap "Suivre" → row dans `follow_requests` (A→B). Bouton devient "Demande envoyée"
3. **B** voit la cloche header avec pastille rouge (compteur via `refreshPendingCount`) OU le menu "Demandes (1)" sur son profil
4. **B** ouvre la page demandes → tap ✓ → RPC `accept_follow_request(A)` → la demande est supprimée, row dans `follows` créée, trigger met à jour les compteurs
5. La ligne reste visible avec le bouton "Suivre en retour" (état local)
6. **B** tap "Suivre en retour" → row dans `follow_requests` (B→A). Chip "Demande envoyée"
7. **A** accepte → trigger fire à nouveau, **B** voit "Abonné(e)" (vert) la prochaine fois qu'il revient sur la page (via `useFocusEffect` qui re-check `getFollowStatus`)

### 12.4 Points de robustesse

- **2 RPCs `SECURITY DEFINER`** pour accept/decline → opérations atomiques (delete request + insert follow dans la même transaction)
- **Trigger `SECURITY DEFINER`** indispensable : sans ça, le DELETE de `follows` (direct, non-RPC) fire le trigger en mode `SECURITY INVOKER` et la RLS sur `users` bloque les UPDATE → compteurs désynchros
- **Primary keys composées** sur les 2 tables → impossible d'avoir des doublons
- **Cascade delete** sur `users(id)` → si un compte est supprimé, ses follows/demandes partent avec
- **`check (follower_id != followed_id)`** → impossible de se suivre soi-même

---

## Ordre recommandé d'implémentation

```
Étape 1  →  Créer le projet Supabase + noter les clés (section 1)       ~15 min
Étape 2  →  npm install + configurer supabase.ts (sections 2-3)         ~10 min
Étape 3  →  Créer les tables SQL (section 4)                             ~20 min
Étape 4  →  Configurer les RLS (section 5)                               ~20 min
Étape 5  →  Implémenter Auth Email/Password (section 6)                  ~1h
Étape 6  →  Créer les buckets Storage + implémenter l'upload (section 7) ~45 min
Étape 7  →  Implémenter captures.ts (section 8.1)                        ~1h30
Étape 8  →  Implémenter chat.ts + temps réel (sections 8.3 + 9)          ~1h
Étape 9  →  Implémenter rankings.ts + badges.ts (sections 8.2 + 8.4)     ~45 min
Étape 10 →  Edge Function rankings automatiques (section 10) — optionnel ~1h
Étape 11 →  Système social — follow + recherche (section 12)             ~30 min
```

**Temps total estimé : 1 journée de travail pour un MVP Supabase complet.**

---

*Dernière mise à jour : 2026-05-22*
