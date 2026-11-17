# STATE.md — État actuel du projet RankingFishing

> Résumé pour reprendre le projet dans un nouveau contexte.
> Dernière mise à jour : 2026-11-17 (branche `feat/mvp-completion`, rien n'est encore committé)

---

## Stack technique

- **Frontend** : React Native 0.81.5 + Expo SDK 54 + TypeScript, React Navigation 7
- **State** : Redux Toolkit (5 slices : auth, captures, rankings, chat, badges)
- **Backend** : Supabase (projet `https://flhqlktregfwvomzprlo.supabase.co`)
  - Auth email/mot de passe
  - PostgreSQL, RLS sur toutes les tables, triggers et RPC `SECURITY DEFINER`
  - Storage (buckets publics `captures` et `avatars`)
  - Realtime (table `messages`)
  - Edge Function `recalculate-rankings` (Deno)
- **Tests** : jest + jest-expo (unitaires), Playwright (E2E sur Expo web en mode mock)

Le schéma complet et chaque migration sont décrits dans [`SUPABASE.md`](SUPABASE.md), section 13 pour les ajouts récents.

---

## Ce qui marche

| Domaine | Fonctionnalité | Issues |
| ------- | -------------- | ------ |
| Auth | Inscription, connexion, mot de passe oublié (email/mot de passe Supabase) | — |
| Onboarding | Écrans de présentation au premier lancement (`Welcome`), rejouables depuis les Paramètres | #25 |
| Feed | Pagination par curseur `(published_at, id)`, 20 captures par page (8 en mock), squelettes de chargement | #18 |
| Feed | Like, ouverture du détail, accès direct aux commentaires | #10 |
| Captures | Publication refaite : espèce, poids, taille, météo, date et heure réelles de la prise (`caught_at`), brouillon | #3 |
| Captures | Compression des photos avant upload (1600 px max, JPEG 0,7) | #19 |
| Captures | Écran détail (`CaptureDetail`) : photos, bande de pesée, likes, commentaires | #10, #11 |
| Captures | Commentaires (lire, poster, supprimer les siens), compteur maintenu par trigger | #11, #31 |
| Captures | Partage : vers une conversation du chat ou à l'extérieur (feuille système, sinon copie du lien) | #20, #31 |
| Classements | Onglets Global (top 100), Région (top 50), Espèce (top 50), Amis (moi + les personnes suivies) | #6, #23 |
| Classements | Tri déterministe (score, puis plus ancienne capture, puis `user_id`) | #34 |
| Classements | Ligne de l'utilisateur marquée (`isCurrentUser`) et épinglée en bas s'il est hors du top | #28 |
| Classements | `user_stats.global_rank` et `regional_rank` synchronisés par l'Edge Function | #23 |
| Badges | Déblocage automatique en SQL (`check_and_award_badges`) après chaque capture et quand le rang global change ; XP créditée une seule fois | #15 |
| Badges | Progression « 47 / 50 » (`current_value`), feuille de déblocage après publication | #15 |
| Chat | Conversations 1:1 avec nom et avatar de l'interlocuteur | #29 |
| Chat | Nouveau message : recherche d'un pêcheur et suggestions (`NewConversation`) | #33 |
| Chat | Temps réel : messages de la conversation ouverte et de la boîte de réception, non-lus, accusés de lecture | #7 |
| Chat | Partage d'une capture dans une conversation (carte cliquable vers le détail) | #20 |
| Social | Profil public, bouton « Message » qui ouvre ou crée la conversation | #12 |
| Social | Follow avec demandes (accepter, refuser, suivre en retour), cloche avec compteur | #13 |
| Social | Recherche de pêcheurs, top 10 par XP en état vide | #14 |
| Profil | Modifier le profil (`EditProfile`) : avatar, bio, localisation, région, spécialités | #30 |
| Profil | Paramètres (`Settings`) : préférences de notification (locales), demandes, Premium, onboarding, déconnexion, suppression du compte (RPC `delete_my_account`) | #30 |
| Premium | Écran `Premium` et inscription à la liste d'attente (`premium_waitlist`) ; pas de paiement | #32 |
| Design | Design system « fiche de pesée », nouveau logo et icône d'app | — |
| Qualité | Mode mock, 115 tests jest, 10 tests Playwright | #26 |

---

## Navigation

```
RootStack (AppNavigator)
├── Welcome                 onboarding au premier lancement (issue #25)       NOUVEAU
├── AuthStack               Login, Register, ForgotPassword
├── MainTabs (MainNavigator)
│   ├── Tabs
│   │   ├── Home
│   │   ├── Rankings
│   │   ├── NewCapture
│   │   ├── Chat            ChatList, Conversation { conversation }, NewConversation   (NewConversation NOUVEAU)
│   │   └── Profile         ProfileMain, Badges, MyCaptures
│   ├── UserProfile { userId }, UserSearch, FollowList { userId, type }, FollowRequests
│   ├── Settings                                                               NOUVEAU
│   ├── EditProfile                                                            NOUVEAU
│   ├── Premium                                                                NOUVEAU
│   └── Onboarding          rejeu depuis les Paramètres (modale plein écran)   NOUVEAU
└── CaptureDetail { capture, focusComment? }                                   NOUVEAU
```

`Welcome` n'est affiché que si le drapeau d'onboarding (AsyncStorage) est absent. `CaptureDetail` est au niveau racine : on l'ouvre depuis le feed, les profils, le chat et « Mes captures ». Les types sont dans `src/navigation/types.ts`, les en-têtes communs dans `src/navigation/headers.tsx`.

---

## Fichiers clés

| Fichier | Rôle |
| ------- | ---- |
| `src/config/supabase.ts` | Client Supabase ; `USE_MOCK_DATA` vaut true si `EXPO_PUBLIC_USE_MOCK=1` |
| `src/api/captures.ts` | Feed paginé (`fetchFeedPage`, curseur), détail, publication, like, suppression |
| `src/api/comments.ts` | `fetchComments`, `postComment`, `deleteComment` |
| `src/api/chat.ts` | RPC des conversations, envoi, `subscribeToMessages`, `subscribeToInbox`, `shareCaptureToConversation` |
| `src/api/rankings.ts` | `fetchRankingBoard` : top N et ligne de l'utilisateur, onglet Amis via `follows` |
| `src/api/badges.ts` | `fetchBadges`, `refreshMyBadges` (RPC `check_my_badges`), `fetchNewlyUnlockedBadges` |
| `src/api/profile.ts` | `updateMyProfile`, liste d'attente Premium, `deleteMyAccount` |
| `src/api/mock/` | Données et base en mémoire du mode mock (`data.ts`, `db.ts`, `*Extra.ts`) |
| `src/utils/image.ts` | Compression des photos (`compressImage`) |
| `src/utils/share.ts` | Partage externe d'une capture |
| `src/utils/preferences.ts` | Préférences de notification et drapeau d'onboarding (AsyncStorage) |
| `src/screens/captures/CaptureDetailScreen.tsx` | Détail d'une capture et commentaires |
| `src/screens/chat/NewConversationScreen.tsx` | Choix du destinataire d'un nouveau message |
| `src/screens/settings/`, `src/screens/premium/`, `src/screens/onboarding/` | Paramètres, EditProfile, Premium, onboarding |
| `src/components/ui/` | Primitives du design system |
| `src/theme/index.ts` | Tokens (couleurs, typographie, espacements, mouvement) |
| `supabase/migrations/` | 5 migrations SQL à appliquer à la main |
| `supabase/functions/recalculate-rankings/index.ts` | Edge Function des classements |
| `scripts/recalc-rankings.sh` | Appel de l'Edge Function (`npm run recalc-rankings`) |

Tous les chemins sont relatifs à `RankingFishingExpo/`.

---

## Mode mock et tests

### Mode mock

- Activé par la variable `EXPO_PUBLIC_USE_MOCK=1`, sinon l'app parle au vrai Supabase.
- `npm run web:mock` lance Expo web sur le port **8082** en mode mock. Aucune requête réseau vers Supabase.
- Compte démo : `demo@rankingfishing.app` / `demo1234`. Les comptes créés en mock sont gardés dans AsyncStorage.
- Les données simulées sont dans `src/api/mock/`.

### Tests

| Commande | Outil | Contenu |
| -------- | ----- | ------- |
| `npm test` | jest + jest-expo | 115 tests dans `__tests__/` : slices Redux, utilitaires (score, formatage, validation), API mock |
| `npm run e2e` | Playwright | 10 tests dans `e2e/` (auth, feed, navigation, recherche) sur Chromium mobile 390×844 |

`npm run e2e` démarre lui-même `npm run web:mock`, ou réutilise un serveur déjà lancé sur le port 8082.

---

## Design system

Direction « fiche de pesée » : les chiffres (poids, taille, score, rang) sont les héros, l'interface s'efface. Fond crème, feuilles blanches sans ombre, vert pour l'action, or réservé à la réussite.

- Tokens : `src/theme/index.ts`
- Primitives et règles : [`RankingFishingExpo/src/components/ui/README.md`](RankingFishingExpo/src/components/ui/README.md)
- Contexte produit (utilisateurs, usage, positionnement) : [`RankingFishingExpo/PRODUCT.md`](RankingFishingExpo/PRODUCT.md)
- `DESIGN.md` : à venir, il décrira le système tel qu'il est livré
- Logo, icône d'app, splash : `RankingFishingExpo/assets/brand/`

Le `ToastProvider` est monté dans `App.tsx` (le README ui le signale encore comme « à brancher »).

---

## Actions manuelles requises

Le code de la branche suppose que ces étapes sont faites. Sans elles, l'app en mode Supabase échoue sur les commentaires, le chat, les classements et les paramètres.

1. **Restaurer le projet Supabase**, actuellement en pause (erreur 521 constatée le 2026-11-17) : Dashboard Supabase > projet > Restore.
2. **Appliquer les migrations dans l'ordre**, dans SQL Editor, depuis `RankingFishingExpo/supabase/migrations/` :
   1. `20260601_comments`
   2. `20260602_rankings_region_species`
   3. `20261117_chat`
   4. `20261117_rankings_badges`
   5. `20261117_captures_settings`
3. **Redéployer l'Edge Function** puis recalculer les classements :
   ```bash
   cd RankingFishingExpo
   supabase functions deploy recalculate-rankings
   npm run recalc-rankings
   ```

---

## Reste à faire

- **#16** Connexion OAuth (Google)
- **#17** Notifications push (`expo-notifications`) ; les préférences sont déjà enregistrées en local
- **#21** Carte des spots (Premium)
- **#22** Paiement Premium (aujourd'hui, seulement une liste d'attente)
- **#24** Mode sombre (l'app force `userInterfaceStyle: light`)
- Création de groupes de chat (le schéma accepte `type = 'group'`, l'app ne crée que des conversations 1:1)
- Pagination des messages d'une conversation (tout l'historique est chargé)
- Validation communautaire des captures : la table `capture_validations` n'existe pas, donc le badge `badge_validator` reste à 0

---

## Issues GitHub à fermer

#3, #7, #12, #13, #14, #15, #18, #19, #20, #23, #25, #26, #28, #29, #30, #31, #32, #33, #34

---

## Problèmes rencontrés et solutions appliquées

| Problème | Solution |
| -------- | -------- |
| Firebase nécessite une CB | Migré vers Supabase |
| `permission denied for table users` | Grants SQL + AsyncStorage dans le client Supabase |
| `permission denied for table captures` | Session JWT expirée (reconnexion) + grants service_role |
| `Cannot coerce result to single JSON` | Trigger `on_auth_user_created` manquant |
| FK violation `captures_species_id_fkey` | Table `species` vide → seed data insérée |
| Photos uploadées à 0 octet | `fetch().blob()` cassé sur Expo SDK 50+ → `expo-file-system/next` + `File.bytes()` |
| Session perdue entre requêtes | `AsyncStorage` ajouté dans `createClient` |
| Captures qui ne s'affichent plus | `species_data` null en base → fallback dans `mapCapture` |
| Stats profil toujours à 0 | Trigger `handle_capture_stats` + `refresh_global_ranks()` + thunk `refreshUser` |
| Compteurs follow qui ne décrémentent pas | Trigger `handle_follow_change` en `SECURITY DEFINER` |
| Noms de conversation vides (#29) | Policy `participants_select` récursive → helper `is_conversation_member` `SECURITY DEFINER` + RPC `get_my_conversations` |
| Rangs instables entre deux recalculs (#34) | Comparateur total dans l'Edge Function + purge de `rankings` avant réécriture |
| Badges jamais débloqués (#15) | `check_and_award_badges` déclenchée par triggers ; écriture client retirée de `user_badges` |
| Jest ne parse pas React Native 0.81 | `jest.config.js` utilise le `babel-preset-expo` embarqué par `expo` |
