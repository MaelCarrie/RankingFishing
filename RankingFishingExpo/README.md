# RankingFishingExpo

Application mobile de classement de pêche développée avec React Native et Expo.

## Prérequis

- Node.js (version recommandée : >=14.17)
- npm (inclus avec Node.js)
- Expo Go sur votre smartphone (disponible sur App Store ou Google Play)

## Installation

1. Installez les dépendances du projet :
```bash
npm install
```

2. Installez Expo :
```bash
npm install expo
```

## Lancement du projet

1. Démarrer le serveur de développement :
```bash
npx expo start
```

2. Une fois le serveur démarré :
   - Scannez le QR code avec l'application Expo Go sur votre téléphone
   - Ou appuyez sur 'a' dans le terminal pour ouvrir sur un émulateur Android
   - Ou appuyez sur 'i' pour ouvrir sur un simulateur iOS (Mac uniquement)

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
