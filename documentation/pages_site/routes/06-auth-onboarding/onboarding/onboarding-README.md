# Onboarding

## Fiche canonique

- **Route** : `/onboarding`
- **Fichier(s) source(s)** :
- `apps/web/src/app/onboarding/page.tsx`
- **Type fonctionnel** : onboarding
- **Famille / bloc fonctionnel** : Auth & Onboarding (hors bloc)
- **Statut** : auth
- **Contexte nécessaire** : Compte authentifié ; redirection vers `/sign-in` si la session ou l'identité n'est pas disponible.
- **Objectif utilisateur principal** : Compléter la configuration initiale du compte avec le rôle, le profil actif, la localisation et les préférences d'affichage.
- **Action principale attendue** : Enregistrer la configuration puis reprendre la route demandée, ou revenir au profil par défaut si la destination est invalide.
- **Palette attendue** : surface claire lavande/menthe, panneaux slate/indigo
- **Scope** : parcours authentifié de complétion initiale, prise en compte d'un code de parrainage et redirection sûre vers la destination après enregistrement.
- **Terminée** : oui pour le parcours actuellement livré
- **Couleurs actuellement détectées** : surface lavande/menthe avec panneaux slate/indigo et accents émeraude du shell partagé.
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec le rendu runtime actuel.
- **Risque de conflit avec les couleurs existantes** : moyen : éviter une dérive vers une esthétique admin ou cartographique.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Formulaire
- CTA principal
- validation
- liens de bascule auth
- lien secondaire « Vous représentez une collectivité ? » vers `/compte/evolution`
- CTA secondaire « Configurer plus tard » ou « Plus tard, sans enregistrer » selon
  l'état de la tentative
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

## Persistance séquentielle et reprise

La validation persiste les étapes nécessaires dans un ordre déterministe :

`identity` → `activeProfile` → `displayMode` → `metadata/completion`

Chaque étape est ajoutée au ledger uniquement après son succès. Une erreur
reprend au retry à l'étape échouée et réutilise les succès déjà enregistrés,
sans rejouer les étapes complétées. `metadata/completion` est la dernière
frontière faillible : `profileSetupCompleted=true`, `profileSetupVersion` et
`profileSetupSchemaVersion` ne sont persistés qu'après la réussite de toutes les
étapes précédentes. Ce marqueur final ne constitue donc jamais la preuve d'une
configuration complète avant la fin de la séquence.

Les systèmes d'identité, de profil actif, de préférences d'affichage et de
métadonnées restent distincts. Il n'existe pas de transaction ni de rollback
cross-system : une étape déjà réussie reste enregistrée si une étape suivante
échoue.

## Configuration différée

La configuration initiale peut être différée.

À côté du CTA principal `Valider et continuer`, l'interface expose un CTA
secondaire explicite :

`Configurer plus tard` lorsque la tentative n'a encore persisté aucune étape.
Après une modification locale non enregistrée, le libellé devient `Plus tard,
sans enregistrer`.

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

Si aucune étape de persistance n'a réussi, la déférence suit le contrat normal :
`Configurer plus tard` ou `Plus tard, sans enregistrer` selon que le formulaire
a été modifié. Si une ou plusieurs étapes du ledger ont déjà réussi, l'interface
affiche `Quitter, modifications conservées` et confirme brièvement que
certaines modifications sont déjà enregistrées et que quitter ne les annulera
pas. Cette déférence ne déclenche aucun rollback.

Contrat de persistance actuel dans `unsafeMetadata` :

- `profileSetupDeferred: true`
- `profileSetupDeferredVersion: ACCOUNT_SETUP_SCHEMA_VERSION`
- `profileSetupDeferredAt: ISO timestamp`

Une déférence dont la version est égale ou supérieure à la version canonique
courante rend le gate non bloquant tout en conservant `setupCompleted: false`.

Une évolution ultérieure de `ACCOUNT_SETUP_SCHEMA_VERSION` peut reproposer la
configuration lorsqu'une déférence enregistrée porte une version plus ancienne.

Lors d'une validation complète réussie :

- `profileSetupCompleted` devient `true` en dernier, après toutes les autres
  étapes de persistance ;
- les métadonnées de déférence sont supprimées ;
- les préférences réellement choisies sont persistées selon leur contrat propre.

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- Le contrat transversal de présence du chrome global est défini dans
  `documentation/design-system/LAYOUT_SPACING.md`.
