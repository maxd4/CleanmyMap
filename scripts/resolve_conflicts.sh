#!/usr/bin/env bash
set -euo pipefail

# Resolve common merge conflicts for this repository by preferring current branch
# versions for frequently conflicting files (including app.py), then show remaining conflicts.

FILES=("README.md" "app.py")

echo "🔍 Vérification des conflits Git..."
if ! git diff --name-only --diff-filter=U | grep -q .; then
  echo "✅ Aucun fichier en conflit (état index Git)."
else
  echo "⚠️ Fichiers en conflit détectés :"
  git diff --name-only --diff-filter=U
fi

echo
for f in "${FILES[@]}"; do
  if git ls-files -u -- "$f" | grep -q .; then
    echo "🛠️ Résolution automatique (version courante) : $f"
    git checkout --ours -- "$f"
    git add "$f"
  fi
done

echo
if git diff --name-only --diff-filter=U | grep -q .; then
  echo "❌ Des conflits restent à résoudre manuellement :"
  git diff --name-only --diff-filter=U
  exit 1
fi

echo "✅ Conflits critiques résolus."
echo "👉 Prochaine étape : git commit -m 'Resolve merge conflicts'"
