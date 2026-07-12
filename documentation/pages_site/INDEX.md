# Index maître des pages

Registre fonctionnel route-first de `documentation/pages_site`.

L'exhaustivité doit être contrôlée par :

```bash
npm run audit:pages-site-drift
```

Le mode strict est disponible avec :

```bash
npm run check:pages-site-drift
```

## Règles

- une route canonique = une fiche canonique ;
- une redirection ou un alias reste inventorié sans devenir une page autonome artificielle ;
- une route dynamique est documentée par son pattern ;
- les captures vivent dans un dossier photo centralisé au niveau du bloc ou de la famille ;
- l'accès documenté doit correspondre au runtime réel ;
- la famille visuelle doit correspondre à `resolvePageFamily` ;
- une page ne peut pas être déclarée terminée si son contrat fonctionnel documenté est faux.

## Taxonomie d'accès

| Valeur | Sens |
|---|---|
| `public-visible` | page ou section lisible sans compte |
| `auth-blur-gate` | aperçu ou gate flouté avant connexion |
| `auth-disabled-gate` | contenu verrouillé tant que le compte n'est pas connecté |
| `protected` | authentification imposée par le proxy ou la page |
| `admin-only` | rôle `admin` requis |
| `max-only` | profil `max` requis |
| `auth-entry` | page de connexion, inscription ou onboarding |
| `legal-public` | page légale publique |
| `standalone` | outil ou page autonome |
| `dynamic` | route paramétrée |
| `redirect` | redirection ou alias technique |

## Homepage

| Route | Fiche | Accès | Famille | Source |
|---|---|---|---|---|
| `/` | [Homepage](./routes/00-homepage/homepage-README.md) | `public-visible` | Homepage | `apps/web/src/app/page.tsx` |

