# Commandes utiles

Fichier de rappel pour exécuter les opérations courantes depuis la racine du dépôt `CleanmyMap-main`.

## GitHub

```powershell
git status                                   # montre les fichiers modifiés avant tout push
git add .                                    # ajoute tous les changements au prochain commit
git commit -m "Mon message de commit"        # crée un commit local
git push origin $(git branch --show-current)  # pousse la branche courante vers GitHub
```

## Supabase

```powershell
npm run backend:doctor -w apps/web            # vérifie que la config backend est cohérente
npm run backend:supabase:push -w apps/web     # pousse les migrations Supabase vers la base distante
```

## Vercel

```powershell
npm run backend:vercel:env:sync -w apps/web   # synchronise les variables d'environnement Vercel
git push origin $(git branch --show-current)  # déclenche le déploiement Vercel via GitHub
```

```powershell
cd apps/web                                   # se place dans l'application web
npx vercel --prod                             # déploiement manuel en production, si tu en as besoin
```

## Vérifications rapides

```powershell
npm run lint -w apps/web                      # contrôle ESLint sur l'application web
npm run typecheck -w apps/web                 # vérifie le typage TypeScript
npm run build -w apps/web                     # lance le build de production local
```

## Notes

- Le déploiement Vercel le plus sûr sur ce dépôt reste le push GitHub, car il suit le pipeline déjà configuré.
- Le déploiement manuel `vercel --prod` ne doit servir que si tu veux publier sans attendre le pipeline.
- Si une commande doit être lancée depuis un autre dossier, la ligne le précise explicitement.
