# 12 | Clubs et collectifs

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `PLAN / PONT WEB`. Famille visuelle : **Réseau**. Lien matrice : `E09-E16`.

## Objectif de la page

Faire découvrir les collectifs locaux et leurs événements, et suivre leur activité.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Get motivated by the community » : contenu social et communauté, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Modèle CleanMyMap existant

![Maquette générée CleanMyMap : Clubs et collectifs](./assets/cleanmymap/06-communaute-clubs-cleanmymap.png)

**Lecture du modèle :** composition exploratoire. Les nombres, noms, photos, badges, unités, trajets ou estimations représentés sont fictifs et ne doivent pas être codés comme données runtime, constantes métier ou règles scientifiques.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **Liste des clubs** | écran d’entrée | Recherche, localisation, cards club (nom, zone, activité), invitation. | La matrice décrit une expérience future. |
| 2 | **En-tête de club** | sous-page | Bannière, logo, nom, statut d’adhésion, description. | Rôles et gestion des membres selon serveur. |
| 3 | **Résumé communautaire** | sous header | Membres et activités publiques si disponibles. | Aucun compteur inventé. |
| 4 | **Onglets de club** | milieu | Vue d’ensemble, événements, activités, discussions selon contrats. | Ne pas multiplier les onglets vides. |
| 5 | **Publications** | principal | Fil de posts avec avatar, photo et commentaires. | Afficher uniquement les contenus autorisés. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. ouvrir un club
2. participer à un événement
3. voir le fil du club

## États visuels à concevoir

- club privé
- adhésion en attente
- club sans événement
- utilisateur non membre

## Frontières métier, sécurité et données

- Le modèle de communauté est une cible de composition, pas la preuve d’une API dédiée.
- Ne pas confondre association, organisateur et groupe de discussion sans validation produit.
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
- https://support.strava.com/fr/articles/15401837-les-clubs-sur-l-appli-mobile

## Références complémentaires trouvées le 3 novembre 2026

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S01, S12**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
