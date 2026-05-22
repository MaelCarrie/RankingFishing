# STATE.md — État actuel du projet RankingFishing

> Résumé complet pour reprendre le projet dans un nouveau contexte Claude.
> Dernière mise à jour : 2026-05-20

---

## Stack technique

- **Frontend** : React Native + Expo SDK 54 (RN 0.81.5) + TypeScript
- **State** : Redux Toolkit (5 slices : auth, captures, rankings, chat, badges)
- **Backend** : Supabase
  - Auth email/password
  - PostgreSQL (base de données)
  - Storage (photos captures + avatars)
  - Realtime (chat)
  - Edge Function (recalcul classements)
- **Project Supabase** : `https://flhqlktregfwvomzprlo.supabase.co`

---

## État de la base de données Supabase

### Tables ✅


| Table                       | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `users`                     | Profils utilisateurs (lié à `auth.users`)      |
| `user_stats`                | Stats de pêche (captures, poids, rang...)      |
| `user_specialties`          | Types de pêche par user                        |
| `species`                   | Espèces de poissons — **peuplée** (15 espèces) |
| `spots`                     | Spots de pêche (Premium)                       |
| `captures`                  | Publications de captures                       |
| `capture_photos`            | Photos liées aux captures                      |
| `capture_likes`             | Likes sur les captures                         |
| `conversations`             | Conversations chat                             |
| `conversation_participants` | Participants aux conversations                 |
| `messages`                  | Messages du chat                               |
| `rankings`                  | Classements calculés par l'Edge Function       |
| `badges`                    | Badges disponibles — **peuplés** (9 badges)    |
| `user_badges`               | Badges débloqués par utilisateur               |


### Données de référence ✅

- **15 espèces** : carp, pike, zander, catfish, brown_trout, rainbow_trout, perch, black_bass, sea_bass, sea_bream, tench, roach, eel, salmon, asp
- **9 badges** : badge_first_catch, badge_10_catches, badge_50_catches, badge_100_catches, badge_big_carp, badge_big_pike, badge_top100, badge_validator, badge_spring

### Fonctions SQL ✅

```sql
increment_likes(p_capture_id uuid)      -- RPC pour liker
decrement_likes(p_capture_id uuid)      -- RPC pour unliker
handle_new_user()                        -- Trigger : crée public.users à l'inscription
handle_capture_stats()                   -- Trigger : met à jour user_stats + XP après capture
refresh_global_ranks()                   -- Recalcule global_rank de tous les users depuis captures
```

### Triggers ✅

```sql
on_auth_user_created   -- after insert on auth.users → crée users + user_stats
on_capture_stats       -- after insert/update/delete on captures → met à jour user_stats + XP + rangs
```

**Détail de `handle_capture_stats` :**

- INSERT publié → +1 `total_captures`, +poids `total_weight_grams`, màj `biggest_fish`, +XP (`max(10, score/5)`) dans `users`
- UPDATE brouillon→publié → même chose
- DELETE publié → -1 captures, -poids
- Appelle `refresh_global_ranks()` à chaque opération

### Realtime ✅

```sql
alter publication supabase_realtime add table public.messages;
```

### RLS (Row Level Security) ✅

Activé sur toutes les tables. Policies créées pour :

- `users` : select (connecté), insert/update (soi-même)
- `user_stats` : select (connecté), insert/update (soi-même)
- `user_specialties` : select (connecté), insert/update/delete (soi-même)
- `captures` : select (publiées ou les siennes), insert/update/delete (soi-même)
- `capture_photos` : select/insert (connecté)
- `capture_likes` : select/insert/delete (soi-même)
- `species` : select (public)
- `badges` : select (connecté)
- `rankings` : select (connecté), écriture réservée au service_role

### Grants ✅

```sql
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
```

### Storage buckets ✅


| Bucket     | Mode   | Usage              |
| ---------- | ------ | ------------------ |
| `captures` | Public | Photos de captures |
| `avatars`  | Public | Photos de profil   |


### Edge Function ✅ (déployée)

`recalculate-rankings` — calcule les scores agrégés par user pour 5 périodes (day/week/month/year/alltime), upsert dans `rankings`, **et synchronise `user_stats.global_rank`** depuis le classement global alltime.

Pour l'invoquer manuellement :

```bash
curl -X POST "https://flhqlktregfwvomzprlo.supabase.co/functions/v1/recalculate-rankings" \
  -H "Authorization: Bearer <ANON_KEY>"
```

---

## État du code

### `src/config/supabase.ts` ✅

- Client Supabase configuré avec `AsyncStorage` pour persister la session React Native
- `USE_MOCK_DATA = false`

### `src/api/auth.ts` ✅

- `signIn` / `register` / `signOut` / `resetPassword` branchés sur Supabase
- `fetchUserProfile` : **exportée** — joint `users + user_stats + user_specialties`
- `refreshAndStoreUser(userId)` : **exportée** — fetche le profil Supabase ET persiste dans AsyncStorage (utilisée par `refreshUser` thunk)
- `register` utilise `upsert` (compatible avec le trigger `on_auth_user_created`)

### `src/api/captures.ts` ✅

- `fetchFeed` / `fetchMyCaptures` / `publishCapture` / `toggleLike` / `deleteCapture` branchés Supabase
- `mapCapture` : fallback `species_data ?? FISH_SPECIES.find(s_id) ?? FISH_SPECIES[0]` pour les captures sans `species_data`

### `src/api/storage.ts` ✅

- Upload via **nouvelle API `expo-file-system/next`** (`File` + `.bytes()`)
- Plus de dépendance à `base64-arraybuffer`
- `uploadCapturePhoto(userId, captureId, localUri)` et `uploadAvatar(userId, localUri)`

