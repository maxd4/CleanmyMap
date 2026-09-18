# Partie V — Risques techniques, sécurité et contrôle des systèmes d'IA {#partie-v-risques-techniques-securite-et-controle-des-systemes-dia}

Cette partie analyse les **risques techniques liés à l'usage de systèmes d'IA dans le développement logiciel et, à titre prospectif, dans des fonctionnalités applicatives**. Elle descend d'un niveau par rapport aux parties précédentes :

- la partie III traite des impacts humains, sociaux et informationnels ;
- la partie IV traite du pouvoir économique, des infrastructures, de la souveraineté et des dépendances fournisseurs ;
- la présente partie traite des **frontières de confiance, secrets, entrées non fiables, sorties générées, permissions, agents, code produit par IA, dépendances logicielles et mécanismes de contrôle**.

Les questions générales de vie privée et de droits sont traitées en partie III. Ici, les données personnelles ne sont abordées que lorsqu'elles deviennent un **problème opérationnel de sécurité** : transmission à un outil, exposition dans des logs, permissions trop larges, conservation inutile ou fuite vers une sortie générée.

De même, la sycophancy, l'automation bias et l'anthropomorphisation sont analysés en partie III comme risques humains. Dans cette partie, la question est plus restreinte : **quels contrôles techniques empêchent une sortie plausible mais incorrecte, une instruction malveillante ou un agent trop privilégié de devenir une action réelle ?**

## Périmètre CURRENT et PROSPECTIVE

Le rapport distingue deux situations.

| Statut | Situation |
| --- | --- |
| `CURRENT` | IA utilisée pour le développement, la revue, la recherche, la documentation et l'assistance au code ; les sorties peuvent influencer le dépôt si un humain les accepte. |
| `PROSPECTIVE` | Fonctionnalités LLM/RAG/agents directement intégrées au produit ou exposées aux utilisateurs ; elles doivent être évaluées avant activation. |

À l'état actuel du dépôt lu pour cette réécriture, aucune dépendance SDK OpenAI/Anthropic/Gemini n'apparaît dans `apps/web/package.json`, et la variable `OPENAI_API_KEY` documentée dans le dépôt est notamment utilisée par la configuration locale de Supabase Studio. Cela ne prouve pas qu'aucun service IA externe ne puisse jamais être appelé par un autre chemin ; cela signifie simplement que **le risque LLM applicatif ne doit pas être présenté comme un incident CURRENT sans preuve**.

En revanche, l'usage d'agents de développement et d'assistants IA est bien un sujet actuel. Le modèle de menace principal est donc aujourd'hui celui d'un **outil de développement puissant qui lit du contexte, produit du code ou des commandes et peut être relié à des outils**.

## Modèle de menace technique

Une chaîne assistée par IA comporte plusieurs frontières de confiance :

```{mermaid}
%%| fig-cap: "Frontières de confiance d'un développement assisté par IA"
%%| fig-width: 10
flowchart LR
  U["Humain"] --> M["Modèle / agent"]
  R["Dépôt, docs, issues,<br/>web et fichiers"] --> M
  M --> O["Sortie générée"]
  O --> G["Gate de validation"]
  G --> T["Outils : Git, shell,<br/>tests, APIs, cloud"]
  T --> P["Code / données / production"]

  R -. "contenu non fiable" .-> X["Prompt injection"]
  M -. "permissions excessives" .-> Y["Excessive agency"]
  O -. "sortie non validée" .-> Z["Improper output handling"]
```

Le NIST recommande de gérer les risques des systèmes génératifs sur l'ensemble de leur cycle de vie, et OWASP distingue notamment la **prompt injection**, la divulgation d'informations sensibles, les risques de chaîne d'approvisionnement, la mauvaise gestion des sorties et l'**excessive agency** [@nist_ai_600_1; @owasp_llm_top_10_2025].

Le principe général retenu est :

> **un modèle n'est ni une frontière de sécurité, ni une autorité d'autorisation, ni une preuve que sa propre sortie est sûre.**

