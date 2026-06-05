# Pages UI à exception assumée

Ce document sert de matrice de référence pour les agents.

Règle générale :
- une page suit la teinte de sa famille visuelle ou de son bloc fonctionnel;
- la homepage (`/` et `/accueil`) constitue une famille autonome avec sa propre palette, ce n'est pas une exception de bloc;
- une exception UI doit être explicitement documentée avant tout changement de palette;
- une exception validée reste stable tant qu'elle sert de référence UX.

Lecture de la colonne `Exception UI ?` :
- `oui` = la route déroge à la palette standard de sa famille;
- `non` = la route suit la règle standard;
- `n/a` = route technique, alias ou redirection qui ne porte pas de UI propre.

## Exceptions validées

| Route | Raison | Palette conservée |
|---|---|---|
| `/explorer` | Sommaire du site déjà abouti, utilisé comme référence de navigation et de structure visuelle | Palette dédiée du Sommaire |
| `/methodologie` | Exception rouge alignée sur les pages d'impact, exposée comme rubrique cliquable du bloc Cartographie & Impact | Rouge d'impact |

## Exceptions rouges d'impact

| Route | Raison | Palette conservée |
|---|---|---|
| `/reports` | Page d'impact rouge conservée comme exception visuelle du bloc Cartographie & Impact | Rouge d'impact |
| `/gamification` | Variante d'impact rouge, même logique visuelle que les pages d'impact | Rouge d'impact |

## Routes `account-complete gated`

Ces routes utilisent le gate de complétion de compte en plus de leur UI canonique. Elles ne sont pas des exceptions de palette, mais des routes où l'accès au contenu dépend d'un compte entièrement renseigné.

| Route | Statut | Note |
|---|---|---|
| `/dashboard` | `account-complete gated` | Mon espace, contenu personnel et réglages liés au compte |
| `/sponsor-portal` | `account-complete gated` | Portail décideur et exports liés au profil |
| `/signalement` | `account-complete gated` | Déclaration terrain certifiée |
| `/actions/history` | `account-complete gated` | Historique terrain et fiabilisation du compte |
| `/partners/dashboard` | `account-complete gated` | Pilotage réseau et gestion des fiches |
| `/partners/onboarding` | `account-complete gated` | Parcours partenaire et saisie des informations requises |
| `/reports` | `account-complete gated` | Rapports d'impact avec contexte utilisateur complet |
| `/admin` | `account-complete gated` | Back-office central avec accès réservé |

## Familles UI autonomes

Ces familles ne sont pas des exceptions de bloc. Elles suivent un système visuel propre, stable et indépendant.

| Famille | Routes principales | Tonalité de base | Note |
|---|---|---|---|
| Homepage autonome | `/`, `/accueil` | `home` | Identité de page indépendante |
| Auth & Onboarding | `/sign-in`, `/sign-up`, `/onboarding`, `/onboarding/localisation` | `auth` | Fond lavande clair vers vert menthe clair; carte Clerk violet nuit / indigo foncé; accents verts uniquement pour validation; boutons inchangés |
| Institutionnel & Légal | `/contact`, `/conditions-*`, `/mentions-legales`, `/politique-*`, `/en` | `legal` | Pages juridiques et institutionnelles, palette slate / gris clair / blanc, sans esthétique marketing blocks |
| Système & Utilitaires | `/reglages`, `/form-comparison`, `/declaration-simple`, `/preview/actions/new`, `/error/429` | `system` | Pages outillage / support / prévisualisation, avec mood layer autonome par usage; les états système suivent une charte commune `SystemStateLayout` |
| Admin & Super-admin | `/admin`, `/admin/forms`, `/admin/services`, `/admin/godmode` | `admin` | Console et supervision restreinte |
| Print & Export | `/prints/report` | `print` | Rapport imprimable et export visuel, ambiance documentaire autonome |

## Matrice UI exhaustive

### Homepage autonome

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/` | Canonique | Homepage autonome | non | Palette homepage dédiée |
| `/accueil` | Alias de `/` | Homepage autonome | non | Même logique que `/` |

### Accueil & Pilotage

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/dashboard` | Canonique | Accueil & Pilotage | non | Palette `amber/orange` |
| `/profil` | Canonique | Accueil & Pilotage | non | Palette `amber/orange` |
| `/profil/impact` | Canonique | Accueil & Pilotage | non | Variante profil, même famille |
| `/profil/[profile]` | Dynamique | Accueil & Pilotage | non | Hérite de la famille profil |

