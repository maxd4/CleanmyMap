# Pages Site - Source de vérité documentaire

Ce dossier est le registre canonique des pages UI du repo. Chaque route rendue dispose d'une fiche route-first dans `routes/`, avec ses captures officielles en `png/` et ses dérivés de contexte en `webp/` quand ils existent.

## Familles canoniques

- [Homepage](./routes/00-homepage/README.md)
- [Accueil & Pilotage](./routes/01-accueil-pilotage/README.md)
- [Agir](./routes/02-agir/README.md)
- [Cartographie & Impact](./routes/03-cartographie-impact/README.md)
- [Réseau & Discussions](./routes/04-reseau-discussions/README.md)
- [Apprendre](./routes/05-apprendre/README.md)
- [Auth & Onboarding](./routes/06-auth-onboarding/README.md)
- [Institutionnel & Légal](./routes/07-legal/README.md)
- [Système & Utilitaires](./routes/08-systeme-utilitaires/README.md)
- [Admin & Super-admin](./routes/09-admin-superadmin/README.md)
- [Print & Export](./routes/10-print-export/README.md)

## Règles

- Une route = une fiche canonique.
- Les exceptions UI sont explicitement marquées.
- Les routes dynamiques utilisent un exemple canonique par pattern.
- Les dossiers legacy dans `0-HOMEPAGE/`, `1-BLOC-*` et `6-PAGES-STANDALONE/` restent consultables, mais ne sont plus la source de vérité principale.

## Index complet

### Homepage

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/` | [Page d'accueil](./routes/00-homepage/root/README.md) | page | non | Hero, piliers, bénéfices, activité communautaire et crédibilité. |
| `/accueil` | [Accueil](./routes/00-homepage/accueil/README.md) | page | non | Reprise de session et porte d'entrée personnelle. |

### Accueil & Pilotage

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/dashboard` | [Dashboard](./routes/01-accueil-pilotage/dashboard/README.md) | page | non | Vue de synthèse et actions rapides de pilotage. |
| `/explorer` | [Sommaire](./routes/01-accueil-pilotage/explorer/README.md) | exception | oui | Carte du site avec palette dédiée validée comme exception. |
| `/methodologie` | [Méthodologie](./routes/01-accueil-pilotage/methodologie/README.md) | exception | oui | Lecture scientifique verte, alignée sur la homepage. |
| `/parcours` | [Parcours](./routes/01-accueil-pilotage/parcours/README.md) | page | non | Point d'entrée vers le parcours associé au profil. |
| `/parcours/[profile] (ex. /parcours/benevole)` | [Parcours par profil](./routes/01-accueil-pilotage/parcours-profile/README.md) | dynamic | non | Parcours redirigé selon le profil actif. |
| `/pilotage` | [Pilotage](./routes/01-accueil-pilotage/pilotage/README.md) | page | non | Vue d'arbitrage et lecture opérationnelle des indicateurs. |
| `/profil` | [Profil](./routes/01-accueil-pilotage/profil/README.md) | page | non | Gestion du compte, progression et impact personnel. |
| `/profil/[profile] (ex. /profil/benevole)` | [Profil détaillé](./routes/01-accueil-pilotage/profil-profile/README.md) | dynamic | non | Vue de profil détaillée par rôle / profil d'application. |
| `/sponsor-portal` | [Portail décideur](./routes/01-accueil-pilotage/sponsor-portal/README.md) | page | non | Espace de pilotage institutionnel et lecture ROI. |

