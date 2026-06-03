# Index maître des pages

Ce document est la table de référence exhaustive de `documentation/pages_site`. Chaque route codée du repo y est inventoriée avec son statut, son contexte d'accès, son dossier canonique et ses signaux d'audit UI / contenu.

## Familles

- [Homepage (hors bloc)](./routes/00-homepage/homepage-README.md)
- [Accueil & Pilotage (bloc)](./routes/01-accueil-pilotage/README.md)
- [Agir (bloc)](./routes/02-agir/README.md)
- [Cartographie & Impact (bloc)](./routes/03-cartographie-impact/README.md)
- [Réseau & Discussions (bloc)](./routes/04-reseau-discussions/README.md)
- [Apprendre (bloc)](./routes/05-apprendre/README.md)
- [Auth & Onboarding (hors bloc)](./routes/06-auth-onboarding/README.md)
- [Institutionnel & Légal (hors bloc)](./routes/07-legal/README.md)
- [Système & Utilitaires (hors bloc)](./routes/08-systeme-utilitaires/README.md)
- [Admin & Super-admin (hors bloc)](./routes/09-admin-superadmin/README.md)
- [Print & Export (hors bloc)](./routes/10-print-export/README.md)

## Règles

- Une route = une fiche canonique.
- Les routes dynamiques sont documentées par un exemple canonique par pattern.
- Les routes alias ou redirections restent inventoriées mais ne sont pas traitées comme des pages UI autonomes.
- Chaque route canonique possède son propre sous-dossier dans `documentation/pages_site/routes/`.
- Ce sous-dossier contient des captures de la page complète, un `README.md` préfixé et titré avec le nom de la page, un `presentation-detaillee.md`, un `liste-propositions-a-traiter.md` et un `objectifs-non-pertinents.md`, tous préfixés par le nom de la page.
- Les captures `.webp` vivent dans un dossier photo centralisé au niveau d'entrée du bloc concerné.
- Les captures sont nommées avec la route, le nom lisible de la page et la date de capture.
- Chaque sous-dossier de page doit conserver ces quatre fichiers préfixés par le nom de la page.
- Le nom du dossier canonique et le nom de chaque fichier doivent contenir le nom de la page ou de la rubrique dont ils dépendent.
- Le dossier photo centralisé doit contenir le nom du bloc ou de la famille qu'il couvre.
- Les fichiers optionnels ne sont créés que lorsqu ils deviennent pertinents pour la page ou la rubrique. On évite les fichiers vides créés par anticipation.
- Les markdown de `documentation/pages_site/routes/` suivent un style court et direct : chiffres exacts, unités abrégées, listes sans article en tête quand c'est possible.
- Les pages de lecture documentent aussi le choix de sobriété : carte légère, calculs à la demande, détails chargés seulement quand ils servent.
- Les captures disponibles ne sont pas obligatoires pour exister dans l'inventaire.
- Les incohérences de couleurs sont évaluées par comparaison entre la règle attendue et la teinte actuellement résolue par le code.
- La charte complémentaire des pages hors blocs vit dans `charte-pages-hors-blocs.md` ([lien](./charte-pages-hors-blocs.md)).

## Inventaire complet

### Homepage (hors bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/` | homepage | [Homepage](./routes/00-homepage/homepage/homepage-README.md) | Homepage (hors bloc) | public | Aucun | vert clair / emerald | à corriger | apps/web/src/app/page.tsx | ./routes/00-homepage/homepage | non | moyen | non | faible |



