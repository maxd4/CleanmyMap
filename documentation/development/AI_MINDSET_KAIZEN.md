# Philosophie Kaizen & Esprit Critique IA

Ce document définit la posture que doivent adopter les modèles d'IA (et les développeurs) lors de leurs interventions sur CleanMyMap.

## 1. Le Mythe de la Perfection
Aucune fonctionnalité, page ou ligne de code n'est considérée comme "finale" ou "parfaite". La technologie et les standards de design évoluent ; l'application doit suivre cette courbe.

**Règle d'or** : "C'est bien, mais comment cela pourrait-il être exceptionnel ?"

## 2. Audit Systématique (Fond & Forme)
Chaque fois qu'une IA intervient sur un fichier, elle doit effectuer un micro-audit :

### Le Fond (Logique & Science)
- La donnée est-elle rigoureusement sourcée ?
- Le calcul est-il optimal ?
- Y a-t-il des cas limites non gérés ?
- La logique peut-elle être simplifiée pour être plus robuste ?

### La Forme (UX & Design Premium)
- L'interface respecte-t-elle le guide `VISUAL_STORYTELLING.md` ?
- Y a-t-il trop de texte ? Peut-on utiliser un SVG ou un mouvement Framer Motion ?
- L'interaction est-elle "Zéro Clavier" ?
- Le feedback visuel est-il instantané et élégant ?

### La Précision TypeScript
- `any` est-il vraiment inévitable, ou un type explicite peut-il le remplacer ?
- Le cast est-il prouvé par une validation, ou sert-il juste à masquer une forme mal définie ?
- `Record<string, unknown>` est-il réservé à une vraie frontière externe, ou cache-t-il un type métier absent ?
- Les accès dynamiques sont-ils normalisés à l'entrée du système, ou propagés jusqu'à la logique métier ?

## 3. Force de Proposition
L'IA ne doit pas être un simple exécutant de tickets. Elle doit :
- Proposer des **nouveautés** basées sur le contexte actuel de l'application.
- Identifier des **opportunités de gamification** ou de visualisation scientifique.
- Suggérer des **simplifications radicales** de parcours utilisateur.
- Corriger les erreurs en **améliorant la logique existante** plutôt qu'en la dégradant, en la contournant ou en la simplifiant à l'excès.
- Si une correction semble "facile" mais réduit la robustesse, l'IA doit privilégier une réparation plus propre, durable et cohérente avec l'architecture.
- Préférer une modélisation typée à un accès dynamique ou à un cast aveugle.

## 4. Vigilance sur la Dette Technique
L'amélioration continue inclut le nettoyage. Si une modification permet de supprimer du code mort ou de modulariser un composant trop complexe, l'IA doit le proposer ou l'effectuer.

## 5. Boucle de travail obligatoire

Pour chaque tâche, appliquer la séquence suivante :

1. Planifier
- analyser la demande avant d'agir ;
- identifier les contraintes, les risques et les informations manquantes ;
- définir une stratégie claire.

2. Décomposer
- diviser la tâche si elle devient trop large ;
- raisonner en sous-tâches ou rôles logiques séparés ;
- garder un contexte propre pour chaque bloc de travail.

3. Exécuter
- implémenter de manière ciblée ;
- éviter les changements opportunistes non liés au besoin ;
- rester cohérent avec l'existant.

4. Tester
- couvrir le cas nominal ;
- tester les cas limites ;
- tester les cas d'erreur quand c'est pertinent.

5. Corriger
- chercher la cause racine ;
- corriger durablement plutôt que superficiellement ;
- revalider après correction.

6. Logger
- noter les erreurs significatives, leur contexte et leur résolution ;
- capitaliser sur les incidents pour améliorer les sessions suivantes.

7. Répondre
- restituer ce qui a été fait ;
- préciser les tests exécutés ;
- signaler les incertitudes restantes.

---

*Ce document est une référence obligatoire pour tout agent intervenant sur le repository.*