Les contrôles doivent donc exister **autour** du modèle.

## Données sensibles, secrets et minimisation technique

### Une instruction est un canal de transmission

Un prompt, une pièce jointe, une capture d'écran ou un contexte fourni à un assistant IA peut contenir beaucoup plus d'information qu'il n'y paraît :

- clés API ;
- jetons ;
- mots de passe ;
- variables d'environnement ;
- chaînes de connexion ;
- logs ;
- extraits de base de données ;
- identifiants utilisateur ;
- coordonnées précises ;
- captures d'écrans internes ;
- code non public ;
- configuration d'infrastructure.

OWASP classe la **Sensitive Information Disclosure** parmi les risques principaux des applications LLM [@owasp_llm_top_10_2025]. La CNIL recommande également d'appliquer la minimisation et des mesures de sécurité adaptées lors du développement de systèmes d'IA [@cnil_ai_development_2025].

Le contrôle le plus robuste est souvent en amont : **ne pas transmettre une donnée dont le modèle n'a pas besoin**.

### Secrets : partage interdit

Pour CleanMyMap, les règles de sécurité du dépôt sont plus strictes qu'une simple recommandation :

- aucun secret en dur dans le code, la documentation ou les logs ;
- aucun `service_role` dans le client ;
- aucune clé privée dans une capture, un prompt ou un artefact ;
- les variables `NEXT_PUBLIC_*` sont considérées publiques ;
- un secret exposé doit être révoqué puis remplacé.

Ces règles sont définies dans la [doctrine de sécurité CURRENT](../../../security/SECURITY.md), le [Codex Security Playbook](../../../security/CODEX_SECURITY_PLAYBOOK.md) et la [politique de protection des données et d'usage de l'IA](../../../operations/DATA_PROTECTION_POLICY.md).

L'IA n'introduit donc pas une exception à la politique de secrets. Elle ajoute au contraire un **nouveau canal possible d'exfiltration**, qui doit être traité avec les mêmes règles que Git, les logs ou une API tierce.

### Logs et exemples

Lorsqu'un diagnostic nécessite un log ou un extrait de données, le contexte doit être réduit et anonymisé avant partage.

La bonne unité de travail n'est généralement pas « tout le dump » mais :

- l'erreur ;
- quelques lignes pertinentes ;
- des identifiants remplacés ;
- un exemple synthétique reproductible ;
- la structure minimale nécessaire à l'analyse.

Cette pratique réduit simultanément le risque de fuite, le bruit contextuel et le coût d'analyse.

## Prompt injection et contexte non fiable

### Prompt injection directe

Une prompt injection consiste à fournir au modèle des instructions conçues pour détourner son comportement prévu. Elle devient un risque de sécurité lorsqu'un modèle peut accéder à des données ou déclencher des actions [@owasp_llm_top_10_2025].

Dans une application conversationnelle, l'attaque peut venir directement de l'utilisateur.

Dans un workflow de développement, elle peut aussi venir d'un texte copié dans le prompt : ticket, issue, log, commentaire, document ou page web.

### Prompt injection indirecte

Le risque devient plus subtil lorsque le modèle **lit lui-même une source externe**.

Un agent de code ou de recherche peut consulter :

- un README ;
- une issue GitHub ;
- un fichier téléchargé ;
- une documentation externe ;
- une page web ;
- une réponse d'API ;
- un commentaire dans du code ;
- un document récupéré par recherche.

Un contenu malveillant peut alors contenir des instructions destinées non pas à l'utilisateur humain, mais au modèle qui le lit.

La règle de confiance doit être explicite :

> **le contenu récupéré est une donnée à analyser, pas une instruction d'autorité.**

Le fait qu'un texte se trouve dans un dépôt, une page web ou une sortie d'outil ne lui donne aucune permission particulière.

### Les instructions système ne sont pas un contrôle suffisant

Un prompt système ou un fichier de règles peut réduire certains comportements indésirables, mais il ne constitue pas une barrière de sécurité comparable à une permission serveur, une sandbox ou une validation de schéma.

