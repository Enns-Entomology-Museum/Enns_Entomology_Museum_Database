// Live data for the Enns Entomology Museum pages, straight from TaxonWorks.
import { makeAPIRequest } from '@/utils/request'
import { reactive } from 'vue'

// Rough size of the physical collection, for the digitization meter
export const COLLECTION_ESTIMATE = 7000000

// How many recent DwC records to pull for the breakdowns and the map.
// While the database is small this is "everything"; later it becomes a sample.
const SAMPLE = 1000

const state = reactive({
  stats: {},
  records: [], // DwC occurrences (latest first)
  totalRecords: null,
  loaded: false,
  error: false
})

let started = false

export function useEem() {
  if (started || import.meta.env.SSR) return state
  started = true

  Promise.allSettled([
    makeAPIRequest.get('/stats').then(({ data }) => {
      state.stats = data?.data || {}
    }),
    makeAPIRequest
      .get('/dwc_occurrences.json', { params: { per: SAMPLE } })
      .then(({ data, headers }) => {
        const rows = Array.isArray(data) ? data : []
        state.totalRecords = Number(headers['pagination-total']) || rows.length
        state.records = rows.sort((a, b) => (b.id || 0) - (a.id || 0))
      })
  ])
    .then((res) => {
      state.error = res.every((r) => r.status === 'rejected')
    })
    .finally(() => (state.loaded = true))

  return state
}

export function countBy(rows, key) {
  const map = new Map()
  rows.forEach((r) => {
    const k = (r[key] || '').trim()
    if (!k) return
    map.set(k, (map.get(k) || 0) + 1)
  })
  return [...map.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
}

export function fmt(n) {
  return typeof n === 'number' && Number.isFinite(n) ? n.toLocaleString('en-US') : '—'
}

// Common names for insect orders (for visitors who are not entomologists)
export const ORDER_NAMES = {
  Coleoptera: 'Beetles',
  Lepidoptera: 'Butterflies & moths',
  Hymenoptera: 'Bees, wasps & ants',
  Diptera: 'True flies',
  Hemiptera: 'True bugs',
  Orthoptera: 'Grasshoppers & crickets',
  Odonata: 'Dragonflies & damselflies',
  Ephemeroptera: 'Mayflies',
  Plecoptera: 'Stoneflies',
  Trichoptera: 'Caddisflies',
  Neuroptera: 'Lacewings',
  Megaloptera: 'Dobsonflies',
  Blattodea: 'Cockroaches & termites',
  Mantodea: 'Mantises',
  Phasmida: 'Stick insects',
  Dermaptera: 'Earwigs',
  Psocodea: 'Lice & barklice',
  Thysanoptera: 'Thrips',
  Siphonaptera: 'Fleas',
  Mecoptera: 'Scorpionflies',
  Strepsiptera: 'Twisted-wing parasites',
  Raphidioptera: 'Snakeflies',
  Embioptera: 'Webspinners',
  Zygentoma: 'Silverfish',
  Archaeognatha: 'Jumping bristletails'
}

// ── Loans ────────────────────────────────────────────────────────────────
// TaxonWorks has no public loans endpoint, but the specimen filter knows which
// specimens have been loaned and which are out now. Borrowers and loan
// paperwork stay private; only counts, taxa and due-back dates are shown.
export const normCat = (c = '') => String(c).replace(/\s+/g, '').toUpperCase()

const loanState = reactive({
  loaded: false,
  everLoaned: null,
  items: [] // specimens currently on loan: { cat, order, family, name, due }
})
let loansStarted = false

export function useLoans() {
  if (loansStarted || import.meta.env.SSR) return loanState
  loansStarted = true

  const everReq = makeAPIRequest
    .get('/collection_objects', { params: { loaned: true, per: 1 } })
    .then(({ headers }) => {
      loanState.everLoaned = Number(headers['pagination-total'])
    })

  const outReq = makeAPIRequest
    .get('/collection_objects', {
      params: { on_loan: true, per: 500, 'extend[]': ['dwc_fields', 'taxon_determinations'] }
    })
    .then(({ data }) => {
      loanState.items = (Array.isArray(data) ? data : []).map((co) => {
        const d = co.dwc || {}
        const tag = co.taxon_determinations?.[0]?.object?.object_tag || ''
        const due = (tag.match(/On Loan until (\d{4}-\d{2}-\d{2})/) || [])[1] || ''
        return {
          cat: normCat(d.catalogNumber),
          order: d.order || '',
          family: d.family || '',
          name: [d.genus, d.specificEpithet].filter(Boolean).join(' ') || d.family || d.order || 'Unidentified',
          due
        }
      })
    })

  Promise.allSettled([everReq, outReq]).finally(() => (loanState.loaded = true))
  return loanState
}

// Full loan history (number of loans, specimens per loan, taxa), exported from
// TaxonWorks when the site is built — see scripts/tw-loans.mjs. Null until that
// export exists; the page then falls back to the counts above.
const loanSummary = reactive({ loaded: false, data: null })
let summaryStarted = false

export function useLoanSummary() {
  if (summaryStarted || import.meta.env.SSR) return loanSummary
  summaryStarted = true
  const base = import.meta.env.BASE_URL || '/'
  fetch(`${base}data/loans-summary.json`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d && d.totals && Array.isArray(d.loans)) loanSummary.data = d
    })
    .catch(() => {})
    .finally(() => (loanSummary.loaded = true))
  return loanSummary
}

