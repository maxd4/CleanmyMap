# Documentation — CleanMyMap

Point d'entrée de la documentation technique, produit et opérationnelle du projet.

## Source de vérité

Avant toute modification ciblant le dépôt :

1. lire `AGENTS.md` ;
2. vérifier le fichier courant sur GitHub `maxd4/CleanmyMap` ;
3. lire uniquement la documentation canonique utile au périmètre ;
4. ne pas appliquer un ancien plan sans le confronter au code actuel.

## Où chercher

| Besoin | Référence |
|---|---|
| Architecture globale | `architecture/master-architecture.md` |
| Vue système rapide | `architecture/system-overview.md` |
| Décisions majeures | `architecture/adr/` |
| Sécurité | `security/README.md` |
| Tests et validation | `development/TESTING.md` |
| Développement | `development/README.md` |
| Produit | `product/README.md` |
| Design system | `design-system/README.md` |
| Pages et routes | `pages_site/INDEX.md` |
| Exploitation | `operations/README.md` |
| Données | `database/README.md` |

## Règle de classement

### `documentation/pages_site/`

Source de vérité fonctionnelle du point de vue utilisateur pour :

- rôle de la page ;
- contenu ;
- parcours ;
- états ;
- UX/UI ;
- captures ;
- améliorations propres à la page.

### Dossiers techniques transversaux

Utiliser le dossier adapté :

```txt
architecture/
database/
development/
features/
operations/
security/
```

Pour un sujet mixte :

- résumé fonctionnel dans la fiche de page ;
- détail technique dans le dossier technique ;
- lien entre les deux ;
- aucune copie miroir.

## Structure principale

```txt
documentation/
├── ai-guides/
├── architecture/
│   ├── adr/
│   ├── master-architecture.md
│   ├── system-overview.md
│   └── ...
├── database/
├── design-system/
├── development/
├── features/
├── operations/
├── pages_site/
│   ├── INDEX.md
│   └── routes/
├── product/
├── security/
└── specs/
```

Les dossiers historiques, de session ou personnels ne doivent pas devenir des sources de vérité concurrentes.

## Lecture par type de tâche

### UI

Lire :

1. `design-system/README.md` ;
2. `design-system/BLOC_COLOR_SYSTEM_PREMIUM.md` ;
3. `pages_site/INDEX.md` ;
4. fiche canonique de la page.

### Sécurité, API, données ou auth

Lire :

1. `security/README.md` ;
2. `architecture/system-overview.md` ;
3. ADR pertinent ;
4. fichiers de code réellement concernés.

### Architecture

Lire :

1. `architecture/master-architecture.md` ;
2. `architecture/system-overview.md` ;
3. ADR concernés ;
4. document de domaine.

### Produit

Lire :

1. `product/vision-et-objectifs.md` ;
2. `product/roadmap-priorisee.md` ;
3. fiche de page ou fonctionnalité concernée.

## Captures UX/UI

Les captures canoniques sont centralisées par bloc ou famille documentaire, conformément à :

```txt
documentation/pages_site/README.md
```

Règles :

- format WebP ;
- dossier photo centralisé au niveau du bloc ;
- nom contenant bloc, page ou route et date ;
- pas de miroir par page ;
- capture desktop par défaut ;
- mobile uniquement sur instruction explicite.

Une preuve visuelle ne remplace pas la vérification sémantique de la page.

## Workflow agent

### Avant de modifier

```txt
□ Lire AGENTS.md
□ Vérifier le fichier actuel sur GitHub
□ Identifier la source canonique
□ Inspecter les dépendances directes
□ Définir le plus petit périmètre sûr
```

### Après modification

Validation ciblée :

```bash
npm run checks:changed
```

Validation complète :

```bash
npm run checks
```

Contrôles spécialisés :

```bash
npm run security:secrets
npm run test:security
npm run test:regression-gates
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:agent-skills
```

E2E explicite :

```bash
npm run test:e2e
```

## Principes

### Sécurité

- valider les entrées ;
- vérifier l'autorisation côté serveur ;
- ne jamais exposer `service_role` au client ;
- ne pas désactiver RLS pour contourner un bug ;
- ne jamais committer un secret.

### Documentation

- une règle durable = une source canonique ;
- préférer un lien à une duplication ;
- éviter les nombres de fichiers codés en dur ;
- éviter les dates factices ;
- ne pas conserver un backlog terminé comme source active.

### Qualité

- ne pas annoncer un test non exécuté ;
- corriger la cause racine ;
- éviter les refontes opportunistes ;
- documenter les décisions majeures dans un ADR.

## Références prioritaires

- `AGENTS.md`
- `README.md`
- `architecture/README.md`
- `security/README.md`
- `development/TESTING.md`
- `pages_site/README.md`
- `pages_site/INDEX.md`
