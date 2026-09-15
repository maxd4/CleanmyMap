# Captures d'écran automatisées

> **Statut du dossier `screen/` : `TOOLING`.** Ce document décrit l'outillage
> de capture et son pipeline. Les images produites sont des `SNAPSHOT` ; elles
> ne sont jamais une source fonctionnelle `CURRENT` et vivent dans le périmètre
> d'artefacts prévu par le pipeline. Aucun script ni aucune capture n'est
> modifié par cette clarification.

Les captures et screenshots sont des `SNAPSHOT` : ils décrivent une
photographie datée d'un rendu et ne sont jamais une source supérieure au
runtime ou à une fiche fonctionnelle `CURRENT`.

Pour toute future capture, documenter lorsque disponible la route ou page, le
viewport `desktop` ou `mobile`, la date et éventuellement le SHA ou la version
de l'application. Une évolution fonctionnelle ne déclenche pas
automatiquement une nouvelle capture.

## Organisation des captures

Le registre canonique des routes et l'inventaire exhaustif sont maintenus dans
`documentation/pages_site/INDEX.md`. Les snapshots route-first conservés avec
une page vivent sous
`documentation/pages_site/routes/<family>/<page>/screenshots/desktop/` ou
`screenshots/mobile/`. Le pipeline d'écran produit séparément ses sorties dans
`artifacts/screenshots/pages-site/` ; ces sorties ne remplacent pas les
snapshots documentaires colocalisés. Le miroir legacy
`documentation/liberte-UX-UI/` reste inchangé.

Les snapshots d'un composant partagé qui n'est pas une page, comme les menus
de navigation par bloc, vivent dans la documentation UI spécialisée, par
exemple `documentation/design-system/navigation-dropdowns-snapshots/`.

### Règle impérative

- Les sorties générées du nouveau pipeline doivent être enregistrées dans
  `artifacts/screenshots/pages-site/<family>/<slug>/desktop.png`.
- Le format de sortie du pipeline est PNG uniquement.
- Les snapshots documentaires manuels restent dans le dossier `screenshots/`
  de leur page canonique, avec leur format et leur nom existants.
- Les anciens dossiers `photo/` ont été migrés vers les pages propriétaires ;
  aucune nouvelle capture ne doit y être déposée.
- Les captures legacy générées sont enregistrées dans `artifacts/screenshots/legacy/...`; les fichiers historiques de `documentation/liberte-UX-UI/...` restent inchangés.
- Ne pas déposer de sortie générée en dehors de `artifacts/screenshots/` et ne
  pas déposer de snapshot de page hors de son dossier canonique.
- Les fichiers de contexte, alias temporaires ou exports intermédiaires doivent rester séparés des captures officielles.
- Les fiches route continuent de documenter la capture attendue, même lorsque
  le dossier `screenshots/` de la page est encore vide.

### Consigne temporaire

- Jusqu'à nouvel ordre, ne produire que les captures `desktop`.
- Aucune nouvelle capture `mobile` ne doit être générée sans instruction explicite.
- Les fiches peuvent continuer à documenter la capture mobile attendue, mais le flux opérationnel reste desktop-first tant que cette règle n'est pas levée.

### Structure des dossiers

```
documentation/pages_site/
├── INDEX.md
├── screen/
│   ├── README.md
│   ├── capture-pages.mjs
│   ├── capture-routes.mjs
│   └── ...
└── routes/
    ├── 00-homepage/
    │   └── homepage/
    │       ├── homepage-README.md
    │       └── screenshots/
    │           ├── desktop/
    │           └── mobile/
    └── ...

artifacts/screenshots/
├── canonical/routes/<route>/
├── legacy/<section>/
└── pages-site/<family>/<slug>/desktop.png

documentation/liberte-UX-UI/
└── [captures historiques, non réécrites par les pipelines]
```

### Formats générés

**Captures écran officielles** :
- `artifacts/screenshots/pages-site/<family>/<slug>/desktop.png` (1440x1200, PNG, full page)
- les captures `mobile` sont suspendues jusqu'à nouvel ordre

## Utilisation

```bash
# Serveur local
npm run dev
npm run screenshots:screen

# URL déployée
BASE_URL=https://mon-site.vercel.app npm run screenshots:screen
```

## Fonctionnalités avancées

### Auto-scroll intelligent
Pour les pages complètes, le script effectue un scroll automatique pour charger les sections lazy-loaded avant la capture.

### Captures PNG automatiques
Les pages principales génèrent automatiquement des captures PNG dans
`artifacts/screenshots/pages-site/` :
- **Redimensionnement et compression** : Sharp ré-encode le PNG en sortie finale
- **Optimisation** : le rendu est généré en full page desktop pour réduire les captures manuelles

### Configuration des routes
Les routes sont lues depuis `documentation/pages_site/screen/capture-routes.mjs`, qui s'appuie sur le registre canonique exporté par `documentation/pages_site/generate-canonical-pages.mjs`.

### Actions avant capture
Le pipeline supporte des actions optionnelles avant capture :
- fermer le bandeau cookies
- ouvrir un menu de bloc
- ouvrir le menu de préférences
- cliquer le menu profil
- cliquer un sélecteur arbitraire
- attendre avant la capture

## Rapport de capture

Le script génère un rapport détaillé indiquant :
- ✅ Captures réussies
- ❌ Captures échouées
- 🔍 Routes en échec avec la raison

## Dépendances

- **Playwright** : capture d'écran et orchestration navigateur
- **Sharp** : ré-encodage et compression du PNG de sortie

