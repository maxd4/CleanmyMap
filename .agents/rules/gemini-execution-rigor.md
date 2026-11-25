---
trigger: always_on
---

# Règles d'exécution Gemini — Rigueur, Stop Conditions, Preuves et Documentation

Ces obligations s'appliquent à l'agent principal et à tous les sous-agents lancés sur ce dépôt.

1. **Lecture complète obligatoire** : lire intégralement les règles racine (`AGENTS.md`) et scoped applicables avant toute modification.
2. **Checklist et `STOP CONDITION`** : avant implémentation, établir une checklist explicite des exigences fonctionnelles et de la `STOP CONDITION`, en associant chaque exigence à une preuve attendue.
3. **Vérification des contrats** : vérifier les types, contrats, owners, consommateurs, dépendances et tests réels avant toute écriture. Ne jamais supposer un contrat.
4. **Raccordement effectif** : une fonctionnalité créée mais non raccordée à ses consommateurs est incomplète. Une interface dont les mutations ne respectent pas le contrat API est non fonctionnelle.
5. **Preuves comportementales réelles** : tester les résultats métier exacts et les comportements utilisateur. Les assertions triviales, mocks isolés et contrôles d'existence ne constituent pas une preuve d'intégration.
6. **Relecture contradictoire** : avant publication, relire contradictoirement le diff final et vérifier chaque exigence initiale, les régressions, la sécurité et la documentation `CURRENT`.
7. **Validations proportionnées** : appliquer les validations proportionnées au risque définies par `AGENTS.md`. Ne jamais contourner les contrôles, réduire les seuils ou masquer les échecs.
8. **Vérification post-publication** : après publication, vérifier le SHA distant et les contrôles CI pertinents. Distinguer `PASS`, `FAIL`, `PENDING`, `BLOCKED` et `NOT_RUN`. Un commit publié n'est pas nécessairement un chantier validé.
9. **Achèvement strict** : ne jamais déclarer un macro-lot terminé si une exigence ou une preuve obligatoire manque. Poursuivre les corrections jusqu'à satisfaction de la `STOP CONDITION`, sauf blocage réel documenté.
10. **Bilan traçable** : dans le bilan final, associer chaque objectif aux fichiers concernés, comportements démontrés et validations effectivement exécutées.
11. **Exhaustivité avant rapidité** : ne jamais optimiser la rapidité de réponse, le nombre d'appels outils ou la longueur du raisonnement au détriment de l'exhaustivité fonctionnelle et de la fiabilité.
12. **Phases séparées** : séparer obligatoirement l'exploration, l'implémentation, la revue contradictoire, la validation et la clôture.
13. **Revue contradictoire active** : chercher activement à invalider sa propre implémentation en relisant les exigences originales, les contrats sources, les consommateurs réels et le diff complet.
14. **Preuve d'absence d'oubli** : ne pas chercher à confirmer que le travail est terminé, mais à démontrer qu'aucune exigence n'a été oubliée.
15. **Profondeur d'exécution** : privilégier la profondeur d'exécution à la vitesse de livraison, sans étendre le périmètre demandé.
