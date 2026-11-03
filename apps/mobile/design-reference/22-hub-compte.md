# 22 | Hub Compte

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `CURRENT`. Famille visuelle : **Profil**. Lien matrice : `G01,H01-H09`.

## Objectif de la page

Retrouver les données du compte, les activités et les préférences.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Improve with personalized data » : vue de progression, graphique et indicateurs, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **Identité et accès** | haut | Nom, profil, rôle et édition. | Authentification actuelle reste propriétaire. |
| 2 | **Mes activités** | centre | Accès historique, actions créées, missions, invitations et données réelles. | Distinguer résumés CURRENT et sections PLAN. |
| 3 | **Mes préférences** | centre bas | Localisations préférées, activité, confidentialité, notifications. | Pas de réglage visuel non persisté présenté comme permanent. |
| 4 | **Aide et légal** | fin | Contact, feedback, textes légaux et déconnexion. | Respecter les liens web et éventuelle nouvelle authentification. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. naviguer vers sous-pages
2. changer préférences
3. déconnexion
4. retour

## États visuels à concevoir

- hors connexion
- profil incomplet
- activité privée
- demande suppression

## Frontières métier, sécurité et données

- Ne pas assimiler « Compte » à futur « Profil » avant décision de navigation.
- Ne pas remplacer les fonctionnalités du compte par des placeholders Strava.
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
- https://support.strava.com/fr/articles/15402175-votre-page-profil-strava

## Références complémentaires trouvées le 3 novembre 2026

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S02, S09, S14**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
