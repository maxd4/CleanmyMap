# Forms & Controls — contrat canonique

Ce document est la source canonique des champs texte standards de CleanMyMap.
Il complète les contrats de surfaces, d'actions et de modes d'affichage sans
créer de recette locale par formulaire.

## Primitives

Les contrôles standards utilisent les primitives de
`apps/web/src/components/ui/cmm-field.tsx` :

- `CmmField` associe le label, le contrôle, le hint et l'erreur ;
- `CmmInput` porte les propriétés natives de `input` ;
- `CmmSelect` porte les propriétés natives de `select` ;
- `CmmTextarea` porte les propriétés natives de `textarea`.

Chaque contrôle conserve ses props HTML et ses refs. `CmmField` génère ou
préserve l'identifiant du contrôle, relie le label et les messages via
`for`/`id` et `aria-describedby`, et annonce `required` avec
`aria-required`. Une erreur utilise `aria-invalid` et un message associé.

## Contrat visuel

La géométrie et les états sont définis une seule fois par les classes
`cmm-field-*` dans `apps/web/src/styles/forms.css`, importé par
`apps/web/src/app/globals.css` :

- input/select : hauteur 44 px et padding horizontal 14 px ;
- radius : `var(--radius-sm)` ;
- couleurs sémantiques, placeholder lisible et focus via `--focus-ring` ;
- disabled identifiable, sans perte d'association accessible ;
- aucun gradient, blur ou transform dans la primitive.

Les formulaires peuvent conserver leurs wrappers métier colorés et leurs
espacements de structure, mais ne recopient pas la bordure, le fond, le
padding, le radius, l'ombre ou le focus du contrôle.

## Composition d'un formulaire compréhensible

Une surface de formulaire doit rendre évidents **la tâche, les informations demandées, l'état de la progression et l'action suivante**, sans faire de la décoration le principal point focal.

- Afficher un label permanent, visible, associé au champ. Un placeholder illustre éventuellement un format, mais n'est jamais l'unique label.
- Positionner l'aide et les contraintes de saisie au voisinage du champ et les relier programmatiquement. Ne pas attendre une erreur pour révéler une contrainte qui pouvait être connue auparavant.
- Grouper les choix liés par une structure sémantique adaptée (`fieldset`/`legend` pour des radio ou checkbox). Les champs, boutons et erreurs conservent leur sémantique native lorsque possible.
- Utiliser les attributs HTML pertinents (`type`, `autocomplete`, `inputMode`, etc.) lorsque compatibles avec le besoin réel. Ne pas désactiver le collage ni contraindre arbitrairement le format d'une saisie.
- Aligner les champs d'une même fonction sur une grille prévisible, sans forcer des largeurs identiques lorsque leurs contenus ou contraintes diffèrent réellement. À la réduction de viewport, faire passer les champs en colonne avant de réduire leur police.
- Limiter les champs à ce qui est nécessaire pour la tâche ; expliquer les champs facultatifs et ne pas faire d'une information inutile une condition bloquante.

## Validation, erreur et reprise

L'owner métier conserve **la validation réelle et les droits**, tandis que les primitives portent la présentation. Ne pas substituer une règle de design à la validation serveur.

1. Prévenir l'erreur avec une indication claire de format, unité ou contrainte.
2. Lors de la soumission invalide, associer une erreur spécifique au champ et, pour les formulaires comportant plusieurs erreurs, rendre un résumé accessible avec liens ou références aux champs concernés.
3. Expliquer **ce qui ne va pas et comment corriger**, sans code interne ni message machine vague. Le message reste cohérent entre résumé et champ.
4. Conserver les données déjà saisies et permettre la correction. Ne pas effacer un formulaire sur une erreur réseau ou d'autorisation.
5. Pendant une mutation, rendre l'état de chargement compréhensible, bloquer une double soumission selon le contrat métier, et annoncer un succès seulement après confirmation réelle.
6. Pour les opérations avec conséquences importantes, proposer une vérification/récapitulation adaptée avant confirmation, et une issue claire pour revenir modifier la saisie.

