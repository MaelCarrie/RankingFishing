# 🎣 RankingFishing

RankingFishing est une application communautaire pour les passionnés de pêche, inspirée de Strava, permettant aux utilisateurs de partager leurs prises, d'obtenir des badges et de se classer au niveau régional et international. 🌍🏆

## 🚀 Fonctionnalités principales

### 📸 Partage des prises
- 🎯 Ajout de captures avec détails : espèce, taille, poids.
- 🖼️ Publication de photos.
- 📍 Indication du lieu de capture (**fonctionnalité réservée aux utilisateurs premium**).

### 🏅 Classements
- **📊 Classements globaux et régionaux**
  - 🦈 Plus gros poisson attrapé.
  - 🎣 Plus actif des pêcheurs.
  - ⏳ Records annuels et historiques.
- **🐟 Classements par espèce**
  - Qui a attrapé le plus gros brochet, sandre, carpe, etc.

### 🎖️ Système de badges
- 🏆 Obtention de badges en fonction des exploits personnels.
  - Exemples : "🐊 Brochet de plus d'1 mètre", "🔟 100 prises enregistrées".
- 🎭 Affichage des badges sur le profil utilisateur.

### 🔓 Accès Premium
- 🌍 Accès à la localisation des prises des autres utilisateurs.
- ✨ Fonctionnalités exclusives à venir.

## 🛠 Technologies utilisées
- **📱 Application mobile** : React Native avec Expo (SDK 54), TypeScript, Redux Toolkit
- **⚙️ Backend** : Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions)
- **🗄 Base de données** : PostgreSQL (Supabase), avec Row Level Security
- **🔐 Authentification** : Supabase Auth (email et mot de passe)
- **🧪 Tests** : jest (unitaires) et Playwright (E2E)

## 📥 Installation et exécution
```bash
git clone https://github.com/MaelCarrie/RankingFishing.git
cd RankingFishing/RankingFishingExpo
npm install --legacy-peer-deps
npx expo start
```

Pour essayer l'app sans backend : `npm run web:mock`, puis connexion avec `demo@rankingfishing.app` / `demo1234`.
Le détail (mode mock, tests, structure) est dans [`RankingFishingExpo/README.md`](RankingFishingExpo/README.md), la base de données dans [`SUPABASE.md`](SUPABASE.md) et l'état d'avancement dans [`STATE.md`](STATE.md).

## 🤝 Contribuer
Toute aide est la bienvenue ! N'hésitez pas à forker le projet et proposer des pull requests. 🚀

## 📧 Contact
Si vous avez des questions ou des suggestions, contactez-nous via GitHub ou par email. 💬

---

**RankingFishing - Pêchez, partagez, classez-vous ! 🐠🏆**