### Pilotage

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/pilotage` | Canonique | Pilotage | non | Palette `amber/brun` |
| `/sponsor-portal` | Canonique | Pilotage | non | Palette `amber/brun` |
| `/observatoire` | Canonique | Pilotage | non | Palette `amber/brun` |
| `/sections/elus` | Canonique (section) | Pilotage / gouvernance | non | Gouvernance, même famille pilotage |

### Admin & Super-admin

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/admin` | Canonique | Admin & Super-admin | non | Famille autonome, console administrative |
| `/admin/forms` | Canonique | Admin & Super-admin | non | Famille autonome, gestion des formulaires |
| `/admin/services` | Canonique | Admin & Super-admin | non | Famille autonome, supervision technique |
| `/admin/godmode` | Canonique | Admin & Super-admin | non | Famille autonome, super-admin |

### Print & Export

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/prints/report` | Canonique | Print & Export | non | Rapport imprimable et export visuel |

### Agir

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/actions/new` | Canonique | Agir | non | Palette `emerald` |
| `/actions/history` | Canonique | Agir | non | Palette `emerald` |
| `/declaration` | Alias vers `/actions/new` | Agir | n/a | Redirection sans UI propre |
| `/declaration-simple` | Canonique | Agir / utilitaire | non | Formulaire simplifié, même logique d'action |
| `/missions/[id]` | Dynamique | Agir | non | Palette `emerald` |
| `/parcours` | Canonique | Agir | non | Palette `emerald` |
| `/parcours/[profile]` | Dynamique | Agir | non | Palette `emerald` |
| `/signalement` | Canonique | Agir | non | Palette `emerald` |
| `/sections/route` | Canonique (section) | Agir | non | Itinéraire prioritaire, palette `emerald` |

### Cartographie & Impact

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/actions/map` | Canonique | Cartographie & Impact | non | Palette `sky` |
| `/sandbox` | Alias vers `/sections/sandbox` | Cartographie & Impact | n/a | Redirection sans UI propre |
| `/sections/sandbox` | Canonique (section) | Cartographie & Impact | non | Palette `sky` |
| `/reports` | Canonique | Cartographie & Impact | non | Palette `red` |
| `/gamification` | Alias vers `/sections/gamification` | Cartographie & Impact | n/a | Redirection sans UI propre |
| `/sections/gamification` | Canonique (section) | Cartographie & Impact | non | Palette `red` |

### Réseau & Discussions

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/sections/community` | Canonique (section) | Réseau & Discussions | non | Famille réseau/discussion, palette rose |
| `/sections/feedback` | Canonique (section) | Réseau & Discussions | non | Famille discussion, palette rose |
| `/community` | Alias vers `/sections/community` | Réseau & Discussions | n/a | Redirection sans UI propre |
| `/messagerie` | Alias vers `/sections/messagerie` | Réseau & Discussions | n/a | Redirection sans UI propre |
| `/sections/messagerie` | Canonique (section) | Réseau & Discussions | non | Famille discussion, palette rose |
| `/sections/dm` | Canonique (section) | Réseau & Discussions | non | Messages privés, même famille réseau rose |
| `/sections/actors` | Canonique (section) | Réseau & Discussions | non | Réseau engagé, palette rose |
| `/sections/annuaire` | Canonique (section) | Réseau & Discussions | non | Annuaire partenaire, palette rose |
| `/sections/funding` | Canonique (section) | Réseau & Discussions | non | Soutien / parrainage, palette rose |
| `/partners/network` | Alias vers `/sections/community?tab=partners` | Réseau & Discussions | n/a | Redirection sans UI propre |
| `/partners/dashboard` | Canonique | Réseau & Discussions | non | Annuaire / pilotage du réseau, palette indigo |
| `/partners/onboarding` | Canonique | Réseau & Discussions | non | Parcours partenaire, palette indigo |
| `/open-data` | Alias vers `/sections/open-data` | Réseau & Discussions / utilitaire | n/a | Redirection sans UI propre |
| `/sections/open-data` | Canonique (section) | Réseau & Discussions / analyse | non | Observatoire public, lecture analytique, palette rose |

