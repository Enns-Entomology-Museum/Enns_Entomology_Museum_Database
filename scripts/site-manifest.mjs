// Writes dist/site-manifest.json: every file of the built site with its size and SHA-256.
// Run after `npm run build` (the GitHub workflow does it). `npm run deploy:aws` reads this
// list to copy only new or changed files to the OneDrive folder of ennsmuseum.missouri.edu.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const dist = process.argv[2] || 'dist'
const SKIP = new Set(['site-manifest.json', 'README.md'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const files = {}
for (const p of walk(dist).sort()) {
  const rel = relative(dist, p).split(sep).join('/')
  if (SKIP.has(rel) || rel.endsWith('/README.md')) continue
  const buf = readFileSync(p)
  files[rel] = { size: buf.length, sha256: createHash('sha256').update(buf).digest('hex') }
}
writeFileSync(join(dist, 'site-manifest.json'), JSON.stringify({ generated: new Date().toISOString(), files }, null, 1))
console.log(`site-manifest.json: ${Object.keys(files).length} files`)
