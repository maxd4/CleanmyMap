---
name: cleanmymap-mobile
description: "Application mobile Expo CleanMyMap, missions GPS, identité Clerk, RLS, permissions, offline, reprise et finalisation serveur."
category: repository
risk: high
source: local
tags: "[mobile]"
---

# Application mobile Expo et missions GPS

## Déclenchement

Activer pour `apps/mobile/`, Expo/React Native, tracking GPS, permissions, mode hors ligne, reprise de mission, identité mobile, background ou connexion aux actions web.

## Sources

`apps/mobile/AGENTS.md`, `apps/mobile/README.md`, `documentation/architecture/master-architecture.md`, `documentation/architecture/data-governance.md`, migrations Supabase et APIs mobiles effectivement concernées.

## Procédure

1. Vérifier le périmètre `CURRENT` sur `main`. Le mobile est une application du **même produit**, distincte du web et non réputée prête pour la production sans preuve.
2. Préserver l'identité Clerk et son `sub`, transmis au client Supabase via le contrat Third-Party Auth. La possession d'un UUID ou d'une session anon ne donne aucun accès aux missions d'un tiers.
3. Tracer machine à états mission, autorisations GPS, buffer owner-scoped, reprise/offline, pertes réseau, changement d'utilisateur et conflit de synchronisation.
4. La finalisation des métriques persistées relève du serveur/trigger `SECURITY INVOKER`; le client ne doit pas écrire `distance_m` ou `duration_s` arbitraires.
5. Réutiliser les sources Actions, signalements et profils communes. Ne pas créer de seconde gamification, seconde identité ou couche métier concurrente.
6. Pour une permission sensible, expliquer finalité/localisation/stockage aux utilisateurs et tester refus, révocation, retour d'arrière-plan et absence réseau.

## Preuves

Distinguer test pur, test React Native/Expo, émulateur/appareil et preuve SQL exécutée. Ne pas assimiler une capture du shell à une validation du tracking en arrière-plan ou de la reprise réelle.
