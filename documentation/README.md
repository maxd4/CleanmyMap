# Documentation — CleanMyMap

Point d'entrée de la documentation technique, produit et opérationnelle du
projet.

L'objectif est une structure lisible et durable, pas une arborescence figée.
La documentation continuera d'évoluer avec le produit.

## Source de vérité

Avant toute modification ciblant le dépôt :

1. lire les consignes locales applicables ;
2. vérifier l'état courant sur GitHub `maxd4/CleanmyMap`, branche `main` ;
3. consulter uniquement les sources canoniques utiles au périmètre ;
4. confronter tout plan ou audit ancien au code et aux contrats actuels.

## Domaines documentaires

| Domaine | Responsabilité principale |
|---|---|
| `architecture/` | architecture, frontières, ADR et décisions structurelles |
| `database/` | données, Supabase, migrations, requêtes et index |
| `design-system/` | design system et règles UI transversales |
| `development/` | développement, tests, qualité et modularisation |
| `features/` | fonctionnalités et moteurs transverses |
| `legal/` | juridique et conformité |
| `operations/` | exploitation, déploiement, plateformes et runbooks |
| `pages_site/` | documentation fonctionnelle route-first |
| `product/` | vision, parcours et décisions produit |
| `security/` | AuthN, AuthZ, RLS et sécurité applicative |
| `seo/` | stratégie et maintenance SEO |

Les zones internes de planification, de session, de spécification temporaire et
les outils de publication sont gouvernés par
`documentation/development/DOCUMENTATION_POLICY.md` ; ils ne constituent pas de nouveaux
domaines métier.

## Où chercher

| Besoin | Référence |
|---|---|
| Architecture globale | `architecture/master-architecture.md` |
| Vue système | `architecture/system-overview.md` |
| ADR | `architecture/adr/` |
| Refactors structurels | `architecture/refactor-priorities-plan.md` et `architecture/monolith-split-plan.md` |
| Données | `database/README.md` |
| Design system | `design-system/README.md` |
| Développement | `development/README.md` |
| Tests et validation | `development/TESTING.md` |
| Fonctionnalités | `features/README.md` |
| Produit | `product/README.md` |
| Exploitation | `operations/README.md` |
| Sécurité | `security/README.md` |
| Pages et routes | `pages_site/README.md` puis `pages_site/INDEX.md` |
| SEO | `seo/README.md` |

## Règles de classement

Une règle durable doit avoir une seule source canonique.

Pour un sujet mixte :

```text
résumé dans le domaine utilisateur concerné
→ détail dans le domaine technique responsable
→ lien entre les deux
→ pas de copie miroir
```

Un README oriente. Il ne doit pas reproduire un guide entier.

Un document daté, un audit, un plan ou un historique ne doit pas être présenté
comme l'état courant.

## `pages_site/`

`pages_site/` décrit les pages du point de vue utilisateur : rôle, contenu,
parcours, états et UX/UI.

`pages_site/README.md` porte les conventions locales et `pages_site/INDEX.md`
reste l'inventaire maître.

Le sous-arbre `pages_site/routes/` est un espace de travail personnel protégé :
il peut être lu pour comprendre le contexte, mais il n'est modifié que sur
demande explicite de l'utilisateur.

La maintenance structurelle de `pages_site/` concerne donc par défaut sa racine,
pas `routes/`.

## Documentation courante et historique

Les statuts utiles sont :

```text
CURRENT
PLAN
AUDIT
HISTORY
SNAPSHOT
ADR
GENERATED
```

Ils peuvent être matérialisés par le nom, le dossier ou une mention explicite
dans le document.

Il n'est pas nécessaire de déplacer un ancien document uniquement pour rendre
l'arborescence plus esthétique. Le classement doit surtout éviter qu'il soit
pris pour une source `CURRENT`.

## Workflow de modification

Avant :

```text
□ Lire les consignes applicables
□ Vérifier `main`
□ Identifier le domaine responsable
□ Identifier la source canonique
□ Définir le plus petit périmètre utile
```

Après :

```text
□ Vérifier les références actives
□ Vérifier le diff exact
□ Exécuter les checks documentaires pertinents
□ Ne pas annoncer de validation non exécutée
```

Commandes usuelles :

```bash
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:agent-skills
git diff --check
```

Les validations plus larges sont exécutées seulement lorsque le périmètre les
justifie.

## Principes de maintenance

- une responsabilité claire par dossier ;
- une règle durable = une source canonique ;
- préférer les liens aux duplications ;
- ne pas créer un nouveau dossier racine pour un besoin ponctuel ;
- ne pas conserver un backlog terminé comme source active ;
- ne pas réécrire l'historique pour le faire ressembler au présent ;
- ne pas poursuivre une restructuration pour atteindre une perfection
  documentaire artificielle.

Pour les règles complètes de classement :
`documentation/development/DOCUMENTATION_POLICY.md`.
