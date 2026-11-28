# Modification du pseudonyme : contrat canonique cible

**État : `PLAN / TARGET`, décision produit validée le 28 novembre 2026.** Contrat cible de modification du handle public, pas une preuve de comportement livré. Owner : identité publique et cycle de vie du profil. Web et Mobile partagent le même contrat serveur. Voir [suppression de compte](./account-erasure.md) et [AuthN/AuthZ données](./authz-authn-donnees.md).

## 1. Identité stable

- profiles.id / identité Clerk est immuable. Le handle est un attribut public modifiable, jamais une clé d'autorisation, de relation, de permission, de calcul scientifique ou de progression.
- Conserver toutes les contributions, rôles, adhésions, droits, XP, badges, historique personnel et statistiques inchangés. Aucune réattribution, duplication de compte ou nouvelle récompense.
- Conserver le format existant : 3 à 30 caractères, lettres minuscules ASCII, chiffres et underscores. Normalisation identique sur les voies d'écriture, unicité garantie en base, protection des noms institutionnels réservés et des usurpations. Ne pas créer de nouveau système d'identité.
- Le choix nom complet/pseudonyme reste distinct du handle ; ne jamais réexposer un nom réel auparavant masqué.

## 2. Règles temporelles

Un changement effectif maximum toutes les 168 heures (7 jours glissants). Premier changement possible sans inventer une date historique. La création initiale du handle ne constitue pas un changement. Une sauvegarde sans modification effective ou une requête refusée ne consomme pas le délai et ne renouvelle pas la transition.

Après changement, afficher pendant trois mois calendaires le pseudonyme immédiatement précédent, sous la forme :

```text
nouveaupseudo [ex ancienpseudo]
```

Conserver uniquement le précédent handle, sa date d'expiration et la date du dernier changement effectif. À chaque nouveau changement autorisé, remplacer le précédent et repartir pour trois mois. Ne pas accumuler une liste de pseudonymes historiques. Un ancien ancien pseudo cesse d'être affiché et recherché immédiatement. L'ancien pseudo affiché reste réservé au même compte pendant la transition, puis peut être libéré ; en cas de remplacement, libérer la réservation devenue inutile. Le titulaire peut reprendre son ancien pseudo si les règles de délai et d'unicité sont satisfaites. Aucun autre utilisateur ne peut le prendre tant que la réservation est active.

Temps serveur UTC, date du dernier changement distincte de updated_at. Les trois mois sont une addition calendaire, avec ajustement au dernier jour du mois si nécessaire, pas 90 jours fixes. La validité est un intervalle semi-ouvert jusqu'à l'échéance : à l'instant exact de l'expiration, le suffixe n'est plus projeté. Ne jamais prolonger via cache ou relecture. Purger la valeur expirée selon le mécanisme de maintenance existant, sans nouvelle conservation injustifiée ni nouveau cron indépendant.

Exemple (dates fictives) :

| Date | Affichage |
|---|---|
| 28/11/2026 | ecoparis |
| 05/12/2026 | greenrunner [ex ecoparis] |
| 12/12/2026 | cleanrunner [ex greenrunner] |
| 12/03/2027 à l'heure d'expiration | cleanrunner |

Le premier suffixe disparaît dès le deuxième changement. En cas de suppression du compte, retirer le suffixe et appliquer uniquement le libellé historique autorisé par le contrat d'effacement. Prévoir une procédure exceptionnelle de retrait d'un ancien pseudonyme pour motif légitime de confidentialité ou sécurité, avec décision habilitée, sans rendre le délai hebdomadaire ordinaire contournable.

## 3. Persistance et sécurité

Étendre PATCH /api/users/profile/handle. La lecture du profil courant, la validation du délai, la disponibilité du handle et des réservations et l'écriture atomique doivent être protégées contre deux demandes simultanées. L'index UNIQUE existant reste en place ; garantir aussi l'exclusion entre handles actifs et réservations, y compris initialisation concurrente. Choisir la plus petite extension du schéma et le owner transactionnel adapté aux contrats existants ; aucune table d'historique exhaustive.

Le 28 novembre 2026, la route mettait à jour uniquement handle et updated_at, tandis que le rôle authenticated pouvait directement INSERT et UPDATE profiles.handle en base. Le délai ne peut donc pas être un contrôle exclusivement Next.js ou UI. Fermer les contournements de changement par Data API, INSERT/UPSERT, suppression/recréation de profil et synchronisation Clerk, en préservant la création légitime. Ne pas ouvrir les métadonnées privées ou affaiblir les RLS. Le serveur déduit le compte de la session et refuse le compte en cours d'effacement.

En mode pseudo, la projection display_name doit rester cohérente avec handle dans la même transition ; en mode nom complet, ne pas écraser le nom choisi. sync-handle.ts, sync-orchestration.ts et sync-persistence.ts ne doivent pas rétablir une valeur lue avant un changement concurrent. Examiner également le changement de mode, les autres writers des profils et les caches.

