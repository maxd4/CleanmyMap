# Familles de pages — contrat courant

Ce document décrit le contrat **courant** qui relie les routes CleanMyMap à
leurs familles visuelles et documentaires.

Il ne porte ni backlog ni historique de migration. Le travail restant est
séparé dans [`PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md).

## Sources de vérité

Le runtime reste autoritaire pour la résolution effective d'une route.

| Responsabilité | Source |
|---|---|
| Définitions runtime des familles | `apps/web/src/lib/ui/page-families/families/registry.ts` |
| Métadonnées partagées runtime/doc | `apps/web/src/lib/ui/page-families/page-families.manifest.json` |
| Résolution pathname → famille | `apps/web/src/lib/ui/page-families/resolve-page-family.ts` |
| Exceptions nommées | `apps/web/src/lib/ui/page-families/exceptions.ts` |
| Tests du resolver | `apps/web/src/lib/ui/page-families/resolve-page-family.test.ts` |
| Inventaire documentaire des routes | `documentation/pages_site/INDEX.md` |
| Fiches fonctionnelles | `documentation/pages_site/routes/` |

La documentation ne doit pas maintenir une seconde logique de résolution.

## Taxonomie

Le manifeste courant expose les familles documentaires suivantes :

| Clé documentaire | Id runtime | Famille |
|---|---|---|
| `00-homepage` | `homepage` | Homepage |
| `01-accueil-pilotage` | `accueil-pilotage` | Accueil & Pilotage |
| `02-agir` | `agir` | Agir |
| `03-cartographie-impact` | `cartographie-impact` | Cartographie & Impact |
| `04-reseau-discussions` | `reseau-discussions` | Réseau & Discussions |
| `05-apprendre` | `apprendre` | Apprendre |
| `06-auth-onboarding` | `authentification` | Auth & Onboarding |
| `07-legal` | `juridique` | Institutionnel & Légal |
| `08-systeme-utilitaires` | `systeme` | Système & Utilitaires |
| `09-admin-superadmin` | `administration` | Admin & Super-admin |
| `10-print-export` | `impression` | Print & Export |

Le runtime possède aussi `secours`, utilisé comme fallback lorsqu'aucune famille
métier n'est résolue.

## Routage structurant

Le resolver courant classe notamment les routes de sections suivantes.

### Accueil & Pilotage

```txt
/sections/elus
```

### Agir

```txt
/sections/route
/sections/weather
/sections/rejoindre-un-formulaire
```

### Cartographie & Impact

```txt
/sections/gamification
```

### Réseau & Discussions

```txt
/sections/community
/sections/feedback
/sections/actors
/sections/annuaire
/sections/messagerie
/sections/open-data
/sections/funding
/sections/trash-spotter
```

D'autres routes sont résolues directement par leur préfixe ou leur domaine :
authentification, pages légales, administration, impressions, actions,
dashboard/pilotage, rapports, apprentissage et partenaires.

Le détail exhaustif du comportement appartient à
`resolve-page-family.ts` et à ses tests, pas à une liste documentaire dupliquée.

## Sections volontairement non classées

Tant qu'aucune décision produit n'est publiée :

```txt
/sections/recycling
/sections/compost
/sections/climate
```

ne reçoivent pas de famille métier implicite.

Elles ne doivent pas être mappées silencieusement pour satisfaire un audit ou
uniformiser une couleur.

## Exceptions actuelles

Les exceptions constituent un contrat explicite. Elles doivent être déclarées,
testées et documentées.

| Id | Route ou périmètre | Effet |
|---|---|---|
| `explorer-sommaire` | `/explorer` | présentation jaune dédiée |
| `methodologie-impact` | `/methodologie` | Cartographie & Impact, variante rouge |
| `weather-operations` | `/sections/weather` | famille Agir |
| `join-group-form` | `/sections/rejoindre-un-formulaire` | famille Agir |
| `reports-impact` | rapports / gamification concernés | variante rouge Cartographie & Impact |
| `partners-indigo` | `/partners/*` | variante partenaires du réseau |
| `error-429` | `/error/429` | état système dédié |

Le registre et le resolver restent la source exacte de leurs tokens.

## Couche visuelle

`page-families` centralise les décisions de famille utilisées par les primitives
partagées, notamment :

- fond de page ;
- tokens de hero ;
- presets de cartes lorsque la primitive concernée s'appuie sur la famille.

Une famille n'autorise pas à dupliquer ses classes dans chaque `page.tsx`.

Les composants et contrats visuels spécialisés restent documentés dans
`documentation/design-system/`. Les KPI, panneaux métier ou composants qui ne
sont pas pilotés par `page-families` ne doivent pas recevoir artificiellement
des tokens de famille.

## Contrat documentaire

Pour chaque route canonique :

```txt
route runtime
→ résolution de famille
→ entrée INDEX.md
→ fiche canonique pages_site
```

Invariants :

- `/` reste l'unique homepage canonique ;
- `/accueil` ne doit pas redevenir un alias caché ;
- une route canonique garde une fiche canonique unique ;
- les docs ne recalculent pas seules une famille, un ton ou une couleur ;
- une exception nouvelle est nommée et testée ;
- une modification de famille traverse runtime, test et documentation
  concernée dans le même lot.

## Générateur et dérive

`documentation/pages_site/generate-canonical-pages.mjs` est un outil d'audit de
dérive. Il ne doit pas redevenir un générateur destructif de la documentation.

Il ne doit pas écraser silencieusement :

```txt
INDEX.md
README enrichis
présentations détaillées
propositions
mémoires d'idées écartées
captures
```

Diagnostic :

```bash
npm run audit:pages-site-drift
```

Contrôle strict :

```bash
npm run check:pages-site-drift
```

## Maintenance

Après une modification de route, de famille ou d'exception :

1. modifier la source runtime concernée ;
2. modifier ou ajouter le test de résolution ;
3. mettre à jour `INDEX.md` si l'inventaire de routes change ;
4. mettre à jour la fiche de page concernée si le comportement visible change ;
5. lancer le contrôle de dérive pertinent.

Ne pas recopier dans ce document l'état ponctuel d'une migration. Les décisions
encore ouvertes vivent dans [`PAGE_FAMILIES_PLAN.md`](./PAGE_FAMILIES_PLAN.md).
