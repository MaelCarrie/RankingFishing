# RankingFishingExpo

Application mobile RankingFishing : React Native 0.88, Expo SDK 58, TypeScript, Redux Toolkit, avec Supabase comme backend.

## Prérequis

- Node.js **v20 ou plus** (`node -v`), avec npm
- **Expo Go** sur le téléphone (App Store ou Google Play), pour tester sur mobile
- Pour le backend : un projet Supabase actif, avec les migrations appliquées (voir [`../SUPABASE.md`](../SUPABASE.md), section 13)
- Pour les tests E2E : un Chromium Playwright (`npx playwright install chromium`)

## Installation

```bash
git clone https://github.com/MaelCarrie/RankingFishing.git
cd RankingFishing/RankingFishingExpo
npm install --legacy-peer-deps
```

L'URL et la clé publique (anon) Supabase sont dans `src/config/supabase.ts`. Aucun fichier `.env` n'est nécessaire.

## Lancement

### Avec Supabase (prod)

```bash
npx expo start          # QR code pour Expo Go (même réseau Wi-Fi)
npx expo start --tunnel # téléphone sur un autre réseau
npm run android         # ou npm run ios, npm run web
```

Sur iPhone, scanner le QR code avec l'appareil photo ; sur Android, depuis Expo Go. On se connecte avec un vrai compte, créé depuis l'écran d'inscription.

### En mode mock (sans réseau)

```bash
npm run web:mock
```

Lance Expo web sur `http://localhost:8082` avec `EXPO_PUBLIC_USE_MOCK=1`. Aucune requête ne part vers Supabase : les données viennent de `src/api/mock/`.

- Compte démo : `demo@rankingfishing.app` / `demo1234`
- Les comptes créés en mock sont gardés dans le stockage local du navigateur.

Sur téléphone, le même mode s'obtient avec `EXPO_PUBLIC_USE_MOCK=1 npx expo start`.

### Recalculer les classements

```bash
npm run recalc-rankings
```

Appelle l'Edge Function `recalculate-rankings` (script `scripts/recalc-rankings.sh`). La fonction doit être déployée au préalable : `supabase functions deploy recalculate-rankings`.

## Tests

| Commande | Ce qu'elle lance |
| -------- | ---------------- |
| `npm test` | Tests unitaires jest (`__tests__/`) : slices Redux, utilitaires, API mock. 115 tests |
| `npm run e2e` | Tests E2E Playwright (`e2e/`) sur Expo web en mode mock, Chromium mobile 390×844. 12 tests |

`npm run e2e` démarre `npm run web:mock` tout seul, ou réutilise un serveur déjà lancé sur le port 8082. Les traces et captures d'échec vont dans `e2e/.results/`.

## Structure

```
RankingFishingExpo/
├── App.tsx                 Point d'entrée : providers (Redux, SafeArea, Toast) et navigation
├── app.json                Configuration Expo (icône, splash, permissions)
├── assets/brand/           Logo, icône d'app, icône adaptative Android, splash
├── src/
│   ├── api/                Accès aux données Supabase (auth, captures, comments, chat,
│   │   │                   rankings, badges, follows, users, profile, storage)
│   │   └── mock/           Données et base en mémoire du mode mock
│   ├── components/
│   │   ├── ui/             Design system « fiche de pesée » (voir son README)
│   │   ├── badges/         Icônes et overlay de déblocage des badges
│   │   ├── captures/       Carte de capture, squelette, sélecteur de date, partage
│   │   ├── chat/           Bulles, carte de capture partagée, sélecteurs
│   │   ├── rankings/       Podium, ligne de classement
│   │   ├── social/         En-tête et sections de profil, ligne utilisateur
│   │   └── common/         Anciens composants génériques
│   ├── config/             Client Supabase (supabase.ts), constantes
│   ├── navigation/         AppNavigator (racine), AuthNavigator, MainNavigator, types, en-têtes
│   ├── screens/            Un dossier par domaine : auth, home, captures, rankings, chat,
│   │                       profile, social, search, settings, premium, onboarding
│   ├── store/              Store Redux, slices (auth, captures, rankings, chat, badges), types
│   ├── theme/              Tokens : couleurs, typographie, espacements, mouvement
│   └── utils/              Formatage, validation, score, compression d'image, partage, préférences
├── supabase/
│   ├── migrations/         Migrations SQL, à appliquer dans l'ordre des noms
│   └── functions/recalculate-rankings/   Edge Function des classements (Deno)
├── scripts/                recalc-rankings.sh
├── __tests__/              Tests jest
├── e2e/                    Tests Playwright
├── jest.config.js
├── playwright.config.ts
└── PRODUCT.md              Contexte produit (utilisateurs, usage, positionnement)
```

Le design system (règles, tokens, primitives) est documenté dans [`src/components/ui/README.md`](src/components/ui/README.md). L'état d'avancement du projet est dans [`../STATE.md`](../STATE.md).

## Dépannage

- Cache Metro : `npx expo start -c`
- Dépendances : `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`
- Erreur réseau ou 521 au démarrage : le projet Supabase est peut-être en pause, il faut le restaurer depuis le dashboard. En attendant, utiliser le mode mock.
- Téléphone qui ne charge pas l'app : vérifier qu'il est sur le même Wi-Fi que l'ordinateur, sinon passer en `--tunnel`, et que Expo Go est à jour.
