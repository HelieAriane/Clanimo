# 🐾 Clanimo

**Clanimo** est une application mobile destinée aux amoureux des chiens, visant à créer et renforcer une communauté autour des propriétaires de chiens et de leurs toutous.  
Elle permet aux utilisateurs de gérer leurs profils, rencontrer d’autres passionnés et organiser des activités canines.  

Développée dans le cadre du cours **Projet de déploiement d'application mobile**.

---

## Technologies principales

L'application est développée avec les technologies suivantes :

![Ionic](https://img.shields.io/badge/Ionic-3880FF?logo=ionic&logoColor=white)
![Vue.js](https://img.shields.io/badge/Vue.js-35495E?logo=vue.js&logoColor=4FC08D)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?logo=leaflet&logoColor=white)

---

## Installation et configuration complète

### 1. Cloner le projet
```bash
git clone https://github.com/HelieAriane/Pawfect-Pack.git
cd Pawfect-Pack
```

### 2. Installer les dépendances

**Backend :**
```bash
cd backend
npm install
npm start
```

**Frontend :**
```bash
cd frontend
npm install
ionic serve
```

### 3. Créer les fichiers de configuration

Dans le projet, créer les fichiers :
- `.env`
- `.env.local`

### 4. Ajouter les clés et tokens

Dans ces fichiers `.env` et `.env.local`, ajouter les clés et tokens pour :
- Firebase
- MongoDB
- Supabase
- Autres services externes (API, tokens, etc.)

### 5. Lancer l'application

Après avoir configuré les clés :

**Backend (pour lancer le serveur) :**
```bash
cd backend
npm start
```

**Frontend (pour lancer l'application mobile en développement) :**
```bash
cd frontend
ionic serve
```

L'application est maintenant accessible dans le navigateur ou sur un appareil mobile via Ionic DevApp ou emulateur.

---

## Fonctionnalités principales

- 🐶 **Gestion des profils** : utilisateur et chiens associés
- 📍 **Création de rencontres** avec carte interactive affichant les parcs à chiens
- 💬 **Messagerie privée** et système d'amis
- 🔔 **Notifications** pour les demandes d'amis, nouveaux messages et invitations

---

## Déploiement

L'application a été pensée exclusivement pour mobile : [Clanimo](https://clanimo.netlify.app/) 

Pour plus d'informations et pour accéder à la page de renvoi : [Page de présentation Clanimo](https://clanimo-landing-page.netlify.app/landing-page)

Le code source est privé et uniquement partagé aux enseignants pour fins d'évaluation.

---

## Architecture du projet

### Frontend (Ionic + Vue.js)
- Gestion des vues et navigation
- Profils, messagerie, carte et notifications
- Système de rencontres et demandes d'amis
- Utilisation de JavaScript et TypeScript (`<script setup lang="ts">`)

### Backend (Node.js + Express + MongoDB / Firebase / Supabase)
- Gestion des utilisateurs et profils canins
- Authentification et sécurisation des endpoints
- Organisation des rencontres et gestion des demandes d'amis
- Messagerie et notifications
- Stockage des données (MongoDB / Firebase / Supabase)

---

## Équipe de développement

- **Ariane Hélie**
- **Audrey Kerene Tazo Tsapah**
- **Brigitte Couture**
- **Cabrel Ange Lene Nzetchouang**
- **Geneviève St-Pierre**

---

## Notes supplémentaires

Les clés API doivent être configurées dans `.env` et `.env.local`.
