// Builds public/data/inat-missouri.json: every insect species with research-grade
// iNaturalist observations in Missouri, with order, family and observation counts.
//
//   node scripts/inat-missouri.mjs        (or: npm run data:inat)
//
// Run it after scripts/gbif-missouri.mjs: order and family are taken from the GBIF
// list when the name (or genus) is already there, and looked up on iNaturalist only
// for the rest. Takes a few minutes (iNaturalist asks for at most ~1 request/second).
// The deploy workflow runs it before each build; if iNaturalist is unreachable the
// existing file is kept and the build goes on.
import { readFile, writeFile } from 'node:fs/promises'

const I = 'https://api.inaturalist.org/v1'
const PLACE = 28 // Missouri
const INSECTA = 47158
const OUT = new URL('../public/data/inat-missouri.json', import.meta.url)
const GBIF = new URL('../public/data/gbif-missouri.json', import.meta.url)
const HEADERS = { 'User-Agent': 'Enns Entomology Museum checklist (University of Missouri)' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, tries = 4) {
  for (let a = 1; ; a++) {
    try {
      const r = await fetch(url, { headers: HEADERS })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    } catch (e) {
      if (a >= tries) throw e
      await sleep(2000 * a)
    }
  }
}

async function main() {
  // 1. Species with research-grade observations in Missouri
  const species = []
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ place_id: PLACE, taxon_id: INSECTA, quality_grade: 'research', per_page: 500, page })
    const d = await getJson(`${I}/observations/species_counts?${params}`)
    d.results.forEach((r) => {
      const t = r.taxon
      if (t.rank !== 'species' || t.extinct) return
      species.push({ id: t.id, name: t.name, common: t.preferred_common_name || '', n: r.count, anc: t.ancestor_ids || [] })
    })
    if (page * 500 >= d.total_results || !d.results.length) break
    await sleep(1100)
  }
  console.log(`${species.length} species — placing them in orders and families…`)

  // 2. Order and family: from the GBIF list when possible
  const byName = new Map()
  const byGenus = new Map()
  try {
    const g = JSON.parse(await readFile(GBIF, 'utf8'))
    g.species.forEach(([, name, fi]) => {
      const [family, oi] = g.families[fi] || []
      const place = { order: g.orders[oi] || '', family: family || '' }
      byName.set(name, place)
      const genus = name.split(' ')[0]
      if (!byGenus.has(genus)) byGenus.set(genus, place)
    })
  } catch {
    console.log('  (no GBIF list found; looking everything up on iNaturalist)')
  }
  species.forEach((s) => Object.assign(s, byName.get(s.name) || byGenus.get(s.name.split(' ')[0]) || {}))

  // 3. ...and from iNaturalist for the rest
  const missing = species.filter((s) => !s.order || !s.family)
  const ids = [...new Set(missing.flatMap((s) => s.anc))]
  const rankOf = new Map()
  for (let i = 0; i < ids.length; i += 30) {
    const d = await getJson(`${I}/taxa/${ids.slice(i, i + 30).join(',')}?per_page=30`)
    d.results.forEach((t) => rankOf.set(t.id, { rank: t.rank, name: t.name }))
    await sleep(1100)
  }
  missing.forEach((s) => {
    const of = (rank) => s.anc.map((id) => rankOf.get(id)).find((t) => t?.rank === rank)?.name || ''
    s.order ||= of('order')
    s.family ||= of('family')
  })

  const orders = [...new Set(species.map((s) => s.order || 'Unplaced'))].sort()
  const famKey = (s) => `${s.order || 'Unplaced'}|${s.family || 'Unplaced'}`
  const families = [...new Set(species.map(famKey))].sort()
  const oIdx = new Map(orders.map((o, i) => [o, i]))
  const fIdx = new Map(families.map((f, i) => [f, i]))

  const data = {
    updated: new Date().toISOString().slice(0, 10),
    observations: species.reduce((n, s) => n + s.n, 0),
    query: `https://www.inaturalist.org/observations?place_id=${PLACE}&taxon_id=${INSECTA}&quality_grade=research&view=species`,
    orders,
    families: families.map((f) => {
      const [o, name] = f.split('|')
      return [name, oIdx.get(o)]
    }),
    // [iNaturalist taxon id, name, family index, research-grade observations, common name]
    species: species
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => [s.id, s.name, fIdx.get(famKey(s)), s.n, s.common])
  }
  await writeFile(OUT, JSON.stringify(data))
  console.log(`Wrote ${data.species.length} species to public/data/inat-missouri.json`)

  // Species recorded by GBIF or iNaturalist together — the total shown on the home page,
  // the same number as the checklist page.
  try {
    const SUMMARY = new URL('../public/data/gbif-missouri-summary.json', import.meta.url)
    const GBIF = new URL('../public/data/gbif-missouri.json', import.meta.url)
    const g = JSON.parse(await readFile(GBIF, 'utf8'))
    const summary = JSON.parse(await readFile(SUMMARY, 'utf8'))
    const names = new Set([...g.species.map((s) => s[1]), ...data.species.map((s) => s[1])])
    summary.speciesAll = names.size
    await writeFile(SUMMARY, JSON.stringify(summary))
    console.log(`Missouri species, GBIF + iNaturalist: ${names.size}`)
  } catch (e) {
    console.warn(`Summary not updated: ${e.message}`)
  }
}

main().catch((e) => {
  console.error(`iNaturalist checklist not updated: ${e.message}`)
  process.exitCode = 0 // never block a deploy
})
