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
| Backend (futur) | Firebase (Auth, Firestore, Storage, Cloud Functions) |
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

## Configurer Firebase

L'app tourne actuellement en **mode mock** (données simulées localement). Pour brancher Firebase :

### 1. Créer un projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com)
2. Créer un projet nommé `rankingfishing`
3. Activer **Authentication** (Email/Password + Google + Facebook)
4. Créer une base **Firestore** (mode production)
5. Activer **Storage**
6. Ajouter une app Web (icône `</>` sur la page d'accueil)

### 2. Copier la configuration

Dans `src/config/firebase.ts`, remplacer les valeurs placeholder :

```typescript
export const firebaseConfig = {
  apiKey: 'ta_valeur',
  authDomain: 'ton-projet.firebaseapp.com',
  projectId: 'ton-projet',
  storageBucket: 'ton-projet.firebasestorage.app',
  messagingSenderId: 'ton_id',
  appId: 'ton_app_id',
};

// Passer à false quand Firebase est configuré
export const USE_MOCK_DATA = false;
```

### 3. Initialiser Firebase dans l'app

Décommenter le code Firebase dans `src/api/auth.ts`, `src/api/captures.ts`, etc.

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

## Structure Firestore à créer

Quand tu seras prêt à configurer Firebase, voici les collections à créer :

```
firestore/
├── users/
│   └── {userId}/
│       ├── id, username, email, avatar, bio, location
│       ├── isPremium, xp, level, levelName
│       ├── specialties: [{ type, level }]
│       └── stats: { totalCaptures, totalWeightGrams, biggestFish, globalRank, regionalRank }
│
├── captures/
│   └── {captureId}/
│       ├── userId, username, userAvatar
│       ├── species: { id, name, nameFr, ... }
│       ├── weightGrams, sizeCm
│       ├── photos: [url]
│       ├── description, weather
│       ├── location: GeoPoint (premium)
│       ├── publishedAt, isDraft
│       ├── validationScore, score, likes, comments
│       └── likedBy: [userId]  ← pour le like
│
├── rankings/
│   └── {type}_{period}/     ← ex: global_alltime
│       └── entries: RankingEntry[]
│
├── conversations/
│   └── {convId}/
│       ├── type, name, avatar
│       ├── participantIds, participantNames
│       ├── lastMessage, unreadCounts: { userId: count }
│       └── updatedAt
│
├── messages/
│   └── {convId}/
│       └── {messageId}/
│           ├── senderId, senderName, senderAvatar
│           ├── content, type
│           └── sentAt, isRead
│
├── badges/
│   └── {badgeId}/
│       ├── name, description, icon, category, tier
│       ├── isUnlocked, progress, target, xpReward
│       └── unlockedAt
│
└── species/
    └── {speciesId}/
        ├── name, nameFr, category, icon
        └── scoreCoefficient, rarityScore
```

---

## Ce qui reste à faire

### MVP prioritaire

- [ ] **Configuration Firebase** : créer le projet, brancher l'auth et Firestore
- [ ] **Authentification réelle** : login/register/reset via Firebase Auth
- [ ] **Stockage photos** : upload vers Firebase Storage + URLs persistantes
- [ ] **Persistance Firestore** : remplacer le mock par de vrais appels Firestore

### Fonctionnalités Phase 2

- [ ] **Carte des spots** (Google Maps API, expo-location) — Premium
- [ ] **Notifications push** (expo-notifications)
- [ ] **Système de commentaires** sur les captures
- [ ] **Validation communautaire** des captures
- [ ] **Paiement Premium** (Stripe / Apple Pay / Google Pay)
- [ ] **Statistiques avancées** pour les Premium
- [ ] **Connexion Google/Facebook** (OAuth 2.0)
- [ ] **Partage de captures** dans le chat

### Améliorations UI/UX

- [ ] Animations de transition (Reanimated)
- [ ] Mode sombre
- [ ] Onboarding pour les nouveaux utilisateurs
- [ ] Recherche d'utilisateurs dans le chat
- [ ] Filtres du feed (par espèce, zone géo, technique)
- [ ] Détail d'une capture (écran complet)
- [ ] Page de profil d'un autre utilisateur

---

*Dernière mise à jour : 2026-05-19*
