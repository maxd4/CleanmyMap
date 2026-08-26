# Annuaire des acteurs

## Fiche canonique

- **Route** : `/sections/annuaire`
- **Fichier(s) source(s)** :
  - `apps/web/src/lib/sections-registry/config.ts`
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- **Type fonctionnel** : section de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : à documenter
- **Contexte nécessaire** : à compléter
- **Objectif utilisateur principal** : Découvrir les acteurs engagés puis permettre à une structure de demander son référencement dans l’annuaire.
- **Action principale attendue** : Référencer ma structure.
- **Cible canonique de l’action principale** : `/partners/onboarding`
- **Palette attendue** : à compléter
- **Scope** : à cadrer
- **Terminée** : non
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : à évaluer

## États à documenter

- **loading** : à compléter.
- **empty state** : à compléter.
- **access refused** : à compléter.
- **Architecture commune** : à compléter.
- **Variantes** : à compléter.
- **Règle** : à compléter.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Compléter après alignement visuel et métier.

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
`structureStatus`. Le LOT 2B.2 porte uniquement sur l'audit qualitatif restant
des descriptions, `featuredReason`, `tags`, `availability` et `pastActions`,
ainsi que sur les doublons d'entités et les formulations à vérifier.

Le LOT 2B.2A a supprimé les profils associatifs éditoriaux non prouvés, fusionné
les doublons ALCOME, TchaoMegot et Cy-Clope, neutralisé les formulations
d'officialité ou de partenariat ciblées, et retiré la ressource de groupe de
parole sans canal public identifiable. Les champs `availability`,
`lastUpdatedAt`, `coveredArrondissements` et `contributionTypes` restent
volontairement inchangés et seront réévalués séparément au LOT 2B.2B.

## Fichiers associés

- [Présentation détaillée](./annuaire-presentation-detaillee.md)
- [Liste des propositions à traiter](./annuaire-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./annuaire-objectifs-non-pertinents.md)
