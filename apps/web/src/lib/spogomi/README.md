# SPOGOMI — domaine runtime

Ce dossier contient les contrats et services runtime SPOGOMI. Les deux familles
internes sont séparées par responsabilité :

```text
spogomi/
├── preparation/  événements, imports, previews et composition initiale
├── results/      résultats, projections, consolidation et publication
└── fichiers racine : accès, équipes, présence, certification et façades publiques
```

Les façades publiques racine conservent les points d'entrée historiques
consommés par les handlers API, services et composants. Elles délèguent aux
implémentations canoniques des sous-domaines et ne contiennent aucune logique
dupliquée.

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
| Billetterie, imports et réimports | `preparation/preparation-import.ts`, `preparation/preparation-import-*`, `preparation/import-completeness.ts` |
| Proposition et mutations de composition | `preparation/preparation.ts`, `preparation/preparation-service.ts`, `preparation/composition-mutation-service.ts` |
| Résultats, projections et publication | `results/result-service.ts`, `results/results-projection*.ts`, `results/consolidation-service.ts` |
| Certification et règles partagées | `validation.ts`, `regulation.ts`, `scoring.ts`, `certification-invariants-migration.contract.test.ts` |
| Contrats de non-régression | fichiers `*.test.ts` et `*.contract.test.ts` correspondants |

Les fixtures de validation doivent rester synthétiques et versionnées. Aucun
fichier de billetterie réelle, contact, code-barres ou donnée nominative ne doit
être ajouté à ce dossier.
