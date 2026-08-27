# Captures d'écran automatisées

## Organisation des captures

Le registre canonique des routes vit dans `documentation/pages_site/generate-canonical-pages.mjs` et l'inventaire exhaustif reste centralisé dans `documentation/pages_site/INDEX.md`. Le nouveau pipeline d'écran alimente `artifacts/screenshots/pages-site/` en PNG desktop full page. Les captures route-first historiques dans `photo/` et le miroir legacy `documentation/liberte-UX-UI/` restent disponibles sans être réécrits.

### Règle impérative

- Les captures écran canoniques du nouveau pipeline doivent être enregistrées dans `artifacts/screenshots/pages-site/<family>/<slug>/desktop.png`.
- Le format de sortie est PNG uniquement.
- Les captures route-first historiques en `photo/` restent documentées pour compatibilité tant que le pipeline n'est pas totalement migré.
- Les captures legacy générées sont enregistrées dans `artifacts/screenshots/legacy/...`; les fichiers historiques de `documentation/liberte-UX-UI/...` restent inchangés.
- Ne pas déposer de captures écran en dehors de `artifacts/screenshots/`.
- Les fichiers de contexte, alias temporaires ou exports intermédiaires doivent rester séparés des captures officielles.
- Les fiches route continuent de documenter la capture attendue, même lorsque le dossier `screen/` ou `photo/` est encore vide.

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
    │   └── root/
    │       ├── README.md
    │       └── photo/
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
Les pages principales génèrent automatiquement des captures PNG dans leur dossier `screen/` :
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

