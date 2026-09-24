# Documentation SEO CleanMyMap

## Fichiers

| Fichier | Description |
|---------|-------------|
| [SEO_STRATEGY.md](./SEO_STRATEGY.md) | Stratégie complète SEO/AEO/GEO/AIO/SXO |
| [MAINTENANCE_CHECKLIST.md](./MAINTENANCE_CHECKLIST.md) | Checklist maintenance régulière |
| [ACTIONS_MANUELLES_RESTANTES.md](./ACTIONS_MANUELLES_RESTANTES.md) | Tâches à faire hors du code |

## Démarrage rapide

### Ajouter une nouvelle page avec SEO

1. **Métadonnées** - Ajouter `export const metadata` dans le fichier `page.tsx`:
```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Titre - CleanMyMap",
  description: "Description avec mots-clés stratégiques",
  keywords: ["mot-clé1", "mot-clé2", "écologie", "développement durable"],
};
```

2. **Schema JSON-LD** - N'en rendre un que si la page expose réellement le même
   contenu. Les schemas globaux actuellement rendus sont `OrganizationJsonLd`
   et `WebSiteJsonLd`; une FAQ JSON-LD nécessite une FAQ visible avec les mêmes
   questions et réponses.

3. **Sitemap** - Vérifier que la page est dans `apps/web/src/app/sitemap.ts`

4. **Test** - Valider avec Google Rich Results Test

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

## Mots-clés autorisés

Voir `SEO_STRATEGY.md` pour la liste complète.

### Base
- CleanMyMap, CMM, cleanwalk, dépollution, propreté, carte, France, territoire, impact

### Écologie
- écologie, développement durable, environnement, transition écologique

### Action
- action citoyenne, bénévolat, engagement, participation citoyenne

### Communauté
- communauté, entraide, coordination, mutualisation, partenariat

### Schemas rendus actuellement

- `OrganizationJsonLd` et `WebSiteJsonLd` sont rendus dans le layout racine.
- Les autres helpers présents dans le code ne sont pas rendus actuellement et
  ne prouvent pas l'existence d'une FAQ, d'un avis, d'un événement, d'un
  article ou d'une vidéo publiés. Les relier à une page exige une source de
  contenu réelle et un contenu visible correspondant.

## Contact

Pour toute question SEO, consulter la stratégie complète dans `SEO_STRATEGY.md` et les tâches manuelles dans `ACTIONS_MANUELLES_RESTANTES.md`.
