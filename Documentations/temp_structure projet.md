src/
├── api/ # Appels API et services
│ ├── auth.ts
│ ├── captures.ts
│ ├── chat.ts
│ └── spots.ts
├── assets/ # Ressources statiques
│ ├── images/
│ ├── fonts/
│ └── icons/
├── components/ # Composants réutilisables
│ ├── common/ # Boutons, inputs, etc.
│ ├── captures/
│ ├── chat/
│ └── spots/
├── navigation/ # Configuration de la navigation
│ ├── AppNavigator.tsx
│ ├── AuthNavigator.tsx
│ └── types.ts
├── screens/ # Écrans de l'application
│ ├── auth/
│ ├── home/
│ ├── captures/
│ └── profile/
├── store/ # État global (Redux/Context)
│ ├── actions/
│ ├── reducers/
│ └── types/
├── theme/ # Thème et styles globaux
│ ├── colors.ts
│ ├── spacing.ts
│ └── typography.ts
├── utils/ # Fonctions utilitaires
│ ├── validation.ts
│ ├── formatting.ts
│ └── helpers.ts
└── config/ # Configuration de l'app
├── constants.ts
└── env.ts