La temporalité de validation (en saisie, après blur, à la soumission) dépend de la nature du champ et du contrat métier ; ne pas ajouter des annonces à chaque frappe qui perturbent la saisie ou le lecteur d'écran.

## Parcours en plusieurs étapes

Pour création d'action, signalement ou autre workflow guidé existant :

- Rendre l'étape courante identifiable textuellement, par exemple « Étape X sur Y » lorsque le nombre d'étapes est stable ; distinguer terminé, courant, restant, sans couleur seule.
- Le `WorkflowStepper` existant expose cette progression dans chaque étape ; le retour ou la reprise conserve l'étape et les valeurs du brouillon, sans transformer un statut d'orchestration en preuve de persistance serveur.
- Utiliser la progression existante et ne pas créer un nouveau composant global uniquement pour afficher un numéro.
- Préserver retour, reprise, état local et transitions métier. Le retour arrière ne doit pas effacer des données sans justification.
- Les boutons « Continuer », « Précédent », « Enregistrer » et « Envoyer » désignent des actions différentes ; leurs libellés et leur hiérarchie doivent l'indiquer.
- À la confirmation finale, distinguer le brouillon, la validation de l'étape, la soumission et la persistance effective.
- Ne jamais annoncer une action comme publiée ou envoyée lorsque l'identité, l'autorisation ou le serveur ne l'ont pas confirmée.

Pour une suppression locale réellement réversible (par exemple un tracé ou un
brouillon non envoyé), utiliser `CmmToast` avec une action `Annuler` qui
restaure exactement la valeur précédente. Le message doit préciser la portée
locale et ne doit jamais suggérer l'annulation d'une mutation serveur déjà
envoyée ; une opération non réversible n'utilise pas ce pattern.

Le modèle de progression appartient à l'owner du workflow ; `CmmButton`, `CmmField` et `STATES_FEEDBACK.md` régissent seulement la présentation.

## Modes d'affichage

Les trois modes gardent les mêmes contrôles, contenus et fonctionnalités :

| Mode | Surface et motion |
| --- | --- |
| `exhaustif` | surface légèrement enrichie, avec au plus une ombre très légère |
| `minimaliste` | aucune ombre |
| `sobre` | aucune ombre ni motion, contraste renforcé |

La géométrie et le contenu restent identiques. Les tokens de mode sont
appliqués globalement via `data-display-mode`; les composants ne définissent
pas de `font-family` ou de recette visuelle de mode.

## Périmètre de migration

Les inputs, selects et textareas standards des formulaires de déclaration
d'action et de `reports/admin-workflow/step-confirm.tsx` utilisent ces
primitives. Restent hors de ce contrat les checkbox/radio, file inputs,
contrôles cartographiques, éditeurs spécialisés et uploads/media.

Le garde-fou `npm run check:forms` contrôle la primitive et les fichiers
migrés afin d'empêcher le retour de recettes directes ou de contrôles natifs
standards contournant le contrat.

## Vérification et références

Sur les formulaires modifiés, vérifier label, aide, champs requis, erreurs multiples, soumission valide et invalide, perte de connexion, reprise, focus clavier, annonces du lecteur d'écran et clavier mobile. Tester au moins une largeur mobile et une largeur desktop, ainsi que les trois modes. Distinguer tests disponibles et effectivement exécutés ; `check:forms` ne certifie pas tout un parcours métier.

Les références externes ci-dessous éclairent la conception et l'accessibilité ;
elles ne créent pas une seconde primitive, ne déplacent pas la validation
métier et ne prouvent pas que le parcours CleanMyMap est déjà conforme.

- GOV.UK Design System, messages d'erreur : https://design-system.service.gov.uk/components/error-message/
- GOV.UK Design System, vérification des réponses : https://design-system.service.gov.uk/patterns/check-answers/
- USWDS, indicateur d'étapes : https://designsystem.digital.gov/components/step-indicator/
- W3C, WCAG 2.2 : https://www.w3.org/TR/WCAG22/
