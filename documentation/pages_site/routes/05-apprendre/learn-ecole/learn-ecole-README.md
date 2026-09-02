# Mode École

Page pédagogique publique pour préparer et lancer un atelier collectif CleanMyMap en classe.

## Route

```txt
/learn/ecole
```

## Statut

- accès : public ;
- famille : Apprendre ;
- palette : yellow / amber ;
- type : page éducative ;
- source principale : `apps/web/src/app/learn/ecole/page.tsx`.

## Rôle

La page sert de point d’entrée public pour une séance adaptée au niveau choisi entre la 6e et la 3e. Le professeur choisit ensuite le format `quiz-30` ou `atelier-60`.

Elle permet de :

- choisir un niveau de 6e, 5e, 4e ou 3e avant de lancer le mode École ;
- choisir un format : `quiz-30` pour le quiz collectif court ou `atelier-60` pour `pré-quiz 15 min → atelier 30 min → post-quiz 15 min` ;
- dérouler automatiquement, dans les 30 minutes d’atelier, une progression
  d’éco-citoyenneté : définition, habitudes utiles, activité scientifique ou
  calcul, changement d’échelle jusqu’au territoire, puis action concrète à
  retenir ;
- lancer une séance publique de 15 questions réparties automatiquement entre les catégories internes ;
- pour `atelier-60`, mesurer localement 8 concepts avant puis 10 items après,
  dont deux situations de transfert, avec taux avant, taux après, progression
  et notions collectives à retenir ou à revoir ;
- sélectionner une banque unique où chaque question déclare ses niveaux éligibles, sa difficulté et les compétences mobilisées ;
- préparer une séance collective ;
- consulter une fiche enseignant ;
- utiliser une fiche élève ;
- ouvrir ensuite, si nécessaire, les détails de la banque de questions ;
- conserver un fonctionnement sans compte professeur, sans compte élève, sans nom d’élève et sans donnée personnelle.

## Repères actuels

```txt
Public visé : 6e | 5e | 4e | 3e
Formats : quiz-30 | atelier-60
Durée cible : 30 min ou 60 min
Questions par séance : 15 pour `quiz-30` ; 8 avant et 10 après pour `atelier-60`
Diversification interne : 4 catégories
Compte professeur ou élève : non requis
```

Ces valeurs viennent du code actuel et doivent être mises à jour si le contrat change.

## CTA principaux

```txt
/learn/sentrainer?mode=ecole&level=6e&format=quiz-30
/learn/sentrainer?mode=ecole&level=5e&format=quiz-30
/learn/sentrainer?mode=ecole&level=4e&format=quiz-30
/learn/sentrainer?mode=ecole&level=3e&format=quiz-30
/learn/sentrainer?mode=ecole&level=4e&format=atelier-60
/learn/sentrainer?mode=demo
```

`level` est borné au contrat canonique `QuizSchoolLevel`. Une valeur absente ou
invalide retombe sur `4e` pour préserver les anciens liens École ; le paramètre
`track` reste accepté pour compatibilité mais ne constitue plus un choix public.
`format` est borné au contrat `QuizSchoolFormat`; une valeur absente ou invalide
retombe sur `quiz-30`. Les réponses ne sont jamais encodées dans l’URL.

Pour `atelier-60`, l’état de phase et les réponses collectives restent
uniquement en mémoire dans le navigateur : pré-quiz, séquence pédagogique,
post-quiz puis bilan. Aucun nom, compte, classe nominative ou classement n’est
nécessaire.

## Fichiers liés

- `learn-ecole-presentation-detaillee.md`
- `learn-ecole-liste-propositions-a-traiter.md`
- `learn-ecole-objectifs-non-pertinents.md`

## Code principal

```txt
apps/web/src/app/learn/ecole/page.tsx
apps/web/src/components/learn/quiz/quiz-school-kit-page.tsx
apps/web/src/components/learn/quiz/school/quiz-school-level-launcher.tsx
apps/web/src/components/learn/quiz/school/quiz-school-picker.tsx
apps/web/src/components/learn/quiz/school/quiz-school-session-guide.tsx
apps/web/src/components/learn/quiz/school/quiz-school-bank-section.tsx
apps/web/src/components/learn/quiz/school/quiz-school-workshop-session.tsx
apps/web/src/components/learn/quiz/session/use-quiz-session-controller.ts
apps/web/src/lib/learning/quiz/school/quiz-school-types.ts
apps/web/src/lib/learning/quiz/quiz-selection-engine.ts
apps/web/src/components/learn/quiz/school/quiz-school-modes.tsx
apps/web/src/lib/learning/quiz/school/quiz-school-kit.ts
apps/web/src/lib/learning/quiz/school/quiz-school-eligibility.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-state.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-activities.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-assessment.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-summary.ts
apps/web/src/lib/learning/quiz/school/quiz-school-territorial-resources.ts
apps/web/src/lib/learning/quiz/quiz-session-summary.ts
apps/web/src/lib/learning/quiz/school/README.md
```

## Notes

- La page utilise `LearnRubricShell`.
- La palette attendue est celle du bloc Apprendre.
- Les questions nécessitant une vérification doivent rester signalées explicitement.
- Les questions `needsReview` sont exclues des séances publiques, même si elles restent visibles dans les outils de revue de la banque.
- Une source externe doit être réelle et traçable.
- La progression 6e → 3e est une catégorisation pédagogique interne du quiz, pas un alignement officiel aux programmes scolaires.
- Les profils 6e/5e/4e/3e de la séquence `atelier-60` sont une adaptation
  pédagogique interne : ils ne constituent pas un alignement officiel aux
  programmes scolaires.
- Les activités publiques sont typées (`QCM raisonné`, estimation, calcul,
  lecture de graphique, comparaison, critique de source, situation-problème),
  durées et compétences comprises. Leur composition vise 30 minutes et
  exclut tout contenu marqué `needsReview`.
- La page ne doit pas recueillir de donnée personnelle d'élève si elle continue d'annoncer « sans compte élève ».
- Les catégories `debat-classe`, `mission-terrain`, `ordres-de-grandeur` et
  `gestes-du-quotidien` servent à équilibrer la séance en interne ; elles ne
  sont pas proposées comme choix principal.
- La banque et ses détails restent en aval du lancement et des fiches : le
  professeur choisit d’abord le niveau, puis lance la séance sans parcourir la
  banque complète.
- Une question peut être éligible à plusieurs niveaux sans être recopiée : le
  contrat porte les profils de difficulté et de compétences par niveau, tandis
  que le texte de la question reste unique.
- Le pré/post de `atelier-60` mesure des résultats collectifs uniquement. Les
  huit concepts sont repris avec des formulations différentes au post-quiz,
  complétés par deux situations de transfert ; aucune réponse n’est envoyée
  ni encodée dans l’URL.
- Le bilan propose trois notions, trois actions possibles dans le collège et
  jusqu’à trois ressources validées d’Île-de-France, Paris étant prioritaire.
  Les lieux et programmes sont des prolongements possibles, jamais des
  partenariats CleanMyMap ; disponibilités, tarifs et réservations doivent être
  revérifiés sur leurs sites officiels.
- Le lancement conserve la démo `mode=demo`. Les liens historiques avec
  `mode=ecole&track=...` retombent sur le niveau `4e` et restent utilisables.