## Accueil & Pilotage

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/dashboard` | [Dashboard](./routes/01-accueil-pilotage/dashboard/dashboard-README.md) | `protected` | amber / pilotage | `apps/web/src/app/(app)/dashboard/page.tsx` |
| `/explorer` | [Sommaire](./routes/01-accueil-pilotage/explorer/explorer-README.md) | `public-visible` | yellow, exception nommée | `apps/web/src/app/(app)/explorer/page.tsx` |
| `/parcours` | [Parcours](./routes/01-accueil-pilotage/parcours/parcours-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/parcours/page.tsx` |
| `/parcours/[profile]` | [Parcours par profil](./routes/01-accueil-pilotage/parcours-profile/parcours-profile-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/parcours/[profile]/page.tsx` |
| `/pilotage` | [Pilotage](./routes/01-accueil-pilotage/pilotage/pilotage-README.md) | `protected` | pilotage | `apps/web/src/app/(app)/pilotage/page.tsx` |
| `/profil` | [Profil](./routes/01-accueil-pilotage/profil/profil-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/profil/page.tsx` |
| `/profil/[profile]` | [Profil détaillé](./routes/01-accueil-pilotage/profil-profile/profil-profile-README.md) | `protected` | accueil-pilotage | `apps/web/src/app/(app)/profil/[profile]/page.tsx` |
| `/sponsor-portal` | [Portail décideur](./routes/01-accueil-pilotage/sponsor-portal/sponsor-portal-README.md) | `protected` | pilotage | `apps/web/src/app/(app)/sponsor-portal/page.tsx` |
| `/sections/elus` | [Gouvernance](./routes/01-accueil-pilotage/gouvernance/gouvernance-README.md) | `auth-disabled-gate` | accueil-pilotage | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |

## Agir

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/actions/history` | [Historique des actions](./routes/02-agir/actions-history/actions-history-README.md) | `protected` | agir | `apps/web/src/app/(app)/actions/history/page.tsx` |
| `/actions/new` | [Déclarer une action](./routes/02-agir/actions-new/actions-new-README.md) | `protected` | agir | `apps/web/src/app/(app)/actions/new/page.tsx` |
| `/sections/rejoindre-un-formulaire` | [Formulaire de groupe](./routes/02-agir/formulaire-de-groupe/formulaire-de-groupe-README.md) | `public-visible` ; compte requis pour rejoindre | agir, exception nommée | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/missions/[id]` | [Missions](./routes/02-agir/missions/missions-README.md) | `dynamic` | agir | `apps/web/src/app/(app)/missions/[id]/page.tsx` |
| `/sections/route` | [Où agir](./routes/02-agir/ou-agir/ou-agir-README.md) | `public-visible` | agir | `apps/web/src/app/(app)/sections/route/page.tsx` |
| `/sections/weather` | [Organiser une action](./routes/02-agir/weather/weather-README.md) | `public-visible` | agir, exception nommée | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/signalement` | [Signalement déchets](./routes/02-agir/signalement/signalement-README.md) | `protected` | agir | `apps/web/src/app/(app)/signalement/page.tsx` |

### Alias et redirections Agir

| Route | Cible | Statut |
|---|---|---|
| `/declaration` | `/actions/new` | `redirect` |
| `/sections/guide` | `/sections/weather` | `redirect` gérée dans la route dynamique |

## Cartographie & Impact

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/actions/map` | [Carte des actions](./routes/03-cartographie-impact/actions-map/actions-map-README.md) | `public-visible` | sky | `apps/web/src/app/(app)/actions/map/page.tsx` |
| `/methodologie` | [Méthodologie](./routes/03-cartographie-impact/methodologie/methodologie-README.md) | `public-visible` | sky, exception `methodologie-impact` | `apps/web/src/app/(app)/methodologie/page.tsx` |
| `/sections/gamification` | [Progression & badges](./routes/03-cartographie-impact/gamification/gamification-README.md) | `auth-disabled-gate` | red, exception `reports-impact` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/profil/impact` | [Profil impact](./routes/03-cartographie-impact/profil-impact/profil-impact-README.md) | `protected` | accueil-pilotage actuellement | `apps/web/src/app/(app)/profil/impact/page.tsx` |
| `/reports` | [Rapports d'impact](./routes/03-cartographie-impact/reports/reports-README.md) | `auth-blur-gate` ; exports détaillés admin-like | red | `apps/web/src/app/(app)/reports/page.tsx` |

### Alias Cartographie & Impact

| Route | Cible | Statut |
|---|---|---|
| `/gamification` | `/sections/gamification` | `redirect` |

## Réseau & Discussions

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/sections/community` | [Communauté](./routes/04-reseau-discussions/community/community-README.md) | `auth-disabled-gate` | pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/feedback` | [Idées et problèmes](./routes/04-reseau-discussions/feedback/feedback-README.md) | `public-visible` | pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/actors` | [Réseau engagé](./routes/04-reseau-discussions/actors/actors-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/annuaire` | [Annuaire des acteurs](./routes/04-reseau-discussions/annuaire/annuaire-README.md) | `auth-disabled-gate` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/messagerie` | [Groupes de discussion](./routes/04-reseau-discussions/messagerie/messagerie-README.md) | `auth-blur-gate` | pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/open-data` | [Données publiques](./routes/04-reseau-discussions/open-data/open-data-README.md) | `public-visible` | pink | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/funding` | [Soutenir le projet](./routes/04-reseau-discussions/funding/funding-README.md) | `public-visible` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/sections/trash-spotter` | [Signaler un déchet](./routes/04-reseau-discussions/trash-spotter/trash-spotter-README.md) | `auth-blur-gate` | réseau-discussions | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |
| `/partners/dashboard` | [Annuaire partenaires](./routes/04-reseau-discussions/partners-dashboard/partners-dashboard-README.md) | `protected` | partenaires / réseau | `apps/web/src/app/(app)/partners/dashboard/page.tsx` |
| `/partners/onboarding` | [Onboarding partenaire](./routes/04-reseau-discussions/partners-onboarding/partners-onboarding-README.md) | `protected` | partenaires / réseau | `apps/web/src/app/(app)/partners/onboarding/page.tsx` |

### Alias et redirections Réseau

| Route | Cible | Statut |
|---|---|---|
| `/community` | `/sections/community` | `redirect` |
| `/messagerie` | `/sections/messagerie` | `redirect` |
| `/open-data` | `/sections/open-data` | `redirect` |
| `/partners/network` | `/sections/community?tab=partners` | `redirect` |
| `/partners/network/pepite` | `/sections/community?tab=partners` | `redirect` |
| `/sections/dm` | `/sections/messagerie?tab=dm` | `redirect` gérée dans la route dynamique |

## Apprendre

| Route | Fiche | Accès | Palette runtime | Source |
|---|---|---|---|---|
| `/learn/bonnes-pratiques` | [Bonnes pratiques](./routes/05-apprendre/learn-bonnes-pratiques/learn-bonnes-pratiques-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/bonnes-pratiques/page.tsx` |
| `/learn/comprendre` | [Ordres de grandeur](./routes/05-apprendre/learn-comprendre/learn-comprendre-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/comprendre/page.tsx` |
| `/learn/sentrainer` | [S'entraîner](./routes/05-apprendre/learn-sentrainer/learn-sentrainer-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/sentrainer/page.tsx` |
| `/learn/ecole` | [Mode École](./routes/05-apprendre/learn-ecole/learn-ecole-README.md) | `public-visible` | apprendre | `apps/web/src/app/learn/ecole/page.tsx` |

Note : aucune page canonique `/learn` n'est documentée dans l'état actuel. Le sitemap ne doit pas l'inventer.

## Auth & Onboarding

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/onboarding` | [Onboarding](./routes/06-auth-onboarding/onboarding/onboarding-README.md) | `auth-entry` | `apps/web/src/app/onboarding/page.tsx` |
| `/sign-in` | [Connexion](./routes/06-auth-onboarding/sign-in/sign-in-README.md) | `auth-entry` | `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx` |
| `/sign-up` | [Inscription](./routes/06-auth-onboarding/sign-up/sign-up-README.md) | `auth-entry` | `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx` |

### Alias Auth

| Route | Cible | Statut |
|---|---|---|
| `/onboarding/localisation` | `/onboarding` | `redirect` |

## Institutionnel & Légal

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/conditions-generales-utilisation` | [CGU](./routes/07-legal/conditions-generales-utilisation/conditions-generales-utilisation-README.md) | `legal-public` | `apps/web/src/app/conditions-generales-utilisation/page.tsx` |
| `/contact` | [Contact](./routes/07-legal/contact/contact-README.md) | `legal-public` | `apps/web/src/app/contact/page.tsx` |
| `/mentions-legales` | [Mentions légales](./routes/07-legal/mentions-legales/mentions-legales-README.md) | `legal-public` | `apps/web/src/app/mentions-legales/page.tsx` |
| `/politique-confidentialite` | [Politique de confidentialité](./routes/07-legal/politique-confidentialite/politique-confidentialite-README.md) | `legal-public` | `apps/web/src/app/politique-confidentialite/page.tsx` |
| `/politique-cookies` | [Politique cookies](./routes/07-legal/politique-cookies/politique-cookies-README.md) | `legal-public` | `apps/web/src/app/politique-cookies/page.tsx` |

### Alias légaux

| Route | Cible | Statut |
|---|---|---|
| `/conditions-utilisation` | `/conditions-generales-utilisation` | `redirect` |
| `/en` | `/explorer` | `redirect` |

## Système & Utilitaires

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/declaration-simple` | [Déclaration simple](./routes/08-systeme-utilitaires/declaration-simple/declaration-simple-README.md) | `standalone` | `apps/web/src/app/declaration-simple/page.tsx` |
| `/error/429` | [Erreur 429](./routes/08-systeme-utilitaires/error-429/error-429-README.md) | `public-visible` | `apps/web/src/app/error/429/page.tsx` |
| `/form-comparison` | [Comparaison de formulaires](./routes/08-systeme-utilitaires/form-comparison/form-comparison-README.md) | `protected` | `apps/web/src/app/form-comparison/page.tsx` |
| `/preview/actions/new` | [Preview déclaration](./routes/08-systeme-utilitaires/preview-actions-new/preview-actions-new-README.md) | `standalone` | `apps/web/src/app/preview/actions/new/page.tsx` |
| `/reglages` | [Réglages](./routes/08-systeme-utilitaires/reglages/reglages-README.md) | `protected` | `apps/web/src/app/reglages/page.tsx` |
| `/sections/[sectionId]` | [Section dynamique](./routes/08-systeme-utilitaires/sections-sectionid/sections-sectionid-README.md) | `dynamic` | `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` |

## Admin & Super-admin

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/admin` | [Administration](./routes/09-admin-superadmin/admin/admin-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/page.tsx` |
| `/admin/forms` | [Administration des formulaires](./routes/09-admin-superadmin/admin-forms/admin-forms-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/forms/page.tsx` |
| `/admin/gamification/xp-audit` | [XP Audit](./routes/09-admin-superadmin/admin-gamification-xp-audit/admin-gamification-xp-audit-README.md) | `protected` + permissions internes | `apps/web/src/app/admin/gamification/xp-audit/page.tsx` |
| `/admin/godmode` | [Administration avancée](./routes/09-admin-superadmin/admin-godmode/admin-godmode-README.md) | `max-only` | `apps/web/src/app/(app)/admin/godmode/page.tsx` |
| `/admin/quiz-bank` | [Banque de quiz](./routes/09-admin-superadmin/admin-quiz-bank/admin-quiz-bank-README.md) | `admin-only` | `apps/web/src/app/(app)/admin/quiz-bank/page.tsx` |
| `/admin/services` | [Administration des services](./routes/09-admin-superadmin/admin-services/admin-services-README.md) | `protected` + permissions internes | `apps/web/src/app/(app)/admin/services/page.tsx` |

## Print & Export

| Route | Fiche | Accès | Source |
|---|---|---|---|
| `/prints/report` | [Rapport imprimable](./routes/10-print-export/prints-report/prints-report-README.md) | `protected` | `apps/web/src/app/(app)/prints/report/page.tsx` |

## Sections runtime à classer

Ces sections existent dans le registre et le renderer, mais leur famille documentaire définitive n'est pas arbitrée ici.

| Route | Label runtime | Accès | Statut documentaire |
|---|---|---|---|
| `/sections/recycling` | Guide du tri | `public-visible` | famille à arbitrer |
| `/sections/compost` | Compostage | `public-visible` | famille à arbitrer |
| `/sections/climate` | Comprendre l'enjeu | `public-visible` | famille à arbitrer |

Ne pas créer leurs dossiers canoniques dans une famille arbitraire avant décision.

## Sources techniques de référence

```txt
apps/web/src/app/**/page.tsx
apps/web/src/lib/sections-registry/config.ts
apps/web/src/lib/clerk-access.ts
apps/web/src/lib/seo/indexability.ts
apps/web/src/lib/ui/page-families/resolve-page-family.ts
apps/web/src/lib/ui/page-families/exceptions.ts
```

## Maintenance

Après ajout, suppression ou déplacement d'une route :

```bash
npm run audit:pages-site-drift
```

Le script doit signaler :

- route code absente de l'index ;
- section runtime absente de l'index ;
- route d'index sans runtime ;
- fiche canonique manquante ;
- noyau documentaire incomplet.
