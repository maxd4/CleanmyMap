# 21 | Hub Agir

> Statut : **BENCHMARK / PLAN** (fiche UX). État mobile observé : `CURRENT`. Famille visuelle : **Agir**. Lien matrice : `B01,E01`.

## Objectif de la page

Offrir un point d’entrée unique aux quatre actions terrain déjà présentes.

## Référence Strava réelle

**Référence visuelle locale (non versionnée) :** consulter [l'emplacement et la provenance](./REFERENCES_STRAVA.md#captures-locales-non-versionnees) ; la source officielle et la limite de correspondance sont indiquées ci-dessous.

**Ce que montre réellement l’image :** Visuel « Track your workouts » : carte de suivi et contrôles d’enregistrement, dans une composition promotionnelle.

**Provenance :** visuel promotionnel public de la fiche [Google Play Strava](https://play.google.com/store/apps/details?id=com.strava), consulté le 3 novembre 2026. Il contient un aperçu authentique de Strava dans un habillage marketing, **pas nécessairement la capture de la page exacte**. Résolution source réduite : 166 × 296 px. Les captures restent la propriété de Strava ; droits de redistribution dans un dépôt Git public non vérifiés.

**Limite de correspondance :** la référence montre un principe graphique voisin. Les zones et interactions décrites ci-dessous sont des **propositions CleanMyMap**, pas une affirmation sur le pixel-perfect ni une preuve que Strava possède tous ces écrans.

## Composition visuelle cible

| Ordre | Zone | Emprise indicative | Contenu et hiérarchie | Comportement à viser |
|---:|---|---|---|---|
| 1 | **Titre et contexte** | haut | « Agir », position et statut éventuel de mission en cours. | Pas de GPS forcé à l’ouverture. |
| 2 | **CTA GPS principal** | premier bloc | Démarrer ou reprendre une mission, avec sécurité et statut. | Surface plus visible que les actions secondaires. |
| 3 | **Actions secondaires** | centre | Rejoindre, Créer, Signaler en cartes compactes. | Ne pas déplacer les fonctions CURRENT derrière des pages vides. |
| 4 | **Préparation / aide** | fin | Accès aux aides, liens fonctionnels et sous-pages PLAN clairement identifiées. | Les ponts web restent visibles comme tels. |

**Grammaire visuelle** : fond sombre par défaut, cartes très contrastées, hiérarchie de typographie claire, 1 CTA primaire identifiable, composants tactiles confortables, Safe Area et clavier respectés. Couleurs par familles du site web : Agir émeraude, Carte ciel, Impact rouge/rose, Réseau rose/indigo, Accueil ambre/brun. La couleur des boutons encode leur priorité, pas le domaine. Ne pas reprendre l’orange de marque Strava.

## Parcours et gestes

1. ouvrir mission
2. ouvrir chaque sous-parcours
3. revenir au hub sans perdre les brouillons

## États visuels à concevoir

- mission active
- GPS refusé
- hors ligne
- utilisateur non connecté

## Frontières métier, sécurité et données

- Protéger les fonctions actuelles avant toute évolution du shell.
- Un hub ne doit pas recopier les pages métiers.
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
- https://support.strava.com/fr/articles/15402137-comment-enregistrer-une-activite-sur-strava

## Références complémentaires trouvées le 3 novembre 2026

Voir le [catalogue de sources et limites](./REFERENCES_STRAVA_COMPLEMENTAIRES_2026.md). Références ciblées : **S02, S17**. Les sources non illustrées ne prouvent pas la composition exacte de l’écran.
