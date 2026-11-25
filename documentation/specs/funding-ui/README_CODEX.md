# Page de soutien : contribution et transparence

**CANDIDATE**. Sources lues sur `b51460d6ff5ffdb82a6c6783a3a2aaa03744c17b`. Aucun changement runtime actif.

## Fichiers

- [01-financement-transparence.patch](01-financement-transparence.patch) : refonte de FundingSection, CTA unique de cagnotte, besoins séparés du suivi financier, alternatives non financières, intégrité des agrégats et états de retours historiques Stripe, tests de modèle, de rendu, de route et E2E.
- [02-contrats-documentaires.patch](02-contrats-documentaires.patch) : adaptation des deux fiches de route existantes ; intégrer seulement avec le runtime validé.

## Décisions et périmètre

Le parcours actuel retenu reste OnParticipe, configuré par FUNDING_ONPARTICIPE_URL. Une seule cagnotte commune, aucune sélection d'affectation, aucun montant ni identifiant transmis. Si la configuration manque, afficher l'indisponibilité et proposer le contact ; ne jamais substituer Stripe ni coder en dur l'URL documentaire. La campagne documentée n'a pas pu être vérifiée en direct ; ni configuration de production ni disponibilité du fournisseur ne sont établies.

Les besoins terrain et fonctionnement sont des usages possibles, pas un bilan comptable. Les agrégats Stripe ne représentent que les paiements confirmés moins les remboursements enregistrés, sans déduction des frais ou dépenses, hors OnParticipe. Le contrat existant attend les deux lignes EUR initialisées par migration. Corriger le défaut constaté : l'ancienne route initialisait les deux catégories à zéro et normalisait aussi des données invalides en zéro. Toute ligne manquante, montant invalide, doublon, devise incorrecte ou somme non sûre provoque 503. Conserver la forme de succès, la limitation de débit et la projection sans identité. Aucun schéma, RPC, webhook, table ou mode de paiement nouveau.

Le retour URL success n'est pas une preuve de paiement ; vérifier le statut existant et distinguer attente, indisponibilité, paiement, remboursement partiel et intégral. Un retour cancelled ne démontre pas l'état comptable de la session. Ne pas demander de vrai paiement pour tester.

Le développement bénévole, les contributions matérielles et la coopération restent distincts des flux financiers. Pas de promesse d'avantage fiscal, de statut associatif, de rémunération, de contrepartie ni d'influence éditoriale. Aucun objectif chiffré ni taux d'avancement artificiel.

## Intégration et preuves

Reprendre le checkout courant en préservant les autres writers, appliquer les patches selon leurs contextes et les contrats actuels. Lire les docs Next locales et appliquer les conventions de formatage, design system, accessibilité et tests. Vérifier le renderer, les autres surfaces de financement et les ancres éventuelles. Tester le modèle (zéro explicite, inconnues, invalides, précision et remboursements), la route publique et les tests existants, typecheck/lint, les deux langues, navigateur desktop/mobile et états de chargement, erreurs/retry, URL success forgée, retour historique remboursé, un seul CTA lorsque configuré, alternative contact quand absent et absence de déclenchement Checkout. Les E2E candidats utilisent des fixtures, pas de transaction réelle. Vérifier un GET public réel sans collecte de données personnelles ni initiation d'un paiement ; ne pas conclure sur l'état de production depuis les mocks.

Une transparence comptable complète nécessite des données vérifiées supplémentaires : recettes encaissées par canal, remboursements, frais, dépenses avec justificatifs anonymisés, période et date d'arrêté, apports en nature et bénévolat séparés. Ne pas introduire un registre fictif, copier les scénarios internes de business-model.md comme budget établi ni créer une nouvelle collecte. Proposer ultérieurement un registre financier public minimisé dérivé des sources comptables réelles et des règles de publication, après preuve du besoin. Le portage juridique et les options HelloAsso/Stripe restent régis par la stratégie canonique.

Contrôle effectué : dix hunks, comptages et anciennes versions exactes comparées aux fichiers GitHub. Nouvelle tentative git ls-remote : échec DNS `Could not resolve host: github.com`. HOOK_NOT_AVAILABLE ; typecheck, lint, tests, navigateur et build NOT_RUN ; couverture NOT_MEASURED. Pas d'intégration runtime ni d'état de production vérifié.

**STOP CONDITION :** page sobre et opérationnelle, besoins et recettes distincts, CTA OnParticipe unique conditionné à la configuration, recours au contact si absent, agrégats validés et états de confirmation exacts, aucune donnée privée, aucun nouveau paiement, validations obligatoires et documentation CURRENT alignées, publication sûre.
