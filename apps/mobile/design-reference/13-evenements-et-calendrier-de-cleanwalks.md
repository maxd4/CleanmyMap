# 13 | Événements et calendrier de cleanwalks

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `PLAN / CURRENT PARTIEL`. Famille visuelle : **Réseau**. Lien matrice : `E03-E09`.

## Objectif de la page

Passer d’une annonce d’événement à une participation concrète.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Get motivated by the community » : contenu social et communauté, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **Entête événements** | haut | Titre et période; recherche géographique. | Clarté sur lieu et heure. |
| 2 | **Calendrier ou liste** | principal | Dates groupées avec cards, organisateur, lieu, capacité si connue. | Choisir le mode le plus lisible sur téléphone. |
| 3 | **Fiche événement** | sous-page | Bannière, horaire exact, lieu rendez-vous, consignes, liste visible et CTA. | Reprend les données d’action canonique. |
| 4 | **Lien club** | dans la fiche | Accès collectif, discussions et consignes selon permissions. | Pas d’inscription « club » implicite. |
| 5 | **Statut participation** | CTA sticky | Rejoindre/annuler, en attente/confirmé. | Aucune confirmation de présence par simple clic. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. parcourir par date
2. ouvrir détail
3. revenir à la même semaine

## États visuels à concevoir

- événement annulé
- capacité atteinte
- invitation requise
- prochaine action introuvable

## Frontières métier, sécurité et données

- Une action future n’est pas une action réalisée.
- Conserver timezone et date locale de l’événement.
- Respecter la source de vérité web, les permissions Clerk/Supabase et la confidentialité. Ne pas inventer de données ni d’API.
- Conserver les parcours mobiles CURRENT et les ponts web tant que les fonctionnalités futures ne sont pas réellement intégrées.

## Consignes pour Codex

- Lire la matrice Strava associée et confronter cette proposition à la version courante du shell mobile, des règles scoped et du design system canonique.
- Reproduire **le patron UX générique** (hiérarchie, densité, geste, rythme, zones), pas les ressources graphiques, logos, images propriétaires ou code de Strava.
- Ne développer que la responsabilité du lot autorisé : ce document ne déclenche pas une implémentation ni une migration.
- Lorsque la page sera développée, tester les états vide, erreur, chargement, permission et retour, puis comparer une capture d’émulateur avec la référence CleanMyMap approuvée.
- Si le mockup contredit un contrat web, une permission ou une donnée réelle, préserver le contrat et noter l’écart visuel.

## Sources pour vérifier le comportement Strava

- https://support.strava.com/fr/articles/15401837-les-clubs-sur-l-appli-mobile
- https://play.google.com/store/apps/details?id=com.strava

## Références complémentaires trouvées le 3 novembre 2026

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S01**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
