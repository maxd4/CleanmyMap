# Actions manuelles restantes pour le SEO

Ce fichier liste ce qui ne peut pas être livré uniquement par du code dans ce dépôt.

## À faire manuellement

- [ ] Vérifier la propriété du site dans Google Search Console.
- [ ] Soumettre le sitemap et demander l'indexation des pages prioritaires dans Search Console.
- [ ] Créer une fiche Google Business Profile uniquement si l'activité est éligible et si une adresse réelle est disponible.
- [ ] Configurer les redirections au niveau du domaine et de l'hébergement pour garantir une seule URL canonique.
- [ ] Vérifier que `https://cleanmymap.fr`, `https://www.cleanmymap.fr` et les variantes `http` redirigent bien vers l'URL canonique retenue.
- [ ] Obtenir des backlinks éditoriaux depuis des partenaires pertinents avec des ancres naturelles.
- [ ] Publier ou actualiser les mentions de marque sur les profils externes réellement utilisés.
- [ ] Contrôler régulièrement les rapports d'indexation et les erreurs d'exploration dans Search Console.

## Ce que le code couvre déjà

- Métadonnées globales et par page.
- `robots.ts` et `sitemap.ts`.
- Données structurées JSON-LD.
- Canonicalisation des URLs dans les métadonnées.

## Point d'attention

Ne pas simuler dans le code des actions qui dépendent d'un tiers, d'un accès DNS ou d'une validation humaine. Ces tâches doivent rester dans la gouvernance opérationnelle du site.
