# Gouvernance locale — `apps/web/scripts`

Héritage : gouvernance racine → `apps/web/AGENTS.md` → ce périmètre scripts.
Les scripts sont des outils opératoires ; leur présence ne signifie pas qu'une
mutation a été exécutée.

## Classer l'opération

Avant d'exécuter ou de modifier un script, identifier explicitement s'il s'agit
de :

- diagnostic ;
- génération ;
- export ;
- import ;
- backfill ;
- cleanup.

## Mutations et environnement

- une opération destructive ou distante ne doit jamais être implicite ;
- privilégier le dry-run par défaut lorsque le script le permet ;
- utiliser `--apply` ou `--write` explicitement pour une mutation lorsque le
  script expose cette option ;
- ne jamais lancer une mutation de production pour valider le fonctionnement
  d'un script ;
- `service_role` est réservé aux environnements serveur/CLI autorisés et ne
  doit jamais entrer dans un bundle ou un client.

## Reprise et preuves

Privilégier l'idempotence, la reprise par lots, la provenance des données et un
compte rendu explicite des éléments lus, écrits, ignorés ou en erreur. Les
scripts doivent préserver les archives et refuser les cibles hors contrat.

Les artefacts générés doivent être écrits dans l'emplacement prévu par le
script ou dans un dossier technique existant (`artifacts/`, `backups/` ou autre
chemin documenté), jamais à la racine par commodité.

Validation des scripts lorsque des tests existent :

```bash
npm run test:scripts
```

Ne pas confondre un export, un backfill ou un dry-run avec une preuve de
mutation effectivement appliquée.
