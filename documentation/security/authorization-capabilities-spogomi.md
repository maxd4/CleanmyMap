# Permissions événementielles SPOGOMI

> Module associé à [authorization-capabilities.md](./authorization-capabilities.md). Statut : CURRENT lorsque précisé.

## 15 bis. SPOGOMI — capacités événementielles `CURRENT`

SPOGOMI applique désormais le modèle capacité + périmètre sans créer de rôle
Clerk global supplémentaire. `action_organizers` prouve le scope
organisateur/coorganisateur ; `spogomi_event_reviewers` porte les habilitations
`observer` et `referee`, chacune contrainte par `event_id`, révocable et auditée
dans `spogomi_event_access_audit`.

Une nouvelle attribution événementielle doit en plus référencer une candidature
`spogomi_referee_applications` à l’état `habilitated`. Cet état exige la preuve
distincte du quiz arbitre versionné, la confirmation pratique versionnée et la
décision explicite d’un organisateur habilité. Le quiz comporte 12 questions
critiques et 10 générales ; sa correction utilise une clé HMAC service-only et
sa définition publique ne contient jamais la clé. Une candidature ou une preuve
théorique ne crée jamais une capacité. Dans une édition mixte, une attribution
événementielle exige une preuve courante pour chaque division concernée ; une
qualification Casual seule ne couvre donc pas World Cup. Les anciennes
habilitations sont préservées jusqu’à une révocation explicite. Une révocation
partielle ne révoque pas toute la candidature ; un refus post-habilitation
retire les accès actifs. Les tables de candidature, de preuves, de tentatives,
de confirmations et d’audit sont service-only.

Le serveur refuse le chevauchement compétiteur/arbitre actif pour une même
édition, y compris lorsqu’une inscription sportive est créée par une autre
voie. Aucun rôle Clerk global supplémentaire n’est introduit.

```txt
public
→ projection effectivement publiée

participant lié
→ projection privée minimale de ses données autorisées

session d'équipe
→ formulaire et soumissions de son équipe uniquement

observer + événement
→ projection opérationnelle non sensible, aucune mutation

referee + événement
→ lecture des soumissions nécessaires et décision d'arbitrage autorisée

organizer/coorganizer + événement
→ gestion de l'événement et attribution/révocation d'accès

organizer/coorganizer + événement
→ lecture et traitement privés des propositions d'aide de cette édition

admin/max actif + capacité globale consommée
→ supervision selon la capacité existante, sans élargissement implicite
```

Les projections de gestion, d'arbitrage et d'observation sont distinctes. La
projection de gestion peut lire le roster nominatif après son garde scoped ;
elle ne doit jamais être réutilisée par l'observateur. Toute habilitation est
bornée à un événement et toute tentative de mutation est revalidée côté
serveur, même si l'interface masque l'action.

Les propositions d'aide utilisent une projection privée dédiée. Le demandeur
ne lit que ses propres lignes ; la file organisateur exige la capacité `manage`
de l'événement et la RPC revalide le créateur ou la relation
`action_organizers`. Cette frontière ne réutilise pas les demandes d'admission
sportive et ne donne accès ni au roster ni aux résultats.

## 16. Checklist de conception

Avant d'accorder une nouvelle permission :

```txt
□ Quel rôle métier en a besoin ?
□ Quelle capacité exacte est nécessaire ?
□ Quel scope minimal suffit ?
□ Quelle relation prouve ce scope ?
□ Quel état métier autorise l'opération ?
□ Quelles données sont réellement nécessaires ?
□ Une projection sanitizée suffit-elle ?
□ Le client peut-il falsifier un identifiant de scope ?
□ RLS doit-elle reproduire cette frontière ?
□ Un motif est-il nécessaire ?
□ Un audit est-il nécessaire ?
□ Les refus owner/non-owner ou scope A/scope B sont-ils testés ?
```

## 17. Références

```txt
apps/web/src/lib/domain-language.ts
apps/web/src/lib/profiles.ts
apps/web/src/lib/authz.ts
apps/web/src/lib/actions/permissions.ts
documentation/security/authz-authn-regles.md
documentation/architecture/adr/ADR-007-capability-scoped-authorization.md
```

## Frontière serveur des capacités sensibles

Les handlers `/api/community/promotion-requests`,
`/api/admin/promotion-requests`, `/api/admin/role-accounts`,
`/api/account/active-profile`, `/api/mobile/account` et
`/api/reports/elus-dossier` bornent désormais la demande à l'identité résolue
par Clerk et à son contrat de capacité. Un identifiant, un rôle, une
motivation, un profil actif ou une propriété JSON supplémentaires fournis par
le client ne peuvent pas modifier `publicMetadata.role` ni élargir le compte
ou le scope ciblé.

Les opérations sensibles utilisent le rate limiter distribué commun et
refusent en mode fail-closed si Upstash n'est pas disponible. Ce contrôle
réduit l'abus mais ne remplace pas l'AuthN/AuthZ. Les rôles `elu`, `admin` et
`max` restent séparés ; une projection Supabase de profil n'est jamais une
preuve suffisante pour conserver une capacité révoquée dans Clerk.

Pour le feedback privé, le destinataire est l'identité Clerk configurée comme
propriétaire IMU et vérifiée avec le rôle canonique `max`. Il n'existe aucun
fallback vers un profil Supabase projeté ou vers l'expéditeur.
