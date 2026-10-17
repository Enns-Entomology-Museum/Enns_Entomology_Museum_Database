// Pests & invasive species of Missouri — data for pages/pests.vue
//
// What is shown is decided in TaxonWorks, not here:
//   • an OTU is listed when it carries one of the KEYWORDS below (tags);
//   • its details come from data attributes with the PREDICATES below;
//   • county records come from asserted distributions (literature, surveys),
//     from Enns Museum specimens (DwC occurrences), from GBIF (other collections
//     and surveys; GBIF's copy of iNaturalist is left out so nothing counts twice)
//     and from research-grade iNaturalist observations;
//   • hosts come from biological associations, extension text from Content.
import { makeAPIRequest } from '@/utils/request'
import { reactive } from 'vue'

export const KEYWORDS = ['Invasive in Missouri', 'Missouri pest', 'Regulated / watch list']
export const PREDICATES = {
  category: 'Pest category',
  status: 'Invasive status',
  first: 'First Missouri record'
}
// Allowed values, in display order (from the predicate definitions)
export const STATUSES = ['Established invasive', 'Under surveillance', 'Native pest']
export const CATEGORIES = [
  'Field crops',
  'Fruit & vegetables',
  'Forest / urban trees',
  'Ornamentals & nursery',
  'Stored products',
  'Structural',
  'Medical & veterinary'
]

const INAT = 'https://api.inaturalist.org/v1'
const INAT_MISSOURI = 28 // iNaturalist place id
const INAT_PAGES = 3 // up to 600 observations per species
const GBIF = 'https://api.gbif.org/v1'
const GBIF_MISSOURI = 'USA.26_1' // GADM id
const GBIF_INAT_DATASET = '50c9509d-22c7-4a22-a47d-8c48425ef4a7' // iNaturalist research-grade observations

const state = reactive({
  loaded: false,
  error: false,
  species: [], // see makeSpecies()
  counties: null // GeoJSON features of Missouri counties
})
let started = false

const lower = (s) => String(s || '').trim().toLowerCase()

// County names as written on labels / in TaxonWorks → names on the county map
export function countyKey(c = '') {
  return String(c)
    .replace(/\s+(county|co\.?)$/i, '')
    .replace(/^saint\s+/i, 'St. ')
    .replace(/^ste?\.?\s+genevieve$/i, 'Ste. Genevieve')
    .replace(/^st\.?\s+/i, 'St. ')
    .trim()
    .toLowerCase()
}

async function getAll(url, params = {}) {
  const { data } = await makeAPIRequest.get(url, { params: { per: 5000, ...params } })
  return Array.isArray(data) ? data : []
}

// ── Missouri counties (for placing iNaturalist points) ──────────────────────
async function loadCounties() {
  if (state.counties) return state.counties
  const base = import.meta.env.BASE_URL || '/'
  const geo = await fetch(`${base}data/mo-counties.json`).then((r) => r.json())
  state.counties = geo.features.map((f) => {
    const ring = f.geometry.coordinates[0]
    const xs = ring.map((p) => p[0])
    const ys = ring.map((p) => p[1])
    return {
      key: countyKey(f.properties.name),
      rings: f.geometry.coordinates,
      box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    }
  })
  return state.counties
}

function inRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function countyAt(lng, lat) {
  for (const c of state.counties || []) {
    const [x0, y0, x1, y1] = c.box
    if (lng < x0 || lng > x1 || lat < y0 || lat > y1) continue
    if (inRing(lng, lat, c.rings[0]) && !c.rings.slice(1).some((h) => inRing(lng, lat, h))) return c.key
  }
  return null
}

// ── One species ─────────────────────────────────────────────────────────────
function makeSpecies(otu, taxonName) {
  return reactive({
    otuId: otu.id,
    taxonNameId: otu.taxon_name_id,
    name: taxonName?.cached || String(otu.object_tag || '').replace(/<[^>]+>/g, ''),
    author: taxonName?.cached_author_year || '',
    order: '',
    family: '',
    common: '',
    keywords: [],
    categories: [],
    status: '',
    firstRecord: '',
    photo: null, // { thumb, medium, credit, source }
    inatId: null,
    hosts: [], // { name, relationship }
    texts: [], // { topic, text }
    // county key → { reported: [{ year, source }], museum: n, gbif: n, inat: n, firstYear }
    records: {},
    months: Array(12).fill(0),
    inatLoaded: false,
    inatTotal: null,
    gbifKey: null,
    gbifTotal: null
  })
}

