// Copies the website to the OneDrive folder that publishes https://ennsmuseum.missouri.edu
// (MU Digital Service: OneDrive -> AWS S3 -> CloudFront).
//
// Every file saved in that folder costs money (400 included per month, then half a cent each),
// so this script copies ONLY files that are new or changed, and never deletes anything:
// old files stay so that pages still cached by CloudFront keep working.
//
// Usage (in the Enns_Entomology_Museum_Database folder):
//   npm run deploy:aws -- --dry-run      show what would be copied, copy nothing
//   npm run deploy:aws                   copy new/changed files
//
// The site is taken from the GitHub Pages build (already built by GitHub, with fresh data), so
// nothing needs to be built on this computer. Wait until the GitHub "Deploy" action has finished.
// Options:
//   --from-dist          use the local dist/ folder instead (after `npm run build`)
//   --folder "<path>"    the OneDrive folder (otherwise read from deploy-aws.json, see below)
//   --media "<path>"     the media repository with the news photos (default: ../media)
//
// News photos from the media repository are copied too (into media/ of the OneDrive folder), because
// ennsmuseum.missouri.edu may not load files from GitHub.
//
// deploy-aws.json (next to package.json, not committed):  { "folder": "C:\\Users\\...\\ennsmuseum.missouri.edu" }
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SITE = 'https://enns-entomology-museum.github.io/Enns_Entomology_Museum_Database/'
const COST_PER_FILE = 0.005

const args = process.argv.slice(2)
const flag = (f) => args.includes(f)
const opt = (f) => (args.indexOf(f) >= 0 ? args[args.indexOf(f) + 1] : null)
const dryRun = flag('--dry-run')
const fromDist = flag('--from-dist')
const source = opt('--source') || SITE // a different web address, mainly for testing

let folder = opt('--folder')
if (!folder && existsSync('deploy-aws.json')) folder = JSON.parse(readFileSync('deploy-aws.json', 'utf8')).folder
if (!folder) {
  console.error('Which OneDrive folder? Create deploy-aws.json next to package.json, for example:\n' +
    '  { "folder": "C:\\\\Users\\\\davel\\\\OneDrive - University of Missouri\\\\ennsmuseum.missouri.edu" }\n' +
    'or run:  npm run deploy:aws -- --folder "C:\\path\\to\\ennsmuseum.missouri.edu"')
  process.exit(1)
}
if (!existsSync(folder)) {
  console.error(`The folder does not exist: ${folder}\nIs OneDrive syncing it? Check the path in deploy-aws.json.`)
  process.exit(1)
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex')

async function getText(path) {
  if (fromDist) return readFileSync(join('dist', path))
  const res = await fetch(source + path + '?nocache=' + Date.now(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} for ${source + path}`)
  return Buffer.from(await res.arrayBuffer())
}

// Node on Windows can crash with "Assertion failed ... async.c" when process.exit() is called while
// downloads are still closing, so the script ends by returning instead.
function fail() {
  process.exitCode = 1
}

async function deploySite() {
  let manifest
  try {
    manifest = JSON.parse((await getText('site-manifest.json')).toString('utf8'))
  } catch (e) {
    console.error(`Could not read the list of files (site-manifest.json): ${e.message}\n` +
      (fromDist ? 'Run `npm run build` and `npm run manifest` first.' : 'Has the GitHub Deploy action finished since the manifest was added?'))
    return fail()
  }

  const all = Object.entries(manifest.files).filter(([path]) => !path.endsWith('README.md'))
  const changed = all.filter(([path, info]) => {
    const local = join(folder, ...path.split('/'))
    return !existsSync(local) || sha(readFileSync(local)) !== info.sha256
  })
  // index.html last, so it never points to files that are not there yet
  changed.sort(([a], [b]) => (a === 'index.html') - (b === 'index.html') || a.localeCompare(b))

  console.log(`Site built ${manifest.generated} — ${all.length} files, ${changed.length} new or changed.`)
  if (!changed.length) {
    console.log('Nothing to copy: the OneDrive folder is up to date.')
    return
  }
  changed.forEach(([path]) => console.log('  ' + path))
  console.log(`${changed.length} file saves: they count toward the 400 included each month (≈ $${(changed.length * COST_PER_FILE).toFixed(2)} if over).`)
  if (dryRun) {
    console.log('Dry run: nothing copied. Run again without --dry-run to copy.')
    return
  }

  let n = 0
  for (const [path, info] of changed) {
    let buf
    try {
      buf = await getText(path)
    } catch (e) {
      console.error(`\nCould not get ${path}: ${e.message}. Copied ${n} files so far; run again later (it continues where it stopped).`)
      return fail()
    }
    if (sha(buf) !== info.sha256) {
      console.error(`\n${path} does not match the list (GitHub Pages is probably still updating). ` +
        `Copied ${n} files so far; wait a few minutes and run again (it continues where it stopped).`)
      return fail()
    }
    const local = join(folder, ...path.split('/'))
    mkdirSync(dirname(local), { recursive: true })
    writeFileSync(local, buf)
    n++
  }
  console.log(`Done: ${n} files copied to ${folder}. OneDrive will upload them in the next minutes.`)
}

// News photos: the media repository (next to this one, or "media" in deploy-aws.json) → media/ in the
// OneDrive folder. Only new or changed photos are copied; nothing is deleted.
function deployMedia() {
  let media = opt('--media')
  if (!media && existsSync('deploy-aws.json')) media = JSON.parse(readFileSync('deploy-aws.json', 'utf8')).media
  media = media || join('..', 'media')
  if (!existsSync(media)) {
    console.log(`\nNews photos: media folder not found (${media}); skipped.`)
    return
  }
  const files = []
  const walk = (dir, rel = '') => {
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.') || name === 'README.md') continue
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p, rel + name + '/')
      else files.push(rel + name)
    }
  }
  walk(media)
  const changed = files.filter((f) => {
    const local = join(folder, 'media', ...f.split('/'))
    return !existsSync(local) || sha(readFileSync(local)) !== sha(readFileSync(join(media, ...f.split('/'))))
  })
  console.log(`\nNews photos: ${files.length} in the media folder, ${changed.length} new or changed.`)
  changed.forEach((f) => console.log('  media/' + f))
  if (!changed.length || dryRun) return
  for (const f of changed) {
    const target = join(folder, 'media', ...f.split('/'))
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, readFileSync(join(media, ...f.split('/'))))
  }
  console.log(`Done: ${changed.length} photos copied.`)
}

async function main() {
  await deploySite()
  if (!process.exitCode) deployMedia()
}

await main()
