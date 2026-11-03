# 11 | Progression et statistiques

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `PLAN`. Famille visuelle : **Impact**. Lien matrice : `G04-G13`.

## Objectif de la page

Donner une lecture temporelle utile de la contribution, distincte des résultats ponctuels.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Improve with personalized data » : vue de progression, graphique et indicateurs, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **Contrôle temporel** | haut | Plage de dates, séries éventuellement filtrées. | Paramétrage selon données réellement présentes. |
| 2 | **KPI de progression** | haut | Activités, distance, masse collectée lorsque fiable. | Indiquer mesuré/déclaré/estimé. |
| 3 | **Graphique central** | 30–45 % | Courbe ou barres avec axes, unités, légende et valeurs accessibles. | Un seul graphique lisible plutôt qu’un tableau dense. |
| 4 | **Décomposition** | sous graphique | Par action, lieu, période ou type selon les données existantes. | Aucune extrapolation décorative. |
| 5 | **Navigation détaillée** | bas | Ouvrir activité source depuis un point ou une ligne. | Calculs dérivés par backend. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. choisir période
2. sélectionner une série
3. ouvrir source des chiffres

## États visuels à concevoir

- aucune donnée
- données partielles
- période très longue
- unités hétérogènes

## Frontières métier, sécurité et données

- Une évolution de kg de déchets n’est pas une preuve de réduction des émissions carbone.
- Afficher graphiquement la fiabilité et la provenance des métriques.
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

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S02, S06, S18**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
