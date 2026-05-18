# Garde-fous IA et Sécurité du Code (CleanMyMap)

Ce document centralise les points de vigilance critiques pour les agents IA intervenant sur le projet, afin d'éviter les régressions structurelles et les pertes de données.

## 1. Alerte : Erreur "Oubli de déplacement"
**Risque** : Lors d'un remplacement de texte partiel (via `replace_file_content` ou `multi_replace_file_content`), l'IA peut accidentellement écraser ou omettre des paragraphes adjacents, entraînant une suppression silencieuse de contenu précieux.

### Protocole de vérification obligatoire :
- **Mesure de ligne** : Toujours comparer le nombre total de lignes avant et après une exécution.
- **Marge de tolérance** : Une différence supérieure à **2%** du volume total doit être considérée comme une erreur potentielle et déclencher une vérification manuelle immédiate.
- **Inspection des frontières** : Vérifier les 5 lignes avant et après chaque bloc de remplacement pour s'assurer qu'aucun paragraphe n'a été tronqué.

## 2. Intégrité de la Documentation
- Le projet CleanMyMap repose sur une documentation extensive (impact, audit, ateliers). 
- Toute modification d'un fichier `.md` de plus de 200 KB doit faire l'objet d'une attention particulière sur le maintien des ancres de liens (`{#anchor}`) et de la structure hiérarchique.

## 3. Invariants Techniques
- **Zéro Hard-coding** : Ne jamais insérer de secrets ou de clés d'API, même en commentaire.
- **Souveraineté** : Préférer les solutions permettant l'export et la réversibilité (CSV/JSON).
- **Sobriété** : Toute nouvelle dépendance doit être justifiée par l'Indice d'Utilité Réelle (IUR).

---
*Dernière mise à jour : 15 mai 2026 - Suite au retour utilisateur sur les erreurs de déplacement.*