Les contrôles robustes doivent rester externes au modèle :

- allowlist d'outils ;
- permissions minimales ;
- validation des entrées ;
- validation des sorties ;
- séparation lecture/écriture ;
- confirmation humaine pour les actions sensibles ;
- restrictions réseau ou environnementales lorsque pertinentes.

Une application ne doit donc jamais reposer sur l'hypothèse : « le modèle a reçu l'instruction de ne pas faire cela, donc l'action est impossible ».

## Agents, outils et excessive agency

### Du texte à l'action

Un chatbot sans outil produit principalement du contenu. Un agent peut en plus :

- lire des fichiers ;
- modifier du code ;
- exécuter des commandes ;
- appeler une API ;
- interroger une base ;
- créer ou supprimer une ressource ;
- déclencher un déploiement ;
- envoyer un message.

Cette capacité transforme le modèle de menace. Une hallucination ou une injection qui restait auparavant textuelle peut produire un effet réel.

OWASP définit l'**Excessive Agency** comme une situation où un système LLM dispose de trop de fonctionnalités, trop de permissions ou trop d'autonomie par rapport à son besoin [@owasp_llm_top_10_2025].

### Principe du moindre privilège

Un agent ne doit recevoir que les capacités nécessaires à la tâche.

Exemples :

| Besoin | Permission appropriée | Permission excessive |
| --- | --- | --- |
| analyser du code | lecture du périmètre utile | accès en écriture à tout le dépôt |
| vérifier un état Supabase | lecture ciblée | `service_role` avec mutations libres |
| préparer une migration | générer un diff | appliquer directement en production |
| analyser un déploiement | lecture des logs | pouvoir supprimer le projet |
| proposer un email | brouillon | envoi autonome à une liste complète |

Le contrôle humain doit se trouver **avant** l'effet irréversible, pas uniquement après.

### Séparer lecture, proposition et mutation

Une architecture sûre distingue trois niveaux :

```text
READ
→ PROPOSE
→ MUTATE
```

Le passage de `READ` à `PROPOSE` peut être largement automatisé.

Le passage à `MUTATE` doit dépendre :

- de la nature de l'action ;
- de sa réversibilité ;
- de son périmètre ;
- de la qualité des tests ;
- d'une autorisation explicite lorsqu'elle est sensible.

Cette séparation est particulièrement importante pour les migrations SQL, les changements AuthN/AuthZ, les secrets, la production et les suppressions.

### Bornes de ressources

Un agent peut aussi créer un risque sans action destructive explicite : boucles d'outils, appels API répétés, consommation de quotas, génération incontrôlée de fichiers ou recherches sans fin.

Il faut donc prévoir des limites :

- nombre d'itérations ;
- durée ;
- coût ou quota ;
- volume de données ;
- taille de sortie ;
- fréquence d'appel.

OWASP classe également l'**unbounded consumption** parmi les risques des applications LLM [@owasp_llm_top_10_2025]. Pour CleanMyMap, les mécanismes de rate limiting restent décrits dans le contrat [RATE_LIMITING](../../../security/RATE_LIMITING.md) ; leur existence ne prouve cependant pas que toute future route IA serait automatiquement protégée.

## Sorties générées : ne jamais exécuter une chaîne parce qu'elle vient d'un modèle

### Improper output handling

Une sortie de modèle doit être considérée comme **non fiable par défaut**.

La mauvaise pratique consiste à prendre directement une sortie générée et à l'utiliser comme :

- commande shell ;
- requête SQL ;
- HTML ;
- URL ;
- expression régulière ;
- nom de fichier ;
- configuration ;
- payload d'API ;
- instruction d'un second agent.

OWASP classe cette faiblesse comme **Improper Output Handling** [@owasp_llm_top_10_2025].

### Validation par type de sortie

Le contrôle dépend du contexte :

