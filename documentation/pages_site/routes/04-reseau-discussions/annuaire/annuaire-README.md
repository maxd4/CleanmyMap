# Annuaire des acteurs

## Fiche canonique

- **Route** : `/sections/annuaire`
- **État documentaire** : `CURRENT`
- **Accès** : consultation publique ; le référencement d'une structure ouvre un parcours authentifié séparé.
- **Objectif actuel** : permettre de comprendre l'annuaire, rechercher des ressources et fiches partenaires acceptées, consulter une fiche et rejoindre le parcours de référencement.
- **Action principale** : `Référencer ma structure` vers [`/partners/onboarding`](../partners-onboarding/partners-onboarding-README.md).
- **Palette** : famille violet/blanc de la section Annuaire.

Cette fiche est l'index contractuel de la page. Elle ne duplique pas les détails de comportement :

- [Présentation détaillée et fonctionnement actuel](./annuaire-presentation-detaillee.md)
- [Propositions réellement restantes](./annuaire-liste-propositions-a-traiter.md)
- [Objectifs hors périmètre](./annuaire-objectifs-non-pertinents.md)

## Sources runtime

- `apps/web/src/lib/sections-registry/config.ts`
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- `apps/web/src/components/sections/rubriques/annuaire/annuaire-section.tsx`
- `apps/web/src/components/sections/rubriques/annuaire/use-annuaire-logic.ts`
- `apps/web/src/lib/partners/annuaire-types.ts`
- `apps/web/src/lib/partners/published-annuaire-entries-store.ts`

## Contrat résumé

L'annuaire assemble deux provenances qui restent distinctes : `editorial_seed` pour
les ressources éditoriales versionnées dans le dépôt et `published_partner` pour les
fiches issues du parcours partenaire. Une ressource éditoriale n'est ni une fiche
partenaire confirmée ni une preuve d'activité, d'impact ou de collaboration.

La lecture publique ne reçoit que les fiches partenaires dont le statut de publication
est `accepted`. Les données administratives, notamment le contact de la demande,
restent privées ; seul un site web HTTP(S) explicitement autorisé par la structure
peut apparaître dans une fiche publique. Une fiche sans URL autorisée conserve l'état
« Contact indisponible ». Une indisponibilité de la source publique est signalée comme
une erreur, et non comme un annuaire vide. Pendant cette indisponibilité, les ressources
`editorial_seed` restent accessibles mais l'interface indique que les fiches partenaires,
le compteur et les résultats visibles peuvent être partiels, avec une action de réessai.
Si des fiches précédemment chargées sont conservées par SWR après un échec, elles sont
signalées comme potentiellement périmées et ne sont pas présentées comme fraîches.

La recherche publique est insensible à la casse et aux accents. Elle accepte plusieurs
termes, les espaces multiples, la ponctuation et les tirets ; les termes sont combinés
par un ET, chaque terme pouvant correspondre à un champ public différent, sans exposer
les contacts administratifs ni les identifiants internes. La recherche, les filtres, la liste paginée, la carte et le graphe consomment le même
état d'exploration. Les limites géographiques et la provenance sont affichées sans
transformer une couverture nationale ou une position dérivée en adresse réelle.

Le filtre structuré des domaines d'engagement propose `Environnement`, `Social`,
`Humanitaire` et `Domaine non renseigné`. Il ne consomme que les types accompagnés de
`engagementTypesSource` (`editorial_seed` ou `partner_declaration`) ; les anciens types
synthétiques des fiches partenaires sont conservés pour l'affichage mais restent non
classés. Les domaines sont éditoriaux ou auto-déclarés, jamais une certification. Les
boutons `Propreté`, `Climat` et `Sensibilisation` restent des recherches par mots-clés.

Une fiche partenaire sépare les données déclarées et administratives des preuves
d'activité. `availability`, les contributions et le périmètre décrivent ce que la
structure déclare ; `lastUpdatedAt` indique une mise à jour administrative. Les
actions passées, dates de dernière action et impacts mesurés ne sont affichés que
lorsqu'une donnée traçable porte sa provenance ; sinon l'interface affiche une
valeur non renseignée. Une relation avec les actions canoniques exige l'identifiant
persisté et vérifié `organizerDirectoryId`, jamais une ressemblance de nom.

L'Annuaire ne consomme pas `community_events` ni `event_rsvps` et ne transforme pas
un événement historique en acteur, partenaire ou preuve d'activité. La disparition
de la page Communauté ne modifie donc ni la provenance `editorial_seed` /
`published_partner`, ni la publication administrative des fiches.

## Preuves et limites documentaires

La présente fiche décrit le contrat du code versionné. Les tests locaux et les
validations de checkout ne constituent pas une preuve de déploiement ou de production.
Les propositions, objectifs exclus et évolutions éventuelles sont séparés des
fonctionnalités `CURRENT` dans les fiches liées.

