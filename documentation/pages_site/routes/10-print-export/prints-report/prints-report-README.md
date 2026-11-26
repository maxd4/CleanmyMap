# Print & Export - Rapport imprimable

## Fiche canonique

- **Route** : `/prints/report`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/prints/report/page.tsx`
- **Type fonctionnel** : rapport / export
- **Famille / bloc fonctionnel** : Print & Export (hors bloc)
- **Statut** : standalone
- **Contexte nécessaire** : Compte connecté ; un visiteur voit un aperçu verrouillé et doit se connecter pour la synthèse complète.
- **Objectif utilisateur principal** : Préparer un export propre et imprimable.
- **Action principale attendue** : Relire la synthèse puis l'imprimer ou l'exporter depuis le rendu documentaire.
- **Palette attendue** : papier / slate / accents documentaires discrets
- **Scope** : synthèse documentaire authentifiée du modèle d’analyse des rapports (périmètre global, bilan sur la fenêtre courante, tendances sur 365 jours), avec aperçu verrouillé pour les visiteurs. Distincte du PDF officiel et des artefacts historiques.
- **Terminée** : oui pour le périmètre actuellement livré
- **Couleurs actuellement détectées** : papier / slate — canvas clair et états documentaires neutres.
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec le rendu runtime actuel.
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
- Structure imprimable : en-tête non certifié, date calculée du modèle, périmètre et période, couverture des sources, résultats renseignés, tableau des secteurs, tendances mensuelles avec couverture, méthode et limites. Les tableaux s’impriment sans dépendre du rendu d’un graphique navigateur. Le bouton d’impression réutilise le composant existant ; le PDF officiel reste accessible depuis /reports?tab=generation. La comparaison de styles cartographiques centrée sur Paris est une illustration facultative à l’écran, jamais une preuve de collecte ni imprimée. Les mentions fixes de certification, score AA et statistiques causales non prouvées sont retirées. AuthN, noindex et refus de charger le corpus sans session préservés.