| Sortie IA | Contrôle attendu |
| --- | --- |
| texte public | vérification factuelle et éditoriale |
| HTML | échappement ou sanitation adaptée au contexte |
| URL | parsing et validation explicite du protocole/host |
| SQL | revue, migration versionnée, test et contrôle des privilèges |
| code | revue, typecheck/lint/tests adaptés |
| dépendance | provenance, maintenance, licence et advisory |
| commande shell | compréhension de l'effet, périmètre borné, confirmation si sensible |
| configuration | comparaison avec le contrat canonique et test de régression |

Pour le HTML et le DOM, CleanMyMap dispose d'un [contrat CURRENT de prévention XSS](../../../security/dom-xss-prevention.md). La présence d'une sortie IA ne change pas ce contrat : une chaîne générée n'est pas « sûre » parce qu'elle paraît bien formée.

### Les sorties structurées réduisent le risque sans le supprimer

Un schéma JSON, Zod ou équivalent peut imposer une forme attendue et rejeter certains résultats invalides.

Il ne prouve pas que :

- la valeur est vraie ;
- l'identifiant appartient à l'utilisateur ;
- l'URL est autorisée ;
- l'action est légitime ;
- la recommandation respecte une règle métier.

La validation syntaxique doit donc rester distincte de l'AuthZ, de la validation métier et de la vérification factuelle.

## Code généré et « vibe coding »

### Le bénéfice technique est réel

Le développement assisté par IA peut accélérer :

- la production de boilerplate ;
- l'écriture de tests ;
- l'exploration d'une base de code ;
- la documentation ;
- la recherche d'une régression ;
- la proposition de refactors ;
- la revue de configurations.

Le risque ne vient donc pas du simple fait qu'un modèle produit du code.

### Le risque apparaît lorsque la vitesse remplace la compréhension

Le terme _vibe coding_ est utile ici comme raccourci pour une pratique où le développeur évalue surtout si « cela marche » et enchaîne les corrections par prompts sans comprendre suffisamment la structure produite.

Le principal risque est une **illusion de maîtrise** :

- l'interface fonctionne mais l'AuthZ est incorrecte ;
- le test heureux passe mais les cas négatifs manquent ;
- une route accepte des entrées trop larges ;
- un secret arrive côté client ;
- une dépendance est ajoutée sans nécessité ;
- une migration fonctionne sur un cas mais viole un invariant ;
- une duplication masque une seconde source de vérité.

Le critère de qualité ne doit donc pas être seulement l'exécution immédiate.

### Explicabilité du code par l'équipe

Pour une modification sensible, au moins un humain doit pouvoir expliquer :

- le flux de données ;
- les permissions utilisées ;
- les effets de bord ;
- les erreurs possibles ;
- les dépendances nouvelles ;
- les invariants protégés ;
- la stratégie de rollback.

Cette exigence ne signifie pas mémoriser chaque ligne. Elle signifie conserver une maîtrise suffisante pour **auditer et maintenir** ce qui est déployé.

### Les tests ne sont pas une validation automatique du sens

Les tests automatisés sont indispensables mais ne prouvent que les propriétés qu'ils vérifient.

Un agent peut produire simultanément le code et un test qui encode la même hypothèse erronée. Une validation solide combine donc :

- tests positifs ;
- tests négatifs ;
- revue de contrat ;
- vérification des permissions ;
- analyse des changements transversaux ;
- comparaison avec la source canonique du domaine.

Dans CleanMyMap, la [checklist humaine de revue sécurité](../../../security/CODE_REVIEW_CHECKLIST.md) et la [checklist pré-merge](../../../security/PRE_MERGE_CHECKLIST.md) complètent les validations automatiques.

## AuthN, AuthZ, RLS et privilèges

### L'IA ne définit jamais une permission

Un modèle peut proposer une règle d'accès ; il ne peut pas déterminer seul qu'une permission est correcte.

Le contrat CURRENT de CleanMyMap distingue :

```text
AuthN
+ Capability
+ rôle compatible
+ Scope / Ownership
+ état métier
+ projection autorisée
```

Une session valide ne donne pas implicitement tous les droits, et une valeur transmise par le client ne constitue pas une preuve d'autorisation. Le contrat complet est maintenu dans [`authz-authn-regles.md`](../../../security/authz-authn-regles.md).

