# Publishing the site at ennsmuseum.missouri.edu

The site is built by GitHub (as before) and published in two places:

- **GitHub Pages**: https://enns-entomology-museum.github.io/Enns_Entomology_Museum_Database/ (automatic on every push)
- **MU Digital Service (AWS)**: https://ennsmuseum.missouri.edu (test address during setup:
  https://d1a6r73dc3sx0h.cloudfront.net/index.html). Files reach it only through a shared **OneDrive folder**:
  OneDrive → AWS S3 → CloudFront. Contacts: Brand Walker (hosting), Eric Chiu and Jeffrey Wiegand (HTML questions).

## What needs a copy to OneDrive, and what doesn't

| Change | What to do |
|---|---|
| News text (TaxonWorks) | Nothing: the site reads it live |
| News photo (new file in the `media` repository) | Push it as usual, then `npm run deploy:aws`: it copies the new photo (1 file save) |
| Specimens, images, taxa in TaxonWorks | Nothing: read live |
| Pages, design, fixes, monthly GBIF/iNaturalist data | Push to GitHub, wait for the Deploy action, then `npm run deploy:aws` |

## Cost

$2/month with 400 file saves included (to confirm with Digital Service whether per month); each file added or changed
after that costs $0.005. `npm run deploy:aws` copies **only new or changed files** and **never deletes**, so:

- an unchanged site copies 0 files;
- a change to one page copies about 30 files (the code files that depend on it get new names);
- the first upload copies about 125 files.

Old files are kept on purpose: the main address can show a cached `index.html` for up to 24 hours, and it must still
find the code files it points to. Link and publish the site as **https://ennsmuseum.missouri.edu/index.html**
(updates faster than the bare address).

Never drag folders into the OneDrive folder and never build or edit inside it: every file saved there costs.

## One-time setup

1. Sync the shared OneDrive folder `ennsmuseum.missouri.edu` to this computer (Digital Service's instructions).
2. Find its path in File Explorer (click the address bar, copy).
3. Create `deploy-aws.json` next to `package.json` (not committed to GitHub):

   ```json
   { "folder": "C:\\Users\\davel\\...\\ennsmuseum.missouri.edu" }
   ```

   Backslashes are written twice.

## News photos

Digital Service does not allow files of the site to come from GitHub, so on ennsmuseum.missouri.edu the
news photos are served from the site itself (`media/news/…`). Nothing changes in how news is written: keep linking
photos as `https://enns-entomology-museum.github.io/media/news/…` in TaxonWorks. The GitHub site shows them from
GitHub; ennsmuseum.missouri.edu automatically uses its own copy, which `npm run deploy:aws` keeps up to date from
the `media` folder next to this one (only new or changed photos are copied).

## Publishing

In the `Enns_Entomology_Museum_Database` folder (PowerShell or Git Bash), after the GitHub **Deploy** action is green:

```
npm run deploy:aws -- --dry-run     # shows what would be copied and the number of file saves
npm run deploy:aws                  # copies them
```

The files are taken from the GitHub Pages build (built by GitHub with fresh data), so nothing is built on this
computer. To copy a local build instead: `npm run build`, `npm run manifest`, then `npm run deploy:aws -- --from-dist`
(local builds have no loan totals: that token is only in GitHub).

If it stops with "does not match the list", GitHub Pages is still updating: wait a few minutes and run it again.

## How it works

- `config/router.yml` has `base_url: ./`, so the same build works at any address (both sites use `#/…` addresses).
- The workflow runs `scripts/site-manifest.mjs` after the build: `dist/site-manifest.json` lists every file with its
  checksum.
- `scripts/deploy-aws.mjs` downloads that list, compares it with the files in the OneDrive folder and copies only
  those that differ, `index.html` last.
