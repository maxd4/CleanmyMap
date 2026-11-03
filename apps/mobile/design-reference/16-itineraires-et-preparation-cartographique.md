# 16 | Itinéraires et préparation cartographique

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `PLAN`. Famille visuelle : **Cartographie**. Lien matrice : `D12-D15`.

## Objectif de la page

Consulter puis préparer un trajet de cleanwalk sans dupliquer le moteur du web.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Discover new routes » : carte, parcours et carte contextuelle, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **Recherche cartographique** | haut | Lieu, activité concernée et préférences existantes. | Ne pas inventer un service de recommandation mobile. |
| 2 | **Carte des tracés** | principal | Route prévue, points de passage, départ et arrivée; contrôles lisibles. | Traces prévues distinctes des observations GPS. |
| 3 | **Fiche itinéraire** | bottom sheet | Distance prévue, géométrie, difficulté si renseignée, contexte d’action. | Source et caractère estimatif visibles. |
| 4 | **Actions** | bas | Consulter, associer à une action, ouvrir le moteur web existant si nécessaire. | Ne pas promettre d’enregistrement hors ligne non pris en charge. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. sélectionner itinéraire
2. zoom et recentrage
3. afficher détails
4. retour à préparation action

## États visuels à concevoir

- aucun itinéraire
- tracé incomplet
- erreur de géocodage
- hors ligne

## Frontières métier, sécurité et données

- Pas de reconstruction artificielle de tracé depuis une adresse.
- Ne pas créer un deuxième moteur de routage ou de météo.
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
- https://stories.strava.com/zh/articles/whats-new-on-strava-log-strength-your-way-find-routes-in-your-own-words-and-explore-offline-mode

## Références complémentaires trouvées le 3 novembre 2026

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S03, S04, S05**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
