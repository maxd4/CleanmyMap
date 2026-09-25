# Gamification - Présentation détaillée

## Fiche canonique

- **Route** : `/sections/gamification`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Cartographie & Impact (bloc)
- **Accès runtime** : `auth-disabled-gate` ; la section reste verrouillée avant connexion, conformément au registre des sections.
- **Objectif utilisateur principal** : Lire sa progression, ses badges, les formes de reconnaissance et les repères de méthode associés.
- **Action principale attendue** : Explorer sa progression, ses collections et les informations de fonctionnement de la gamification.
- **Palette attendue** : red
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : blanc / rose / rouge — interface claire avec accents d'impact rouges et roses.
- **Incohérences de couleurs** : Aucune incohérence majeure avec l'identité rouge attendue n'est établie par le composant actuel.
- **Risque de conflit avec les couleurs existantes** : moyen : attention au chevauchement entre sky cartographique et rouge impact / alerte.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Carte
- légende
- chiffres clés
- résumés d impact
- **Textes à réduire ou supprimer** :
- Commentaires de contexte
- badges de répétition
- cartes trop proches visuellement
- **Bulles / cartes / contextes trop nombreux** : Les widgets de lecture d impact se superposent facilement avec la carte ou les stats.
- **Composants UI concernés** :
- progression et collections
- badges et reconnaissance
- préférences de présentation
- méthode et états opérationnels
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique

## Rôle produit

La rubrique gamification sert à rendre lisible la progression personnelle, la reconnaissance utile et les paliers d engagement. Elle doit rester non compétitive, crédible et alignée avec la mission benevole du site.

## Ce que la rubrique montre

- progression visible;
- badges one-shot;
- badges infinis;
- badges réguliers;
- retours d impact;
- distinctions de confiance;
- surfaces de lecture calmes, pas un jeu mobile.

## Mécaniques CURRENT à garder visibles

Les sept progressions infinies sont `Participation`, `Organisation`,
`Exploration`, `Zones propres`, `Régularité`, `Polyvalence` et
`Apprentissage`. Les paliers quiz par type et équilibrés sont rattachés à
`Apprentissage`, pas exposés comme deux progressions supplémentaires.

Les formulaires sont des preuves de validation et de complétude, pas une
progression utilisateur : aucun badge Forms CURRENT ni XP de remplissage. Les
indicateurs de confiance et de qualité restent dérivés des faits vérifiés, et
les compteurs kg/mégots restent des métriques d'impact ; aucune de ces surfaces
ne produit une barre infinie CURRENT. Mohs reste une lecture `LEGACY` des
anciens compteurs. La zone sensible apaisée dispose d'une preuve historique
dédiée : une qualification est figée au moment de la validation de l'action et
l'état courant de la zone ne peut pas révoquer cette contribution. Elle ne
produit pas de nouvelle attribution XP ; les anciens événements de palier sont
conservés uniquement en compatibilité historique.

## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

## Références legacy

- [progression_badges.md](../../../../3-BLOC-VISUALISER&IMPACTER/progression_badges.md)

## Notes d audit

- Cette fiche est la source de vérité canonique pour la section.
- `/gamification` reste un alias de compatibilité vers cette section canonique.
- La source canonique des règles de gamification vit dans [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md).
- Les conventions de scopes temporels et le résumé de l interface cible vivent dans [gamification-scope-ui-notes.md](./gamification-scope-ui-notes.md).
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.

## Liens de travail

- [Spécification canonique](./gamification-SPEC_CANONIQUE.md)
- [Liste des propositions à traiter](./gamification-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./gamification-objectifs-non-pertinents.md)