### Clerk et Supabase ont des rôles distincts

Dans l'architecture actuelle :

- Clerk porte l'identité principale du web ;
- les handlers appliquent l'AuthZ côté serveur ;
- Supabase protège les flux de données concernés avec RLS et permissions RPC ;
- `service_role` reste une identité technique serveur, jamais un rôle utilisateur.

Une proposition IA qui contournerait cette séparation pour « simplifier » une route doit être considérée comme une régression, même si elle résout le problème fonctionnel immédiat.

### RLS et migrations

Une politique RLS ou une migration générée par IA doit être relue comme du **code de sécurité**, pas comme une simple requête SQL.

Il faut notamment vérifier :

- rôle et scope ;
- propriétaire/non-propriétaire ;
- organisation ou territoire lorsque pertinent ;
- permissions RPC ;
- `search_path` ;
- fonctions privilégiées ;
- comportement des données existantes ;
- rollback ou stratégie de correction.

La checklist spécialisée est maintenue dans [`supabase-review-checklist.md`](../../../security/supabase-review-checklist.md).

## Chaîne d'approvisionnement et dépendances

### Le modèle peut proposer une dépendance inexistante ou inadaptée

Un assistant peut suggérer un package :

- obsolète ;
- non maintenu ;
- typosquatté ;
- inutilement lourd ;
- incompatible avec la licence du projet ;
- vulnérable ;
- ou simplement inexistant.

Une dépendance ne doit donc jamais être installée sur la seule autorité d'une réponse IA.

OWASP classe la **Supply Chain** parmi les risques majeurs des applications LLM [@owasp_llm_top_10_2025].

### Contrôles utiles

Avant d'accepter une nouvelle dépendance :

1. vérifier qu'elle existe dans la source officielle ;
2. vérifier le package exact et son propriétaire ;
3. vérifier la maintenance et les versions ;
4. examiner les advisories pertinents ;
5. vérifier que la fonctionnalité n'existe pas déjà dans le dépôt ;
6. préférer la convergence à la duplication ;
7. revalider le lockfile.

CleanMyMap maintient Dependabot, CodeQL, un lockfile et une gouvernance spécifique pour certains advisories et backports locaux. Ces mécanismes sont documentés dans [`dependency-advisory-governance.md`](../../../security/dependency-advisory-governance.md).

Ils réduisent le risque ; ils ne garantissent pas qu'une dépendance soit sûre ou appropriée par construction.

## Recherche augmentée, embeddings et bases vectorielles

Cette section est **prospective** tant qu'une fonctionnalité LLM/RAG correspondante n'est pas démontrée comme active dans le runtime.

Une architecture RAG ajoute des frontières supplémentaires :

```text
document externe
→ ingestion
→ découpage
→ embeddings
→ index
→ retrieval
→ contexte du modèle
→ réponse
```

Chaque étape peut introduire un risque :

- document malveillant ;
- contenu obsolète ;
- empoisonnement de la base de connaissances ;
- mélange de tenants ;
- retrieval d'une donnée non autorisée ;
- fuite par similarité ;
- prompt injection contenue dans le document ;
- conservation excessive d'un contenu supprimé ailleurs.

OWASP classe les faiblesses liées aux **vecteurs et embeddings** parmi les risques des applications LLM [@owasp_llm_top_10_2025].

Si CleanMyMap active ultérieurement ce type d'architecture, les règles minimales seront :

- AuthZ **avant** ou au niveau du retrieval ;
- séparation des namespaces/scopes lorsqu'elle est pertinente ;
- traçabilité de la provenance ;
- mécanisme de suppression cohérent ;
- traitement des documents récupérés comme contenu non fiable ;
- tests négatifs de fuite inter-utilisateur ou inter-organisation.

La présence d'un package vectoriel dans les dépendances ne suffit pas à affirmer qu'un tel système est actif.

## Fiabilité, non-déterminisme et limites des garde-fous

### Une sortie correcte hier peut différer demain