### Agir

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/actions/history` | [Historique des actions](./routes/02-agir/actions-history/README.md) | page | non | Historique opérationnel des actions déclarées. |
| `/actions/new` | [Déclarer une action](./routes/02-agir/actions-new/README.md) | page | non | Formulaire prioritaire pour déclarer une action terrain. |
| `/declaration` | [Déclaration](./routes/02-agir/declaration/README.md) | alias | non | Redirection canonique vers `/actions/new`. |
| `/declaration-simple` | [Déclaration simple](./routes/02-agir/declaration-simple/README.md) | page | non | Version simplifiée du formulaire de déclaration. |
| `/missions/[id] (ex. /missions/terrain-2026)` | [Mission détaillée](./routes/02-agir/missions-id/README.md) | dynamic | non | Vue détaillée d'une mission avec carte et chronologie. |
| `/sections/guide` | [Mode d'emploi](./routes/02-agir/sections-guide/README.md) | page | non | Guide terrain et bonnes pratiques opérationnelles. |
| `/sections/kit` | [Kit terrain](./routes/02-agir/sections-kit/README.md) | page | non | Checklist matériel et préparation terrain. |
| `/sections/recycling` | [Que faire des déchets ?](./routes/02-agir/sections-recycling/README.md) | page | non | Tri, valorisation et filières après collecte. |
| `/sections/route` | [Itinéraire IA](./routes/02-agir/sections-route/README.md) | page | non | Recommandation guidée pour aller agir au bon endroit. |
| `/sections/weather` | [Météo terrain](./routes/02-agir/sections-weather/README.md) | page | non | Fenêtres météo pour choisir le bon moment d'action. |
| `/signalement` | [Signalement déchets](./routes/02-agir/signalement/README.md) | page | non | Signalement rapide des points de pollution et déchets. |

### Cartographie & Impact

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/actions/map` | [Carte des actions](./routes/03-cartographie-impact/actions-map/README.md) | page | non | Carte géolocalisée des actions et hotspots. |
| `/gamification` | [Progression & badges](./routes/03-cartographie-impact/gamification/README.md) | page | non | Badges, niveaux et progression personnelle. |
| `/observatoire` | [Observatoire public](./routes/03-cartographie-impact/observatoire/README.md) | page | non | Lecture publique des données ouvertes et vérifiables. |
| `/profil/impact` | [Profil impact](./routes/03-cartographie-impact/profil-impact/README.md) | page | non | Impact personnel détaillé et progression utilisateur. |
| `/reports` | [Rapports d'impact](./routes/03-cartographie-impact/reports/README.md) | page | non | Synthèses et exports d'impact pour partager les résultats. |
| `/sandbox` | [Sandbox carte](./routes/03-cartographie-impact/sandbox/README.md) | page | non | Bac à sable cartographique pour tester les comportements. |

### Réseau & Discussions

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/community` | [Communauté](./routes/04-reseau-discussions/community/README.md) | page | non | Espace d'entraide et d'échanges communautaires. |
| `/messagerie` | [Messagerie](./routes/04-reseau-discussions/messagerie/README.md) | page | non | Messagerie interne et discussions ciblées. |
| `/open-data` | [Open data](./routes/04-reseau-discussions/open-data/README.md) | page | non | Point d'accès aux données et jeux ouverts. |
| `/partners/dashboard` | [Annuaire partenaires](./routes/04-reseau-discussions/partners-dashboard/README.md) | page | non | Fiches partenaires et gestion du réseau. |
| `/partners/network` | [Réseau engagé](./routes/04-reseau-discussions/partners-network/README.md) | page | non | Cartographie du réseau et des partenaires engagés. |
| `/partners/onboarding` | [Onboarding partenaire](./routes/04-reseau-discussions/partners-onboarding/README.md) | page | non | Séquence guidée d'entrée dans le réseau partenaire. |

### Apprendre

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/learn/bonnes-pratiques` | [Bonnes pratiques](./routes/05-apprendre/learn-bonnes-pratiques/README.md) | page | non | Guides courts pour agir plus efficacement. |
| `/learn/comprendre` | [Comprendre l'enjeu](./routes/05-apprendre/learn-comprendre/README.md) | page | non | Pédagogie de l'enjeu environnemental. |
| `/learn/hub` | [Hub éducatif](./routes/05-apprendre/learn-hub/README.md) | page | non | Point d'entrée principal des contenus d'apprentissage. |
| `/learn/ressources` | [Ressources](./routes/05-apprendre/learn-ressources/README.md) | page | non | Ressources, liens et contenus de référence. |
| `/learn/sentrainer` | [S'entraîner](./routes/05-apprendre/learn-sentrainer/README.md) | page | non | Entraînement et mise en pratique guidée. |

### Auth & Onboarding

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/onboarding` | [Onboarding](./routes/06-auth-onboarding/onboarding/README.md) | page | non | Configuration initiale du profil utilisateur. |
| `/onboarding/localisation` | [Onboarding localisation](./routes/06-auth-onboarding/onboarding-localisation/README.md) | page | non | Choix de la zone d'action à l'inscription. |
| `/sign-in` | [Connexion](./routes/06-auth-onboarding/sign-in/README.md) | page | non | Page de connexion Clerk au système. |
| `/sign-up` | [Inscription](./routes/06-auth-onboarding/sign-up/README.md) | page | non | Page de création de compte Clerk. |

### Institutionnel & Légal

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/conditions-generales-utilisation` | [CGU](./routes/07-legal/conditions-generales-utilisation/README.md) | page | non | Conditions générales d'utilisation. |
| `/conditions-utilisation` | [Conditions d'utilisation](./routes/07-legal/conditions-utilisation/README.md) | page | non | Version complémentaire des conditions d'utilisation. |
| `/contact` | [Contact](./routes/07-legal/contact/README.md) | page | non | Page de contact, email public et formulaire RGPD. |
| `/en` | [English entry](./routes/07-legal/en/README.md) | page | non | Entrée bilingue / internationale. |
| `/mentions-legales` | [Mentions légales](./routes/07-legal/mentions-legales/README.md) | page | non | Informations légales du site. |
| `/politique-confidentialite` | [Politique de confidentialité](./routes/07-legal/politique-confidentialite/README.md) | page | non | Traitement et protection des données. |
| `/politique-cookies` | [Politique cookies](./routes/07-legal/politique-cookies/README.md) | page | non | Gestion des cookies et consentement. |

### Système & Utilitaires

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/error/429` | [Erreur 429](./routes/08-systeme-utilitaires/error-429/README.md) | page | non | Page d'erreur de limitation de requêtes. |
| `/form-comparison` | [Comparaison de formulaires](./routes/08-systeme-utilitaires/form-comparison/README.md) | page | non | Comparaison UX entre deux parcours de formulaire. |
| `/preview/actions/new` | [Preview déclaration](./routes/08-systeme-utilitaires/preview-actions-new/README.md) | page | non | Prévisualisation technique du formulaire de déclaration. |
| `/reglages` | [Réglages](./routes/08-systeme-utilitaires/reglages/README.md) | page | non | Paramètres, préférences et réglages globaux. |
| `/sections/[sectionId] (ex. /sections/route)` | [Section dynamique](./routes/08-systeme-utilitaires/sections-sectionid/README.md) | dynamic | non | Route générique de rendu des rubriques de section. |

### Admin & Super-admin

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/admin` | [Administration](./routes/09-admin-superadmin/admin/README.md) | page | non | Vue d'administration et de modération. |
| `/admin/forms` | [Administration des formulaires](./routes/09-admin-superadmin/admin-forms/README.md) | page | non | Gestion des formulaires et des règles associées. |
| `/admin/godmode` | [God mode](./routes/09-admin-superadmin/admin-godmode/README.md) | page | non | Supervision avancée et maintenance privilégiée. |
| `/admin/services` | [Administration des services](./routes/09-admin-superadmin/admin-services/README.md) | page | non | Pilotage des services et paramètres techniques. |

### Print & Export

| Route | Fiche | Type | Exception UI | Résumé |
|---|---|---|:---:|---|
| `/prints/report` | [Rapport imprimable](./routes/10-print-export/prints-report/README.md) | page | non | Rapport d'impact prêt à imprimer et exporter. |