### `src/api/rankings.ts` ✅

- Requête la table `rankings`, mappe `totalCaptures`

### `src/api/badges.ts` ✅

- Joint `badges + user_badges!left`, mappe `target_label`

### `src/api/chat.ts` ✅

- `fetchConversations(userId)` / `fetchMessages` / `sendMessage` branchés
- `subscribeToMessages` via Supabase Realtime (`postgres_changes`)

### `src/store/slices/authSlice.ts` ✅

- Thunk `refreshUser(userId)` : fetche Supabase + persiste AsyncStorage + màj Redux
- Utilisé après publication d'une capture et au démarrage de l'app

### `src/store/slices/capturesSlice.ts` ✅

- Déduplication des captures dans le feed

### `src/store/slices/chatSlice.ts` ✅

- `addMessage` avec déduplication pour le temps réel

### `src/navigation/AppNavigator.tsx` ✅

- Au démarrage : `initAuth` (lit AsyncStorage, rapide) → puis `refreshUser` en arrière-plan (fetche Supabase, màj silencieuse)

### `src/screens/captures/NewCaptureScreen.tsx` ✅

- Après publication (non-brouillon) : dispatch `refreshUser(user.id)` pour màj immédiate des stats dans le profil

### `src/components/captures/CaptureCard.tsx` ✅

- Guard défensif `capture.species?.icon ?? '🐟'` (évite crash si `species_data` null en base)

---

## Ce qui fonctionne (MVP fonctionnel)

- ✅ Authentification email/password complète
- ✅ Feed de captures (lecture + like)
- ✅ Publication de capture (photos, espèce, poids, taille, météo, brouillon/publié)
- ✅ Upload de photos vers Supabase Storage
- ✅ Stats profil mises à jour automatiquement après capture (trigger SQL)
- ✅ XP gagné à chaque publication (trigger SQL, `max(10, score/5)`)
- ✅ Rang global calculé automatiquement (trigger + Edge Function)
- ✅ Profil rafraîchi au démarrage et après publication
- ✅ Classements (table `rankings` peuplée par Edge Function)
- ✅ Chat temps réel (Supabase Realtime)
- ✅ Badges (affichage + progression)

---

## Ce qui ne fonctionne pas encore / TODO

### Priorité haute — MVP incomplet

- **Écran détail d'une capture** : vue full-screen avec photos, likes, commentaires
- **Système de commentaires** : poster/lire des commentaires sur une capture
- **Page profil d'un autre utilisateur** : consulter les stats, captures, badges d'un autre pêcheur
- **Système de follow** : suivre un utilisateur, onglet "Amis" dans les classements
- **Recherche d'utilisateurs** dans le chat pour démarrer une conversation
- **Logique de déblocage des badges** : trigger ou Edge Function qui check les conditions après chaque capture
- **Mise à jour `user_stats` via Edge Function** : `global_rank` est mis à jour par l'Edge Function mais `regional_rank` n'existe pas encore

### Priorité moyenne — Phase 2

- **Google OAuth** (nécessite Google Cloud Console)
- **Notifications push** : `expo-notifications` → nouveaux messages, badges débloqués, likes
- **Pagination du feed** : `.range(0, 29)` + curseur
- **Compression images** avant upload (`expo-image-manipulator`)
- **Carte des spots** (Premium) : `expo-location` + maps
- **Abonnement Premium** : Stripe / Apple Pay / Google Pay
- **Classements régionaux** : actuellement tout est `type = 'global'`, `regional_rank` jamais mis à jour
- **Partage de captures** dans le chat et sur réseaux sociaux

### Priorité basse

- Mode sombre
- Animations (react-native-reanimated)
- Onboarding (3-4 écrans pour nouveaux utilisateurs)
- Email templates personnalisés (Supabase Auth > Email Templates)
- Deep link pour confirmation email
- Export données utilisateur (RGPD)
- Tests unitaires et E2E

---

## Problèmes rencontrés et solutions appliquées


| Problème                                | Solution                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Firebase nécessite CB                   | Migré vers Supabase                                                                                   |
| `permission denied for table users`     | Grants SQL + AsyncStorage dans le client Supabase                                                     |
| `permission denied for table captures`  | Session JWT expirée (reconnexion) + grants service_role                                               |
| `Cannot coerce result to single JSON`   | Trigger `on_auth_user_created` manquant                                                               |
| FK violation `captures_species_id_fkey` | Table `species` vide → seed data insérée                                                              |
| Photos uploadées à 0 bytes              | `fetch().blob()` cassé sur Expo SDK 50+ → remplacé par `expo-file-system/next` + `File.bytes()`       |
| `FileSystem.EncodingType` undefined     | Migration vers nouvelle API `expo-file-system/next` (File class)                                      |
| `readAsStringAsync` déprécié            | Migration vers `expo-file-system/next`                                                                |
| Session perdue entre requêtes           | `AsyncStorage` ajouté dans `createClient`                                                             |
| Captures ne s'affichent plus            | `species_data` null en base → fallback dans `mapCapture` + guard dans `CaptureCard`                   |
| Stats profil toujours à 0               | Trigger `handle_capture_stats` + `refresh_global_ranks()` + `refreshUser` thunk                       |
| Stats ne persistent pas au redémarrage  | `refreshUser` appelait `fetchUserProfile` sans `storeUser` → `refreshAndStoreUser`                    |
| Stats pas à jour au redémarrage         | `initAuth` lisait seulement AsyncStorage → ajout de `refreshUser` en arrière-plan dans `AppNavigator` |
| Edge Function "permission denied"       | Grants SQL pour `service_role`                                                                        |
| `refresh_global_ranks()` inexistante    | Fonction créée séparément dans SQL Editor                                                             |