function addRecord(sp, key, kind, extra = {}) {
  if (!key) return
  const r = (sp.records[key] ||= { reported: [], museum: 0, gbif: 0, inat: 0, firstYear: null })
  if (kind === 'reported') r.reported.push(extra)
  else r[kind] += extra.n || 1
  const y = Number(extra.year)
  if (y && (!r.firstYear || y < r.firstYear)) r.firstYear = y
}

// ── Loading ─────────────────────────────────────────────────────────────────
export function usePests(missouriRecords) {
  if (started || import.meta.env.SSR) return state
  started = true
  load(missouriRecords).catch(() => (state.error = true))
  return state
}

async function load(missouri) {
  const terms = await getAll('/controlled_vocabulary_terms')
  const keywords = terms.filter((t) => t.type === 'Keyword' && KEYWORDS.map(lower).includes(lower(t.name)))
  const predicates = Object.fromEntries(
    Object.entries(PREDICATES).map(([k, name]) => [k, terms.find((t) => t.type === 'Predicate' && lower(t.name) === lower(name))])
  )
  if (!keywords.length) {
    state.loaded = true
    return
  }

  // Tagged OTUs
  const tags = await getAll('/tags', { 'keyword_id[]': keywords.map((k) => k.id), tag_object_type: 'Otu' })
  const keywordsOf = new Map()
  tags
    .filter((t) => t.tag_object_type === 'Otu')
    .forEach((t) => {
      if (!keywordsOf.has(t.tag_object_id)) keywordsOf.set(t.tag_object_id, new Set())
      keywordsOf.get(t.tag_object_id).add(t.keyword?.name || keywords.find((k) => k.id === t.keyword_id)?.name)
    })
  const otuIds = [...keywordsOf.keys()]
  if (!otuIds.length) {
    state.loaded = true
    return
  }

  const otus = await getAll('/otus', { 'otu_id[]': otuIds })
  const names = await getAll('/taxon_names', { 'taxon_name_id[]': otus.map((o) => o.taxon_name_id).filter(Boolean) })
  const nameById = new Map(names.map((n) => [n.id, n]))
  const species = otus.map((o) => {
    const sp = makeSpecies(o, nameById.get(o.taxon_name_id))
    sp.keywords = [...(keywordsOf.get(o.id) || [])]
    return sp
  })
  const byOtu = new Map(species.map((s) => [s.otuId, s]))

  // Data attributes
  const predIds = Object.values(predicates).filter(Boolean).map((p) => p.id)
  if (predIds.length) {
    const attrs = await getAll('/data_attributes', {
      'controlled_vocabulary_term_id[]': predIds,
      attribute_subject_type: 'Otu'
    })
    attrs.forEach((a) => {
      const sp = byOtu.get(a.attribute_subject_id)
      if (!sp) return
      const v = String(a.value || '').trim()
      if (a.controlled_vocabulary_term_id === predicates.category?.id) sp.categories.push(v)
      if (a.controlled_vocabulary_term_id === predicates.status?.id) sp.status = v
      if (a.controlled_vocabulary_term_id === predicates.first?.id) sp.firstRecord = v
    })
  }

  state.species = species.sort((a, b) => a.name.localeCompare(b.name))
  state.loaded = true

  // Everything below fills in as it arrives
  await loadCounties().catch(() => {})
  await Promise.allSettled([
    loadTaxonomy(species),
    loadCommonNames(species, otuIds),
    loadDistributions(byOtu, otuIds),
    loadHosts(byOtu, otuIds),
    loadTexts(byOtu, otuIds),
    loadPhotos(byOtu, otuIds)
  ])
  // Enns Museum records are loaded by the checklist code; wait for them (max ~20 s)
  for (let i = 0; i < 80 && missouri && !missouri.loaded; i++) await new Promise((r) => setTimeout(r, 250))
  loadMuseum(species, missouri)
  // GBIF and iNaturalist: a couple of species at a time
  const queue = [...species]
  const worker = async () => {
    while (queue.length) {
      const sp = queue.shift()
      await Promise.allSettled([loadGbif(sp), loadInat(sp)])
    }
  }
  await Promise.all([worker(), worker()])
}

