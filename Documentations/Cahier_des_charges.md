# 📑 Cahier des Charges - RankingFishing

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Public cible](#public-cible)
3. [Spécifications fonctionnelles](#spécifications-fonctionnelles)
4. [Spécifications techniques](#spécifications-techniques)
5. [Architecture de l'application](#architecture-de-l-application)
6. [Planning prévisionnel](#planning-prévisionnel)

## 1️⃣ Introduction

### Contexte

RankingFishing est une application mobile communautaire destinée aux passionnés de pêche, s'inspirant du modèle Strava. L'application permet aux pêcheurs de partager leurs prises, de gagner des badges et de se mesurer aux autres via des classements régionaux et internationaux.

### Objectifs

- Créer une communauté active de pêcheurs
- Gamifier l'expérience de pêche
- Générer de l'engagement via un système de classement
- Répertorier des coins de pêche et les partager
- Monétiser via un modèle freemium

## 2️⃣ Public cible

- Pêcheurs amateurs et professionnels
- Tranche d'âge : 16-65 ans
- Utilisateurs de smartphones
- Passionnés de compétition et de partage

## 3️⃣ Spécifications fonctionnelles

### Module d'authentification

- Inscription via email/mot de passe
- Connexion avec Google/Facebook
- Récupération de mot de passe
- Validation email

### Profil utilisateur

- Photo de profil
- Statistiques personnelles
- Historique des prises
- Collection de badges
- Niveau d'expérience
- Classements personnels
- Spécialités de pêche :
  - Choix multiples possibles
  - Types : Carpiste, Pêcheur de carnassiers, Pêcheur en mer, Truiteur, Siluriste, Pêcheur au coup, Street fishing, Pêche à la mouche
  - Niveau d'expertise par spécialité (Débutant, Intermédiaire, Expert)
  - Affichage des badges spécifiques par type de pêche

### Système de publication

- Formulaire de capture :
  - Espèce de poisson
  - Poids
  - Taille
  - Date et heure
  - Photos (max 3)
  - Localisation (premium)
  - Description
  - Conditions météo (optionnel)
- Modification/Suppression des publications
- Système de validation communautaire :
  - Vérification de la taille et du poids déclarés
  - Confirmation de l'espèce identifiée
  - Validation de l'authenticité des photos
  - Signalement des publications douteuses

### Système de chat

- Messagerie instantanée :

  - Conversations privées entre utilisateurs
  - Discussions de groupe (max 50 personnes)
  - Partage de photos et de captures
  - Statut en ligne/hors ligne
  - Indicateur de lecture
  - Notifications push

- Fonctionnalités sociales :

  - Création de groupes thématiques
  - Partage de spots de pêche (premium)
  - Organisation de sessions de pêche
  - Système de mentions (@utilisateur)
  - Réactions aux messages (émojis)

- Modération :
  - Signalement de messages inappropriés
  - Filtrage automatique du contenu sensible
  - Blocage d'utilisateurs
  - Administration des groupes

### Système de classement

- Classements globaux :
  - Top 100 mondial
  - Top 50 régional
  - Classements mensuels/annuels
- Classements par espèce :
  - Plus gros spécimens
  - Plus grand nombre de prises
- Classement des amis :
  - Comparaison avec les amis
  - Défis entre amis
  - Classement privé du cercle d'amis
- Filtres temporels et géographiques

### Système de badges

- Badges de progression :
  - Première prise
  - 10/50/100 prises
  - Badges par espèce
- Badges d'excellence :
  - Records de taille
  - Records de poids
  - Badges saisonniers
- Badges communautaires :
  - Participation active
  - Validation des prises
  - Aide aux débutants

### Version Premium

- Fonctionnalités exclusives :
  - Carte des spots de pêche
  - Historique détaillé
  - Statistiques avancées
  - Export des données
  - Absence de publicités
- Système d'abonnement :
  - Mensuel
  - Annuel
  - À vie

## 4️⃣ Spécifications techniques

### Technologies

- Frontend :
  - React Native
  - Expo
  - Redux pour la gestion d'état
- Backend :
  - Firebase
  - Cloud Functions
  - Storage pour les images
- Base de données :
  - Firestore
  - Indexation pour les recherches

### Sécurité

- Authentification sécurisée
- Validation des données
- Protection contre le spam
- Sauvegarde quotidienne
- Conformité RGPD

## 5️⃣ Architecture de l'application

### Structure des données

- Collections Firestore :
  - Users
  - Catches
  - Badges
  - Rankings
  - Species
  - Locations (premium)

### API

- REST API
- WebSockets pour les mises à jour en temps réel
- Système de cache

## 6️⃣ Planning prévisionnel

1. Phase de conception (2 semaines)
2. Développement MVP (8 semaines)
3. Phase de test (2 semaines)
4. Déploiement v1.0 (1 semaine)
5. Collecte de feedback (continu)
6. Itérations et améliorations (continu)
