# Connexion

## Fiche canonique

- **Route** : `/sign-in`
- **Fichier(s) source(s)** :
- `apps/web/src/app/sign-in/[[...sign-in]]/page.tsx`
- `apps/web/src/components/auth/auth-page-shell.tsx`
- **Type fonctionnel** : authentification
- **Famille / bloc fonctionnel** : Auth & Onboarding (hors bloc)
- **Statut** : auth
- **Contexte nécessaire** : Page d'entrée d'authentification ou de configuration initiale
- **Objectif utilisateur principal** : Créer ou reprendre l'accès au compte puis initialiser le profil.
- **Action principale attendue** : Se connecter, s'inscrire ou continuer l'onboarding.
- **Palette attendue** : lavande claire / vert menthe clair
- **Scope** : shell partagé réalisé, validation visuelle à confirmer
- **Terminée** : non
- **Couleurs actuellement détectées** : auth — canvas lavande claire / vert menthe clair, panneaux bleu nuit slate / indigo, surface Clerk blanche
- **Incohérences de couleurs** : aucune incohérence structurelle identifiée dans le shell ; la surface Clerk est claire et le contraste est porté par les styles Clerk locaux.
- **Risque de conflit avec les couleurs existantes** : moyen : éviter une dérive vers une esthétique admin ou cartographique.
- **Niveau de surcharge textuelle** : faible
- **Textes à conserver** :
- Formulaire
- CTA principal
- validation
- liens de bascule auth
- **Textes à réduire ou supprimer** :
- Marketing de contexte
- explications répétées
- bandeaux auxiliaires
- **Bulles / cartes / contextes trop nombreux** : le shell limite le contexte éditorial à trois bénéfices et conserve une seule surface Clerk principale.
- **Composants UI concernés** :
- Formulaire auth
- inputs
- CTA
- helpers
- progression onboarding
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Composition UI

La page utilise le shell partagé Auth & Onboarding : deux panneaux rapprochés
sur desktop, un panneau éditorial sombre à gauche et une surface Clerk claire
contenue dans un panneau sombre à droite. Sur mobile, le panneau éditorial est
remplacé par une identité CleanMyMap compacte au-dessus du formulaire.

Le composant Clerk natif conserve le formulaire, les OAuth, la validation, les
erreurs et les redirections existantes. Le titre Clerk reste la hiérarchie
principale du panneau d’authentification ; aucun titre de connexion redondant
n’est ajouté autour du formulaire.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
