# Documentation Policy

## Objet

Cette politique définit quand documenter, où placer une connaissance et comment
gérer son cycle de vie.

La structure canonique des dossiers est définie dans
`documentation/AGENTS.md`.

## Quand documenter

Documenter uniquement une connaissance durable pertinente, notamment :

- contrat ;
- comportement ;
- architecture ou frontière ;
- sécurité ;
- données ;
- exploitation ;
- validation ;
- décision produit ;
- limite ou hypothèse utile.

Une modification interne sans conséquence durable ne crée pas, à elle seule,
une obligation documentaire.

## Où documenter

Choisir d'abord le domaine responsable :

```text
architecture/
database/
design-system/
development/
features/
legal/
operations/
pages_site/
product/
security/
seo/
```

Ne pas créer un nouveau domaine lorsqu'un emplacement existant convient.

Pour un sujet mixte :

- résumé fonctionnel dans la source utilisateur ou produit concernée ;
- détail technique dans le domaine responsable ;
- lien entre les deux ;
- aucune copie miroir.

## États documentaires

Toujours distinguer :

- `CURRENT` : état ou contrat applicable ;
- `PLAN` : travail ou décision encore ouverte ;
- `AUDIT` : preuve contextualisée ;
- `HISTORY` : contexte historique ;
- `SNAPSHOT` : photographie figée ;
- `ADR` : décision d'architecture ;
- `GENERATED` : sortie reproductible.

Ne jamais présenter un `PLAN`, un audit ou un snapshot comme comportement
implémenté.

Un historique reste historique. Il n'est pas réécrit uniquement pour refléter
le présent.

## Zones internes et temporaires

Les chemins suivants ne constituent pas des sources publiques `CURRENT` :

- `documentation/sessions/` — mémoire et continuité de session ;
- `documentation/plans/` — plans transverses ou projet ;
- `documentation/specs/` — spécifications temporaires de chantier ;
- `documentation/operations/agent-memory-governance.md` ;
- `documentation/operations/session-standard-runbook.md`.

Règles :

- une spec terminée doit céder sa connaissance durable au domaine canonique ;
- un plan terminé ne reste pas présenté comme backlog actif ;
- une mémoire de session ne devient jamais un contrat produit ou runtime ;
- ces zones ne doivent pas être utilisées comme raccourci pour éviter de
  choisir un domaine responsable.

## `pages_site/`

`documentation/pages_site/` reste route-first.

`README.md` porte les conventions locales et `INDEX.md` l'inventaire maître.

`documentation/pages_site/routes/` est un espace de travail personnel protégé.
Sa lecture est autorisée pour comprendre les pages et leurs références, mais
aucune mutation n'y est effectuée sans demande explicite de l'utilisateur.

Une restructuration documentaire globale peut modifier les fichiers à la racine
de `pages_site/`, mais ne doit pas normaliser automatiquement `routes/`.

## README et index

Un README :

- explique le rôle du dossier ;
- oriente vers les sources canoniques ;
- peut résumer la structure ;
- ne duplique pas les règles détaillées.

Après une réorganisation significative, mettre à jour uniquement les README et
index réellement concernés.

## Schémas et visuels

Ajouter un schéma lorsqu'il réduit réellement l'ambiguïté.

Préférer une source éditable et versionnable, notamment Mermaid, lorsqu'elle
convient.

Une image statique n'est pas une seconde source de vérité.

Les captures et assets sous `documentation/pages_site/routes/` suivent la règle
de protection de ce sous-arbre et les règles Git du dépôt.

## Génération et publication

`documentation/quarto-templates/` et `_quarto*.yml` sont de l'outillage de
publication.

Les sorties générées doivent rester identifiées comme telles et ne remplacent
pas la source éditable.

Les rapports reproductibles destinés à la validation ou au diagnostic vivent
dans l'emplacement d'artefact prévu par le dépôt, sauf exception explicitement
documentée.

## Public et interne

Les domaines publics peuvent être orientés depuis `documentation/README.md`.

Les documents de session, mémoires internes, plans internes, secrets, tokens,
backups et dumps ne doivent pas être exposés comme documentation publique.

Ne jamais inventer une source, une mesure, un chiffre ou une validation.

## Suppression et déplacement

Avant de déplacer ou supprimer :

1. identifier l'état du document ;
2. vérifier s'il porte encore une connaissance unique ;
3. rechercher les références actives ;
4. déplacer seulement si cela clarifie réellement la responsabilité ;
5. préserver les références historiques qui décrivent volontairement l'ancien
   état.

Ne pas lancer de réorganisation cosmétique globale.

## Vérification avant clôture

Pour un document `CURRENT`, vérifier sa cohérence avec le code ou le contrat
actuel lorsque pertinent.

Puis :

- contrôler les liens actifs ;
- contrôler le diff ;
- exécuter les checks documentaires du périmètre ;
- signaler explicitement les validations non exécutées.

Le critère de réussite est une documentation compréhensible et correctement
classée, pas une arborescence parfaite.
