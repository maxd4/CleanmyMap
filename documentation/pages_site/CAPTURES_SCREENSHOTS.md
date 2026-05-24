# Captures d'écran automatisées

## Organisation des captures

Le script `documentation/pages_site/generate-canonical-pages.mjs` structure le registre canonique par route, et le script de capture alimente ensuite les dossiers `png/` et `webp/` de ces fiches route-first. Les captures legacy restent aussi miroir dans `documentation/liberte-UX-UI/`.

### Règle impérative

- Toute capture au format PNG doit être enregistrée dans le dossier `png/` du dossier route canonique sous `documentation/pages_site/routes/.../`.
- Les captures doivent aussi rester miroirs dans `documentation/liberte-UX-UI/...` tant que le pipeline n'est pas entièrement migré.
- Ne pas déposer de PNG canonique ailleurs dans `documentation/pages_site/` ou à la racine du repo.
- Les fichiers de contexte, alias temporaires ou exports intermédiaires doivent rester séparés des captures PNG officielles.

### Structure des dossiers

```
documentation/pages_site/routes/
├── 00-homepage/
│   └── root/
│       ├── README.md
│       ├── png/
│       └── webp/
├── 01-accueil-pilotage/
│   └── dashboard/
│       ├── README.md
│       ├── png/
│       └── webp/
└── ...

documentation/liberte-UX-UI/
└── [miroir legacy des captures, conservé le temps de la migration]
```

### Formats générés

**Captures originales** (haute résolution) :
- `png/[nom].desktop.png` (1440x1200)
- `png/[nom].mobile.png` (390x844)

**Versions contexte** (compatibles VS Code/Codex) :
- `webp/[nom]-desktop-context.webp` (≤ 3000px, optimisé)
- `webp/[nom]-mobile-context.webp` (≤ 3000px, optimisé)

## Utilisation

```bash
# Serveur local
npm run dev
npm run screenshots

# URL déployée
BASE_URL=https://mon-site.vercel.app npm run screenshots
```

## Fonctionnalités avancées

### Auto-scroll intelligent
Pour les pages complètes, le script effectue un scroll automatique pour charger les sections lazy-loaded avant la capture.

### Versions contexte automatiques
Les pages principales génèrent automatiquement des versions compressées dans leur dossier `webp/` :
- **Redimensionnement proportionnel** : la plus grande dimension ne dépasse jamais 3000px
- **Compression WebP** : qualité 85% pour un bon compromis taille/qualité
- **Optimisation Sharp** : algorithme Lanczos3 pour une qualité optimale

### Configuration des versions contexte
Seules certaines pages génèrent des versions contexte (flag `generateContext: true`) :
- Accueil
- Accueil
- Agir
- Visualiser
- Profil-impact

## Captures de blocs spécifiques

Pour capturer des blocs individuels de l'accueil, le script recherche ces sélecteurs CSS et enregistre les sorties dans `01-ACCUEIL` :

- `[data-section='hero']` ou `.hero-section`
- `[data-section='benefits']` ou `.benefits-section`
- `[data-section='pillars']` ou `.pillars-section`
- `[data-section='impact-summary']` ou `.impact-summary-section`
- `[data-section='community-activity']` ou `.community-activity-section`
- `[data-section='credibility-footer']` ou `.credibility-footer-section`

### Ajout des attributs data-section

Pour capturer des blocs spécifiques, ajoutez les attributs `data-section` aux composants React :

```jsx
// Exemple pour le hero
<section data-section="hero" className="hero-section">
  {/* Contenu du hero */}
</section>

// Exemple pour les benefits
<section data-section="benefits" className="benefits-section">
  {/* Contenu des avantages */}
</section>
```

## Fallback

Si un sélecteur de bloc n'est pas trouvé, le script capture automatiquement la page complète comme fallback.

## Structure par format

Chaque dossier de capture utilise maintenant deux sous-dossiers dédiés :
- `png/` pour les originaux
- `webp/` pour les versions contexte
- cette séparation s'applique aussi bien à `01-ACCUEIL` qu'aux blocs `02` à `09` et aux pages standalone de `10`

## Branchement 01 et 10

- `01-ACCUEIL` est le dossier principal des captures liées à l'accueil complet et à ses sections internes
- `02-BLOC-ACCUEIL` ne doit pas contenir des captures de l'accueil public
- `10-PAGES-STANDALONE` reste réservé aux autres pages autonomes
- l'accueil n'est plus dupliqué dans `10-PAGES-STANDALONE`

## Rapport de capture

Le script génère un rapport détaillé indiquant :
- ✅ Captures réussies
- 📐 Versions contexte générées
- ❌ Captures échouées
- 🔍 Sélecteurs CSS manquants
- 💡 Suggestions d'amélioration

## Dépendances

- **Playwright** : Capture d'écran
- **Sharp** : Redimensionnement et compression d'images

