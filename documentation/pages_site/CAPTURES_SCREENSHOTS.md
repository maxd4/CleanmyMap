# Captures d'écran automatisées

## Organisation des captures

Le script `documentation/pages_site/generate-canonical-pages.mjs` structure le registre canonique par route. L’inventaire exhaustif, le statut de capture et la priorité d’audit sont centralisés dans `documentation/pages_site/INDEX.md`. Le script de capture alimente ensuite le dossier `photo/` des fiches route-first, avec uniquement des fichiers `.webp`. Les captures legacy restent aussi miroir dans `documentation/liberte-UX-UI/`.

### Règle impérative

- Toute capture canonique doit être enregistrée dans le dossier `photo/` du dossier route canonique sous `documentation/pages_site/routes/.../`.
- Les fichiers doivent être au format WebP uniquement.
- Les captures doivent aussi rester miroirs dans `documentation/liberte-UX-UI/...` tant que le pipeline n'est pas entièrement migré.
- Ne pas déposer de capture canonique ailleurs dans `documentation/pages_site/` ou à la racine du repo.
- Les fichiers de contexte, alias temporaires ou exports intermédiaires doivent rester séparés des captures WebP officielles.
- Les fiches route décrivent aussi la capture attendue, même lorsque le dossier `photo/` est encore vide.

### Consigne temporaire

- Jusqu'à nouvel ordre, ne produire que les captures `desktop`.
- Aucune nouvelle capture `mobile` ne doit être générée sans instruction explicite.
- Les fiches peuvent continuer à documenter la capture mobile attendue, mais le flux opérationnel reste desktop-first tant que cette règle n'est pas levée.

### Structure des dossiers

```
documentation/pages_site/routes/
├── 00-homepage/
│   └── root/
│       ├── README.md
│       └── photo/
├── 01-accueil-pilotage/
│   └── dashboard/
│       ├── README.md
│       └── photo/
└── ...

documentation/liberte-UX-UI/
└── [miroir legacy des captures, conservé le temps de la migration]
```

### Formats générés

**Captures officielles** :
- `photo/[route]-desktop.webp` (1440x1200, WebP)
- les captures `mobile` sont suspendues jusqu'à nouvel ordre

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

### Captures WebP automatiques
Les pages principales génèrent automatiquement des captures WebP dans leur dossier `photo/` :
- **Redimensionnement proportionnel** : la plus grande dimension ne dépasse jamais 3000px
- **Compression WebP** : qualité 85% pour un bon compromis taille/qualité
- **Optimisation Sharp** : algorithme Lanczos3 pour une qualité optimale

### Configuration des versions contexte
Seules certaines pages génèrent des captures officielles (flag `generateContext: true`) :
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

Chaque dossier de capture utilise maintenant un seul sous-dossier dédié :
- `photo/` pour les captures officielles WebP
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

