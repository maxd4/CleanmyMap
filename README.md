# 🌿 Clean my Map • Plateforme Citoyenne pour les Actions Bénévoles de Dépollution

https://cleanmymap.streamlit.app

**Clean my Map** est une solution bénévole engagée en faveur de l'environnement dont le but principal est de mutualiser les résultats des actions bénévoles de dépollution des rues (cleanwalk). La visualisation se fait sur une carte interactive.
D'autres fonctionnalités permettent un engagement et un partage sur l'écologie, bien sûr, mais aussi sur l'aide humanitaire et sociale et le développement durable.

Cet outil transforme chaque ramassage bénévole en une donnée scientifique précieuse pour inciter à l'action.

## ✅ Mises à Jour Récentes
- Les indicateurs **S** et **C** ont été réalignés sur les **fréquences physiques**.
- L'ancien **historique GMT en table fixe** n'est plus utilisé.

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
git clone https://github.com/votre-compte/cleanmymap-app.git
cd cleanmymap-app
```

### 2. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 3. Lancer l'application
```bash
streamlit run app.py
```

---

## 🔐 Sécurité & Configuration
L'application utilise une authentification Google (OIDC) pour l'accès administrateur. 
Configurez vos secrets dans le dashboard Streamlit ou via un fichier `.env` :

- `CLEANMYMAP_ADMIN_SECRET_CODE` : Code de double authentification.
- `CLEANMYMAP_SHEET_URL` : Source de données historique (Google Sheets).
- `SENDGRID_API_KEY` : Pour l'envoi de la Gazette Automatisée.

---

## 🤝 Contribution & Science Citoyenne
Les données de **Clean my Map** sont ouvertes à la communauté scientifique. Les administrateurs peuvent générer un export anonymisé dans l'onglet Admin pour les besoins de recherche environnementale.

---
*Projet propulsé par les Brigades Vertes - Veiller ensemble sur notre territoire.*

## 🧪 Clone de travail local (`APPLI`)
Pour travailler sur une copie locale dédiée, un clone du repo peut être créé dans le dossier `/workspace/APPLI` :

```bash
git clone /workspace/CleanmyMap /workspace/APPLI
```

## Journal de changements, Monitoring UX et E2E
- Journal de changements produit: visible directement dans l'app (bloc repliable).
- Monitoring UX: suivi en base des erreurs de validation et des actions cassees.
- Dashboard admin: indicateurs UX (30 jours) + journal des evenements.
- Tests E2E Playwright: flux critiques declaration, carte, rapport.

### Lancer les tests E2E
```bash
npx.cmd playwright test
```

Configuration: `playwright.config.cjs`  
Specs: `e2e/tests/critical-flows.spec.js`