Les systèmes génératifs sont probabilistes et peuvent évoluer avec :

- la version du modèle ;
- le prompt système ;
- le contexte ;
- les outils disponibles ;
- les paramètres ;
- une mise à jour fournisseur.

Pour les usages sensibles, la reproductibilité doit donc reposer autant que possible sur des artefacts déterministes :

- tests ;
- schémas ;
- règles métier ;
- migrations ;
- validations statiques ;
- sources externes ;
- logs techniques appropriés.

Le modèle peut aider à produire ou interpréter ces artefacts ; il ne doit pas en devenir le substitut.

### Les garde-fous ne remplacent pas l'architecture de sécurité

Les mécanismes de refus des fournisseurs sont utiles, mais leur présence ne doit jamais servir d'argument pour donner davantage de permissions au modèle.

Un système reste plus sûr lorsque l'action dangereuse est **techniquement impossible ou explicitement autorisée** que lorsqu'elle est seulement « déconseillée » dans le prompt.

Cette logique est particulièrement importante avec des agents capables d'utiliser des outils.

## Cybersécurité offensive et défensive assistée par IA

La partie III traite du caractère dual-use de l'IA au niveau social. Ici, l'enjeu est l'effet sur l'ingénierie de sécurité.

Des acteurs malveillants utilisent déjà les modèles génératifs pour accélérer certaines tâches comme la reconnaissance, le scripting, la rédaction de phishing ou la recherche d'information. Les analyses de Google Threat Intelligence montrent toutefois que ces outils servent souvent d'**accélérateurs de capacités existantes** plutôt que de créer automatiquement une expertise offensive avancée [@google_gtig_adversarial_misuse_generative_ai].

La même asymétrie vaut en défense. Un assistant peut aider à :

- rechercher des patterns vulnérables ;
- générer des tests négatifs ;
- expliquer une advisory ;
- comparer une configuration ;
- analyser un diff ;
- préparer un correctif.

Mais une revue IA de sécurité ne constitue pas une certification. Elle doit être confrontée aux contrats réels du dépôt et aux outils spécialisés.

Pour CleanMyMap, cela signifie :

> **l'IA peut participer à la défense, mais elle ne doit pas être simultanément l'unique auteur du code, l'unique testeur et l'unique validateur de sa sécurité.**

## Traçabilité, audit et réponse à incident

### Tracer les décisions sensibles sans journaliser les secrets

Une chaîne assistée par IA doit conserver assez d'information pour comprendre une décision importante, sans stocker inutilement les données sensibles elles-mêmes.

Pour un changement critique, la trace pertinente peut inclure :

- objectif du changement ;
- fichiers concernés ;
- source canonique consultée ;
- tests exécutés ;
- résultat des contrôles ;
- validation humaine ;
- décision finale.

Il n'est pas nécessaire de conserver chaque token ou chaque conversation complète pour obtenir cette auditabilité.

### Distinguer suggestion, intégration et effet réel

Trois événements ne doivent jamais être confondus :

```text
SUGGESTED
INTEGRATED
PROVEN
```

Une IA peut avoir suggéré une correction.

Le code peut ensuite avoir été intégré.

La propriété attendue n'est réellement prouvée qu'après la validation appropriée.

Cette distinction évite les formulations trompeuses du type « sécurisé par IA » ou « corrigé » alors que seul un patch a été proposé.

### Incident

Si un outil IA reçoit accidentellement un secret ou une donnée interdite, la réponse ne doit pas se limiter à supprimer le texte du prompt.

Selon le cas :

1. stopper l'exposition ;
2. révoquer ou faire tourner le secret ;
3. vérifier les logs et usages ;
4. évaluer les données touchées ;
5. nettoyer les artefacts accessibles lorsque c'est possible ;
6. documenter l'incident ;
7. renforcer le contrôle qui a échoué.

La doctrine générale d'incident reste définie par la documentation opérationnelle et de sécurité du projet.

## `CLEANMYMAP_APPLICATION` — état des contrôles

