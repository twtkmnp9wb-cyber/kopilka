#!/usr/bin/env bash
# Публикует свежую сборку в ветку gh-pages (GitHub Pages → «Deploy from a branch»).
# Пока у токена нет права workflow, это замена CI из docs/ci/deploy.yml.
set -euo pipefail

cd "$(dirname "$0")/.."
remote=$(git remote get-url origin)

npm run check
npm run build

out=$(mktemp -d)
cp -R dist/. "$out"
touch "$out/.nojekyll"

cd "$out"
git init -q -b gh-pages
git add -A
git commit -q -m "Деплой $(date '+%Y-%m-%d %H:%M')"
git push -q -f "$remote" gh-pages
echo "Опубликовано: ветка gh-pages → $remote"
