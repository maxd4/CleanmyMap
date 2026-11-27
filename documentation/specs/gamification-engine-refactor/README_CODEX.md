# Refonte du moteur de gamification (hors refonte UI)

**Statut : CANDIDATE / réception requise.** Sources runtime lues au SHA 492c24d9f6dc8b6220da5a8403b204ff529681b2, premier candidat publié à ce SHA ; BASE_FILES.json conserve les blobs exacts lus initialement à 2acc756a6e2994ed012965c23fe41bdc10ffda6f, inchangés sur les destinations. Ne pas imposer un checkout historique.

## Décisions et jalons

RESTRUCTURE_FIRST pour les responsabilités entremêlées ; EXTEND_EXISTING pour les défauts de preuve démontrés. Le programme GAME de l'interface reste distinct. Le candidat consolidé comprend 58 fichiers complets (39 runtime, 13 tests, 6 documents).

1. Registre : isoler catalogue et classification, conserver exports historiques ; consommateurs directs identifiés migrés.
2. Réconciliation : séparer contrat, calcul du reçu et stockage des notifications. Préserver finalisation conditionnelle scientifique, propriétaire, idempotence et relecture du gagnant.
3. Légendes : fenêtre civile, classement pur, loader Supabase/Clerk, façade stable.
4. Types : découper les contrats catalogue, sources, niveaux et DTO ; aucune identité, export ni shape HTTP supprimée.
5. Reconstruction : indexer les faits par mécanique sans changer le résultat, l'ordre des règles, la déduplication ou les filtres par type et scope.
6. Catalogue/classement : isoler la projection commune des paliers du loader privé ; isoler agrégation des badges du batch paginé et converger sur la liste des progressions de base. Les critères de formes et les règles de sélection du classement restent inchangés.
7. Parrainage : réutiliser la sélection de première preuve CURRENT admissible dans les deux voies ; la voie incrémentale choisissait la plus récente, la reconstruction la première. Conserver la preuve existante encore admissible sans nouveau crédit ; lors de création/remplacement choisir la première. Date canonique d'action, puis date de filiation, puis fallback déterministe. Séparer modèle pur de lignage et accès RPC.
8. Intégrité : les erreurs de lecture des organisateurs, participants, filleuls, zones propres et dossiers de modération ne doivent pas produire de faux inventaires vides dans une réconciliation. La lecture de zone propre strictement requise est distincte du best-effort d'affichage. Les lectures nécessaires échouent avant le plan d'écriture.
9. Modération : le reconstructeur ne produisait aucun palier au-delà de 20 alors que les écritures et la projection d'état en reconnaissaient tous les 5 dossiers après 20. Convergence sur un helper de seuil canonique. Chaque palier reconstruit garde la date du dossier correspondant.
10. Documentation : intégrer les six documents candidats avec le code ; maintenir la fiche route-first et l'index d'owners.

## Compatibilités et limites de l'analyse

- Les façades `progression.ts`, `progression-data.ts`, `progression-types.ts`, `types.ts` et les chemins historiques sont conservés. Les anciens événements Forms, zones sensibles, points et fonctions historiques ont des consommateurs, preuves ou contrats de compatibilité. Aucune suppression de code mort non démontrée.
- Risque distinct non résolu : les limites de certaines requêtes (notamment .limit(10000), .limit(6000) et .limit(5000)) ne prouvent pas l'exhaustivité réelle du corpus PostgREST. Ne pas exécuter de reconstruction globale de production sur cette seule preuve. Prévoir une vérification de pagination des preuves avec contrat et tests multi-pages avant toute évolution de données.
- La résolution d'identité générale peut retourner un rôle bénévole de fallback après un échec Clerk ; le mécanisme ne permet pas ici de distinguer cette indisponibilité d'une vraie inapplicabilité de modération. Ne pas changer l'AuthZ sans revue du propriétaire. Le risque d'omission lié à l'identité et le comportement au changement de rôle restent à qualifier avant une reconstruction globale.
- Les compteurs SQL et le batch public expriment des critères d'éligibilité potentiellement divergents (notamment ownership du créateur, validation de formulaire et cardinalité). Le SQL versionné de 20260924 et les requêtes TS sont distincts ; l'égalité sémantique et l'état de la DB liée ne sont pas prouvés. Ne pas réécrire les règles ou les migrations dans cette extraction ; valider par comparaison sur des fixtures et engager un lot SQL distinct si divergence CURRENT confirmée.
- Le chemin incrémental de parrainage conserve sa séquence delete/insert/refresh. L'atomicité sur ce chemin et la course de revendication du code (update conditionnel sans retour de ligne) ne sont pas démontrées. Aucun élargissement de ce candidat aux contrats d'authentification ou SQL.

## Intégration et invariants

BASE_FILES.json indique chaque chemin, son blob de base (null si nouveau) et les lignes candidates. Intégrer les deltas en préservant le checkout et les writers concurrents. Ne pas copier de candidat dans le runtime sans la réception. Les signatures, noms d'événements, payloads, seuils déclarés, règles de non-gamification, confidentialité, grants, transactions SQL et identités de badge restent inchangés ; les corrections ci-dessus rétablissent les preuves des règles existantes. Le mobile consomme les mêmes interfaces HTTP ; aucune modification mobile.

## Preuves obtenues et manquantes

- Lecture des sources et tests ; comparaison des ancres, inventaire et blobs Git. Contrôle ciblé des motifs de secrets et encodage.
- EXECUTED_BEHAVIOR isolé : le code TypeScript exact de la reconstruction candidate (blob 4c3ee8bbd530abde45bd2597865a0af307e4039c) et du code publié (blob b82d0c15d22498d122dd9b52e6f7a4fce0dc9852) a été reproduit localement, vérifié par git hash-object, puis exécuté par Node 22.16.0 --experimental-strip-types. 1000 scénarios différentiels déterministes (seed 123456789, mécanique/type/scope/statut/XP/badge/doublons) ont produit des objets strictement égaux ; contrôle de rejet d'identité étrangère PASS. Ce test n'exécute pas les dépendances du workspace ni le runtime intégré.
- Le dépôt n'est pas joignable depuis le conteneur (git ls-remote : Could not resolve host). HOOK_NOT_AVAILABLE ; typecheck, lint, Vitest, couverture, qualité structurelle et preuve DB du candidat intégré : NOT_RUN / NOT_MEASURED / DB_SEMANTICS_NOT_EXECUTED. La CI du premier commit candidat a réussi sans intégrer les fichiers runtime ; elle ne valide pas le moteur candidat.

## Réception

Intégrer par dépendances : types et registre ; projection et reconstruction ; reçus/territorial ; parrainage et intégrité des preuves ; docs. Exécuter les tests de progression, réconciliation, territorial, referrals, badges, routes API, profils/dashboard, scripts, consommateurs et frontières. Valider en particulier paliers 20/24/25/29/30, premier filleul et remplacement de preuve, refus d'inventaire incomplet avant la RPC ledger, règles de non-gamification, comparaison des exports, conflits et consentements. Contrôler les consommateurs de mocks, typecheck, lint, couverture Web pertinente, cycles, duplication, complexité, top-heavy et docs. Ne pas modifier les baselines. Aucun SQL distant ou déploiement requis pour ce candidat.

STOP CONDITION : tous les candidats sont intégrés au checkout actuel, preuves comportementales et structurelles du périmètre obtenues, docs CURRENT alignés et publication sur main vérifiée ; retirer les candidats consommés. Les limites SQL/AuthZ et de pagination ci-dessus ne deviennent pas des résultats validés : elles doivent être traitées séparément avant reconstruction globale de production si elles sont confirmées.