La partie V ne doit pas inventer un niveau de sécurité à partir de bonnes intentions. Il faut distinguer les contrôles réellement documentés du projet et ceux qui deviennent nécessaires seulement si de nouvelles fonctions IA sont activées.

### Contrôles CURRENT documentés

| Domaine | Contrôle CURRENT |
| --- | --- |
| secrets | interdiction des secrets dans Git/client/docs/logs + `npm run security:secrets` |
| identité | Clerk comme identité principale du web |
| AuthZ | contrôle serveur par capacité, rôle compatible et scope/ownership |
| données | RLS/RPC pour les flux Supabase concernés ; `service_role` serveur uniquement |
| entrées | validation, bornes, normalisation et rejet explicite des entrées non valides |
| XSS | contenu non fiable rendu comme texte ou sanitisé selon le contrat |
| dépendances | Dependabot, CodeQL, lockfile et revue ciblée des advisories |
| revue | checklist humaine de sécurité et contrôles pré-merge |
| rate limiting | mécanisme partagé documenté, avec profils adaptés aux familles de flux |
| développement IA | playbook Codex imposant des frontières explicites sur secrets, Supabase, Vercel et validations |

Les sources canoniques sont indexées dans [`documentation/security/README.md`](../../../security/README.md).

### Contrôles PROSPECTIVE si un LLM devient une fonctionnalité runtime

Avant d'exposer un LLM ou un agent aux utilisateurs, il faudra vérifier explicitement :

- threat model dédié ;
- prompt injection directe et indirecte ;
- séparation stricte des outils ;
- permissions minimales ;
- validation des sorties ;
- quotas ;
- protection contre le coût non borné ;
- stratégie de rétention ;
- classification des données ;
- tests d'AuthZ sur les sources RAG éventuelles ;
- observabilité ;
- mécanisme de désactivation ;
- comportement en mode dégradé.

Ces exigences ne prouvent pas qu'une future fonctionnalité IA sera nécessaire. Elles définissent simplement le **minimum de sécurité avant son activation**.

## Ce qui n'est plus traité dans cette partie

Pour éviter les duplications avec les autres fiches :

| Sujet | Source du rapport |
| --- | --- |
| biais, discrimination, travail, vie privée comme droit | Partie III |
| hallucinations et désinformation comme effet social | Partie III |
| sycophancy, automation bias, anthropomorphisation | Partie III |
| concentration cloud/GPU, lock-in économique, souveraineté | Partie IV |
| coûts énergétiques, carbone, eau, matériel | Partie II |
| utilité réelle et arbitrage coût/bénéfice | Parties VI et VII |
| effet rebond et dette numérique globale | Partie VIII |
| mesures de réduction | Partie IX |
| audit technique de sobriété | Partie XI |
| enseignements DU et usage méthodologique de l'IA | Partie XII |

Cette séparation permet à la partie V de rester une **analyse de sécurité et de contrôle**, et non une seconde synthèse générale des impacts de l'IA.

## Synthèse

Le risque technique principal d'un système d'IA ne vient pas uniquement d'une « mauvaise réponse ». Il vient du moment où une sortie non fiable rencontre **des données sensibles, des permissions, du code, des outils ou une action réelle**.

Les contrôles les plus robustes sont donc structurels :

- minimiser les données ;
- garder les secrets hors du contexte IA ;
- traiter tout contexte externe comme non fiable ;
- limiter les outils et permissions ;
- séparer lecture, proposition et mutation ;
- valider les sorties selon leur type ;
- protéger AuthN/AuthZ/RLS indépendamment du modèle ;
- contrôler la chaîne d'approvisionnement ;
- tester les cas négatifs ;
- conserver un humain responsable des changements sensibles ;
- prouver les effets avant de les déclarer validés.

Pour CleanMyMap, la priorité actuelle est surtout de sécuriser **le développement assisté par IA** et de maintenir les contrats de sécurité existants. Les risques propres à une application LLM exposée au public doivent rester classés `PROSPECTIVE` tant qu'une telle intégration n'est pas démontrée comme active dans le runtime.
