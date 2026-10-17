// Arranges the library's group tags into a tree (Heteroptera › Naucoridae).
//
// Each tag is looked up in the Catalogue of Life (GBIF if COL has no match);
// a tag is placed under the closest of your other tags found in its classification.
// Nothing needs to change in TaxonWorks — just tag a title with the group name.
//
// The tag's definition in TaxonWorks comes first, because many subfamilies and
// tribes are missing from those checklists: end it with the higher groups in
// brackets — "… the subfamily Brachycyrtinae (Hymenoptera: Ichneumonidae)" — or
// write "A subfamily of Ichneumonidae". The tag goes under the last group named
// (or under the closest of its higher groups that is itself a tag).
//
// Last resort: if a tag still ends up in the wrong place (or isn't a taxon name),
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

// Parent group named in a tag's definition, closest first:
//   "… the subfamily Brachycyrtinae (Hymenoptera: Ichneumonidae)" → "Ichneumonidae"
//   "A subfamily of Ichneumonidae"                                → "Ichneumonidae"
export function declaredParent(definition = '') {
  const text = String(definition)
  // last name inside the last (…), e.g. "(Hymenoptera: Ichneumonidae)"
  const paren = [...text.matchAll(/\(([^()]*)\)/g)].pop()
  if (paren) {
    const names = paren[1].match(/\b[A-Z][a-z]{2,}\b/g)
    if (names) return names.at(-1)
  }
  const m = text.match(/\b(?:of|in|within|under)\s+(?:the\s+)?(?:family\s+|order\s+|subfamily\s+|superfamily\s+)?([A-Z][a-z]{2,})\b/)
  return m ? m[1] : null
}

// tags: array of tag names; definitions: { tag: definition text } from TaxonWorks
// → Map(tag → parent tag or null)
export async function parentsOf(tags, definitions = {}) {
  const cache = readCache()
  const now = Date.now()
  const MONTH = 30 * 24 * 3600 * 1000
  const declared = {}
  tags.forEach((t) => {
    const d = declaredParent(definitions[t])
    if (d && d !== t) declared[t] = d
  })
  // names to classify: every tag, plus declared parents that are not tags themselves
  const names = [...new Set([...tags, ...Object.values(declared)])]
  const todo = names.filter((t) => !(t in PARENT_OVERRIDES) && !(cache[t] && now - cache[t].at < MONTH))
  await Promise.all(
    todo.map(async (t) => {
      cache[t] = { at: now, lineage: await lineageOf(t) }
    })
  )
  writeCache(cache)

  const set = new Set(tags)
  const nearestTag = (list) => list.find((x) => set.has(x)) || null
  const parents = new Map()
  tags.forEach((t) => {
    if (t in PARENT_OVERRIDES) {
      const p = PARENT_OVERRIDES[t]
      parents.set(t, p && set.has(p) ? p : null)
      return
    }
    const lineage = (cache[t]?.lineage || []).filter((x) => x !== t)
    const found = nearestTag(lineage)
    // Classification found a tagged group → use it, unless the definition names a closer one
    if (declared[t]) {
      const d = declared[t]
      const viaDefinition = set.has(d) ? d : nearestTag((cache[d]?.lineage || []).filter((x) => x !== t))
      parents.set(t, viaDefinition || found)
      return
    }
    parents.set(t, found)
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
