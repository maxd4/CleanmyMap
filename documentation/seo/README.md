# Documentation SEO CleanMyMap

## Fichiers

| Fichier | Description |
|---------|-------------|
| [SEO_STRATEGY.md](./SEO_STRATEGY.md) | Stratégie complète SEO/AEO/GEO/AIO/SXO |
| [MAINTENANCE_CHECKLIST.md](./MAINTENANCE_CHECKLIST.md) | Checklist maintenance régulière |
| [ACTIONS_MANUELLES_RESTANTES.md](./ACTIONS_MANUELLES_RESTANTES.md) | Tâches à faire hors du code |

## Démarrage rapide

## État Search Console

La propriété Google Search Console `https://cleanmymap.fr/` est **ACTIVE et
validée**. La homepage est indexée et Google reconnaît la canonical
`https://cleanmymap.fr/`. Cette documentation ne prétend pas exécuter des
actions dans Search Console : les inspections et demandes d’indexation restent
humaines.

## Contrat de route SEO

Le contrat canonique est défini dans
[`documentation/pages_site/INDEX.md`](../pages_site/INDEX.md), sous
`Contrat ACCESS / SEARCH / DISCOVERY / CANONICAL`. Il sépare explicitement :

- `ACCESS` : `PUBLIC`, `HYBRID` ou `PRIVATE` ;
- `SEARCH` : `INDEX` ou `NOINDEX` ;
- `DISCOVERY` : `SITEMAP`, `INTERNAL_ONLY` ou `REDIRECT` ;
- `CANONICAL` : `SELF`, `TARGET` ou `NONE`.

Les libellés runtime `public-visible`, `clerk-context`, `blur`, `disabled` et
`protected` décrivent l'accès ou la présentation. Ils ne constituent pas à eux
seuls une décision SEO. Les pages hybrides peuvent être indexables tout en
conservant leurs mutations, exports et données personnelles derrière
AuthN/AuthZ. Les routes privées, utilitaires non indexables et alias ne sont
pas des pages SEO autonomes.

La matrice documentaire et les surfaces runtime sont alignées sur le contrat
produit/SEO. Le sitemap, les metadata, les robots et les redirects sont
maintenus ensemble ; aucune action Search Console n'est simulée par cette
documentation.

### Ajouter une nouvelle page avec SEO

1. **Contrat de route** - Définir explicitement les quatre axes `ACCESS`,
   `SEARCH`, `DISCOVERY` et `CANONICAL` dans l'index maître des pages.
2. **Source d’indexabilité** - Pour une page publique indexable, l’ajouter à
   `apps/web/src/lib/seo/indexability.ts` et au sitemap si son URL doit être
   découverte. Une page privée, inachevée ou noindex reste hors sitemap.
3. **Métadonnées** - Ajouter `export const metadata` dans le fichier `page.tsx`
   uniquement lorsqu’une metadata spécifique est nécessaire:
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Titre - CleanMyMap",
  description: "Description fidèle au contenu réellement visible de la page",
};
```

4. **Robots, canonical et contenu** - Vérifier que robots autorise la page,
   que la canonical est cohérente, qu’un titre principal descriptif et un
   contenu utile existent dans le HTML rendu, et qu’un lien interne permet sa
   découverte lorsque c’est pertinent.
5. **Schema JSON-LD** - N’en rendre un que si la page expose réellement le même
   contenu. Le seul schema global actuellement rendu est `WebSiteJsonLd`;
   aucune identité juridique `Organization` n’est rendue tant que CleanMyMap
   est édité par une personne physique. Une FAQ JSON-LD nécessite une FAQ
   visible avec les mêmes questions et réponses.

6. **Tests et publication** - Ajouter ou adapter les tests d’indexabilité,
   sitemap et metadata, puis après publication d’une page stratégique prévoir
   une inspection manuelle Search Console.

## NEW_PUBLIC_PAGE_SEO_CHECK

1. décider explicitement si la page doit être indexable ;
2. si oui, l’ajouter à la source canonique d’indexabilité/sitemap ;
3. fournir metadata/canonical adaptées si nécessaire ;
4. vérifier robots ;
5. vérifier le contenu HTML et le titre principal ;
6. ajouter JSON-LD uniquement si justifié par le contenu publié ;
7. ajouter ou adapter les tests ;
8. après publication d’une page stratégique, documenter l’inspection Search
   Console comme action manuelle recommandée.

Pour une page privée ou inachevée, ne pas l’ajouter au sitemap et conserver les
protections/noindex prévues par le contrat existant.

Pour une route de compatibilité, documenter la cible dans l'index maître et ne
pas la présenter comme une page canonique autonome. `/en` est actuellement un
alias vers `/` ; aucune version anglaise canonique ni déclaration
`hreflang` `en-US` ne doit être inventée. Aucune page canonique `/learn` n'existe
actuellement.

### Ajouter un nouveau HowTo

Créer un HowTo uniquement lorsqu'un guide correspondant est publié. Ses étapes
doivent reprendre les informations réellement visibles sur cette page.

1. Créer une nouvelle fonction dans `apps/web/src/components/seo/structured-data/`:
```typescript
export function HowToMonActionJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Mon action",
    step: [
      { "@type": "HowToStep", name: "Étape 1", text: "Description" },
    ],
  };
  return <JsonLd data={data} />;
}
```

2. Importer et utiliser dans la page concernée

## Lexique de marque et de contenu

Voir `SEO_STRATEGY.md` pour le lexique utile. Il guide les titres, descriptions
et contenus réels ; il ne justifie ni keyword stuffing ni l'augmentation
automatique de `metadata.keywords`.

### Base
- CleanMyMap, CMM, cleanwalk, dépollution, propreté, carte, France, territoire, impact

### Écologie
- écologie, développement durable, environnement, transition écologique

### Action
- action citoyenne, bénévolat, engagement, participation citoyenne

### Communauté
- communauté, entraide, coordination, mutualisation, partenariat

### Schemas rendus actuellement

- `WebSiteJsonLd` est rendu dans le layout racine.
- `OrganizationJsonLd` n’est pas rendu globalement ; aucun schema `Person`,
  `LocalBusiness`, FAQ, HowTo, Article, Review ou Event ne le remplace.
- Les autres helpers présents dans le code ne sont pas rendus actuellement et
  ne prouvent pas l'existence d'une FAQ, d'un avis, d'un événement, d'un
  article ou d'une vidéo publiés. Les relier à une page exige une source de
  contenu réelle et un contenu visible correspondant.

## Contact

Pour toute question SEO, consulter la stratégie complète dans `SEO_STRATEGY.md` et les tâches manuelles dans `ACTIONS_MANUELLES_RESTANTES.md`.
