# Interface interne de revue de la banque de quiz

Cette page décrit l&apos;interface admin réservée à la revue de la banque de questions du quiz CleanMyMap.

Accès:
- route: `/admin/quiz-bank`
- visibilité: administrateurs uniquement
- mode de fonctionnement: lecture et audit uniquement tant qu&apos;aucun éditeur persistant n&apos;est branché

Objectif:
- relire les questions sans parcourir le code;
- filtrer par mode, type pédagogique, compétence, difficulté, trap level, source et statut `needsReview`;
- repérer d&apos;abord les questions à relire, les questions trop évidentes et les questions sans source;
- préparer les corrections avant réintégration dans la banque.

Lecture de la page:
- les questions sont triées par priorité éditoriale;
- les questions signalées `needsReview` remontent en tête;
- les sources faibles, vagues ou absentes sont signalées explicitement;
- les questions évidentes ou trop directives sont marquées comme à retravailler;
- chaque carte affiche la réponse attendue, l&apos;explication et le rappel de la source.

Filtres:
- mode de quiz;
- type pédagogique;
- compétence;
- difficulté;
- niveau de piège;
- type de source;
- état de source;
- `needsReview`.

Règles de correction:
- une question sans source doit être complétée avant publication;
- une question locale doit être signalée avec le bon périmètre;
- une question trop évidente doit être reformulée pour faire hésiter;
- une explication doit enseigner un mécanisme ou une conséquence, pas seulement répéter la réponse;
- une source interne ou en estimation doit rester explicitement marquée.

Références:
- [Guide d&apos;authoring du quiz](./quiz-authoring-guide.md)
- [Contrôle qualité des questions du quiz](./quiz-quality-control.md)

