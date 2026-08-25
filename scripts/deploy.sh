#!/usr/bin/env bash
# Local deploy. Same shape as the CI job: build, verify, then publish.
#
# The staging step is not paranoia. dist/ is gitignored on main but tracked on
# gh-pages, so `git checkout gh-pages` replaces the build you just made with
# the previous deploy's copy — and every deploy ships the build before the one
# you meant. Staging outside the repo is the fix.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
npm run verify

STAGE=$(mktemp -d)
cp -r dist/. "$STAGE"/
touch "$STAGE/.nojekyll"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout gh-pages 2>/dev/null || git checkout --orphan gh-pages
find . -maxdepth 1 ! -name . ! -name .git ! -name node_modules -exec rm -rf {} +
cp -r "$STAGE"/. .
rm -rf "$STAGE"

git add -A
git commit -m "Deploy: $(git log "$BRANCH" -1 --pretty=%s)" || echo "nothing changed"
if [ -n "${GH_TOKEN:-}" ]; then
  git push -f "https://x-access-token:${GH_TOKEN}@github.com/abhaybhuvagithub/AIChip.git" gh-pages
else
  git push -f origin gh-pages
fi
git checkout "$BRANCH"
echo "✓ deployed"
