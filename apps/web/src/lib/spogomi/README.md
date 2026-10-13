# SPOGOMI — domaine runtime

Ce dossier contient les contrats et services runtime SPOGOMI : préparation des
places, import et réconciliation, composition, accès, résultats, certification,
consolidation et projections.

## Sources canoniques

- [Contrat fonctionnel SPOGOMI](../../../../../documentation/features/spogomi.md)
- [Fixtures et références synthétiques](../../../../../documentation/features/spogomi-references/README.md)
- [Tests et validation](../../../../../documentation/development/TESTING.md)

Le contrat métier, les migrations et les surfaces API restent les sources de
vérité. Ce README n'est qu'un index local : il ne définit ni nouveau roster,
ni règle de compétition, ni donnée partenaire.

## Repères de lecture

| Besoin | Owner local |
| --- | --- |
| Billetterie, imports et réimports | `preparation-import.ts`, `ticket-reconciliation.ts`, `import-completeness.ts` |
| Proposition et mutations de composition | `preparation.ts`, `preparation-service.ts`, `composition-mutation-service.ts` |
| Résultats et certification | `result-service.ts`, `results-projection-service.ts`, `certification-*` |
| Contrats de non-régression | fichiers `*.test.ts` et `*.contract.test.ts` correspondants |

Les fixtures de validation doivent rester synthétiques et versionnées. Aucun
fichier de billetterie réelle, contact, code-barres ou donnée nominative ne doit
être ajouté à ce dossier.
