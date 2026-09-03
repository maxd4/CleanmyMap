# Gouvernance locale — `documentation`

Héritage : gouvernance racine → ce périmètre documentaire.

Ce fichier définit la structure et les règles de classement de
`documentation/`. Il ne remplace ni `AGENTS.md` racine ni les contrats
techniques spécialisés.

## Principe directeur

La documentation doit rester **cohérente**, pas parfaite.

Priorités :

1. une responsabilité claire par dossier ;
2. une source canonique par règle durable ;
3. distinction explicite entre état courant, plan, audit et historique ;
4. pas de duplication volontaire ;
5. pas de réorganisation cosmétique sans gain structurel.

Ne pas lancer une campagne de renommage, de déplacement ou de réécriture
uniquement pour homogénéiser l'arborescence.

## Architecture documentaire

### Domaines durables

Les dossiers suivants portent les responsabilités documentaires principales :

| Dossier | Responsabilité |
|---|---|
| `architecture/` | architecture globale, frontières, ADR, décisions structurelles |
| `database/` | données, Supabase, requêtes, index, migrations |
| `design-system/` | règles UI transversales et design system |
| `development/` | méthodes de développement, tests, qualité, modularisation |
| `features/` | moteurs et fonctionnalités transverses |
| `legal/` | juridique, conformité et contenus légaux |
| `operations/` | exploitation, déploiement, plateformes, runbooks, audits opérationnels |
| `pages_site/` | registre fonctionnel route-first et espace documentaire des pages |
| `product/` | vision, parcours, roadmap et décisions produit |
| `security/` | AuthN, AuthZ, RLS et sécurité applicative |
| `seo/` | stratégie et maintenance SEO |

Ne pas créer un nouveau dossier racine si un de ces domaines peut porter le
contenu sans ambiguïté.

### Zones de cycle de vie et de support

Ces dossiers ne sont pas des domaines métier concurrents :

- `plans/` : plans transverses ou projet encore actifs ; un plan spécifique à
  un domaine peut vivre directement dans ce domaine ;
- `sessions/` : contexte, mémoire et historique de sessions ; jamais source
  `CURRENT` du produit ou du runtime ;
- `specs/` : spécifications temporaires de chantier ; lorsqu'une spec est
  terminée, absorber la connaissance durable dans son domaine puis supprimer ou
  historiser la spec si nécessaire ;
- `quarto-templates/` et `_quarto*.yml` : outillage de publication documentaire,
  pas documentation métier.

Un nouveau dossier de cycle de vie n'est créé que s'il porte une responsabilité
durable absente des zones existantes.

## États documentaires

Toujours distinguer :

```text
CURRENT
PLAN
AUDIT
HISTORY
SNAPSHOT
ADR
GENERATED
```

Règles :

- `CURRENT` décrit l'état actuel ou le contrat applicable ;
- `PLAN` décrit un travail ou une décision encore ouverte ;
- `AUDIT` est une preuve contextualisée ;
- `HISTORY` et `SNAPSHOT` conservent un état passé ;
- un ADR conserve une décision structurante ;
- `GENERATED` est reproductible et ne devient pas une seconde source de vérité.

Un audit ou un historique peut rester dans son domaine si son statut est
évident. Il n'est pas nécessaire de créer une arborescence parfaite autour de
chaque ancien document.

## Source durable et sélection

Documenter uniquement une connaissance durable pertinente :

- contrat ;
- architecture ou frontière de responsabilité ;
- règle de sécurité ;
- comportement ;
- exploitation ;
- validation ;
- décision produit ;
- limite ou hypothèse nécessaire.

Modifier la source spécialisée réellement concernée. Préférer un lien à une
copie.

Les README servent d'orientation et d'index. Ils ne doivent pas recopier les
documents canoniques.

## Règle spéciale — `pages_site/`

`documentation/pages_site/` reste route-first.

- `README.md` porte les conventions locales ;
- `INDEX.md` reste l'inventaire maître ;
- les fichiers à la racine de `pages_site/` peuvent être maintenus dans le
  cadre de la gouvernance documentaire ;
- `documentation/pages_site/routes/` est un **espace de travail personnel
  protégé**.

Par défaut, dans `pages_site/routes/` :

- lecture autorisée pour comprendre le contexte et les références ;
- aucune suppression ;
- aucun déplacement ;
- aucun renommage ;
- aucune réécriture ;
- aucune normalisation de structure ;
- aucune modification d'asset.

Toute mutation sous `documentation/pages_site/routes/` exige une demande
explicite de l'utilisateur pour ce périmètre.

La restructuration globale de `documentation/` doit donc s'adapter autour de
`routes/`, jamais utiliser ce sous-arbre comme cible de nettoyage automatique.

## Déplacement et suppression

Avant de déplacer ou supprimer un document :

1. identifier son état (`CURRENT`, `PLAN`, `AUDIT`, etc.) ;
2. vérifier s'il porte encore une connaissance unique ;
3. rechercher les références actives ;
4. déplacer vers le domaine responsable seulement si cela réduit réellement
   l'ambiguïté ;
5. préserver les références historiques lorsqu'elles décrivent volontairement
   l'ancien état.

Ne pas réécrire un snapshot ou un audit uniquement pour moderniser ses chemins.

## Public, interne et généré

Respecter `development/DOCUMENTATION_POLICY.md`.

En particulier :

- les mémoires de session et plans internes ne deviennent pas des index publics ;
- les secrets, tokens, identifiants de session et données privées ne sont jamais
  documentés ;
- les sorties générées restent sous leur emplacement d'artefact ou de
  publication prévu ;
- une preuve générée ne remplace pas une source éditable.

## Critère de création d'un nouveau document

Créer un nouveau fichier uniquement si :

1. la connaissance mérite d'être conservée ;
2. aucun document canonique existant ne peut l'absorber proprement ;
3. son domaine et son état documentaire sont explicites.

Sinon, enrichir la source existante.

## Clôture

Après une réorganisation significative :

- vérifier les README réellement concernés ;
- vérifier les références actives ;
- confronter les documents `CURRENT` au code ou au contrat actuel lorsque
  pertinent ;
- exécuter les checks documentaires applicables.

Ne pas poursuivre une restructuration uniquement pour atteindre une
arborescence idéale.