async function loadTaxonomy(species) {
  await Promise.all(
    species
      .filter((sp) => sp.taxonNameId)
      .map(async (sp) => {
        const anc = await getAll('/taxon_names', { 'taxon_name_id[]': [sp.taxonNameId], ancestors: true, per: 60 })
        sp.order = anc.find((n) => n.rank === 'order')?.cached || ''
        sp.family = anc.find((n) => n.rank === 'family')?.cached || ''
      })
  )
}

async function loadCommonNames(species, otuIds) {
  const rows = await getAll('/common_names', { 'otu_id[]': otuIds })
  rows.forEach((c) => {
    const sp = species.find((s) => s.otuId === c.otu_id)
    if (sp && !sp.common && (!c.language || /eng/i.test(c.language?.english_name || c.language || 'eng'))) sp.common = c.name
  })
}

async function loadDistributions(byOtu, otuIds) {
  const rows = await getAll('/asserted_distributions', { 'otu_id[]': otuIds, 'extend[]': ['citations'] })
  rows.forEach((d) => {
    const sp = byOtu.get(d.asserted_distribution_object_id)
    const shape = d.asserted_distribution_shape || {}
    if (!sp || d.is_absent) return
    const inMissouri = /missouri/i.test(shape.parent?.name || '') || (state.counties || []).some((c) => c.key === countyKey(shape.name))
    if (!inMissouri || /^missouri$/i.test(shape.name || '')) return
    const cites = d.citations || []
    const sources = cites.map((c) => String(c.source?.name || '').replace(/<[^>]+>/g, ''))
    const years = sources.map((s) => Number((s.match(/\((\d{4})\)/) || [])[1])).filter(Boolean)
    addRecord(sp, countyKey(shape.name), 'reported', { year: years.length ? Math.min(...years) : null, source: sources[0] || '' })
  })
}

async function loadHosts(byOtu, otuIds) {
  const rows = await getAll('/biological_associations', {
    'otu_query[otu_id][]': otuIds,
    'extend[]': ['subject', 'object', 'biological_relationship']
  })
  rows.forEach((a) => {
    const sideOf = (e) => (e?.base_class === 'Otu' ? byOtu.get(e.id) : null)
    const sp = sideOf(a.subject) || sideOf(a.object)
    if (!sp) return
    const us = sideOf(a.subject) ? a.subject : a.object
    const other = us === a.subject ? a.object : a.subject
    const rel = a.biological_relationship || {}
    const name = String(other?.object_label || other?.object_tag || '').replace(/<[^>]+>/g, '')
    const relationship = us === a.subject ? rel.name : rel.inverted_name || rel.name
    if (name && !sp.hosts.some((h) => h.name === name)) sp.hosts.push({ name, relationship: relationship || '' })
  })
}

async function loadTexts(byOtu, otuIds) {
  const rows = await getAll('/contents', { 'otu_id[]': otuIds })
  rows.forEach((c) => {
    const sp = byOtu.get(c.otu_id)
    if (sp && c.text) sp.texts.push({ topic: c.topic?.name || '', text: c.text })
  })
}

async function loadPhotos(byOtu, otuIds) {
  const deps = await getAll('/depictions', { depiction_object_type: 'Otu', 'depiction_object_id[]': otuIds })
  if (!deps.length) return
  const { data } = await makeAPIRequest.get('/depictions/gallery', { params: { 'depiction_id[]': deps.map((d) => d.id) } })
  ;(data || []).forEach((d) => {
    const sp = byOtu.get(d.depiction_object_id)
    if (sp && !sp.photo && d.image) {
      sp.photo = { thumb: d.image.thumb, medium: d.image.medium, credit: d.attribution?.label || '', source: 'Enns Museum' }
    }
  })
}

// Enns Museum specimens from Missouri (already loaded for the checklist)
function loadMuseum(species, missouri) {
  const records = missouri?.records || []
  species.forEach((sp) => {
    const n = lower(sp.name)
    records
      .filter((r) => lower([r.genus, r.specificEpithet].filter(Boolean).join(' ')) === n || lower(r.scientificName).startsWith(n))
      .forEach((r) => {
        addRecord(sp, countyKey(r.county), 'museum', { year: Number(String(r.eventDate || r.year || '').slice(0, 4)) || null })
        const m = Number(r.month || String(r.eventDate || '').slice(5, 7))
        if (m >= 1 && m <= 12) sp.months[m - 1] += 1
      })
  })
}

