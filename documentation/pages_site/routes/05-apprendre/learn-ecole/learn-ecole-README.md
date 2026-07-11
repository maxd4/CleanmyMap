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

La page sert de kit d'atelier pour les classes, avec un cadrage actuel centré sur les élèves de 4e et 3e.

Elle permet de :

- lancer le mode École du quiz ;
- préparer une séance collective ;
- consulter une fiche enseignant ;
- utiliser une fiche élève ;
- parcourir une banque initiale de questions ;
- conserver un fonctionnement sans compte élève.

## Repères actuels

```txt
Public visé : 4e et 3e
Durée conseillée : 30 à 45 min
Questions test : 20
Sous-modes : 4
Questions par sous-mode : 5
Compte élève : non requis
```

Ces valeurs viennent du code actuel et doivent être mises à jour si le contrat change.

## CTA principaux

```txt
/learn/sentrainer?mode=ecole&track=debat-classe&collective=1
/learn/sentrainer?mode=demo
```

## Fichiers liés

- `learn-ecole-presentation-detaillee.md`
- `learn-ecole-liste-propositions-a-traiter.md`
- `learn-ecole-objectifs-non-pertinents.md`

## Code principal

```txt
apps/web/src/app/learn/ecole/page.tsx
apps/web/src/components/learn/quiz-school-kit-page.tsx
apps/web/src/components/learn/quiz-school-modes.ts
apps/web/src/lib/learning/quiz-school-kit.ts
```

## Notes

- La page utilise `LearnRubricShell`.
- La palette attendue est celle du bloc Apprendre.
- Les questions nécessitant une vérification doivent rester signalées explicitement.
- Une source externe doit être réelle et traçable.
- La page ne doit pas recueillir de donnée personnelle d'élève si elle continue d'annoncer « sans compte élève ».
