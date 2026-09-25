# Inscription

## Fiche canonique

- **Route** : `/sign-up`
- **Fichier(s) source(s)** :
- `apps/web/src/app/sign-up/[[...sign-up]]/page.tsx`
- `apps/web/src/components/auth/auth-page-shell.tsx`
- **Type fonctionnel** : authentification
- **Famille / bloc fonctionnel** : Auth & Onboarding (hors bloc)
- **Statut** : auth
- **Contrat SEO** : `ACCESS=PUBLIC`, `SEARCH=NOINDEX`, `DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`. La page est accessible anonymement uniquement comme entrée d'inscription.
- **Contexte nécessaire** : Page d'entrée d'authentification ou de configuration initiale
- **Objectif utilisateur principal** : Créer un compte CleanMyMap puis accéder à sa configuration initiale.
- **Action principale attendue** : S'inscrire via Clerk ou basculer vers `/sign-in` pour reprendre un compte existant.
- **Palette attendue** : canvas emerald clair lumineux, halos emerald discrets,
  panneau éditorial emerald sombre et surface Clerk claire structurée
- **Scope** : shell Auth & Onboarding partagé, surface Clerk d'inscription, retour vers l'accueil et bascule vers la connexion.
- **Terminée** : oui pour le parcours actuellement livré
- **Couleurs actuellement détectées** : canvas emerald lumineux, panneau éditorial
  emerald sombre, surface Clerk blanche et CTA principal doré/brun
- **Incohérences de couleurs** : aucune ; le shell reste autonome et la
  surface Clerk conserve ses composants natifs, sa validation, son referral et
  ses erreurs.
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

La page utilise le shell partagé Auth & Onboarding : sur desktop, un panneau
éditorial emerald sombre accompagne une surface Clerk claire et compacte ; le
canvas, les halos et les bordures reprennent la grammaire du bloc Agir sans
rattacher la route au parcours métier `/actions/new`. Sur mobile, le formulaire
est prioritaire et le panneau éditorial disparaît au profit d'une identité
CleanMyMap compacte.

Le composant Clerk natif conserve le formulaire d’inscription, Google/OAuth,
la validation, les erreurs, le paramètre de referral et la redirection vers
l’onboarding. Le titre Clerk reste la hiérarchie principale du panneau
d’authentification ; aucun titre d’inscription redondant n’est ajouté autour
du formulaire.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