### Apprendre

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/learn/hub` | Canonique | Apprendre | non | Index léger, palette `yellow` |
| `/learn/comprendre` | Canonique | Apprendre | non | Palette `yellow` |
| `/learn/sentrainer` | Canonique | Apprendre | non | Palette `yellow` |
| `/learn/bonnes-pratiques` | Canonique | Apprendre | non | Palette `yellow` |
| `/learn/ressources` | Canonique | Apprendre | non | Palette `yellow` |

### Familles autonomes / utilitaires

| Route | Canonique / alias | Bloc / famille | Exception UI ? | Note |
|---|---|---|---:|---|
| `/sections/[sectionId]` | Dynamique | Section dynamique | non | La famille réelle dépend de `sectionId` |
| `/sections/climate` | Canonique (section) | Analyse & contexte | non | Analyse & contexte |
| `/sections/recycling` | Canonique (section) | Terrain | non | Guide du tri |
| `/sections/compost` | Canonique (section) | Terrain | non | Compostage |
| `/sections/weather` | Canonique (section) | Terrain | non | Météo terrain |
| `/sections/guide` | Canonique (section) | Terrain | non | Mode d'emploi |
| `/sections/trash-spotter` | Canonique (section) | Terrain | non | Signalement de déchets |
| `/form-comparison` | Canonique | Système & Utilitaires | non | Comparaison interne, mood layer analytique autonome |
| `/declaration-simple` | Canonique | Système & Utilitaires | non | Déclaration rapide simplifiée, mood layer vert clair |
| `/onboarding` | Canonique | Auth & Onboarding | non | Écran de démarrage |
| `/onboarding/localisation` | Canonique | Auth & Onboarding | non | Étape de configuration |
| `/reglages` | Canonique | Système & Utilitaires | non | Préférences et réglages, ambiance neutre autonome |
| `/sign-in/[[...sign-in]]` | Canonique | Auth & Onboarding | non | Écran Clerk |
| `/sign-up/[[...sign-up]]` | Canonique | Auth & Onboarding | non | Écran Clerk |
| `/preview/actions/new` | Canonique | Système & Utilitaires | non | Prévisualisation publique, mood layer terrain |
| `/error/429` | Canonique | Système & Utilitaires | non | Page de limitation temporaire, palette d erreur dédiée: amber principal, red très léger, logique système commune |
| `/contact` | Canonique | Institutionnel & Légal | non | Page institutionnelle |
| `/conditions-generales-utilisation` | Canonique | Institutionnel & Légal | non | Page juridique |
| `/conditions-utilisation` | Canonique | Institutionnel & Légal | non | Page juridique |
| `/mentions-legales` | Canonique | Institutionnel & Légal | non | Page juridique |
| `/politique-confidentialite` | Canonique | Institutionnel & Légal | non | Page juridique |
| `/politique-cookies` | Canonique | Institutionnel & Légal | non | Page juridique |
| `/en` | Canonique | Institutionnel & Légal | non | Variante linguistique |

## Pages non migrées vers `PageHeader`

Les pages ci-dessous n'utilisent pas encore le composant canonique directement. La raison indiquée est celle qui bloque ou justifie la migration à ce stade.

### Encore à migrer

| Route | Pourquoi ce n'est pas encore migré | Priorité |
|---|---|---|
| `/explorer` | sommaire validé comme surface dédiée, pas un simple header de page | faible |
| `/not-found` | page système d'erreur, doit rester sur un traitement `SystemState` | faible |
| `/explorer` | sommaire validé comme surface dédiée, pas un simple header de page | faible |
| `/not-found` | page système d'erreur, doit rester sur un traitement `SystemState` | faible |

### Migrées sur `PageHeader`

| Route | Pourquoi la page n'est plus dans la liste précédente | Note |
|---|---|---|
| `/admin` | en-tête principal harmonisé sur le composant canonique | console admin autonome, sections internes conservées |
| `/admin/services` | en-tête principal harmonisé sur le composant canonique | supervision technique autonome, panneaux internes conservés |
| `/admin/godmode` | en-tête principal harmonisé sur le composant canonique | accès racine autonome, garde-fou `notFound()` conservé |
| `/reglages` | en-tête principal harmonisé sur le composant canonique | famille système, layout privé conservé |
| `/observatoire` | en-tête principal harmonisé sur le composant canonique | surface analytique publique, sections métiers conservées |
| `/partners/dashboard` | en-tête principal harmonisé sur le composant canonique | page réseau/pilotage, contenu métier conservé |
| `/partners/network` | redirection vers la page Communauté | onglet Partenaires intégré à `/sections/community` |
| `/partners/onboarding` | en-tête principal harmonisé sur le composant canonique | parcours partenaire, gate de connexion conservé |
| `/sections/route` | en-tête principal harmonisé sur le composant canonique | itinéraire Agir, CTA conservés |
| `/prints/report` | en-tête principal harmonisé sur le composant canonique | en-tête de document conservé, layout imprimable inchangé |
| `/missions/[id]` | en-tête principal harmonisé sur le composant canonique | détail mission, carte et statistiques conservées |
| `/learn/ressources` | en-tête principal harmonisé via le shell d'apprentissage | shell d'apprentissage inchangé |
| `/actions/history` | en-tête principal harmonisé via `PageReadingTemplate` et `DecisionPageHeader` | chronologie métier conservée |

### Familles autonomes où `PageHeader` n'est pas la bonne brique principale

| Route | Pourquoi | Composant de référence |
|---|---|---|
| `/sign-in`, `/sign-up` | écran Clerk / auth, la structure est pilotée par le fournisseur | écran auth dédié |
| `/onboarding` | parcours pas à pas, davantage un flow qu'une page éditoriale | shell onboarding |
| `/onboarding/localisation` | étape de configuration du parcours, même logique que l'onboarding | shell onboarding |
| `/error/429` | état système / quota, pas un header de page standard | `SystemState*` |

## Règles d'usage

- Ne pas recolorer `/explorer` pour le faire rentrer artificiellement dans `Accueil & Pilotage`.
- Ne pas traiter la homepage comme une exception de bloc: c'est une famille autonome.
- Toute nouvelle exception UI doit être ajoutée ici avant d'être appliquée dans le code.
- Si une page n'est pas listée dans ce document, elle doit suivre la palette standard de son bloc ou de sa famille technique.

## Annexe API

Les routes API n'ont pas de UI de page, donc la colonne `Exception UI ?` y est toujours `n/a`. Elles restent listées ici pour exhaustivité.

| Préfixe | Endpoints | Note |
|---|---|---|
| `/api/account` | `display-mode`, `profile-role` | Compte et préférences |
| `/api/actions` | `/`, `import`, `map`, `prefill`, `simple` | Flux d'actions |
| `/api/admin` | `codex-usage`, `creator-inbox`, `environmental-impact`, `free-plan-services`, `moderation`, `operations`, `partners/published-directory`, `promotion-requests`, `role-accounts`, `storage-usage` | Outils d'administration |
| `/api/analytics` | `funnel` | Mesure d'audience |
| `/api/chat` | `/`, `users` | Messagerie |
| `/api/community` | `bug-reports`, `events`, `events/ops`, `funnel.csv`, `promotion-requests`, `rsvps` | Communauté |
| `/api/cron` | `environmental-impact`, `storage-usage` | Jobs planifiés |
| `/api/documentation` | `[slug]` | Docs dynamiques |
| `/api/email` | `test` | Vérification mail |
| `/api/environmental-impact` | `/` | Impact environnemental |
| `/api/gamification` | `leaderboard`, `me` | Progression |
| `/api/geo` | `address-suggestions` | Géocodage |
| `/api/health` | `/` | Santé système |
| `/api/newsletter` | `subscribe` | Inscription newsletter |
| `/api/notifications` | `/` | Notifications |
| `/api/partners` | `onboarding-requests`, `published-directory` | Réseau partenaires |
| `/api/pilotage` | `overview` | Pilotage |
| `/api/recycling` | `breakdown` | Tri / recyclage |
| `/api/reports` | `actions.csv`, `actions.json`, `elus-dossier`, `governance-monthly` | Rapports |
| `/api/route` | `recommend` | Itinéraire |
| `/api/sandbox` | `runbook-checks` | Sandbox |
| `/api/send` | `/` | Envoi générique |
| `/api/services` | `/` | Services |
| `/api/spots` | `/` | Spots / localisations |
| `/api/stripe` | `webhook` | Paiement |
| `/api/system` | `backpressure` | Contrôle système |
| `/api/uptime` | `/` | Disponibilité |
| `/api/users` | `checklist-progress`, `profile/display-name-mode`, `profile/handle` | Utilisateurs |

## Références associées

- [`BLOC_COLOR_SYSTEM_PREMIUM.md`](./BLOC_COLOR_SYSTEM_PREMIUM.md)
- [`theme-visibility-rules.md`](./theme-visibility-rules.md)
- [`principes-visuels.md`](./principes-visuels.md)
