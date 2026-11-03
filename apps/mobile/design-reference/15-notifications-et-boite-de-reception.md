# 15 | Notifications et boîte de réception

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `PLAN`. Famille visuelle : **Profil**. Lien matrice : `F09-F12`.

## Objectif de la page

Donner accès aux changements importants des actions et messages.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Get motivated by the community » : contenu social et communauté, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **Header** | haut | Titre Notifications, gestion de lecture si réellement disponible. | Compteur non lu réel uniquement. |
| 2 | **Filtres légers** | haut liste | Toutes / Actions / Messages à évaluer selon volume. | Ne pas figer les catégories sans besoin. |
| 3 | **Liste de notifications** | principal | Icone, auteur ou ressource, résumé sur deux lignes, horodatage, état lu/non lu. | Différencier important et promotionnel sans code couleur seul. |
| 4 | **Navigation ciblée** | au toucher | Ouvrir la ressource exacte après vérification. | Conserver destination précédente. |
| 5 | **Préférences** | menu | Lien vers notifications système et réglages existants. | Respecter le consentement OS. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. ouvrir notification
2. marquer lue si serveur le prévoit
3. retour liste

## États visuels à concevoir

- aucune notification
- nouvelle alerte
- ressource inaccessible
- notifications désactivées

## Frontières métier, sécurité et données

- Le compte mobile dispose de préférences mais pas d’inbox native complète.
- Ne pas créer un deuxième système de notifications.
- Respecter la source de vérité web, les permissions Clerk/Supabase et la confidentialité. Ne pas inventer de données ni d’API.
- Conserver les parcours mobiles CURRENT et les ponts web tant que les fonctionnalités futures ne sont pas réellement intégrées.

## Consignes pour Codex

- Lire la matrice Strava associée et confronter cette proposition à la version courante du shell mobile, des règles scoped et du design system canonique.
- Reproduire **le patron UX générique** (hiérarchie, densité, geste, rythme, zones), pas les ressources graphiques, logos, images propriétaires ou code de Strava.
- Ne développer que la responsabilité du lot autorisé : ce document ne déclenche pas une implémentation ni une migration.
- Lorsque la page sera développée, tester les états vide, erreur, chargement, permission et retour, puis comparer une capture d’émulateur avec la référence CleanMyMap approuvée.
- Si le mockup contredit un contrat web, une permission ou une donnée réelle, préserver le contrat et noter l’écart visuel.

## Sources pour vérifier le comportement Strava

- https://support.strava.com/fr/articles/15402004-parametres-de-l-application-android
- https://play.google.com/store/apps/details?id=com.strava

## Références complémentaires trouvées le 3 novembre 2026

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S11**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
