# Politique cookies

## Fiche canonique

- **Route** : `/politique-cookies`
- **Fichier(s) source(s)** :
- `apps/web/src/app/politique-cookies/page.tsx`
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

- La première visite affiche une bannière avec deux actions de même niveau : **Tout accepter** et **Tout refuser**. Il n'y a pas de fermeture implicite par une icône ni d'option « Essentiels seulement » distincte.
- Les services essentiels restent actifs dans les deux cas. PostHog, Vercel Analytics et Vercel Speed Insights ne sont activés qu'après acceptation explicite.
- L'acceptation comme le refus sont mémorisés pendant 6 mois dans `localStorage` (`cleanmymap_cookie_consent`) et dans `cleanmymap_analytics_consent` avec `Max-Age=15552000`.
- Une décision locale expirée est supprimée automatiquement et la bannière est reproposée.
- Le contrôle permanent **Gérer mes cookies**, présent dans le footer, rouvre les choix sans suppression manuelle du stockage navigateur.
- Après un retrait, PostHog arrête explicitement la capture, réinitialise son identité et sa persistance utile ; un nouveau consentement peut le réactiver.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