Retourner des erreurs distinctes pour format, indisponibilité (y compris réservation), délai, compte supprimé/en cours d'effacement et indisponibilité technique. Renvoyer les dates canoniques de prochaine modification et d'expiration de transition. Les clients n'imposent pas leur horloge et ne déduisent pas l'état depuis une réponse tardive d'un autre compte.

## 4. Projections dynamiques

Toutes les surfaces autorisées qui affichent une identité active utilisent le nouveau pseudonyme, y compris les contributions antérieures. Le suffixe est une propriété de présentation distincte, jamais incorporée dans handle, display_name, URL, clé métier, mention technique ou contenu de message. Ne pas réécrire massivement les contributions ni leurs snapshots de preuve.

Consommateurs : profil et navigation, messagerie et messages privés, actions et organisateurs, participants, organisations et équipes, SPOGOMI, retours et suggestions, classements/badges/légendes, recherche et notifications dynamiques. Respecter chaque scope public/privé et opt-in. Afficher le suffixe uniquement sur les surfaces où le handle est légitimement exposé ; ne pas utiliser la transition pour lever une préférence de confidentialité. L'ancien handle valide est recherchable uniquement dans les mêmes scopes que le handle actuel, et retourne le profil actuel, pas un second résultat. Après expiration ou remplacement il ne permet plus de retrouver l'ancien titulaire. Aucun historique public complet ni lien vers un ancien nom réel.

Les documents et rapports d'impact déjà générés restent inchangés (instantanés datés) ; les nouvelles générations utilisent l'identité actuelle. Les pièces de preuve, contacts archivés et journaux nécessaires restent privés et soumis à leurs durées/justifications ; ne pas y propager artificiellement le suffixe. La suppression de compte suit le contrat d'effacement, y compris pour tous les rapports générés.

Actualiser les données et caches autorisés immédiatement après la mutation, sans rechargement intégral inutile ; garantir le retrait du suffixe à échéance y compris sur une session longue et sans nouvelle requête globale périodique. Les caches privés restent isolés par compte. Ne pas rendre les colonnes privées publiques par commodité.

## 5. Interface

Étendre /reglages via AccountSettingsEditor et AccountSettingsView, et converger les autres points d'entrée. Afficher le handle actuel, le champ normalisé, l'aperçu du futur handle et de son suffixe, la date exacte de disparition de la mention et la prochaine date de modification autorisée. En cas de délai actif, indiquer clairement la date et désactiver la modification effective.

Confirmation simple avant enregistrement : le nouveau pseudo apparaît sur les contributions anciennes et futures ; l'ancien pseudo reste visible trois mois ; chaque changement remplace l'ancien affiché ; droits et données restent inchangés. Annulation sans mutation ; conflit et indisponibilité explicites. FR/EN, accessibilité clavier/focus, responsive et trois modes d'affichage. Ne pas exiger de changement de mot de passe ; réauthentification non requise par défaut pour cette mutation non destructive. Respecter le contrat d'authentification existant.

## 6. Séquencement et preuves

- HANDLE-BASE : transaction, délai, transition, réservation, fermeture des écritures directes, préservation du mode et de la synchronisation.
- HANDLE-PROJECTION : owner de projection partagé, consommateurs, recherche, caches et interaction avec l'effacement.
- HANDLE-UI : confirmation, dates, erreurs, réception sur deux sessions et documentation.

Tests : deux utilisateurs convoitant le même handle, réservation concurrente, première modification, no-op, requête refusée, double appel, seuil exact 168 heures, trois mois calendaires (fin de mois et année bissextile), changement successif, retour à son propre handle, expiration exacte, tentative directe SQL/Data API, synchronisation tardive, changement de mode, ancien pseudo en recherche, cache expiré, sessions distinctes, confidentialité, compte effacé, invariants XP/droits/contributions, rapports historiques inchangés. Exécuter preuves PostgreSQL, comportementales et navigateur avec couverture pertinente Web/Mobile. Mettre à jour les fiches CURRENT et la politique de confidentialité à mesure de la réception, sans présenter ce PLAN comme livré.

STOP CONDITION : règle hebdomadaire non contournable, réservation atomique, seul l'ancien immédiat visible trois mois, expiration effective, projection cohérente, aucune modification des relations ou droits, preuves et publication vérifiées.

## 7. Owners existants

Code relu le 28 novembre 2026 : apps/web/src/app/api/users/profile/handle/route.ts, apps/web/src/app/api/users/profile/display-name-mode/route.ts, apps/web/src/lib/auth/sync-handle.ts, apps/web/src/lib/auth/sync-orchestration.ts, apps/web/src/lib/auth/sync-persistence.ts, apps/web/src/lib/authz-identity-names.ts, apps/web/src/app/api/chat/route.shared.ts, apps/web/src/lib/chat/user-search.ts, apps/web/src/lib/gamification/progression/progression-ranking.ts et composants account. Les index d'unicité et les privilèges du schéma lié ont été relus ; les nouvelles règles temporelles et réservations ne sont pas démontrées sur le runtime actuel.
