// Builds public/data/eem-citations.json: publications that mention the Enns
// Entomology Museum (or its coden UMRM) in their text, found in OpenAlex and
// Europe PMC. They appear on the Research page as "found by text search" until
// they are confirmed in TaxonWorks (a source tagged with the keyword set in
// pages/research.vue). The search itself lives in pages/components/citationsHarvest.js.
//
//   node scripts/eem-citations.mjs        (or: npm run data:citations)
//
// Runs in the deploy workflow; never fails the build (the old file is kept).
import { writeFile } from 'node:fs/promises'
import { MAILTO, harvest } from '../pages/components/citationsHarvest.js'

const OUT = new URL('../public/data/eem-citations.json', import.meta.url)

async function getJson(url, tries = 4) {
  for (let a = 1; ; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': `Enns Entomology Museum (${MAILTO})` } })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return await r.json()
    } catch (e) {
      if (a >= tries) throw e
      await new Promise((res) => setTimeout(res, 1500 * a))
    }
  }
}

harvest(getJson)
  .then(async (items) => {
    if (!items.length) throw new Error('nothing found — keeping the previous file')
    await writeFile(OUT, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), items }))
    console.log(`Wrote ${items.length} publications to public/data/eem-citations.json`)
  })
  .catch((e) => {
    console.error(`Citations not updated: ${e.message}`)
    process.exitCode = 0
  })
