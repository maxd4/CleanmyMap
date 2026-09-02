# Documentation — CleanMyMap

Point d'entrée de la documentation technique, produit et opérationnelle du
projet.

## Source de vérité

Avant toute modification ciblant le dépôt :

1. lire les consignes locales applicables ;
2. vérifier le fichier courant sur GitHub `maxd4/CleanmyMap` ;
3. lire uniquement la documentation canonique utile au périmètre ;
4. ne pas appliquer un ancien plan sans le confronter au code actuel.

## Où chercher

| Besoin | Référence |
|---|---|
| Architecture globale | `architecture/master-architecture.md` |
| Inventaire technique | `architecture/technical-inventory.md` |
| Vue système rapide | `architecture/system-overview.md` |
| Décisions majeures | `architecture/adr/` |
| Sécurité | `security/README.md` |
| Tests et validation | `development/TESTING.md` |
| Développement | `development/README.md` |
| Modularisation | `development/conventions-modularisation.md` puis `architecture/monolith-split-plan.md` |
| Amélioration continue / Kaizen | `development/kaizen/README.md` |
| Affichage des scores UI | `development/ui-score-formatting.md` |
| Produit | `product/README.md` |
| Fonctionnalités | `features/README.md` |
| Gamification | `features/GAMIFICATION_ENGINE.md` puis la spec canonique liée |
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
├── architecture/
│   ├── adr/
│   ├── master-architecture.md
│   ├── system-overview.md
│   └── ...
├── database/
├── design-system/
│   └── generated/board/
├── development/
│   └── kaizen/
├── features/
├── operations/
├── pages_site/
│   ├── INDEX.md
│   └── routes/
├── product/
├── security/
└── specs/
```

Les documents courants sont les sources de vérité. Les documents historiques,
audits et documents de session conservent le contexte sans devenir une
architecture ou une spécification concurrente.

## Orientation par objectif

### Construire une fonctionnalité

Lire l'architecture globale, la vue système, les frontières front/back et les
modules concernés, puis uniquement les règles spécialisées nécessaires :
`architecture/master-architecture.md`, `architecture/system-overview.md`,
`architecture/frontend-backend-boundaries.md`,
`architecture/modules-cles-et-dependances.md`,
`development/regression-gates.md`, `development/repo-quality-rules.md`,
`development/TESTING.md` et, pour une surface UI, `design-system/README.md`.

### Modulariser ou refactorer

Partir de `development/conventions-modularisation.md` pour les règles durables,
puis de `architecture/monolith-split-plan.md` pour le radar et les cibles
actuelles. Ne pas maintenir une seconde liste de progression dans un guide
d'agent.

### Vérifier le produit

Partir de `product/vision-et-objectifs.md`, puis consulter
`product/parcours-utilisateurs.md`, `product/matrice-rubriques.md`,
`product/coherence-mobile-first.md`, `product/SCIENTIFIC_PROTOCOL.md` et
`product/roadmap-priorisee.md`.

### Publier et maintenir

Consulter `operations/checklist-push-deploy.md`,
`operations/incidents-frequents-et-reprise.md`,
`architecture/traceability-matrix.md` et le runbook de session approprié.

### UI, sécurité et zones sensibles

Pour l'UI, lire `design-system/README.md`,
`design-system/BLOC_COLOR_SYSTEM_PREMIUM.md`, `pages_site/INDEX.md` et la fiche
canonique de la page. Pour les routes, permissions, exports ou données, lire
`security/api-vigilance.md`, `security/authz-authn-regles.md` et
`operations/pre-release-security-check.md`, en plus du document de domaine.

## Captures UX/UI

Les captures canoniques sont centralisées par bloc ou famille documentaire,
conformément à :

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
□ Lire les consignes locales applicables
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

Validation complète lorsqu'elle est justifiée :

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

- les consignes locales applicables ;
- `README.md` ;
- `architecture/README.md` ;
- `security/README.md` ;
- `development/TESTING.md` ;
- `pages_site/README.md` ;
- `pages_site/INDEX.md`.
