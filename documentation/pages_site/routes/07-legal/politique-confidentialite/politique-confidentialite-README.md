# Politique de confidentialité

## Fiche canonique

- **Route** : `/politique-confidentialite`
- **Fichier(s) source(s)** :
- `apps/web/src/app/politique-confidentialite/page.tsx`
- **Type fonctionnel** : légale
- **Famille / bloc fonctionnel** : Institutionnel & Légal (hors bloc)
- **Statut** : légal
- **Contexte nécessaire** : Aucun, page institutionnelle
- **Objectif utilisateur principal** : Informer sur les règles, les droits et la conformité, sans esthétique marketing.
- **Action principale attendue** : Lire un document ou contacter l'équipe.
- **Palette attendue** : slate / gris clair
- **Scope** : consentement cookies et analytics — LEGAL-01
- **Terminée** : oui pour le périmètre LEGAL-01
- **Couleurs actuellement détectées** : legal — canvas #f8fafc, halo rgba(148, 163, 184, 0.18)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : faible : la palette doit rester slate / gris clair / blanc, sans gradients visibles ni effets marketing.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Titres légaux
- sections obligatoires
- liens de contact
- mentions réglementaires
- structures de lecture
- ancres utiles
- **Textes à réduire ou supprimer** :
- Décorations inutiles
- phrases promotionnelles
- blocs redondants
- callouts d'ambiance
- **Bulles / cartes / contextes trop nombreux** : Le contenu réglementaire doit rester sobre, compact et cohérent d'une page à l'autre.
- **Composants UI concernés** :
- LegalSection
- LegalLayout
- Article
- listes
- footer
- liens
- tableaux légaux
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Comportement fonctionnel vérifié

- Le consentement analytique est une décision explicite, acceptée ou refusée, conservée pendant 6 mois.
- La décision est stockée dans `cleanmymap_cookie_consent` et synchronisée dans `cleanmymap_analytics_consent` ; une décision locale expirée est nettoyée et redevient absente.
- Le retrait désactive le rendu Vercel Analytics / Speed Insights et arrête une instance PostHog déjà initialisée avant de réautoriser une nouvelle capture.
- **Gérer mes cookies** est accessible en permanence depuis le footer et rouvre la bannière de choix.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
