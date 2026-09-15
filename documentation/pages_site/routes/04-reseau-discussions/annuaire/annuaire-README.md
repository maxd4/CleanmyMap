# Annuaire des acteurs

## Fiche canonique

- **Route** : `/sections/annuaire`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/components/sections/rubriques/annuaire/annuaire-section.tsx`
- **Type fonctionnel** : section de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `public-visible` ; la consultation de l'annuaire, sa recherche et son exploration ne requièrent pas de compte. Le CTA de référencement ouvre un parcours séparé, avec ses propres contrôles.
- **Objectif utilisateur principal** : Découvrir les acteurs engagés puis permettre à une structure de demander son référencement dans l’annuaire.
- **Action principale attendue** : Référencer ma structure.
- **Cible canonique de l’action principale** : `/partners/onboarding`
- **Palette attendue** : violet / blanc, identité visuelle actuelle de l'annuaire
- **Scope** : consultation publique avec recherche, filtres thématiques et géographiques, exploration carte/réseau, fiches détaillées paginées et CTA vers le référencement partenaire.
- **Terminée** : non
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne — maintenir la distinction provenance éditoriale/partenaire.

## Accès et limites

La page expose publiquement les ressources éditoriales et les fiches de
partenaires publiées selon leur contrat de publication. Une lecture publique
ne donne ni accès à des données privées ni pouvoir d'organisation sur les
fiches. Le CTA `Référencer ma structure` mène à `/partners/onboarding`, qui
reste un parcours séparé avec son propre contrôle d'accès.

Les éléments non établis par le runtime — notamment le scope d'organisation,
les variantes UI et les décisions de présentation non documentées ailleurs —
restent **à arbitrer** et ne sont pas des capacités actuelles de l'annuaire.

## États à documenter

- **loading** : le canvas cartographique est chargé dynamiquement ; l'interface conserve son shell pendant le chargement.
- **empty state** : aucune fiche ne correspond aux termes ou filtres sélectionnés.
- **access refused** : non applicable à la consultation publique ; le référencement partenaire conserve son parcours séparé.
- **Architecture commune** : `SectionShell`, `AnnuaireExplorationView`, `useAnnuaireLogic`, liste de fiches, canvas carte/réseau et drawer de détail.
- **Variantes** : vue carte, vue réseau, filtres ouverts, pagination et fiche sélectionnée.
- **Règle** : la provenance `editorial_seed` ou `published_partner` reste visible et ne vaut jamais validation, partenariat ou activité mesurée par défaut.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Le rendu runtime est finalisé ; aucune décision d'organisation non prouvée n'est ajoutée à cette fiche.

## Provenance et niveau de confiance

L'annuaire public présente deux provenances distinctes, portées par le champ
discriminant `provenance` :

- `editorial_seed` : ressource éditoriale ou curatée versionnée dans le dépôt.
  Sa présence dans le code ne constitue pas une validation, un partenariat,
  une activité récente ni une mesure d'impact. Elle est affichée avec un niveau
  de confiance neutre (`Ressource éditoriale`).
- `published_partner` : fiche issue du parcours partenaire et de la
  persistance, exposée publiquement seulement lorsqu'elle est acceptée par le
  contrat de publication. Ses statuts persistés de vérification et de
  qualification conservent le comportement de confiance prévu par le produit.

Les seeds sont normalisés à la frontière du registre public : ils ne peuvent
pas produire `trusted`, `Confirmée`, `Vérifiée`, `Partenaire actif`, une
structure active ou validée, une activité récente prouvée ou un historique
d'impact mesuré. Le tri ne leur attribue aucun avantage lié à la confiance ;
une éventuelle mise en avant reste une sélection éditoriale distincte.

Les fiches issues du seed restent visibles dans l'annuaire comme ressources
éditoriales. Le contrat `AnnuaireEntrySeedInput` interdit désormais dans les
sources seed les statuts de validation, la récence, `impactHistory` et
`structureStatus`. Le LOT 2B.2 porte sur l'audit qualitatif des descriptions,
`featuredReason`, `tags` et `pastActions`, ainsi que sur les doublons d'entités
et les formulations à vérifier.

Le LOT 2B.2A a supprimé les profils associatifs éditoriaux non prouvés, fusionné
les doublons ALCOME, TchaoMegot et Cy-Clope, neutralisé les formulations
d'officialité ou de partenariat ciblées, et retiré la ressource de groupe de
parole sans canal public identifiable. Les champs `availability`,
`lastUpdatedAt`, `coveredArrondissements` et `contributionTypes` ont ensuite
été réévalués dans le lot final ci-dessous.

Le LOT 2B.2B finalise ce contrat sémantique : une ressource `editorial_seed`
ne transporte ni disponibilité opérationnelle ni fraîcheur partenaire. Elle
peut exposer des `coveredArrondissements` comme zones associées au contenu
éditorial, sans les présenter comme un périmètre opérationnel prouvé. Ses
`contributionTypes` sont affichés comme contributions repérées et ne sont pas
un indicateur d'impact.

Une fiche `published_partner` conserve ses données déclarées de disponibilité,
de fraîcheur et de périmètre. Les labels de confiance restent factuels
(`Fiche confirmée`, `Mise à jour récente`) et ne valent pas certification ni
preuve d'activité. L'ordre réel est : mise en avant éventuelle, fiches
confirmées, proximité lorsqu'elle est disponible, puis ordre alphabétique.

## Fichiers associés

- [Présentation détaillée](./annuaire-presentation-detaillee.md)
- [Liste des propositions à traiter](./annuaire-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./annuaire-objectifs-non-pertinents.md)
