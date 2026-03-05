# 🌿 Clean my Map • Plateforme Citoyenne de Protection de l'Eau

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_svg)](https://cleanmymap.streamlit.app)
[![Science Citoyenne](https://img.shields.io/badge/Science-Citoyenne-blue)](https://www.surfrider.eu)

**Clean my Map** est une solution technologique engagée permettant de cartographier, quantifier et prédire la pollution urbaine pour protéger nos ressources en eau. Né de la volonté de fédérer les citoyens, cet outil transforme chaque ramassage bénévole en une donnée scientifique précieuse.

## 🚀 Vision & Impact
L'objectif est de rendre visible l'invisible. Un seul mégot pollue 1000 litres d'eau ; **Clean my Map** permet de mesurer précisément l'impact de chaque action citoyenne et d'accompagner les collectivités vers des solutions durables.

### Fondamentaux du projet :
- **Engagement** : Valorisation des bénévoles et des partenaires locaux ("Médaille Verte").
- **Science** : Export de données anonymisées aux standards E-PRTR pour la recherche (Surfrider, ADEME).
- **Intelligence** : Prédiction des flux de pollution par analyse topographique (Ruissellement).

---

## 🏗️ Architecture du Système

```mermaid
graph TD
    User((Citoyen)) -->|Déclare une action| App[app.py]
    App -->|Stocke & Valide| DB[(SQL/SQLite)]
    App -->|Analyse Flux| AI[AI Flux Pollution]
    App -->|Génère| PDF[Rapports PDF]
    App -->|Affiche| Map[Carte interactive]
    
    subgraph "Structure du Projet"
        App
        src[src/ - Logique métier]
        data[data/ - Données historiques]
        legacy[legacy/ - Scripts Colab archives]
    end
```

### 📂 Structure des fichiers

- `app.py` : point d'entrée principal de l'application streamlit.
- `src/` : contient le moteur de l'application (base de données, mailer, pages).
- `data/` : stockage des fichiers de données historiques (excel) et base de données locale.
- `legacy/` : archives des anciens scripts de recherche et colab.
- `requirements.txt` : liste des dépendances pour le déploiement cloud.

---

## 🛠️ Installation & Déploiement

### 1. Cloner le projet
```bash
git clone https://github.com/votre-compte/cleanwalk-app.git
cd cleanwalk-app
```

### 2. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 3. Lancer l'application
```bash
streamlit run dev/streamlit.py
```

---

## 🔐 Sécurité & Configuration
L'application utilise une authentification Google (OIDC) pour l'accès administrateur. 
Configurez vos secrets dans le dashboard Streamlit ou via un fichier `.env` :

- `CLEANWALK_ADMIN_SECRET_CODE` : Code de double authentification.
- `CLEANWALK_SHEET_URL` : Source de données historique (Google Sheets).
- `SENDGRID_API_KEY` : Pour l'envoi de la Gazette Automatisée.

---

## 🤝 Contribution & Science Citoyenne
Les données de CleanWalk sont ouvertes à la communauté scientifique. Les administrateurs peuvent générer un export anonymisé dans l'onglet Admin pour les besoins de recherche environnementale.

---
*Projet propulsé par les Brigades Vertes - Veiller ensemble sur notre territoire.*