### Accueil & Pilotage (bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/dashboard` | page de bloc | [Dashboard](./routes/01-accueil-pilotage/dashboard/README.md) | Accueil & Pilotage (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | amber / orange | à corriger | apps/web/src/app/(app)/dashboard/page.tsx | ./routes/01-accueil-pilotage/dashboard | non | fort | non | moyenne |
| `/explorer` | exception UI — sommaire | [Sommaire](./routes/01-accueil-pilotage/explorer/README.md) | Accueil & Pilotage (bloc) | public | Aucun | yellow | terminé | apps/web/src/app/(app)/explorer/page.tsx | ./routes/01-accueil-pilotage/explorer | non | moyen | non | faible |
| `/parcours` | page d'action | [Parcours](./routes/01-accueil-pilotage/parcours/README.md) | Accueil & Pilotage (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | amber / orange | à corriger | apps/web/src/app/(app)/parcours/page.tsx | ./routes/01-accueil-pilotage/parcours | non | moyen | oui | critique |
| `/parcours/[profile] (ex. /parcours/benevole)` | dynamique — parcours | [Parcours par profil](./routes/01-accueil-pilotage/parcours-profile/README.md) | Accueil & Pilotage (bloc) | dynamique | Paramètre de route requis (profil, id, section, mission...) | amber / orange | à corriger | apps/web/src/app/(app)/parcours/[profile]/page.tsx | ./routes/01-accueil-pilotage/parcours-profile | non | moyen | oui | moyenne |
| `/pilotage` | page de bloc | [Pilotage](./routes/01-accueil-pilotage/pilotage/README.md) | Accueil & Pilotage (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | amber / brun | à corriger | apps/web/src/app/(app)/pilotage/page.tsx | ./routes/01-accueil-pilotage/pilotage | non | fort | non | moyenne |
| `/profil` | page de bloc | [Profil](./routes/01-accueil-pilotage/profil/README.md) | Accueil & Pilotage (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | amber / orange | à corriger | apps/web/src/app/(app)/profil/page.tsx | ./routes/01-accueil-pilotage/profil | non | fort | non | moyenne |
| `/profil/[profile] (ex. /profil/benevole)` | dynamique — profil | [Profil détaillé](./routes/01-accueil-pilotage/profil-profile/README.md) | Accueil & Pilotage (bloc) | dynamique | Paramètre de route requis (profil, id, section, mission...) | amber / orange | à corriger | apps/web/src/app/(app)/profil/[profile]/page.tsx | ./routes/01-accueil-pilotage/profil-profile | non | moyen | non | moyenne |
| `/sponsor-portal` | page de bloc | [Portail décideur](./routes/01-accueil-pilotage/sponsor-portal/README.md) | Accueil & Pilotage (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | amber / brun | à corriger | apps/web/src/app/(app)/sponsor-portal/page.tsx | ./routes/01-accueil-pilotage/sponsor-portal | non | moyen | non | faible |



### Agir (bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/actions/history` | page d'action | [Historique des actions](./routes/02-agir/actions-history/README.md) | Agir (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | emerald | à corriger | apps/web/src/app/(app)/actions/history/page.tsx | ./routes/02-agir/actions-history | non | moyen | non | faible |
| `/actions/new` | page d'action | [Déclarer une action](./routes/02-agir/actions-new/README.md) | Agir (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | emerald | à corriger | apps/web/src/app/(app)/actions/new/page.tsx | ./routes/02-agir/actions-new | non | moyen | non | faible |
| `/missions/[id] (ex. /missions/terrain-2026)` | dynamique — mission | [Mission détaillée](./routes/02-agir/missions-id/README.md) | Agir (bloc) | dynamique | Paramètre de route requis (profil, id, section, mission...) | emerald | à corriger | apps/web/src/app/(app)/missions/[id]/page.tsx | ./routes/02-agir/missions-id | non | moyen | non | moyenne |
| `/sections/route` | page de bloc | [Itinéraire IA](./routes/02-agir/sections-route/README.md) | Agir (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | emerald | à corriger | apps/web/src/app/(app)/sections/route/page.tsx | ./routes/02-agir/sections-route | non | moyen | non | faible |
| `/signalement` | page d'action | [Signalement déchets](./routes/02-agir/signalement/README.md) | Agir (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | emerald | à corriger | apps/web/src/app/(app)/signalement/page.tsx | ./routes/02-agir/signalement | non | moyen | non | faible |

#### Redirections et alias

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/declaration` | redirection | [Déclaration](./routes/02-agir/declaration/README.md) | Agir (bloc) | redirection | Aucun, la page redirige automatiquement | emerald | hors scope | apps/web/src/app/declaration/page.tsx | ./routes/02-agir/declaration | non | faible | non | moyenne |


### Cartographie & Impact (bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/actions/map` | page d'action | [Carte des actions](./routes/03-cartographie-impact/actions-map/README.md) | Cartographie & Impact (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | sky | à corriger | apps/web/src/app/(app)/actions/map/page.tsx | ./routes/03-cartographie-impact/actions-map | non | moyen | non | faible |
| `/methodologie` | exception UI — impact | [Méthodologie](./routes/03-cartographie-impact/methodologie/README.md) | Cartographie & Impact (bloc) | public | Aucun | red | terminé | apps/web/src/app/(app)/methodologie/page.tsx | ./routes/03-cartographie-impact/methodologie | non | moyen | non | faible |
| `/gamification` | page de bloc | [Progression & badges](./routes/03-cartographie-impact/gamification/README.md) | Cartographie & Impact (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | red | à corriger | apps/web/src/app/(app)/gamification/page.tsx | ./routes/03-cartographie-impact/gamification | non | moyen | oui | critique |
| `/observatoire` | page de bloc | [Observatoire public](./routes/03-cartographie-impact/observatoire/README.md) | Cartographie & Impact (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | sky | à corriger | apps/web/src/app/(app)/observatoire/page.tsx | ./routes/03-cartographie-impact/observatoire | non | moyen | oui | critique |
| `/profil/impact` | page de bloc | [Profil impact](./routes/03-cartographie-impact/profil-impact/README.md) | Cartographie & Impact (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | amber / orange | à corriger | apps/web/src/app/(app)/profil/impact/page.tsx | ./routes/03-cartographie-impact/profil-impact | non | fort | non | moyenne |
| `/reports` | page de bloc | [Rapports d'impact](./routes/03-cartographie-impact/reports/README.md) | Cartographie & Impact (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | red | à corriger | apps/web/src/app/(app)/reports/page.tsx | ./routes/03-cartographie-impact/reports | non | fort | non | moyenne |
| `/sandbox` | page de bloc | [Sandbox carte](./routes/03-cartographie-impact/sandbox/README.md) | Cartographie & Impact (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | sky | à corriger | apps/web/src/app/(app)/sandbox/page.tsx | ./routes/03-cartographie-impact/sandbox | non | moyen | oui | critique |



### Réseau & Discussions (bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/community` | page de réseau | [Communauté](./routes/04-reseau-discussions/community/README.md) | Réseau & Discussions (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | pink | à corriger | apps/web/src/app/(app)/community/page.tsx | ./routes/04-reseau-discussions/community | non | fort | oui | critique |
| `/messagerie` | page de réseau | [Messagerie](./routes/04-reseau-discussions/messagerie/README.md) | Réseau & Discussions (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | pink | à corriger | apps/web/src/app/(app)/messagerie/page.tsx | ./routes/04-reseau-discussions/messagerie | non | fort | oui | critique |
| `/open-data` | page de réseau | [Open data](./routes/04-reseau-discussions/open-data/README.md) | Réseau & Discussions (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | pink | à corriger | apps/web/src/app/(app)/open-data/page.tsx | ./routes/04-reseau-discussions/open-data | non | moyen | oui | critique |
| `/partners/dashboard` | page de réseau | [Annuaire partenaires](./routes/04-reseau-discussions/partners-dashboard/README.md) | Réseau & Discussions (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | indigo | à corriger | apps/web/src/app/(app)/partners/dashboard/page.tsx | ./routes/04-reseau-discussions/partners-dashboard | non | fort | non | moyenne |
| `/partners/network` | page de réseau | [Réseau engagé](./routes/04-reseau-discussions/partners-network/README.md) | Réseau & Discussions (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | indigo | à corriger | apps/web/src/app/(app)/partners/network/page.tsx | ./routes/04-reseau-discussions/partners-network | non | fort | non | moyenne |
| `/partners/onboarding` | page de réseau | [Onboarding partenaire](./routes/04-reseau-discussions/partners-onboarding/README.md) | Réseau & Discussions (bloc) | protégé | Compte connecté, parfois rôle ou profil spécifique | indigo | à corriger | apps/web/src/app/(app)/partners/onboarding/page.tsx | ./routes/04-reseau-discussions/partners-onboarding | non | fort | non | moyenne |



### Apprendre (bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/learn/bonnes-pratiques` | page éducative | [Bonnes pratiques](./routes/05-apprendre/learn-bonnes-pratiques/README.md) | Apprendre (bloc) | public | Aucun | yellow | à corriger | apps/web/src/app/learn/bonnes-pratiques/page.tsx | ./routes/05-apprendre/learn-bonnes-pratiques | non | fort | non | moyenne |
| `/learn/comprendre` | page éducative | [Comprendre l'enjeu](./routes/05-apprendre/learn-comprendre/README.md) | Apprendre (bloc) | public | Aucun | yellow | à corriger | apps/web/src/app/learn/comprendre/page.tsx | ./routes/05-apprendre/learn-comprendre | non | fort | non | moyenne |
| `/learn/hub` | page éducative | [Point de départ](./routes/05-apprendre/learn-hub/README.md) | Apprendre (bloc) | public | Aucun | yellow | à corriger | apps/web/src/app/learn/hub/page.tsx | ./routes/05-apprendre/learn-hub | non | fort | non | moyenne |
| `/learn/ressources` | page éducative | [Ressources](./routes/05-apprendre/learn-ressources/README.md) | Apprendre (bloc) | public | Aucun | yellow | à corriger | apps/web/src/app/learn/ressources/page.tsx | ./routes/05-apprendre/learn-ressources | non | fort | non | moyenne |
| `/learn/sentrainer` | page éducative | [S'entraîner](./routes/05-apprendre/learn-sentrainer/README.md) | Apprendre (bloc) | public | Aucun | yellow | à corriger | apps/web/src/app/learn/sentrainer/page.tsx | ./routes/05-apprendre/learn-sentrainer | non | fort | non | moyenne |



### Auth & Onboarding (hors bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/onboarding` | onboarding | [Onboarding](./routes/06-auth-onboarding/onboarding/README.md) | Auth & Onboarding (hors bloc) | auth | Page d'entrée d'authentification ou de configuration initiale | lavande claire / vert menthe clair | à corriger | apps/web/src/app/onboarding/page.tsx | ./routes/06-auth-onboarding/onboarding | non | moyen | oui | moyenne |
| `/sign-in` | authentification | [Connexion](./routes/06-auth-onboarding/sign-in/README.md) | Auth & Onboarding (hors bloc) | auth | Page d'entrée d'authentification ou de configuration initiale | lavande claire / vert menthe clair | à corriger | apps/web/src/app/sign-in/[[...sign-in]]/page.tsx | ./routes/06-auth-onboarding/sign-in | non | moyen | oui | moyenne |
| `/sign-up` | authentification | [Inscription](./routes/06-auth-onboarding/sign-up/README.md) | Auth & Onboarding (hors bloc) | auth | Page d'entrée d'authentification ou de configuration initiale | lavande claire / vert menthe clair | à corriger | apps/web/src/app/sign-up/[[...sign-up]]/page.tsx | ./routes/06-auth-onboarding/sign-up | non | moyen | oui | moyenne |

#### Redirections et alias

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/onboarding/localisation` | redirection | [Onboarding localisation](./routes/06-auth-onboarding/onboarding-localisation/README.md) | Auth & Onboarding (hors bloc) | redirection | Aucun, la page redirige automatiquement | lavande claire / vert menthe clair | hors scope | apps/web/src/app/onboarding/localisation/page.tsx | ./routes/06-auth-onboarding/onboarding-localisation | non | faible | oui | moyenne |


### Institutionnel & Légal (hors bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/conditions-generales-utilisation` | légale | [CGU](./routes/07-legal/conditions-generales-utilisation/README.md) | Institutionnel & Légal (hors bloc) | légal | Aucun, page institutionnelle | slate / gris clair | à corriger | apps/web/src/app/conditions-generales-utilisation/page.tsx | ./routes/07-legal/conditions-generales-utilisation | non | fort | non | moyenne |
| `/conditions-utilisation` | légale | [Conditions d'utilisation](./routes/07-legal/conditions-utilisation/README.md) | Institutionnel & Légal (hors bloc) | légal | Aucun, page institutionnelle | slate / gris clair | à corriger | apps/web/src/app/conditions-utilisation/page.tsx | ./routes/07-legal/conditions-utilisation | non | fort | non | moyenne |
| `/contact` | légale | [Contact](./routes/07-legal/contact/README.md) | Institutionnel & Légal (hors bloc) | légal | Aucun, page institutionnelle | slate / gris clair | à corriger | apps/web/src/app/contact/page.tsx | ./routes/07-legal/contact | non | fort | non | moyenne |
| `/en` | légale | [English entry](./routes/07-legal/en/README.md) | Institutionnel & Légal (hors bloc) | légal | Aucun, page institutionnelle | slate / gris clair | à corriger | apps/web/src/app/en/page.tsx | ./routes/07-legal/en | non | fort | non | moyenne |
| `/mentions-legales` | légale | [Mentions légales](./routes/07-legal/mentions-legales/README.md) | Institutionnel & Légal (hors bloc) | légal | Aucun, page institutionnelle | slate / gris clair | à corriger | apps/web/src/app/mentions-legales/page.tsx | ./routes/07-legal/mentions-legales | non | fort | non | moyenne |
| `/politique-confidentialite` | légale | [Politique de confidentialité](./routes/07-legal/politique-confidentialite/README.md) | Institutionnel & Légal (hors bloc) | légal | Aucun, page institutionnelle | slate / gris clair | à corriger | apps/web/src/app/politique-confidentialite/page.tsx | ./routes/07-legal/politique-confidentialite | non | fort | non | moyenne |
| `/politique-cookies` | légale | [Politique cookies](./routes/07-legal/politique-cookies/README.md) | Institutionnel & Légal (hors bloc) | légal | Aucun, page institutionnelle | slate / gris clair | à corriger | apps/web/src/app/politique-cookies/page.tsx | ./routes/07-legal/politique-cookies | non | fort | non | moyenne |



### Système & Utilitaires (hors bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/declaration-simple` | outil | [Déclaration simple](./routes/08-systeme-utilitaires/declaration-simple/README.md) | Système & Utilitaires (hors bloc) | standalone | Accès direct depuis le shell ou un outil interne | vert clair / neutres | à corriger | apps/web/src/app/declaration-simple/page.tsx | ./routes/08-systeme-utilitaires/declaration-simple | non | moyen | oui | critique |
| `/error/429` | erreur | [Erreur 429](./routes/08-systeme-utilitaires/error-429/README.md) | Système & Utilitaires (hors bloc) | erreur | Contexte d'erreur ou de quota déclenché par le système | amber / red léger / slate | terminé | apps/web/src/app/error/429/page.tsx | ./routes/08-systeme-utilitaires/error-429 | non | faible | non | faible |
| `/form-comparison` | outil | [Comparaison de formulaires](./routes/08-systeme-utilitaires/form-comparison/README.md) | Système & Utilitaires (hors bloc) | standalone | Accès direct depuis le shell ou un outil interne | indigo / cyan doux | à corriger | apps/web/src/app/form-comparison/page.tsx | ./routes/08-systeme-utilitaires/form-comparison | non | moyen | oui | critique |
| `/preview/actions/new` | outil | [Preview déclaration](./routes/08-systeme-utilitaires/preview-actions-new/README.md) | Système & Utilitaires (hors bloc) | standalone | Accès direct depuis le shell ou un outil interne | vert / teal | à corriger | apps/web/src/app/preview/actions/new/page.tsx | ./routes/08-systeme-utilitaires/preview-actions-new | non | moyen | oui | critique |
| `/reglages` | outil | [Réglages](./routes/08-systeme-utilitaires/reglages/README.md) | Système & Utilitaires (hors bloc) | standalone | Accès direct depuis le shell ou un outil interne | slate / gris doux | à corriger | apps/web/src/app/reglages/page.tsx | ./routes/08-systeme-utilitaires/reglages | non | moyen | oui | critique |
| `/sections/[sectionId] (ex. /sections/route)` | dynamique — section | [Section dynamique](./routes/08-systeme-utilitaires/sections-sectionid/README.md) | Système & Utilitaires (hors bloc) | dynamique | Paramètre de route requis (profil, id, section, mission...) | sky / slate | à corriger | apps/web/src/app/(app)/sections/[sectionId]/page.tsx | ./routes/08-systeme-utilitaires/sections-sectionid | non | moyen | oui | moyenne |



### Admin & Super-admin (hors bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/admin` | administration | [Administration du site](./routes/09-admin-superadmin/admin/README.md) | Admin & Super-admin (hors bloc) | technique | Compte connecté, parfois rôle technique ou de supervision | amber / brun sombre | à corriger | apps/web/src/app/(app)/admin/page.tsx | ./routes/09-admin-superadmin/admin | non | fort | non | moyenne |
| `/admin/forms` | administration | [Administration des formulaires](./routes/09-admin-superadmin/admin-forms/README.md) | Admin & Super-admin (hors bloc) | technique | Compte connecté, parfois rôle technique ou de supervision | amber / brun sombre | à corriger | apps/web/src/app/(app)/admin/forms/page.tsx | ./routes/09-admin-superadmin/admin-forms | non | fort | non | moyenne |
| `/admin/godmode` | administration | [Créateur du site](./routes/09-admin-superadmin/admin-godmode/README.md) | Admin & Super-admin (hors bloc) | technique | Compte connecté, parfois rôle technique ou de supervision | amber / brun sombre | à corriger | apps/web/src/app/(app)/admin/godmode/page.tsx | ./routes/09-admin-superadmin/admin-godmode | non | fort | non | moyenne |
| `/admin/services` | administration | [Administration des services](./routes/09-admin-superadmin/admin-services/README.md) | Admin & Super-admin (hors bloc) | technique | Compte connecté, parfois rôle technique ou de supervision | amber / brun sombre | à corriger | apps/web/src/app/(app)/admin/services/page.tsx | ./routes/09-admin-superadmin/admin-services | non | fort | non | moyenne |



### Print & Export (hors bloc)

| Route | Type de page | Fiche | Famille / hors bloc | Statut | Contexte d'accès | Palette attendue | Scope | Fichier source | Dossier canonique | Capture disponible | Surcharge textuelle | Incohérence couleur | Priorité |
|---|---|---|---|---|---|---|---|---|---|:---:|---|:---:|---|
| `/prints/report` | rapport / export | [Rapport imprimable](./routes/10-print-export/prints-report/README.md) | Print & Export (hors bloc) | standalone | Accès direct depuis le shell ou un outil interne | ardoise / bleu nuit / vert discret | à corriger | apps/web/src/app/(app)/prints/report/page.tsx | ./routes/10-print-export/prints-report | non | moyen | oui | critique |
