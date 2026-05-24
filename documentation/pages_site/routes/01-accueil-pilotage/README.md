# Accueil & Pilotage

Entrées opérationnelles de pilotage, profil, sommaire et méthodologie.

## Routes canoniques

| Route | Fiche | Statut | Exception UI | Résumé |
|---|---|---:|:---:|---|
| `/dashboard` | [Dashboard](./dashboard/README.md) | canonique | non | Vue de synthèse et actions rapides de pilotage. |
| `/explorer` | [Sommaire](./explorer/README.md) | exception-ui | oui | Carte du site avec palette dédiée validée comme exception. |
| `/methodologie` | [Méthodologie](./methodologie/README.md) | exception-ui | oui | Lecture scientifique verte, alignée sur la homepage. |
| `/parcours` | [Parcours](./parcours/README.md) | canonique | non | Point d'entrée vers le parcours associé au profil. |
| `/parcours/[profile] (ex. /parcours/benevole)` | [Parcours par profil](./parcours-profile/README.md) | canonique-exemple | non | Parcours redirigé selon le profil actif. |
| `/pilotage` | [Pilotage](./pilotage/README.md) | canonique | non | Vue d'arbitrage et lecture opérationnelle des indicateurs. |
| `/profil` | [Profil](./profil/README.md) | canonique | non | Gestion du compte, progression et impact personnel. |
| `/profil/[profile] (ex. /profil/benevole)` | [Profil détaillé](./profil-profile/README.md) | canonique-exemple | non | Vue de profil détaillée par rôle / profil d'application. |
| `/sponsor-portal` | [Portail décideur](./sponsor-portal/README.md) | canonique | non | Espace de pilotage institutionnel et lecture ROI. |

## Captures

- Les captures officielles de cette famille vivent dans chaque dossier route sous `png/` et `webp/`.
- Les archives legacy restent dans `documentation/liberte-UX-UI/` tant que le pipeline de capture n'a pas été migré partout.
