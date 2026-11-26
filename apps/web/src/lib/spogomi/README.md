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

### Transitions d'inscription et projections d'état

Chemins API relatifs à `src/app/api/spogomi/events/[eventId]/`.
Les tests sont des points d'entrée, non une déclaration de réussite.

| Besoin | Entrée / contrat | Tests repères |
|---|---|---|
| Calendrier, inscription et résultats | `lifecycle.ts` | `lifecycle.test.ts` |
| Ouverture des inscriptions | `registration/open/route.ts`, `preparation-service.ts` | `registration/open/route.test.ts` |
| Lire, créer ou annuler sa demande | `admission-requests/route.ts`, `admission-requests.ts` | `admission-requests/route.test.ts`, `admission-requests.test.ts` |
| Décider une demande | `admission-requests/review/route.ts`, `transitionSpogomiAdmissionRequest` | `admission-requests/review/route.test.ts` |
| Transitions et quiz | `registration-lifecycle.ts`, owner SQL déclaré `spogomi_admission_transition_allowed` | `registration-lifecycle.test.ts`, `registration-lifecycle-migration.contract.test.ts` |

Calendrier, inscriptions et résultats sont des projections distinctes :
une date écoulée ne certifie pas un événement. L'ouverture vérifie l'accès
organisateur. La route de demandes authentifie et limite le demandeur,
utilise son identité serveur et expose un GET privé sans cache.
La décision administrative exige un rôle actif admin ou max et une preuve
de vérification pour approuver. Vérifier la transition SQL réelle,
les états terminaux, le quiz, les refus, la concurrence et les projections ;
ne pas déduire les autorisations du seul miroir UI.
