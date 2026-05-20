# DEVELOPMENT.md — RankingFishing

> Document vivant mis à jour à chaque phase de développement.
> Il décrit ce qui a été implémenté, les décisions prises, et comment configurer le projet.

---

## Table des matières

1. [Stack technique](#stack-technique)
2. [Lancer l'application](#lancer-lapplication)
3. [Configurer Firebase](#configurer-firebase)
4. [Architecture du projet](#architecture-du-projet)
5. [Journal des phases](#journal-des-phases)
6. [Structure Firestore à créer](#structure-firestore-à-créer)
7. [Ce qui reste à faire](#ce-qui-reste-à-faire)

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework mobile | React Native 0.76 + Expo SDK 52 |
| Navigation | React Navigation v7 (Native Stack + Bottom Tabs) |
| État global | Redux Toolkit + react-redux |
| Backend (futur) | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| Stockage local | AsyncStorage |
| Photos | expo-image-picker |
| Géolocalisation | expo-location |
| TypeScript | v5.7 |
| Design | Vert nature (#2E7D32) + Or (#F9A825) |

---

## Lancer l'application

### Prérequis

- Node.js ≥ 18
- npm ou yarn
- Expo Go installé sur ton téléphone (iOS / Android)

### Première installation

```bash
cd RankingFishingExpo
npm install
```

### Démarrer le serveur de développement

```bash
npm start
# ou
expo start
```

Scanne le QR code avec l'app Expo Go sur ton téléphone.

### Raccourcis

```bash
npm run android  # Ouvre sur émulateur Android
npm run ios      # Ouvre sur simulateur iOS
npm run web      # Version web (expérimental)
```

---

## Configurer Supabase

L'app tourne actuellement en **mode mock** (données simulées localement). Pour brancher Supabase :

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) — **gratuit, sans carte bancaire**
2. Créer un projet nommé `rankingfishing`
3. Aller dans **Project Settings > API**
4. Copier **Project URL** et **anon public key**

### 2. Copier la configuration

Dans `src/config/supabase.ts`, remplacer les valeurs placeholder :

```typescript
const supabaseUrl = 'https://xxxxx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Passer à false quand Supabase est configuré
export const USE_MOCK_DATA = false;
```

### 3. Créer les tables et brancher les services

Voir **`SUPABASE.md`** pour le guide complet de A à Z.

---

## Architecture du projet

```
RankingFishingExpo/
├── App.tsx                      ← Point d'entrée (Provider Redux + SafeAreaProvider)
├── index.js                     ← Enregistrement Expo
├── app.json                     ← Config Expo (permissions, bundle ID, splash)
├── src/
│   ├── api/                     ← Couche service (Firebase wrappers + mock)
│   │   ├── auth.ts
│   │   ├── captures.ts
│   │   ├── chat.ts
│   │   ├── rankings.ts
│   │   ├── badges.ts
│   │   └── mock/
│   │       └── data.ts          ← Données de démonstration réalistes
│   ├── components/
│   │   ├── common/              ← Composants UI réutilisables
│   │   │   ├── Button.tsx       ← Bouton (primary/secondary/outline/ghost/danger)
│   │   │   ├── Input.tsx        ← Input avec label, erreur, icônes
│   │   │   ├── Card.tsx         ← Carte avec ombres
│   │   │   ├── Avatar.tsx       ← Avatar (photo ou initiales colorées)
│   │   │   └── Badge.tsx        ← Chip coloré (statut, catégorie)
│   │   ├── captures/
│   │   │   └── CaptureCard.tsx  ← Carte de capture pour le feed
│   │   └── chat/
│   │       └── MessageBubble.tsx ← Bulle de message
│   ├── config/
│   │   ├── firebase.ts          ← Config Firebase (placeholder)
│   │   └── constants.ts         ← Espèces, niveaux XP, calcul de score
│   ├── navigation/
│   │   ├── types.ts             ← Types TypeScript pour toutes les routes
│   │   ├── AppNavigator.tsx     ← Root navigator (Auth ↔ Main)
│   │   ├── AuthNavigator.tsx    ← Stack auth (Login/Register/ForgotPassword)
│   │   └── MainNavigator.tsx    ← Bottom tabs + stacks Chat/Profil imbriqués
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── home/HomeScreen.tsx  ← Feed de captures avec like
│   │   ├── captures/
│   │   │   ├── CapturesScreen.tsx    ← Mes captures (liste)
│   │   │   └── NewCaptureScreen.tsx  ← Formulaire nouvelle capture
│   │   ├── rankings/RankingsScreen.tsx ← Classements (podium + liste)
│   │   ├── chat/
│   │   │   ├── ChatScreen.tsx        ← Liste des conversations
│   │   │   └── ConversationScreen.tsx ← Vue d'une conversation
│   │   └── profile/
│   │       ├── ProfileScreen.tsx     ← Profil, stats, spécialités, menu
│   │       └── BadgesScreen.tsx      ← Grille de badges
│   ├── store/
│   │   ├── index.ts             ← Store Redux + hooks typés
│   │   ├── types/index.ts       ← Tous les types TypeScript partagés
│   │   └── slices/
│   │       ├── authSlice.ts     ← Authentification
│   │       ├── capturesSlice.ts ← Feed + mes captures
│   │       ├── rankingsSlice.ts ← Classements
│   │       ├── chatSlice.ts     ← Conversations + messages
│   │       └── badgesSlice.ts   ← Badges
│   ├── theme/index.ts           ← Design system (couleurs, typo, spacing, ombres)
│   └── utils/
│       ├── validation.ts        ← Validation des formulaires
│       ├── formatting.ts        ← Formatage (poids, dates, rangs, XP)
│       └── helpers.ts           ← Calcul de niveau, delay, generateId
```

---

## Journal des phases

### Phase 0 — Nettoyage ✅
**Date :** 2026-05-19

- Suppression des fichiers du compilateur TypeScript (bin/, lib/) accidentellement commités
- Suppression des fichiers TypeScript (LICENSE.txt, SECURITY.md, ThirdPartyNoticeText.txt)
- Réécriture du `package.json` (était celui du package TypeScript de Microsoft)
- Réécriture de `index.js` (simplifié, suppression du code de test)
- Nettoyage du `app.json` (ajout permissions expo-image-picker et expo-location)

---

### Phase 1 — Foundation ✅
**Date :** 2026-05-19

**Types TypeScript (`src/store/types/index.ts`)**
Définition complète de toutes les interfaces : User, Capture, FishSpecies, Badge, RankingEntry, Conversation, Message, et les états Redux correspondants.

**Thème (`src/theme/index.ts`)**
Design system complet : palette Vert nature & Or, spacing, borderRadius, typographie, ombres.
- Primary : `#2E7D32` (vert forêt)
- Secondary : `#F9A825` (ambre/or)
- Background : `#F5F5F0`

**Config (`src/config/constants.ts`)**
- 15 espèces de poissons avec coefficients de score, icônes, catégories
- Niveaux XP (Novice → Légende)
- Fonctions `calculateCaptureScore()` et `getLevelFromXP()`
- Labels de pêche, météo

**Config Firebase (`src/config/firebase.ts`)**
Placeholder avec instructions. Variable `USE_MOCK_DATA = true` pour basculer.

**Utilitaires**
- `formatting.ts` : formatWeight, formatSize, formatRelativeDate, formatRank, formatXP, getInitials
- `validation.ts` : validateEmail, validatePassword, validateUsername, validateWeight, validateSize
- `helpers.ts` : delay, generateId, getLevelInfo, getAvatarColor, kgAndGramsToGrams

**Mock data (`src/api/mock/data.ts`)**
Données réalistes pour le développement :
- 1 utilisateur courant : PierreM (niveau 4, 47 captures, Bretagne)
- 4 autres utilisateurs : SilureMaster, BrochetQueen, CarpeFanatik, TruiteurAlpin
- 7 captures pour le feed (espèces variées : carpe 26kg, silure 72kg, brochet...)
- 4 captures personnelles pour PierreM
- 9 badges (3 débloqués, 6 en cours)
- 11 entrées de classement global
- 3 conversations avec messages

**Store Redux**
5 slices : authSlice, capturesSlice, rankingsSlice, chatSlice, badgesSlice.
Tous les thunks asynchrones gèrent les états loading/error.

**API services**
Couche service unifiée (mock + Firebase stubs) pour : auth, captures, rankings, chat, badges.

**Composants communs**
- `Button` : 5 variantes, 3 tailles, loading state
- `Input` : label, erreur, hint, icônes gauche/droite, mode password
- `Card` : variantes default/elevated/flat
- `Avatar` : photo ou initiales colorées (couleur déterministe), badge premium
- `Badge` : chip de statut (7 variantes de couleur)

---

### Phase 2 — Navigation ✅
**Date :** 2026-05-19

**Structure de navigation :**
```
AppNavigator (Root NativeStack)
├── AuthNavigator (NativeStack, headerShown: false)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ForgotPasswordScreen
└── MainNavigator (Bottom Tabs, 5 onglets)
    ├── Home
    ├── Rankings
    ├── [+] NewCapture (bouton FAB central personnalisé)
    ├── Chat (NativeStack imbriqué → Conversation)
    └── Profile (NativeStack imbriqué → Badges, MyCaptures)
```

- Bouton central `+` stylisé en FAB vert avec ombre
- Chargement de l'état auth depuis AsyncStorage au démarrage
- Animation `fade` entre Auth et Main

---

### Phase 3 — Authentification ✅
**Date :** 2026-05-19

**LoginScreen**
- Formulaire email + mot de passe avec validation
- Boutons Google/Facebook (UI, activation post-Firebase)
- Lien "Mot de passe oublié"
- En mode mock : tout email/mdp valide connecte l'utilisateur PierreM

**RegisterScreen**
- Email, username, password, confirmation
- Sélection multi-choix des spécialités de pêche (8 types)
- Checkbox CGU
- Validation complète de tous les champs

**ForgotPasswordScreen**
- Saisie email
- État "envoyé" avec message de confirmation
- Gère le cas Firebase (envoi réel) et mock (simulation)

---

### Phase 4 — Home & Feed ✅
**Date :** 2026-05-19

**CaptureCard** (`src/components/captures/CaptureCard.tsx`)
Carte complète pour le feed :
- Photo de capture (image network)
- Header : avatar, username, date relative, badge "Validé"
- Stats : poids, taille, score (fond vert clair)
- Description (2 lignes max)
- Localisation (verrouillée pour les non-premium avec message upgrade)
- Actions : like (cœur rouge si liké), commentaires, partage
- Météo en emoji

**HomeScreen** (`src/screens/home/HomeScreen.tsx`)
- FlatList avec RefreshControl
- Chargement des captures au mount
- FAB vert (+) en bas à droite pour nouvelle capture
- État vide avec message encourageant

---

### Phase 5 — Captures ✅
**Date :** 2026-05-19

**NewCaptureScreen** (`src/screens/captures/NewCaptureScreen.tsx`)
Formulaire complet de création de capture :
- Galerie photo (jusqu'à 5 photos via expo-image-picker)
- Sélection d'espèce via modal bottom-sheet (15 espèces)
- Poids (kg + g séparés)
- Taille en cm
- Météo (6 options en chips)
- Description (textarea)
- Section Premium (localisation GPS verrouillée)
- Bouton "Brouillon" + bouton "Publier"

**CapturesScreen** (`src/screens/captures/CapturesScreen.tsx`)
- Liste compacte de mes captures (miniature + infos)
- Barre de stats en tête (publiées / brouillons / likes reçus)
- Badge "Brouillon" sur les captures non publiées

---

### Phase 6 — Classements ✅
**Date :** 2026-05-19

**RankingsScreen** (`src/screens/rankings/RankingsScreen.tsx`)
- 4 onglets de type : Global, Régional, Par espèce, Amis
- 5 onglets de période : Jour, Semaine, Mois, Année, All-time
- Podium visuel (top 3) avec avatars et médailles colorées
- Liste des autres rangs avec row compacte
- Bandeau "Mon rang" en bas (encadré vert)
- Simulation de scores différents par période

---

### Phase 7 — Chat ✅
**Date :** 2026-05-19

**ChatScreen** (`src/screens/chat/ChatScreen.tsx`)
- Liste des conversations (privées + groupes)
- Badge de messages non lus (rouge)
- Icône groupe pour les conversations de groupe
- Preview du dernier message
- FAB pour nouveau message

**ConversationScreen** (`src/screens/chat/ConversationScreen.tsx`)
- FlatList de messages avec scroll automatique au bas
- Bulles différenciées (vert pour moi, blanc pour les autres)
- Affichage du nom de l'expéditeur dans les groupes
- Barre d'envoi avec bouton attachement
- KeyboardAvoidingView pour iOS/Android

**MessageBubble** (`src/components/chat/MessageBubble.tsx`)
- Bulle droite (mes messages) / gauche (autres)
- Date relative + indicateur de lecture (✓ / ✓✓)
- Nom de l'expéditeur (groupes)

---

### Phase 8 — Profil & Badges ✅
**Date :** 2026-05-19

**ProfileScreen** (`src/screens/profile/ProfileScreen.tsx`)
- Header : avatar, username, localisation, bio, badge premium
- Barre de progression XP (niveau actuel → prochain)
- Grille de 4 stats (captures, poids total, rang mondial, rang régional)
- Carte "Meilleure prise" (espèce, poids, taille)
- Carte "Spécialités" avec niveau d'expertise coloré
- Menu : Badges, Mes captures, Premium, Paramètres, Déconnexion

**BadgesScreen** (`src/screens/profile/BadgesScreen.tsx`)
- Stats en tête (obtenus / total / % complété)
- Grille 2 colonnes (débloqués en premier, puis en cours)
- Barre de progression pour les badges non débloqués
- Badge de tier (Bronze/Argent/Or/Platine) avec couleur
- Récompense XP affichée

---

## Structure de la base Supabase (PostgreSQL)

Voir **`SUPABASE.md`** pour le SQL complet à coller dans l'éditeur Supabase.

Tables principales :

```
users              ← profils utilisateurs
user_stats         ← stats de pêche (captures, poids, rangs)
user_specialties   ← spécialités de pêche par utilisateur
captures           ← toutes les prises publiées/brouillons
capture_photos     ← photos associées à une capture
capture_likes      ← table de jonction capture ↔ utilisateur (likes)
species            ← 15 espèces de poissons avec coefficients
conversations      ← conversations privées et groupes
conversation_participants ← qui est dans quelle conversation
messages           ← messages de chaque conversation
badges             ← définitions des badges (globaux)
user_badges        ← progression et déblocage par utilisateur
rankings           ← classements précalculés (recalculés par Edge Function)
```

---

## Ce qui reste à faire

> Légende : 🔴 Bloquant MVP — 🟠 Important Phase 2 — 🟡 Amélioration — 🟢 Nice-to-have

---

### 🔴 Bloc 1 — Intégration Supabase (BD principale)

> Voir `SUPABASE.md` pour le guide complet de A à Z.

- [ ] **Créer le projet Supabase** (supabase.com — gratuit, sans carte)
- [ ] **Installer le SDK Supabase** dans le projet Expo (`@supabase/supabase-js`) ✅ déjà dans package.json
- [ ] **Configurer `src/config/supabase.ts`** avec les vraies clés (URL + anon key)
- [ ] **Créer les tables SQL** dans l'éditeur Supabase (script dans `SUPABASE.md`)
- [ ] **Configurer les RLS** (Row Level Security — équivalent des règles Firestore)
- [ ] **Passer `USE_MOCK_DATA` à `false`**
- [ ] **Auth — Email/Password** : brancher `signIn`, `register`, `signOut`, `resetPassword` dans `src/api/auth.ts`
- [ ] **Auth — Google** : OAuth avec `supabase.auth.signInWithOAuth` — nécessite Google Cloud Console (Client ID + Secret + redirect URI `https://flhqlktregfwvomzprlo.supabase.co/auth/v1/callback`)
- [ ] **Supabase — Users** : créer le profil utilisateur à l'inscription, le lire à la connexion
- [ ] **Supabase — Captures** : `fetchFeed`, `fetchMyCaptures`, `publishCapture`, `toggleLike`, `deleteCapture` dans `src/api/captures.ts`
- [ ] **Supabase — Rankings** : calcul et lecture des classements dans `src/api/rankings.ts`
- [ ] **Supabase — Chat** : `fetchConversations`, `fetchMessages`, `sendMessage` en temps réel dans `src/api/chat.ts`
- [ ] **Supabase — Badges** : logique de débloquage automatique dans `src/api/badges.ts`
- [ ] **Supabase Storage** : upload des photos de captures, stockage des avatars
- [ ] **Policies Storage** : autoriser uniquement les fichiers image par utilisateur

---

### 🔴 Bloc 2 — Fonctionnalités manquantes pour le MVP

- [ ] **Écran détail d'une capture** : vue complète avec photos full-screen, likes, commentaires
- [ ] **Système de commentaires** : poster/lire des commentaires sur une capture
- [ ] **Page profil d'un autre utilisateur** : consulter le profil, les captures, les stats d'un autre pêcheur
- [ ] **Système de suivi (follow)** : suivre un utilisateur, fil "Amis" dans les classements
- [ ] **Recherche d'utilisateurs** dans le chat pour démarrer une conversation

---

### 🟠 Bloc 3 — Fonctionnalités Phase 2

- [ ] **Validation communautaire des captures** : système de vote pour confirmer/infirmer une prise (anti-fraude)
- [ ] **Notifications push** : `expo-notifications` → nouveaux messages, badges débloqués, followers, validation
- [ ] **Carte des spots de pêche** : `expo-location` + Google Maps / MapLibre — réservé Premium
- [ ] **Abonnement Premium** : intégration paiement (Stripe, Apple Pay, Google Pay)
- [ ] **Statistiques avancées Premium** : graphiques de progression, comparaisons, prédictions
- [ ] **Partage de captures** : partager dans le chat, partager sur réseaux sociaux (expo-sharing)
- [ ] **Filtres du feed** : filtrer par espèce, région géographique, technique de pêche
- [ ] **Cloud Functions Firebase** : automatisation des scores, triggers de badges, recalcul des classements

---

### 🟡 Bloc 4 — Améliorations UI/UX

- [ ] **Animations de transitions** (react-native-reanimated 3)
- [ ] **Mode sombre** : thème dark complet, respect du réglage système
- [ ] **Onboarding** : tutoriel pour les nouveaux utilisateurs (3-4 écrans)
- [ ] **Pull-to-refresh** global et cohérent sur tous les écrans
- [ ] **Skeleton loaders** à la place des spinners (meilleure UX perçue)
- [ ] **Feedback haptique** (expo-haptics) sur les actions importantes
- [ ] **Swipe to delete** sur les captures dans `CapturesScreen`
- [ ] **Infinite scroll** sur le feed (pagination Firestore)
- [ ] **Optimistic updates** sur les likes (réponse UI immédiate)

---

### 🟢 Bloc 5 — Infrastructure & Qualité

- [ ] **Support hors-ligne** : cache local avec AsyncStorage, file d'attente d'envoi
- [ ] **Compression d'images** avant upload (expo-image-manipulator)
- [ ] **Conformité RGPD** : export des données utilisateur, suppression de compte
- [ ] **Tests unitaires** : utils, slices Redux
- [ ] **Tests E2E** : parcours critiques (inscription → publication → classement)
- [ ] **Dashboard de modération** : signalement de captures frauduleuses, bannissement
- [ ] **Analytics** (Firebase Analytics ou Mixpanel)
- [ ] **Crashlytics** (Firebase Crashlytics) pour le suivi des bugs en production

---

*Dernière mise à jour : 2026-05-19*
