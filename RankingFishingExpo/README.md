# RankingFishingExpo

Application mobile de classement de pêche développée avec React Native et Expo.

## Prérequis

- Node.js **v20 ou supérieur** ([télécharger via nvm](https://github.com/nvm-sh/nvm) ou [nodejs.org](https://nodejs.org))
- npm (inclus avec Node.js)
- **Expo Go** sur votre smartphone — App Store (iOS) ou Google Play (Android)

> Vérifier votre version de Node : `node -v` — elle doit commencer par `v20` ou plus.

## Installation

Cloner le dépôt puis installer les dépendances :

```bash
git clone <url-du-repo>
cd RankingFishingExpo
npm install --legacy-peer-deps
```

## Lancer l'app sur son téléphone

### Cas 1 — Même réseau Wi-Fi (le plus simple)

Votre téléphone et l'ordinateur qui héberge le serveur doivent être **sur le même réseau Wi-Fi**.

```bash
npx expo start
```

1. Un QR code s'affiche dans le terminal.
2. Sur **iPhone** : ouvrez l'app Appareil photo et scannez le QR code.
3. Sur **Android** : ouvrez Expo Go, appuyez sur "Scan QR code" et scannez.
4. L'app se charge automatiquement dans Expo Go.

### Cas 2 — Réseaux différents (collaborateur à distance)

Si vous n'êtes pas sur le même Wi-Fi, utilisez le mode tunnel :

```bash
npx expo start --tunnel
```

La première fois, Expo vous propose d'installer `@expo/ngrok` — acceptez (`y`).  
Un lien public est généré : le QR code fonctionne depuis n'importe quel réseau.

> Le mode tunnel est plus lent au premier chargement, c'est normal.

### Se connecter dans l'app

En mode développement, **n'importe quel email et mot de passe** fonctionne.  
Exemple : `test@test.com` / `motdepasse123`

Vous arriverez sur un profil de démo avec des données pré-remplies (captures, classements, chat).

## Lancement du projet

## Architecture du projet

```
RankingFishingExpo/
├── src/
│   ├── screens/           # Écrans de l'application
│   │   ├── home/         # Écran d'accueil
│   │   ├── captures/     # Écran des captures
│   │   ├── chat/        # Écran de chat
│   │   └── profile/     # Écran de profil
│   ├── components/       # Composants réutilisables
│   ├── navigation/       # Configuration de la navigation
│   ├── services/        # Services (API, authentification, etc.)
│   ├── utils/           # Fonctions utilitaires
│   ├── hooks/           # Hooks personnalisés
│   ├── constants/       # Constants et configurations
│   └── types/          # Types TypeScript
├── assets/             # Ressources statiques
│   ├── images/        # Images
│   ├── fonts/         # Polices
│   └── icons/         # Icônes
├── App.tsx            # Point d'entrée de l'application
└── package.json       # Dépendances et scripts
```

### Description des dossiers

- **screens/** : Contient tous les écrans principaux de l'application. Chaque écran est dans son propre dossier avec ses composants spécifiques.
- **components/** : Composants réutilisables à travers l'application.
- **navigation/** : Configuration des routes et de la navigation.
- **services/** : Logique métier, appels API, gestion de l'authentification.
- **utils/** : Fonctions utilitaires réutilisables.
- **hooks/** : Hooks React personnalisés.
- **constants/** : Variables constantes et configurations.
- **types/** : Définitions des types TypeScript.

## Commandes utiles

- Démarrer l'application avec un cache propre :
```bash
npx expo start -c
```

- Lancer spécifiquement sur Android :
```bash
npx expo start --android
```

- Lancer spécifiquement sur iOS :
```bash
npx expo start --ios
```

## Dépendances principales

- Expo
- React Navigation
- React Native Safe Area Context
- React Native Screens

## Résolution des problèmes courants

Si vous rencontrez des problèmes :

1. Nettoyez le cache :
```bash
npx expo start -c
```

2. Réinstallez les dépendances :
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

3. Assurez-vous que votre téléphone et votre ordinateur sont sur le même réseau WiFi

4. Vérifiez que Expo Go est à jour sur votre téléphone
