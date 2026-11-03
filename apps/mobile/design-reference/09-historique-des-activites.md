# 09 | Historique des activités

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `CURRENT RÉSUMÉ / PLAN`. Famille visuelle : **Profil**. Lien matrice : `G02-G08`.

## Objectif de la page

Retrouver les cleanwalks passées et leurs preuves, avec accès rapide aux détails.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Improve with personalized data » : vue de progression, graphique et indicateurs, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **En-tête** | haut | Titre « Historique », recherche et sélection d’une période. | Ne pas présenter une seule liste comme source complète sans preuve. |
| 2 | **Résumé de période** | 8–12 % | Total des activités et métriques disponibles, périodes et unités. | Aucun zéro par défaut sur données absentes. |
| 3 | **Liste chronologique** | principal | Chaque ligne : date, lieu, statut, distance et donnée d’impact si admissible. | Carte miniature ou image facultative. |
| 4 | **Filtre de type** | haut liste | Participation, organisation, mission GPS selon catégories effectivement disponibles. | Pas de mélange entre mission et présence validée. |
| 5 | **Navigation** | bas | Ouvrir détail et conserver les filtres au retour. | Respecter la visibilité. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. recherche textuelle si supportée
2. ouverture depuis graphique de progression
3. restauration du contexte

## États visuels à concevoir

- aucune activité
- beaucoup d’activités
- résultat incomplet
- recherche sans résultat

## Frontières métier, sécurité et données

- Conserver les statuts serveur des actions et missions.
- Ne pas compter automatiquement une trace GPS comme participation.
- Respecter la source de vérité web, les permissions Clerk/Supabase et la confidentialité. Ne pas inventer de données ni d’API.
- Conserver les parcours mobiles CURRENT et les ponts web tant que les fonctionnalités futures ne sont pas réellement intégrées.

## Consignes pour Codex

- Lire la matrice Strava associée et confronter cette proposition à la version courante du shell mobile, des règles scoped et du design system canonique.
- Reproduire **le patron UX générique** (hiérarchie, densité, geste, rythme, zones), pas les ressources graphiques, logos, images propriétaires ou code de Strava.
- Ne développer que la responsabilité du lot autorisé : ce document ne déclenche pas une implémentation ni une migration.
- Lorsque la page sera développée, tester les états vide, erreur, chargement, permission et retour, puis comparer une capture d’émulateur avec la référence CleanMyMap approuvée.
- Si le mockup contredit un contrat web, une permission ou une donnée réelle, préserver le contrat et noter l’écart visuel.

## Sources pour vérifier le comportement Strava

- https://play.google.com/store/apps/details?id=com.strava
- https://support.strava.com/fr/articles/15402014-voir-votre-historique-d-activite-sur-strava

## Références complémentaires trouvées le 3 novembre 2026

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S02, S18**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
