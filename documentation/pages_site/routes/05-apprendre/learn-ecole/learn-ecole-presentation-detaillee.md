# Mode École — Présentation détaillée

## Objectif

Donner à un enseignant ou animateur un kit immédiatement utilisable pour une séance collective autour des déchets, de l'environnement et des comportements.

## Parcours

```mermaid
flowchart TD
  A[Arrivée sur /learn/ecole] --> B[Choisir le niveau]
  B --> C[Choisir le format]
  C --> D[Lancer le mode École]
  A --> E[Lancer la démo]
  A --> F[Consulter les fiches et le déroulé]
  D --> G[/learn/sentrainer mode=ecole level=... format=quiz-30]
  D --> H[/learn/sentrainer mode=ecole level=... format=atelier-60]
```

## Contenu actuel

### Introduction

Quatre repères :

- public visé ;
- durée ;
- absence de compte élève ;
- fonctionnement classe entière.

### Lancement

Le lancement est prioritaire et propose d'abord le niveau (`6e`, `5e`, `4e` ou
`3e`), puis le format :

- ouvrir le mode École ;
- lancer la démo.

### Aides de séance

- fiche enseignant ;
- fiche élève.

Ces aides viennent après le bloc de lancement. La banque détaillée reste
repliée et placée en dernier : elle sert à préparer ou prolonger une séance,
mais n'est pas une étape préalable au choix du niveau et au lancement.

### Banque

Le code expose une banque partagée, répartie en quatre tracks internes. Le
professeur ne choisit pas un track : le moteur compose le lot selon le niveau.
Le format `quiz-30` lance la séance courte. Le format `atelier-60` enchaîne un
pré-quiz de 15 minutes, une séquence pédagogique de 30 minutes, un post-quiz de
15 minutes et un bilan collectif.

Dans `atelier-60`, le pré-quiz contient huit items couvrant les connaissances,
idées reçues, ordres de grandeur et décisions. Le post-quiz reprend les mêmes
huit concepts avec des formulations différentes et ajoute deux situations de
transfert. Le bilan calcule uniquement les taux collectifs avant/après, la
progression, les notions retenues ou fragiles, puis trois actions possibles
dans le collège. Ces données restent en mémoire dans le navigateur.

Le bilan peut aussi proposer jusqu’à trois prolongements validés en
Île-de-France, avec Paris prioritaire : l’Académie du Climat est une piste
possible, au même titre que la Maison Paris Nature ou un lieu ressource
« Apprendre dehors ». Il ne s’agit pas de partenaires CleanMyMap ; la
programmation, les modalités d’accueil et les inscriptions sont à vérifier sur
les sites officiels.

La séquence centrale est composée par le domaine scolaire pour le niveau choisi.
Elle part de la définition d’un éco-citoyen, passe par les habitudes utiles
(déchets, consommation, alimentation, mobilité, eau, énergie et numérique),
propose une activité scientifique ou de calcul, relie l’individu à la classe,
au collège puis au territoire, et se termine par une action concrète. Les
profils de niveau précisent le degré de difficulté et les compétences mobilisées
sans revendiquer d’alignement officiel aux programmes scolaires.

Les activités supportent les formats QCM raisonné, estimation, calcul, lecture
de graphique, comparaison, critique de source et situation-problème. La
composition est déterministe, équilibrée par les tracks internes et exclut les
éléments `needsReview`.

L’état de l’atelier et les réponses restent locaux et anonymes pendant la
séance. Ils ne sont pas placés dans l’URL et ne sont pas persistés comme
données personnelles.

Les statuts de questions permettent notamment de distinguer :

- source disponible ;
- vérification nécessaire.

## Données personnelles

La page annonce :

```txt
Sans compte élève
Pas de connexion élève
Pas de donnée personnelle
```

Toute future fonctionnalité de suivi individuel doit donc déclencher une revue :

- produit ;
- confidentialité ;
- sécurité ;
- documentation.

## Accessibilité

À vérifier lors d'une revue UI explicite :

- focus clavier ;
- ordre de lecture ;
- contraste ;
- intitulés des CTA ;
- liens externes ;
- annonces des statuts « à vérifier ».

## Performance

La page doit rester légère.

Éviter :

- appels serveur inutiles ;
- chargement de médias lourds ;
- dépendances supplémentaires pour un simple affichage ;
- animations décoratives.

## Sécurité éditoriale

Chaque question doit avoir un état clair :

- vérifiée ;
- source attachée ;
- à vérifier.

Ne pas masquer une incertitude.

## Sources de vérité

```txt
apps/web/src/app/learn/ecole/page.tsx
apps/web/src/components/learn/quiz/quiz-school-kit-page.tsx
apps/web/src/components/learn/quiz/school/quiz-school-level-launcher.tsx
apps/web/src/components/learn/quiz/school/quiz-school-session-guide.tsx
apps/web/src/components/learn/quiz/school/quiz-school-bank-section.tsx
apps/web/src/components/learn/quiz/session/use-quiz-session-controller.ts
apps/web/src/lib/learning/quiz/school/quiz-school-kit.ts
apps/web/src/lib/learning/quiz/school/quiz-school-types.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-state.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-activities.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-assessment.ts
apps/web/src/lib/learning/quiz/school/quiz-school-workshop-summary.ts
apps/web/src/lib/learning/quiz/school/quiz-school-territorial-resources.ts
documentation/pages_site/INDEX.md
documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md
```
