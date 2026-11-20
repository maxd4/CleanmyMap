# LOT 14 : Attestation salariée et partage volontaire d'engagement

Type : lot XL. Statut : PLAN, à exécuter après le complément pédagogique 10. Lire le contrat scientifique `01` §12 et §15 ainsi que le cadre `17`. Ne pas réexécuter les lots précédents.

**Constat sur main au 20/11/2026 :** `apps/web/src/lib/actions/engagement-proof-projection.ts` et `engagement-dossier-markdown.ts` établissent déjà un dossier personnel ; `apps/web/src/components/profil/engagement/engagement-attestation-pdf-section.tsx` fournit un modèle PDF **vierge à signer par la structure**, non une attestation officiellement signée. Le lot 11 prévoit des parts personnelles figées par révision. Aucun droit général employeur sur un compte salarié n'est établi.

## Objectif

Permettre à un salarié de produire une preuve personnelle de collecte et de la transmettre **sélectivement** à sa hiérarchie ou à un partenaire, sans ouvrir son profil privé et sans transférer la part au destinataire. Ce lot ne crée pas de tableau RSE collectif ni d'affectation à une entreprise.

## Jalon 1 : preuve personnelle canonique

- Étendre la projection de preuves d'engagement existante en consommant **en lecture seule** la révision effective des parts personnelles du lot 11, avec `actionId`, identifiant de participation, date, organisateur vérifiable, statut final, kg hors mégots, nombre de mégots, provenance `individual|quote_part|unavailable`, facteur/version et éligibilité. `quote_part` signifie estimation attribuée, jamais pesée individuelle. Aucune duplication persistée des faits terrain.
- Éligibilité : action réelle, finalisée, approuvée, publiée, publique, visible, non annulée, participation finale confirmée ; une absence de preuve, une source incohérente ou une lecture incomplète reste `NA`. Dédupliquer la preuve par action, utilisateur et métrique dans la révision effective. Afficher historique corrigé sans prétendre à une mesure immuable erronée.
- Réutiliser le modèle d'attestation associative existant et le dossier bénévole. Produire une **attestation de données CleanMyMap**, distincte de la version officielle à signer ; titre, provenance, date/version, statut et avertissement d'absence de signature tierce visibles. Ne pas fabriquer une identité de signataire, une durée horaire individuelle ou une certification.

## Jalon 2 : partage limité et contrôle utilisateur

- Par défaut aucun partage. Permettre de sélectionner une période, des actions et des champs de la preuve ; générer une vue ou un document minimal sans tokens, prompts, coûts IA, employeur déduit, historique de challenge ou données des autres participants. Partage par lien à durée limitée ou par téléchargement explicite ; ne pas supposer que le destinataire est autorisé par son seul nom d'entreprise.
- Réutiliser les mécanismes de partage de PDF et de révocation de `apps/web/src/lib/reports/` **uniquement si leurs contrats autorisent réellement le nouveau type de document** ; sinon prévoir la plus petite adaptation sûre, isolée des rapports publics. Jeton opaque, stockage server-only, expiration, révocation et `no-store`. Aucun document privé dans la bibliothèque publique des rapports.
- Expliquer à l'utilisateur qu'un PDF téléchargé ne peut plus être révoqué chez le destinataire. Pour un document servi par CleanMyMap, afficher un état de validité courant ; un document d'une révision remplacée devient `superseded` et ne prétend plus être à jour. Révocation ne modifie pas la collecte ni l'XP.

## Jalon 3 : parcours et vie privée

- Point d'entrée depuis `/profil` ou `/dashboard` et lien secondaire depuis `/learn/empreinte-ia` ; ne pas créer de compte ou groupe « employeur » implicite. UX fr/en, modes d'affichage, mobile responsive, clavier, état vide/NA et explication « partage ≠ affectation de la part ».
- Ajouter les seuls contrats AuthN/AuthZ, migrations et droits strictement nécessaires aux partages si non couverts par les owners existants, jamais de table alternative de kg/mégots. Gérer idempotence, révocation, suppression du compte, concurrence et protection contre lecture d'un document d'un autre utilisateur.
- Mettre à jour les fiches CURRENT des pages et la documentation de preuve et de sécurité sans dupliquer la gouvernance générale.

## Validation

Tests des preuves mesurées/estimées, action annulée ou historique reconstruit, correction de quote-part, `NA`, provenance et version, absence de création au GET ; exports expurgés de tokens, prompts, identifiants internes et données de tiers ; partage/retrait/expiration, double propriétaire A/B, ID falsifié, absence d'accès anonyme non autorisé et non-publication en bibliothèque. PostgreSQL RLS/grants exécuté lorsque applicable, E2E navigateur, responsive, accessibilité, fr/en, trois modes, typecheck/lint/coverage pertinente. Distinguer preuve statique, exécution et production.

## STOP CONDITION

Un compte peut sélectionner ses participations admissibles, produire un dossier traçable, le partager à un destinataire choisi puis révoquer l'accès hébergé, sans donner accès aux usages IA privés ni modifier le bénéficiaire, l'impact physique, les badges ou l'XP.