// Builds public/data/gbif-missouri.json: every insect species with GBIF occurrence
// records in Missouri (GADM USA.26_1), with order, family and record counts.
//
//   node scripts/gbif-missouri.mjs        (or: npm run data:gbif)
//
// Runs in about a minute. The deploy workflow runs it before each build, so the
// published checklist stays current; if GBIF is unreachable the existing file is kept.
import { writeFile } from 'node:fs/promises'

const G = 'https://api.gbif.org/v1'
const QUERY = 'gadmGid=USA.26_1&classKey=216&occurrenceStatus=PRESENT'
const OUT = new URL('../public/data/gbif-missouri.json', import.meta.url)
const SUMMARY = new URL('../public/data/gbif-missouri-summary.json', import.meta.url)

// Living insect orders only: a few Carboniferous fossils from Missouri are filed
// in GBIF as ordinary specimens and would otherwise show up as extra "orders".
const EXTANT_ORDERS = new Set([
  'Archaeognatha', 'Blattodea', 'Coleoptera', 'Dermaptera', 'Diptera', 'Embioptera', 'Ephemeroptera',
  'Hemiptera', 'Hymenoptera', 'Lepidoptera', 'Mantodea', 'Mecoptera', 'Megaloptera', 'Neuroptera',
  'Odonata', 'Orthoptera', 'Phasmida', 'Plecoptera', 'Psocodea', 'Raphidioptera', 'Siphonaptera',
  'Strepsiptera', 'Thysanoptera', 'Trichoptera', 'Zoraptera', 'Zygentoma'
])
// Fossil-only families inside living orders
const FOSSIL_FAMILIES = new Set(['Hemimylacridae', 'Orthomylacridae', 'Blattinopsidae', 'Cnemidolestidae'])
// GBIF placeholder names such as "Nomada spec"
const PLACEHOLDER = /\s(spec|sp|spp)\.?$/i

async function getJson(url, tries = 4) {
  for (let a = 1; ; a++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    } catch (e) {
      if (a >= tries) throw e
      await new Promise((res) => setTimeout(res, 800 * a))
    }
  }
}

async function main() {
  const facet = await getJson(`${G}/occurrence/search?${QUERY}&limit=0&facet=speciesKey&facetLimit=100000`)
  const keys = facet.facets[0].counts.map((c) => [Number(c.name), c.count])
  console.log(`${keys.length} species, ${facet.count} records — looking up names…`)

  const rows = new Array(keys.length)
  let next = 0
  let done = 0
  async function worker() {
    while (next < keys.length) {
      const j = next++
      const [key, n] = keys[j]
      try {
        const s = await getJson(`${G}/species/${key}`)
        rows[j] = { key, name: s.canonicalName || s.scientificName, order: s.order || '', family: s.family || 'Unplaced', n }
      } catch {
        rows[j] = null
      }
      if (++done % 500 === 0) console.log(`  ${done}/${keys.length}`)
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker))

  const resolved = rows.filter((r) => r && r.name)
  if (resolved.length < keys.length * 0.95) throw new Error(`Only ${resolved.length} of ${keys.length} names resolved`)
  const ok = resolved.filter(
    (r) => EXTANT_ORDERS.has(r.order) && !FOSSIL_FAMILIES.has(r.family) && !PLACEHOLDER.test(r.name)
  )

  // Compact layout: orders and families as lookup lists, species as rows
  const orders = [...new Set(ok.map((r) => r.order))].sort()
  const famKey = (r) => `${r.order}|${r.family}`
  const families = [...new Set(ok.map(famKey))].sort()
  const oIdx = new Map(orders.map((o, i) => [o, i]))
  const fIdx = new Map(families.map((f, i) => [f, i]))

  const data = {
    updated: new Date().toISOString().slice(0, 10),
    records: facet.count,
    query: `https://www.gbif.org/occurrence/search?gadm_gid=USA.26_1&class_key=216&occurrence_status=present`,
    orders,
    families: families.map((f) => {
      const [o, name] = f.split('|')
      return [name, oIdx.get(o)]
    }),
    // [gbif taxon key, canonical name, family index, number of records]
    species: ok
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => [r.key, r.name, fIdx.get(famKey(r)), r.n])
  }

  await writeFile(OUT, JSON.stringify(data))
  // Small file for the home page, so it doesn't load the full list
  await writeFile(
    SUMMARY,
    JSON.stringify({
      updated: data.updated,
      records: data.records,
      species: data.species.length,
      families: families.length,
      orders: orders.length
    })
  )
  console.log(`Wrote ${data.species.length} species in ${families.length} families to public/data/gbif-missouri.json`)
}

main().catch((e) => {
  console.error(`GBIF checklist not updated: ${e.message}`)
  process.exitCode = 0 // never block a deploy; the previous snapshot stays
})
