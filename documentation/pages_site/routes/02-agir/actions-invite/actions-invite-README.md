# Accès privé à une action par invitation

## Fiche canonique

- **Route** : `/actions/invite/[token]`
- **Fichier source** : `apps/web/src/app/(app)/actions/invite/[token]/page.tsx`
- **Type fonctionnel** : deep-link privé d'inscription et de rattachement
- **Famille / bloc fonctionnel** : Agir
- **Accès runtime** : projection minimale lisible par le lien ; Clerk requis pour toute mutation
- **Contrat SEO** : `ACCESS=PRIVATE`, `SEARCH=NOINDEX`, `DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`

## Contrat métier

Le token est un aléa cryptographiquement sûr. Seule son empreinte est persistée
et un lien est valable trois mois calendaires depuis sa création ou son
renouvellement. Le renouvellement remplace le jeton précédent ; la révocation
le ferme immédiatement.

La page ne projette que les informations minimales utiles au rendez-vous et
n’expose jamais les notes internes de préparation. Une action
`access_mode = invite_link` n’est pas publiée dans les cartes, recherches,
rapports, exports, références ni projections publiques, y compris après sa
finalisation.

Avant le début prévu, `POST /api/actions/invite/[token]` utilise la RPC
`request_private_action_registration` et crée ou retrouve une ligne
`action_registrations` `confirmed` de source `invite_link`. Cette inscription ne
constitue pas une présence terrain. Si la date est passée mais que le bilan
n’est pas finalisé, le lien reste lisible mais affiche `Action en attente de
finalisation` et aucune nouvelle inscription n’est ouverte.

Après `post_action_complete`, le même lien réutilise le workflow canonique de
claim et crée au plus une demande `action_participants` de source
`post_action_claim` au statut `pending`. La décision reste soumise aux
permissions et à la review Actions existantes ; aucune présence n’est confirmée
automatiquement.

Un token expiré, révoqué, remplacé ou associé à une action annulée, rejetée ou
non éligible est fermé. Une décision d’inscription refusée ou annulée n’est pas
réactivée silencieusement par une nouvelle requête.
