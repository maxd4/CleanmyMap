# Onboarding

## Fiche canonique

- **Route** : `/onboarding`
- **Fichier(s) source(s)** :
- `apps/web/src/app/onboarding/page.tsx`
- **Type fonctionnel** : onboarding
- **Famille / bloc fonctionnel** : Auth & Onboarding (hors bloc)
- **Statut** : auth
- **Contexte nécessaire** : Page d'entrée d'authentification ou de configuration initiale
- **Objectif utilisateur principal** : Créer ou reprendre l'accès au compte puis initialiser le profil.
- **Action principale attendue** : Renseigner son rôle, sa localisation et son mode d'affichage pour terminer la configuration initiale.
- **Palette attendue** : lavande claire / vert menthe clair
- **Scope** : terminé
- **Terminée** : oui
- **Couleurs actuellement détectées** : auth — canvas lavande claire -> vert menthe clair, shell sombre violet nuit / indigo foncé, bulles indigo / violet / vert profond, fallback local stable si Clerk est indisponible
- **Incohérences de couleurs** : Aucune incohérence détectée après réalignement visuel.
- **Risque de conflit avec les couleurs existantes** : moyen : éviter une dérive vers une esthétique admin ou cartographique.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Formulaire
- CTA principal
- validation
- liens de bascule auth
- **Textes à réduire ou supprimer** :
- Marketing de contexte
- explications répétées
- bandeaux auxiliaires
- **Bulles / cartes / contextes trop nombreux** : L'auth doit rester focalisée sur l'action et éviter les panneaux multiples.
- **Composants UI concernés** :
- Formulaire auth
- inputs
- CTA
- helpers
- progression onboarding
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- Si Clerk n'est pas joignable en local, la page affiche un état stable plutôt qu'un chargement infini.
- La configuration initiale est regroupée sur cette page unique après authentification; `/onboarding/localisation` est un redirect historique.
- En local, la capture peut montrer l'état de chargement sobre du compte tant que Clerk n'a pas terminé son initialisation.

## Captures officielles

- Desktop: [photo/desktop/onboarding-desktop.webp](../photo/desktop/onboarding-desktop.webp)
- Mobile: [photo/mobile/onboarding-mobile.webp](../photo/mobile/onboarding-mobile.webp)
