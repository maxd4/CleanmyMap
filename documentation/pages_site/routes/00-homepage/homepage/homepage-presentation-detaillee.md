# Homepage — présentation détaillée

**Statut : CURRENT pour les parcours observables ; les améliorations visuelles non exécutées restent PLAN.** Route canonique publique : `/`. La [fiche de la homepage](./homepage-README.md) et le code de `apps/web/src/app/page.tsx` font foi pour les données effectivement exposées.

## Composition et orientation

La page accueille les visiteurs et présente la vocation de CleanMyMap. Elle ouvre l'accès aux rubriques du produit sans devenir elle-même un nouveau domaine métier ou un tableau de bord de données distinct.

- **Hero** : proposition de valeur et CTA réels, reliés à leurs routes propriétaires. Les destinations, libellés et états responsive sont gouvernés par les composants réellement utilisés, non par une maquette historique.
- **Preview cartographique** : aperçu public des Actions via `ActionsMapFeed`, avec politique d'actions `approved`, période `current_year` et références de pollution V6 de la carte canonique. La homepage peut limiter la quantité, adapter le viewport et masquer des contrôles, mais ne calcule ni score ni règle de couleur autonome.
- **Découverte et crédibilité** : contenus de présentation et signaux communautaires uniquement depuis des faits publiés ou correctement contextualisés. Une vignette ou un indicateur non renseigné n'est pas une preuve de résultat terrain.
- **KPI Impact terrain** : les six KPI, leurs équivalences et leurs bulles d'explication proviennent exclusivement du dernier snapshot mensuel public persisté par le cron Impact terrain. Le chemin KPI de la homepage ne lance aucun agrégat, scan d'actions ou recalcul lors d'une visite ; le flux d'activité communautaire indépendant reste borné à trois actions récentes. La date `generatedAt` et la mention de mise à jour mensuelle sont affichées lorsque le snapshot est disponible ; son absence produit « Données d’impact indisponibles » plutôt qu'un zéro.
- **Navigation et approfondissement** : chaque carte ou CTA délègue les éventuels contrôles AuthN/AuthZ à la page, au handler et au domaine propriétaire.

## Preuves et limites de présentation

- Les actions réelles représentées renvoient à `/methodologie#indicateurs-impact-terrain` pour les méthodes et limites.
- Le caractère open source peut être relié au dépôt public `https://github.com/maxd4/CleanmyMap`.
- La mention DU Engagement de Sorbonne Université reste du contexte éditorial : ne pas ajouter de lien ni de validation officielle sans source vérifiée.
- La couleur verte est réservée aux `clean_place`, le gris correspond à une indisponibilité réelle du score ; les états de chargement ou de donnée absente doivent conserver leur sens distinct. Les données de la preview sont celles de la carte, pas un inventaire homepage parallèle.

## États, accessibilité et vérification

Le shell doit rester lisible lorsque les signaux cartographiques sont en chargement, indisponibles ou vides. Toute évolution de l'interface doit vérifier les vrais CTA, les sources des données, l'ordre de lecture, les titres, le clavier, le responsive et le `prefers-reduced-motion` pertinent, sans fabriquer de résultat de test ou de capture.

Aucune mesure de conversion, vérification navigateur, capture ou résultat de test n'est revendiqué par cette fiche. Pour une modification, confronter les composants du hero et de la preview aux tests, au design system et à l'INDEX maître.
