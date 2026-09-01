# Principes Kaizen

## 1. Amélioration continue, pas perfectionnisme

Aucune partie du projet n'est considérée comme parfaite ou définitivement figée. En revanche, toute modification doit répondre à une valeur démontrable.

Le Kaizen signifie : observer, comprendre, améliorer par petites décisions vérifiables, puis mesurer ou valider le résultat.

Il ne signifie pas : ajouter des fonctionnalités, dépendances, animations, abstractions ou refactors parce qu'ils paraissent plus modernes.

## 2. Le périmètre reste une contrainte

Une tâche ciblée reste ciblée.

Pendant un chantier :

- corriger ce qui est nécessaire à la cause racine ;
- intégrer une amélioration adjacente uniquement si elle est indispensable à la robustesse ou au contrat modifié ;
- ne pas réécrire une zone indépendante au nom de l'amélioration continue ;
- signaler séparément les opportunités hors périmètre.

Le Kaizen ne contourne jamais l'allowlist logique d'un lot.

## 3. Ordre des priorités

Avant toute amélioration Kaizen, privilégier :

1. sécurité, AuthN/AuthZ, secrets et intégrité des données ;
2. erreurs runtime ou comportement incorrect ;
3. régressions et tests critiques manquants ;
4. contrats métier et backlog explicitement actifs ;
5. refactors nécessaires pour rendre la correction sûre ;
6. amélioration incrémentale de qualité, UX, performance ou maintenance.

Une amélioration décorative ne passe jamais devant une dette de sûreté ou de correction.

## 4. Preuve avant proposition

Toute action Kaizen doit partir d'une preuve observable, par exemple :

- code ou logique dupliqués ;
- erreur ou warning reproductible ;
- test absent sur un cas critique ;
- branche morte ou contrat contradictoire ;
- état UI manquant ;
- donnée non sourcée ;
- mesure de performance ;
- friction issue d'un parcours réel ;
- document actif contredisant le code courant.

Ne pas inventer de métrique, seuil, source scientifique, composant, API, dépendance ou gain attendu.

## 5. Exactitude et robustesse d'abord

Une simplification n'est bonne que si elle préserve le comportement attendu et les invariants.

Préférer :

- la cause racine au contournement ;
- une frontière explicite à un cast aveugle ;
- un type métier précis à `any` ou à un `Record<string, unknown>` diffus ;
- une validation à l'entrée à une propagation d'ambiguïté ;
- l'idempotence et le fail-closed sur les opérations sensibles ;
- un test qui couvre le contrat à une assertion superficielle.

## 6. Dette technique proportionnée

La dette technique doit être traitée quand elle :

- augmente le risque du changement courant ;
- produit des régressions répétées ;
- masque une frontière métier claire ;
- empêche des tests fiables ;
- complique excessivement une zone fréquemment modifiée.

La taille seule ne justifie pas une extraction. Une micro-abstraction qui ne clarifie aucune responsabilité peut augmenter la dette au lieu de la réduire.

## 7. UI et UX : sens avant décoration

Une amélioration UI doit répondre à un besoin de compréhension, d'accessibilité, de hiérarchie, de feedback ou d'efficacité.

Ne pas appliquer par défaut :

- animations ;
- gamification ;
- graphiques ;
- glassmorphism ;
- suppression systématique du clavier ;
- nouvelles bibliothèques visuelles ;
- effets dits « premium » sans problème démontré.

Consulter le design system et la fiche de page concernée. Respecter les modes d'affichage, l'accessibilité et `prefers-reduced-motion` lorsque le mouvement est réellement justifié.

## 8. Données et science

Une valeur scientifique ou environnementale doit conserver :

- sa source ou sa justification ;
- ses hypothèses ;
- son unité ;
- son domaine de validité ;
- la distinction entre mesure, dérivation et proxy lorsque pertinente.

Ne jamais créer un chiffre pour rendre une proposition plus convaincante.

## 9. Performance

Optimiser après avoir caractérisé le comportement.

Une proposition de cache, memoïsation, parallélisation, pagination ou changement d'architecture doit être liée à un coût réel ou à un risque démontré. Ne pas complexifier un flux pour un gain supposé.

## 10. Proposer versus exécuter

Une opportunité détectée peut avoir trois issues :

- `IN_SCOPE` — nécessaire ou directement liée au contrat du lot ; elle peut être exécutée ;
- `FOLLOW_UP` — utile mais indépendante ; elle est proposée pour un chantier séparé ;
- `NO_ACTION` — bénéfice insuffisant, preuve faible ou complexité injustifiée.

Cette classification évite que le Kaizen devienne une source permanente de scope creep.

## 11. Boucle de travail

La boucle Kaizen recommandée est :

1. **Observer** — lire l'état réel, les tests et les contrats.
2. **Prouver** — formuler le problème avec une preuve concrète.
3. **Prioriser** — comparer risque, valeur et dépendances.
4. **Délimiter** — choisir le plus petit périmètre sûr.
5. **Modifier** — appliquer la correction ou l'amélioration ciblée.
6. **Valider** — tests et contrôles proportionnels au risque.
7. **Capitaliser** — documenter seulement la connaissance durable réellement nouvelle.

## 12. Critère final

Une modification Kaizen est meilleure si, après son intégration, le système est plus :

- correct ;
- sûr ;
- compréhensible ;
- testable ;
- maintenable ;
- accessible ;
- mesurable lorsque cela a du sens ;

sans élargissement injustifié du périmètre ni nouveau contrat concurrent.
