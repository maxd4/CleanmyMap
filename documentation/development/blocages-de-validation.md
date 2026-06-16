# Blocages de validation

Derniere photographie des verifications lancees apres la correction Dependabot sur `companion-app`.

Etat observe:
- `npm run lint -w apps/web` : passe, avec warnings existants uniquement.
- `npm run typecheck -w apps/web` : echoue encore sur des erreurs de typage et de fixtures.
- `npm run test -w apps/web` : echoue encore sur plusieurs tests, surtout des timeouts et des attentes de contrat non alignees.

## Erreurs restantes

| Verification | Fichier source | Erreur constatee | Nature | Remarque |
| --- | --- | --- | --- | --- |
| Typecheck | `apps/web/src/components/actions/actions-map-canvas.utils.ts` | `LatLngTuple` n'est pas assignable a `[number, number]` | Typage local | Mismatch de tuple, corrigeable sans changement d'API. |
| Typecheck | `apps/web/src/components/admin/free-plan-services-visual.test.ts` | Cle `github` manquante dans les mappings `Record<EnvironmentalImpactInfrastructureServiceKey, ...>` | Fixture / couverture | Le modele a evolue, les tests et la vue doivent connaitre la nouvelle cle. |
| Typecheck | `apps/web/src/components/admin/free-plan-services-visual.tsx` | Cle `github` manquante dans le mapping `Record<EnvironmentalImpactInfrastructureServiceKey, ...>` | Donnee UI manquante | Meme racine que le test: un service a ete ajoute sans extension du tableau de correspondance. |
| Typecheck | `apps/web/src/lib/supabase/client.test.ts` | `afterEach` introuvable | Import de test incomplet | Oubli d'import, sans impact fonctionnel. |
| Test | `apps/web/src/app/api/actions/pollution-score-references/route.test.ts` | Timeout | Performance du test | Le test attend trop longtemps sur la route ou sur son mock. |
| Test | `apps/web/src/app/api/users/profile/display-name-mode/route.test.ts` | Timeout | Performance du test | Meme symptome, probablement une attente async lente ou un mock incomplet. |
| Test | `apps/web/src/app/api/community/rsvps/route.test.ts` | Timeout | Performance du test | Le flux de test reste bloque avant l'assertion. |
| Test | `apps/web/src/app/api/chat/users/route.test.ts` | Timeout | Performance du test | La route ou les mocks prennent trop de temps a se stabiliser. |
| Test | `apps/web/src/app/api/gamification/badges/[userId]/route.test.ts` | Timeout | Performance du test | Entree/sortie asynchrone trop lente pour le timeout par defaut. |
| Test | `apps/web/src/app/api/actions/route.submit.test.ts` | `resolveActionCreationStatus` absent du mock, reponse `500` au lieu de `201` | Contrat de mock | Le test attend une exportation qui n'est plus fournie par le mock courant. |
| Test | `apps/web/src/app/api/actions/group-join/route.test.ts` | `participantsCount` et `participationStatus` different des attentes | Contrat fonctionnel | Le comportement courant de la route ne renvoie plus les anciennes valeurs attendues par le test. |
| Test | `apps/web/src/lib/client-boundary.test.ts` | Timeout | Verification de frontieres | Parcours de fichiers volumineux et lent. |
| Test | `apps/web/src/app/server-translation-boundary.test.ts` | Timeout | Verification de frontieres | Meme cause, exploration de l'arborescence trop lente pour le timeout actuel. |
| Test | `apps/web/src/app/api-boundary.test.ts` | Timeout | Verification de frontieres | Le scan de routes depasse la fenetre de 5 s. |
| Test | `apps/web/src/components/client-boundary.test.ts` | Timeout | Verification de frontieres | Meme famille de test, meme probleme de duree. |
| Test | `apps/web/src/lib/vercel-regression-gates.test.ts` | Baseline de routes API en decalage avec l'ajout de `apps/web/src/app/api/gamification/quiz/progress/route.ts` | Baseline / gouvernance | Le gate constate une route nouvelle non encore integree au baseline. |
| Test | `apps/web/src/components/sections/rubriques/free-plan-services-methodology-visual.test.ts` | `noteLabel` absent sur plusieurs lignes attendues | Donnees de visualisation | La source de donnees ou le composant ne produit plus les notes esperes par le test. |

## Ce qui demanderait un breaking change

La plupart des ecarts ci-dessus sont des drifts de typage, de mocks ou de tests. Ils peuvent etre corriges sans casser l'API publique.

Les cas suivants deviennent contractuels et peuvent exiger un breaking change si on veut revenir a l'ancien comportement:

1. `apps/web/src/app/api/actions/group-join/route.ts`
   - Le test attend encore `participationStatus = "confirmed"` et `participantsCount = 1`.
   - Le comportement courant ne fournit plus cette semantique.
   - Restaurer ces valeurs pour tous les appels changerait le contrat de la route API et le sens metier de la participation.

2. `apps/web/src/lib/vercel-regression-gates.test.ts`
   - Le baseline ne connait pas encore `apps/web/src/app/api/gamification/quiz/progress/route.ts`.
   - Supprimer cette route pour faire passer le gate serait une suppression d'endpoint, donc un changement cassant.
   - La voie non cassante est de valider l'ajout comme intentionnel, puis de refresher le baseline de facon explicite.

## Commandes lancees

- `npm run typecheck -w apps/web`
- `npm run lint -w apps/web`
- `npm run test -w apps/web`

## Lecture rapide

- Le correctif Dependabot est bien en place.
- Les blocages restants sont surtout du drift de tests et de typage.
- Aucun de ces ecarts n'oblige a toucher au patch `shell-quote` lui-meme.
