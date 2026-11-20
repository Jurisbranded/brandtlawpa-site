#!/bin/bash
# Regenerate the site from the harvest (migration time only). Run from the folder holding harvest/ and site/.
# Harvest steps (read-only, slow): rest.py, render-capture.mjs, collect-images.py, fetch-images.py.
set -e
python3 site/tools/migration/prep-images.py harvest site | tail -1
python3 site/tools/migration/carry-pages.py harvest site | tail -1
python3 site/tools/migration/import-posts.py harvest site | head -1
python3 site/tools/migration/apply-fixes.py site harvest | tail -3   # Jeff 2026-11-20 decisions (brandt/BRANDT-site-standard.md)
python3 site/tools/migration/slim-heroes.py site | tail -1
python3 site/tools/migration/write-privacy.py site harvest | tail -1 # JB Privacy Center + Accessibility Policy
cd site
npx astro build > /tmp/astro1.log 2>&1
node tools/migration/purge-css.mjs ../harvest/build-css dist public/css | tail -1
npm run build 2>&1 | grep -E "page\(s\) built|_redirects|_worker|rror"
