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

La page sert de point d’entrée public pour une séance de 30 minutes adaptée au niveau choisi entre la 6e et la 3e.

Elle permet de :

- choisir un niveau de 6e, 5e, 4e ou 3e avant de lancer le mode École ;
- lancer une séance publique de 15 questions réparties automatiquement entre les catégories internes ;
- sélectionner une banque unique où chaque question déclare ses niveaux éligibles, sa difficulté et les compétences mobilisées ;
- préparer une séance collective ;
- consulter une fiche enseignant ;
- utiliser une fiche élève ;
- parcourir une banque initiale de questions ;
- conserver un fonctionnement sans compte professeur, sans compte élève, sans nom d’élève et sans donnée personnelle.

## Repères actuels

```txt
Public visé : 6e | 5e | 4e | 3e
Durée cible : 30 min
Questions par séance : 15
Diversification interne : 4 catégories
Compte professeur ou élève : non requis
```

Ces valeurs viennent du code actuel et doivent être mises à jour si le contrat change.

## CTA principaux

```txt
/learn/sentrainer?mode=ecole&level=6e
/learn/sentrainer?mode=ecole&level=5e
/learn/sentrainer?mode=ecole&level=4e
/learn/sentrainer?mode=ecole&level=3e
/learn/sentrainer?mode=demo
```

`level` est borné au contrat canonique `QuizSchoolLevel`. Une valeur absente ou
invalide retombe sur `4e` pour préserver les anciens liens École ; le paramètre
`track` reste accepté pour compatibilité mais ne constitue plus un choix public.

## Fichiers liés

- `learn-ecole-presentation-detaillee.md`
- `learn-ecole-liste-propositions-a-traiter.md`
- `learn-ecole-objectifs-non-pertinents.md`

## Code principal

```txt
apps/web/src/app/learn/ecole/page.tsx
apps/web/src/components/learn/quiz/quiz-school-kit-page.tsx
apps/web/src/components/learn/quiz/quiz-school-level-launcher.tsx
apps/web/src/lib/learning/quiz/quiz-school-types.ts
apps/web/src/lib/learning/quiz/quiz-selection-engine.ts
apps/web/src/components/learn/quiz/quiz-school-modes.tsx
apps/web/src/lib/learning/quiz/quiz-school-kit.ts
```

## Notes

- La page utilise `LearnRubricShell`.
- La palette attendue est celle du bloc Apprendre.
- Les questions nécessitant une vérification doivent rester signalées explicitement.
- Les questions `needsReview` sont exclues des séances publiques, même si elles restent visibles dans les outils de revue de la banque.
- Une source externe doit être réelle et traçable.
- La progression 6e → 3e est une catégorisation pédagogique interne du quiz, pas un alignement officiel aux programmes scolaires.
- La page ne doit pas recueillir de donnée personnelle d'élève si elle continue d'annoncer « sans compte élève ».
- Les catégories `debat-classe`, `mission-terrain`, `ordres-de-grandeur` et
  `gestes-du-quotidien` servent à équilibrer la séance en interne ; elles ne
  sont pas proposées comme choix principal.
- Une question peut être éligible à plusieurs niveaux sans être recopiée : le
  contrat porte les profils de difficulté et de compétences par niveau, tandis
  que le texte de la question reste unique.
- Le lancement conserve la démo `mode=demo`. Les liens historiques avec
  `mode=ecole&track=...` retombent sur le niveau `4e` et restent utilisables.
