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
- **Action principale attendue** : Configurer le compte ou choisir explicitement de le configurer plus tard.
- **Palette attendue** : lavande claire / vert menthe clair
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : auth — canvas #eef2ff, halo rgba(99, 102, 241, 0.24)
- **Incohérences de couleurs** : Écart détecté: attendu lavande claire / vert menthe clair, code actuel indigo / violet.
- **Risque de conflit avec les couleurs existantes** : moyen : éviter une dérive vers une esthétique admin ou cartographique.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Formulaire
- CTA principal
- validation
- liens de bascule auth
- lien secondaire « Vous représentez une collectivité ? » vers `/compte/evolution`
- CTA secondaire « Configurer plus tard »
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
- **Priorité de correction** : moyenne

## Contrat de chrome global

`/onboarding` est une page du site et non un overlay plein viewport.

Le ruban supérieur de navigation et le ruban inférieur global sont obligatoires
et restent visibles pendant toute la configuration du compte. Le contenu
d'onboarding s'insère entre ces deux rubans et ne doit jamais les recouvrir.

Le chrome est fourni exclusivement par le layout racine. La page onboarding ne
doit pas dupliquer localement le header ou le footer.

## Configuration différée

La configuration initiale peut être différée.

À côté du CTA principal `Valider et continuer`, l'interface expose un CTA
secondaire explicite :

`Configurer plus tard`

Ce CTA :

- ne déclenche pas la validation des champs du formulaire ;
- ne modifie ni le rôle réel, ni le profil actif, ni le pseudo, ni le nom, ni
  le prénom, ni les préférences de localisation ou d'affichage ;
- enregistre uniquement la déférence de la version courante de la configuration ;
- ne doit jamais être traité comme une configuration terminée ;
- désactive le gate bloquant pour la version courante de l'onboarding ;
- laisse les réglages accessibles ultérieurement depuis les préférences du compte ;
- sur `/onboarding`, continue vers la destination `next` sécurisée ou vers
  `/profil` par défaut ;
- lorsqu'il est déclenché depuis un `AccountCompletionGate`, rafraîchit le gate
  et rend le contenu initialement demandé.

Contrat de persistance actuel dans `unsafeMetadata` :

- `profileSetupDeferred: true`
- `profileSetupDeferredVersion: ACCOUNT_SETUP_SCHEMA_VERSION`
- `profileSetupDeferredAt: ISO timestamp`

Une déférence dont la version est égale ou supérieure à la version canonique
courante rend le gate non bloquant tout en conservant `setupCompleted: false`.

Une évolution ultérieure de `ACCOUNT_SETUP_SCHEMA_VERSION` peut reproposer la
configuration lorsqu'une déférence enregistrée porte une version plus ancienne.

Lors d'une validation complète réussie :

- `profileSetupCompleted` devient `true` ;
- les métadonnées de déférence sont supprimées ;
- les préférences réellement choisies sont persistées selon leur contrat propre.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- Le contrat transversal de présence du chrome global est défini dans
  `documentation/design-system/LAYOUT_SPACING.md`.
