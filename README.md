# 🌿 Clean my Map • Plateforme Citoyenne pour les Actions Bénévoles de Dépollution

https://cleanmymap.streamlit.app

**Clean my Map** est une solution bénévole engagée en faveur de l'environnement dont le but principal est de mutualiser les résultats des actions bénévoles de dépollution des rues (cleanwalk). La visualisation se fait sur une carte intéractive.
D'autres fonctionnalités permettent un engagement et un partage sur l'écologie, bien sur, mais aussi sur l'aide humanitaire et sociale et le développement durable.

Cet outil transforme chaque ramassage bénévole en une donnée scientifique précieuse pour inciter à l'action.

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
