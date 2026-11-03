# 07 | Créer et préparer une action

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `CURRENT PARTIEL / PLAN`. Famille visuelle : **Agir**. Lien matrice : `D12,E03`.

## Objectif de la page

Préparer une action sur téléphone sans transformer le mobile en deuxième moteur de planification.

## Référence Strava réelle

![Référence visuelle officielle Strava : Visuel « Discover new routes » : carte, parcours et carte contextuelle, dans une composition promotionnelle.](./assets/strava/strava-cartographie.png)

**Ce que montre réellement l’image :** Visuel « Discover new routes » : carte, parcours et carte contextuelle, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **En-tête et progression** | haut | Titre « Créer une action », progression par étapes, sauvegarde brouillon. | Ne pas masquer les vrais champs existants. |
| 2 | **Essentiel** | étape 1 | Titre, date/heure, adresse et point de rendez-vous selon contrat. | Validation contextualisée. |
| 3 | **Terrain / itinéraire** | étape 2 | Carte courte et géométrie attendue selon disponibilité ; accès aux outils carto PLAN. | Ne pas figer une logique de routage native. |
| 4 | **Équipe et logistique** | étape 3 | Participants, rôles, besoins logistiques. | Droits organisateur vérifiés par serveur. |
| 5 | **Vérifier et publier** | étape finale | Résumé vérifiable et CTA unique de publication. | Risque de double soumission traité. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. Navigation avant/arrière entre étapes
2. reprise brouillon
3. contrôle de publication et erreurs inline

## États visuels à concevoir

- brouillon incomplet
- permissions insuffisantes
- publication en cours
- erreur réseau
- action déjà publiée

## Frontières métier, sécurité et données

- Reprendre les quatre sections mobiles existantes.
- La cartographie Strava ne prouve pas un algorithme de planification.
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

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S03**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
