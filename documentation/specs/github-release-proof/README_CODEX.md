# Correction du contrôle GitHub de release

Statut : CANDIDATE / PLAN. Source observée : a68a07dbf2857c2c58d6dddaf12a9256f8ea1928.
Voir [audit](../../operations/audits/github-repository-audit-2026-11-26.md).

Le FULL local consomme scripts/ci/audit-github-release.mjs via
scripts/ci/validation-modes.mjs (github-security-full). L'évaluateur actif
a retourné PASS sur trois entrées reproduites en JS : un run sans rapport,
un objet d'alertes invalide, deux runs réussis avec rulesets vides.
Les tests existants audit-full-release.test.mjs valident actuellement
le cas vide de rulesets. Ne pas considérer ces tests comme un contrat métier
qui légitime un faux PASS.

Le candidat sous candidates/scripts/ci/ est une fonction pure de remplacement
et quatorze scénarios synthétiques, exécutés en isolate JS. Ce n'est ni un
nouvel outil de release ni un remplacement actif du gate. Intégrer sa
responsabilité à l'owner existant (pas de second gate). Adapter les tests
existants et conserver les tests Supabase. Le transport doit obtenir les
listes d'alertes paginées strictes, les détails des rulesets et les runs
pour le SHA exact via l'API GitHub, sans valeurs sensibles. Ne pas transformer
un payload non reconnu en tableau vide. Valider l'identité du dépôt, la
branche par défaut et le SHA. Les chemins de workflow, head_sha, head_branch,
event, status et conclusion proviennent des réponses REST réelles.
Rejeter la pagination incomplète, les erreurs et formes inattendues.
Le contrôle des règles proposé est conservateur : il reconnaît les conditions
exactes actuelles, vérifie suppression et non_fast_forward sans bypass et
restriction d'update active ; il n'atteste pas l'identité légitime des acteurs.
Un autre motif de règle nécessite une preuve explicite, pas une approximation.
Conserver les échecs et annulations des runs pertinents. Si un ancien run
échoué ou annulé est remplacé par une preuve valide, définir et tester la
règle de remplacement par identité de workflow, SHA et scénario ; ne pas
ignorer en bloc les échecs SQL ou E2E. Les runs ci et CodeQL réussis sur main
sont nécessaires mais ne suffisent pas à prouver une release FULL.

Vérifier les appels FULL/RELEASE et la publication : ne pas exiger une
preuve GitHub impossible pour un candidat encore non publié sans traiter
explicitement son statut et la frontière de release. Un résultat NOT_RUN
n'est pas une autorisation de déploiement. Exécuter les tests Node ciblés,
tester le transport avec faux runner (pagination, accès refusé, JSON invalide),
puis vérifier en lecture seule sur le vrai dépôt. Ne pas déclencher FULL,
déploiement ou mutation distante pour cette correction.

Deuxième défaut de CI à traiter dans le même chantier : web-governance dépend
uniquement de docs_only ou web_code_relevant. Un diff de documentation avec
du code Mobile ou Python, ou une modification isolée de dependabot.yml,
peut omettre les gardes transversaux. Sélectionner explicitement les contrôles
de gouvernance de dépôt pour ces changements, indépendamment des lanes Web
et Mobile. Réutiliser detect-scope.mjs, ses tests et les contrôles de
workflow existants ; ne pas lancer toutes les lanes applicatives par défaut.
Prouver la condition réellement utilisée sur des fixtures et par CI.
Ne jamais transformer un garde ignoré en PASS.

STOP CONDITION : plus de faux PASS du contrôle GitHub, transport vérifié,
preuves manquantes explicites, gouvernance CI sélectionnée sur les cas
réels concernés, tests de régression ciblés et check:github-actions réussis,
documentation propriétaire alignée et publication vérifiée.