// ── Collectors ───────────────────────────────────────────────────────────
// recordedBy can hold several people separated by "|" (TaxonWorks) or ";"
export function collectorsOf(r) {
  return String(r?.recordedBy || '')
    .split(/\s*[|;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// ── Missouri records (county map and checklist) ───────────────────────────
const moState = reactive({ loaded: false, records: [], total: null })
let moStarted = false

export function useMissouri() {
  if (moStarted || import.meta.env.SSR) return moState
  moStarted = true
  makeAPIRequest
    .get('/dwc_occurrences.json', { params: { stateProvince: 'Missouri', per: 10000 } })
    .then(({ data, headers }) => {
      const rows = (Array.isArray(data) ? data : []).filter((r) => r.stateProvince === 'Missouri')
      moState.records = rows
      moState.total = Number(headers['pagination-total']) || rows.length
    })
    .catch(() => {})
    .finally(() => (moState.loaded = true))
  return moState
}

// County names as written on labels → names on the county map
export function normCounty(c = '') {
  return String(c)
    .replace(/\s+(county|co\.?)$/i, '')
    .replace(/^saint\s+/i, 'St. ')
    .replace(/^ste?\.?\s+genevieve$/i, 'Ste. Genevieve')
    .replace(/^st\.?\s+/i, 'St. ')
    .trim()
    .toLowerCase()
}

// ── Specimen photos ──────────────────────────────────────────────────────
const imgState = reactive({ loaded: false, items: [] })
let imgStarted = false

export function useSpecimenImages() {
  if (imgStarted || import.meta.env.SSR) return imgState
  imgStarted = true
  makeAPIRequest
    .get('/images', { params: { per: 60, 'extend[]': ['depictions'] } })
    .then(({ data }) => {
      imgState.items = (Array.isArray(data) ? data : [])
        .map((im) => {
          const label = (im.depictions || []).map((d) => d.label).join(' ')
          const m = label.match(/EEM\s?\d{6,9}/i)
          return { id: im.id, thumb: im.thumb, medium: im.medium, cat: m ? normCat(m[0]) : '' }
        })
        .filter((i) => i.medium)
    })
    .catch(() => {})
    .finally(() => (imgState.loaded = true))
  return imgState
}

// ── Catalog number lookup ────────────────────────────────────────────────
// Some catalog numbers were created as "EEM 000000001" (with a space) before the
// namespace changed to "EEM000000001". Look up every spelling so both work.
export function catalogVariants(text = '') {
  const t = String(text).trim()
  const out = [t.toUpperCase()]
  const digits = t.replace(/\D/g, '')
  if (digits && /^(eem)?[\s.-]*\d{1,9}$/i.test(t)) {
    const n = digits.padStart(9, '0')
    out.push(`EEM${n}`, `EEM ${n}`)
  }
  return [...new Set(out.filter(Boolean))]
}

export async function findByCatalog(text) {
  const variants = catalogVariants(text)
  const results = await Promise.all(
    variants.map((c) =>
      makeAPIRequest
        .get('/dwc_occurrences.json', { params: { catalogNumber: c, per: 1 } })
        .then(({ data }) => (Array.isArray(data) && data[0]) || null)
        .catch(() => null)
    )
  )
  return results.find(Boolean) || null
}

// Type status from a DwC row → { label, primary } (primary = name-bearing, shown in red,
// as on red type labels), or null if the specimen is not a type.
const PRIMARY_TYPES = ['holotype', 'lectotype', 'neotype', 'syntype']
export function typeInfo(typeStatus) {
  const s = String(typeStatus || '').split('|')[0].trim()
  if (!s) return null
  const kind = s.split(/\s+/)[0].toLowerCase()
  return { label: kind.charAt(0).toUpperCase() + kind.slice(1), primary: PRIMARY_TYPES.includes(kind) }
}

// ── Type collection (collection objects with type material) ──────────────
// One row per specimen and type designation; shared by the home page band.
export const TYPE_ORDER = ['holotype', 'lectotype', 'neotype', 'syntype', 'paralectotype', 'paratype', 'allotype', 'topotype']
const typesState = reactive({ loaded: false, rows: [] })
let typesStarted = false

export function useTypes() {
  if (typesStarted || import.meta.env.SSR) return typesState
  typesStarted = true
  makeAPIRequest
    .get('/collection_objects', { params: { type_material: true, per: 2000, 'extend[]': ['dwc_fields', 'type_material'] } })
    .then(({ data }) => {
      const out = []
      ;(Array.isArray(data) ? data : []).forEach((co) => {
        const d = co.dwc || {}
        const tms = co.type_materials?.length ? co.type_materials : [{ type_type: d.typeStatus || 'type' }]
        tms.forEach((tm) => {
          const kind = String(tm.type_type || d.typeStatus || 'type').split(/\s+/)[0].toLowerCase()
          const name = [d.genus, d.specificEpithet].filter(Boolean).join(' ') || d.scientificName || 'Unidentified'
          out.push({ id: `${co.id}-${kind}`, coId: co.id, kind, primary: PRIMARY_TYPES.includes(kind), name, cat: d.catalogNumber || '', order: d.order || '', family: d.family || '' })
        })
      })
      typesState.rows = out
    })
    .catch(() => (typesState.rows = []))
    .finally(() => (typesState.loaded = true))
  return typesState
}

// counts per kind, in nomenclatural order: [{ kind, label, n, primary }]
export function typeKinds(rows) {
  const m = new Map()
  rows.forEach((r) => m.set(r.kind, (m.get(r.kind) || 0) + 1))
  const rank = (k) => (TYPE_ORDER.indexOf(k) < 0 ? 99 : TYPE_ORDER.indexOf(k))
  return [...m.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([kind, n]) => ({ kind, n, label: kind.charAt(0).toUpperCase() + kind.slice(1) + (n === 1 ? '' : 's'), primary: PRIMARY_TYPES.includes(kind) }))
}
