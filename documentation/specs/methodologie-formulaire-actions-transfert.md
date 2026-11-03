# PLAN — transfert des explications du formulaire d’actions

Statut : `PLAN` — document préparatoire non publié.

Ce document accompagne l’allègement rédactionnel du formulaire de création et
de bilan. Il ne modifie pas le runtime de `/methodologie` et ne constitue pas
une nouvelle source de vérité scientifique. Les règles et formules existantes
restent dans leurs documents canoniques ; elles sont seulement référencées ici
pour préparer une migration ultérieure.

## Règle de transfert

L’interface conserve les titres courts, labels, unités, valeurs, statuts
(`mesuré`, `estimé`, `non qualifié`), messages d’erreur, alertes de sécurité et
consignes nécessaires à une saisie correcte. Les explications de méthode, de
provenance, de calcul ou de contexte sont retirées de l’UI lorsqu’elles ne sont
pas nécessaires à l’action immédiate.

| Thème | Contenu explicatif conservé hors UI | Emplacement d’origine | Destination proposée dans `/methodologie` | Référence canonique |
| --- | --- | --- | --- | --- |
| Mégots — conversions et lots | Détail des conversions nombre/masse/volume, des états d’humidité, des versions de formule et du principe de mesure source unique par lot. L’UI conserve les valeurs et le statut court. | `apps/web/src/components/actions/action-declaration/sections/harvest-megots-section.tsx` | Méthodologie → Collecte → Mégots → mesures, lots et conversions | `documentation/product/SCIENTIFIC_PROTOCOL.md`; `documentation/product/methodologie-carte-actions.md` |
| Mégots — provenance | Signification technique des provenances comptée, mesurée, convertie, estimée et historique non qualifié. | `apps/web/src/components/actions/action-declaration/sections/harvest-megots-section.tsx` | Méthodologie → Collecte → Mégots → provenance des mesures | `documentation/product/SCIENTIFIC_PROTOCOL.md` |
| Déchets et tri | Interprétation détaillée de la ventilation, de la tolérance de cohérence et des catégories. Le formulaire conserve l’avertissement court et les champs. | `apps/web/src/components/actions/action-declaration/sections/harvest-waste-section.tsx` | Méthodologie → Collecte → Déchets et tri | `documentation/product/SCIENTIFIC_PROTOCOL.md`; `documentation/product/methodologie-carte-actions.md` |
| Jauges et comparaisons | Construction des repères visuels, référence contextuelle, tolérance, couleurs comparatives et limites d’interprétation. Les jauges et l’incertitude essentielle restent visibles. | `apps/web/src/components/actions/action-declaration/ui/harvest-gauges.tsx` | Méthodologie → Indicateurs → Jauges et comparaisons | `documentation/product/SCIENTIFIC_PROTOCOL.md` |
| Participants et parcours école | Règles de composition enfants/adultes/retraités, suggestion scolaire, différence entre comptes identifiés et présence terrain. L’UI conserve les contraintes et statuts utiles. | `apps/web/src/components/actions/action-declaration/steps/action-step-identity.participants.tsx`; `before/planned-action-volunteer-section.tsx`; `before/identity-and-sharing-section.tsx` | Méthodologie → Participants → composition, comptes et présence | `documentation/pages_site/routes/02-agir/actions-new/actions-new-README.md`; `documentation/product/methodologie-carte-actions.md` |
| Localisation, GPS et GPX | Priorité des coordonnées validées, distinction adresse libre/coordonnées, provenance des traces et limites de reconstruction. Le formulaire conserve les erreurs, avertissements et choix de source. | `action-location-inputs.tsx`; `action-location-geometry-sections.tsx`; `before/terrain-map-panel.tsx`; `operational-route-editor.tsx` | Méthodologie → Localisation → géocodage, traces et parcours | `documentation/pages_site/routes/02-agir/actions-new/actions-new-README.md`; `documentation/product/methodologie-carte-actions.md` |
| Durée et créneau | Règles détaillées de cohérence entre durée, horaires, organisation et créneau global. Les valeurs, unités et erreurs restent dans le formulaire. | `steps/action-step-identity.time.tsx`; `before/planned-action-schedule-fields.tsx` | Méthodologie → Préparation → durée et horaires | `apps/web/src/lib/actions/time-contract.ts`; `documentation/pages_site/routes/02-agir/actions-new/actions-new-README.md` |
| Préparation, matériel et sécurité | Justifications des projections de matériel, météo, checklist et recommandations. Les alertes de sécurité, les distinctions vide/0 et les consignes éditables restent affichées. | `before/preparation-checklist-fields.tsx`; `preparation-material-fields.tsx`; `preparation-equipment-fields.tsx`; `preparation-security-fields.tsx`; `preparation-accessibility-fields.tsx` | Méthodologie → Préparation → sécurité, matériel et accessibilité | `documentation/pages_site/routes/02-agir/actions-new/actions-new-README.md`; `documentation/product/SCIENTIFIC_PROTOCOL.md` |
| Identité, accès et inscriptions | Explication complète des relations organisateur, comptes associés, invitations, publication et présence non confirmée. L’UI conserve les statuts d’accès et les limites bloquantes. | `before/identity-and-sharing-section.tsx`; `before/private-action-access-section.tsx`; `before/ui.tsx`; `ui/action-declaration-form-feedback-success.tsx` | Méthodologie → Organisation → comptes, inscriptions et publication | `documentation/pages_site/routes/02-agir/actions-new/actions-new-README.md` |
| Relecture et confirmation | Explications sur la séparation des données brutes, photos, validation et impact. Le formulaire conserve les valeurs, erreurs, statuts et confirmation avant envoi. | `steps/ActionStepReview.tsx`; `ui/action-declaration-form-confirmation.tsx`; `ui/action-declaration-form-feedback-recorded-summary.tsx` | Méthodologie → Bilan → relecture et validation | `documentation/product/SCIENTIFIC_PROTOCOL.md`; `documentation/pages_site/routes/02-agir/actions-new/actions-new-README.md` |

## Éléments explicitement non transférés

Les labels, unités, résultats chiffrés, erreurs, alertes de sécurité, statuts de
mesure, messages de coordonnées non fiables, distinction d’une mesure absente
et d’un zéro explicite, ainsi que les contrôles d’accès restent dans l’UI.
Les calculs, payloads, permissions, conversions et soumissions ne sont pas
modifiés par ce plan.

## Prochaine intégration proposée

Lors d’un futur lot `/methodologie`, reprendre chaque ligne du tableau en
réutilisant les références canoniques indiquées, puis supprimer ce document
PLAN après vérification que les explications transférées sont effectivement
publiées dans le bon owner documentaire.
