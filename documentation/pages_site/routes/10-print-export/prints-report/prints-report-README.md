# Print & Export - Rapport imprimable

## Fiche canonique

- **Route** : `/prints/report`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/prints/report/page.tsx`
- **Type fonctionnel** : rapport / export
- **Famille / bloc fonctionnel** : Print & Export (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Accès direct depuis le shell ou un outil interne
- **Objectif utilisateur principal** : Préparer un export propre et imprimable.
- **Action principale attendue** : Générer ou relire un rapport.
- **Palette attendue** : ardoise / bleu nuit / vert discret
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : print — canvas #faf7f0, halo rgba(148, 163, 184, 0.14)
- **Incohérences de couleurs** : Écart détecté: attendu ardoise / bleu nuit / vert discret, code actuel slate / papier.
- **Risque de conflit avec les couleurs existantes** : faible : garder une identité documentaire autonome, sobre et détachée des blocs principaux.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titres
- tableaux exportables
- résumés
- CTA export / print
- **Textes à réduire ou supprimer** :
- Chrome web inutile
- explications de parcours redondantes
- éléments décoratifs
- **Bulles / cartes / contextes trop nombreux** : La version imprimable doit rester sobre et structurée.
- **Composants UI concernés** :
- Layout print
- boutons export
- tableaux
- résumés
- en-têtes de rapport
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- Structure imprimable réorganisée autour d'une grille canonique CleanMyMap:
  - en-tête documentaire sur deux colonnes;
  - bande KPI en quatre blocs alignés;
  - comparaison cartographique et analyse mensuelle disposées côte à côte quand l'espace le permet;
  - bloc méthodologique et notes de lecture regroupés en section dédiée;
  - sections protégées contre les ruptures de page inutiles et les débordements horizontaux.
