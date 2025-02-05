# 📄 Spécifications Fonctionnelles - Profil Utilisateur

## 🏷️ Introduction

Le module Profil Utilisateur permet aux pêcheurs d'accéder et de personnaliser leur espace personnel. Il regroupe leurs statistiques, badges, classements et préférences.

---

## 🎯 Objectifs

- Permettre aux utilisateurs de consulter et modifier leurs informations personnelles.
- Offrir un aperçu des performances et statistiques de pêche.
- Assurer un suivi des badges et classements.
- Favoriser l'engagement grâce à un système de progression.

---

## 🔑 Fonctionnalités

### 📌 Création et Gestion du Profil

- Saisie des informations personnelles :
  - 📷 Photo de profil
  - 🆔 Nom d'utilisateur (unique)
  - 📍 Localisation (optionnel)
  - 📅 Date d'inscription
- Modification des informations (sauf date d'inscription et nom unique).

### 📊 Statistiques Personnelles

- Nombre total de prises.
- Poids total des prises.
- Plus gros poisson pêché (espèce, taille, poids).
- Classement global et régional.
- Nombre de défis remportés.

### 🏆 Collection de Badges

- Liste des badges débloqués.
- Progression vers les prochains badges.
- Filtrage par catégories : progression, excellence, communautaire.

### 🎣 Spécialités de Pêche

- Sélection des types de pêche pratiqués.
- Niveau d'expertise par spécialité :
  - 🟢 Débutant
  - 🔵 Intermédiaire
  - 🔴 Expert
- Affichage des badges spécifiques à chaque type de pêche.

### 🔄 Historique des Prises

- Liste des prises enregistrées.
- Filtrage par date, espèce, taille.
- Accès rapide aux détails de chaque prise.

### ⚙️ Paramètres du Compte

- Gestion des préférences : notifications, confidentialité.
- Suppression du compte (confirmation requise).

---

## 📌 Contraintes et Exigences

- Le nom d'utilisateur doit être unique.
- La photo de profil est limitée à 2 Mo.
- Sécurisation des données personnelles (conformité RGPD).

---

## ✅ Critères d'Acceptation

- Un utilisateur doit pouvoir modifier ses informations (sauf nom unique et date d'inscription).
- L'affichage des statistiques doit être mis à jour en temps réel.
- Les badges doivent s'afficher dynamiquement en fonction des actions de l'utilisateur.
- La suppression de compte doit être définitive après confirmation.

---

## 🛠️ Technologies

- Stockage des données : Firestore (collection **Users**).
- Gestion des images : Firebase Storage.
- Authentification : Firebase Auth.

---

## 📅 Suivi et Évolutions

- Phase 1 : Mise en place du profil de base.
- Phase 2 : Intégration des statistiques avancées.
- Phase 3 : Amélioration UX et personnalisation du profil.
