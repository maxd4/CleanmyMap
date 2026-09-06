# CleanMyMap — Action fallback images

Destination prévue dans le dépôt :

`apps/web/public/images/action-fallbacks/`

Ce dossier contient 15 images de fallback et `action-fallback-images.json`.

## Invariants d'intégration

1. Une vraie photo jointe par l'utilisateur a toujours priorité.
2. Une image de fallback est un asset synthétique de présentation, jamais une preuve terrain.
3. Le choix doit d'abord filtrer les images compatibles avec le contexte canonique de l'action.
4. Le tirage aléatoire intervient uniquement parmi les candidats compatibles.
5. Si le contexte est inconnu, préférer les assets `isNeutral: true`.
6. Ne jamais choisir une plage pour une action explicitement urbaine, une forêt pour un centre-ville, etc.
7. Ne pas déduire le contexte depuis du texte libre si le modèle fournit déjà une catégorie ou un contexte géographique canonique.

Le manifeste JSON contient pour chaque image : chemin public, environnement principal,
environnements compatibles, type d'action, présence humaine, contexte aquatique,
caractère neutre, texte alternatif, provenance synthétique et SHA-256.