// Research-grade iNaturalist observations in Missouri (obscured points skipped)
async function loadInat(sp) {
  const q = sp.name.replace(/ sp\.$/, '')
  const t = await fetch(`${INAT}/taxa?${new URLSearchParams({ q, per_page: 5, is_active: true })}`).then((r) => r.json())
  const hit = (t.results || []).find((x) => lower(x.name) === lower(q))
  if (!hit) {
    sp.inatLoaded = true
    return
  }
  sp.inatId = hit.id
  if (!sp.common && hit.preferred_common_name) sp.common = hit.preferred_common_name
  if (!sp.photo && hit.default_photo) {
    sp.photo = {
      thumb: hit.default_photo.square_url,
      medium: hit.default_photo.medium_url,
      credit: hit.default_photo.attribution || '',
      source: 'iNaturalist'
    }
  }
  let idAbove = 0
  for (let page = 0; page < INAT_PAGES; page++) {
    const params = new URLSearchParams({
      taxon_id: hit.id,
      place_id: INAT_MISSOURI,
      quality_grade: 'research',
      per_page: 200,
      order_by: 'id',
      order: 'asc',
      id_above: idAbove
    })
    const o = await fetch(`${INAT}/observations?${params}`).then((r) => r.json())
    if (page === 0) sp.inatTotal = o.total_results
    const rows = o.results || []
    rows.forEach((r) => {
      const m = Number(String(r.observed_on || '').slice(5, 7))
      if (m >= 1 && m <= 12) sp.months[m - 1] += 1
      if (r.obscured || !r.location) return
      const [lat, lng] = r.location.split(',').map(Number)
      addRecord(sp, countyAt(lng, lat), 'inat', { year: Number(String(r.observed_on || '').slice(0, 4)) || null })
    })
    if (rows.length < 200) break
    idAbove = rows[rows.length - 1].id
  }
  sp.inatLoaded = true
}

// GBIF county names (GADM level 2) → county keys
let gbifCounties = null
async function gbifCountyNames() {
  if (!gbifCounties) {
    gbifCounties = fetch(`${GBIF}/geocode/gadm/${GBIF_MISSOURI}/subdivisions`)
      .then((r) => r.json())
      .then((rows) => new Map((rows || []).map((c) => [c.id, countyKey(c.name)])))
  }
  return gbifCounties
}

// GBIF occurrences in Missouri, per county and month, minus GBIF's copy of iNaturalist
async function loadGbif(sp) {
  const q = sp.name.replace(/ sp\.$/, '')
  const m = await fetch(`${GBIF}/species/match?${new URLSearchParams({ name: q, class: 'Insecta' })}`).then((r) => r.json())
  if (!m.usageKey || m.matchType === 'NONE' || m.rank !== 'SPECIES') return
  sp.gbifKey = m.usageKey
  const facets = (extra = '') =>
    fetch(
      `${GBIF}/occurrence/search?taxonKey=${m.usageKey}&gadmGid=${GBIF_MISSOURI}&occurrenceStatus=PRESENT&limit=0&facet=gadmLevel2Gid&facet=month&facetLimit=200${extra}`
    ).then((r) => r.json())
  const [all, inat, names] = await Promise.all([facets(), facets(`&datasetKey=${GBIF_INAT_DATASET}`), gbifCountyNames()])
  const counts = (d, field) => new Map(((d.facets || []).find((f) => f.field === field)?.counts || []).map((c) => [c.name, c.count]))
  sp.gbifTotal = (all.count || 0) - (inat.count || 0)
  const iCounty = counts(inat, 'GADM_LEVEL_2_GID')
  counts(all, 'GADM_LEVEL_2_GID').forEach((n, gid) => {
    const left = n - (iCounty.get(gid) || 0)
    if (left > 0) addRecord(sp, names.get(gid), 'gbif', { n: left })
  })
  const iMonth = counts(inat, 'MONTH')
  counts(all, 'MONTH').forEach((n, mo) => {
    const left = n - (iMonth.get(mo) || 0)
    if (left > 0 && mo >= 1 && mo <= 12) sp.months[mo - 1] += left
  })
}

// Strongest evidence for a county: museum specimen > reported > other records (GBIF, iNaturalist)
export function evidenceOf(r) {
  if (!r) return null
  if (r.museum) return 'museum'
  if (r.reported.length) return 'reported'
  if (r.gbif || r.inat) return 'other'
  return null
}
