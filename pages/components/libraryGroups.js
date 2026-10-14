// Arranges the library's group tags into a tree (Heteroptera › Naucoridae).
//
// Each tag is looked up in the Catalogue of Life (GBIF if COL has no match);
// a tag is placed under the closest of your other tags found in its classification.
// Nothing needs to change in TaxonWorks — just tag a title with the group name.
//
// Corrections: if a tag ends up in the wrong place (or isn't a taxon name),
// set its parent here. Use null to force a tag to the top level.
export const PARENT_OVERRIDES = {
  Chilopoda: 'Myriapoda', // COL places Chilopoda directly under Arthropoda
  Cryptinae: 'Ichneumonidae' // subfamily not matched in COL
}

const CACHE_KEY = 'eem-lib-classification-v1'
const COL = 'https://api.checklistbank.org/dataset/3LR/match/nameusage'
const GBIF = 'https://api.gbif.org/v1/species/match'

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}
function writeCache(c) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c))
  } catch {
    /* private mode etc. */
  }
}

// Higher taxa of one name, closest first
async function lineageOf(name) {
  try {
    const r = await (await fetch(`${COL}?q=${encodeURIComponent(name)}`)).json()
    if (r?.usage?.classification?.length) return r.usage.classification.map((c) => c.name)
  } catch {
    /* try GBIF */
  }
  try {
    const g = await (await fetch(`${GBIF}?name=${encodeURIComponent(name)}&kingdom=Animalia`)).json()
    if (g && g.matchType !== 'NONE') {
      return [g.genus, g.family, g.order, g.class, g.phylum, g.kingdom].filter((x) => x && x !== name)
    }
  } catch {
    /* unknown */
  }
  return []
}

// tags: array of tag names → Map(tag → parent tag or null)
export async function parentsOf(tags) {
  const cache = readCache()
  const now = Date.now()
  const MONTH = 30 * 24 * 3600 * 1000
  const todo = tags.filter((t) => !(t in PARENT_OVERRIDES) && !(cache[t] && now - cache[t].at < MONTH))
  await Promise.all(
    todo.map(async (t) => {
      cache[t] = { at: now, lineage: await lineageOf(t) }
    })
  )
  writeCache(cache)

  const set = new Set(tags)
  const parents = new Map()
  tags.forEach((t) => {
    if (t in PARENT_OVERRIDES) {
      const p = PARENT_OVERRIDES[t]
      parents.set(t, p && set.has(p) ? p : null)
      return
    }
    const lineage = cache[t]?.lineage || []
    parents.set(t, lineage.find((x) => set.has(x) && x !== t) || null)
  })
  // guard against loops from odd overrides
  parents.forEach((p, t) => {
    const seen = new Set([t])
    let cur = p
    while (cur) {
      if (seen.has(cur)) {
        parents.set(t, null)
        break
      }
      seen.add(cur)
      cur = parents.get(cur)
    }
  })
  return parents
}
