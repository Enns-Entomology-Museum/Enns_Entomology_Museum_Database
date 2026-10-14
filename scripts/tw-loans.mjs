// Builds public/data/loans-summary.json: how many loans the museum has made and
// how many specimens went out in each, with no names, addresses or e-mails.
//
//   TW_USER_TOKEN=xxxx node scripts/tw-loans.mjs        (or: npm run data:loans)
//
// Loans are not in TaxonWorks' public API, so this reads them with a personal
// TaxonWorks API token. In GitHub the token is stored as the repository secret
// TW_USER_TOKEN and only used while the site is being built; it never reaches the
// published site. Without a token, or if anything goes wrong, the existing file is
// kept and the build carries on.
//
// Counting specimens
//   - an item that is a specimen record counts that record's "total" (usually 1)
//   - an item that is a taxon with a count (e.g. "Elateridae — 500") counts that number
//   - a container (drawer, box, vial) counts its total if one was entered, otherwise 1
import { readFile, writeFile } from 'node:fs/promises'

const HOST = process.env.TW_HOST || 'https://sfg.taxonworks.org'
const PROJECT_ID = process.env.TW_PROJECT_ID || '101'
const PROJECT_TOKEN = process.env.TW_PROJECT_TOKEN || 'D--Lahpd8yWlU5-iHYwxUg'
const USER_TOKEN = process.env.TW_USER_TOKEN
const DEBUG = !!process.env.TW_DEBUG
const OUT = new URL('../public/data/loans-summary.json', import.meta.url)
const API = `${HOST}/api/v1`

const log = (...a) => console.log('[loans]', ...a)

async function get(url, { auth = false, tries = 3 } = {}) {
  const headers = { Accept: 'application/json' }
  if (auth) headers.Authorization = `Token ${USER_TOKEN}`
  for (let a = 1; ; a++) {
    try {
      const r = await fetch(url, { headers })
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${url.replace(USER_TOKEN || '¤', '***')}`)
      return await r.json()
    } catch (e) {
      if (a >= tries) throw e
      await new Promise((res) => setTimeout(res, 700 * a))
    }
  }
}

// Logged-in (project) endpoints: token in the header and in the query, project id in the query
const priv = (path, params = {}) => {
  const q = new URLSearchParams({ project_id: PROJECT_ID, token: USER_TOKEN, ...params })
  return get(`${HOST}${path}?${q}`, { auth: true })
}
// Public API endpoints
const pub = (path, params = {}) => {
  const q = new URLSearchParams({ project_token: PROJECT_TOKEN, ...params })
  return get(`${API}${path}?${q}`)
}

const firstOf = (o, keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined && v !== null && v !== '')
const yearOf = (d) => (d ? Number(String(d).slice(0, 4)) || null : null)

async function allLoans() {
  const out = []
  for (let page = 1; page < 50; page++) {
    const data = await priv('/loans.json', { per: 250, page })
    const list = Array.isArray(data) ? data : data?.loans || []
    out.push(...list)
    if (list.length < 250) break
  }
  return out
}

async function itemsOf(loan) {
  if (Array.isArray(loan.loan_items)) return loan.loan_items
  try {
    const data = await priv('/loan_items.json', { loan_id: loan.id, per: 5000 })
    const list = Array.isArray(data) ? data : data?.loan_items || []
    return list.filter((i) => !i.loan_id || i.loan_id === loan.id)
  } catch {
    const full = await priv(`/loans/${loan.id}.json`, { 'extend[]': 'loan_items' })
    return full?.loan_items || []
  }
}

// Order and family of a specimen record or a taxon, from the public API (cached)
const taxonCache = new Map()
async function classifyCollectionObject(id) {
  const key = `co:${id}`
  if (taxonCache.has(key)) return taxonCache.get(key)
  let res = { order: null, family: null, total: 1 }
  try {
    const co = await pub(`/collection_objects/${id}`, { 'extend[]': 'dwc_fields' })
    res = { order: co?.dwc?.order || null, family: co?.dwc?.family || null, total: Number(co?.total) || 1 }
  } catch {}
  taxonCache.set(key, res)
  return res
}
async function classifyOtu(id) {
  const key = `otu:${id}`
  if (taxonCache.has(key)) return taxonCache.get(key)
  let res = { order: null, family: null, name: null }
  try {
    const otu = await pub(`/otus/${id}`)
    res.name = otu?.name || otu?.object_label || null
    const tn = otu?.taxon_name_id
    if (tn) {
      const t = await pub(`/taxon_names/${tn}`, { 'extend[]': 'parents' })
      const chain = [...(t?.parents ? Object.values(t.parents).flat() : []), t].filter(Boolean)
      for (const p of chain) {
        const rank = String(p.rank || p.rank_string || '').toLowerCase()
        const name = p.cached || p.name
        if (rank.endsWith('order') && !rank.includes('sub') && !rank.includes('infra') && !rank.includes('super')) res.order = name
        if (rank.endsWith('family') && !rank.includes('sub') && !rank.includes('super')) res.family = name
      }
      res.name = res.name || t?.cached || t?.name
    }
  } catch {}
  taxonCache.set(key, res)
  return res
}

async function main() {
  if (!USER_TOKEN) {
    log('No TW_USER_TOKEN set — keeping the existing loans summary.')
    return
  }

  const loans = await allLoans()
  log(`${loans.length} loans found`)
  if (DEBUG && loans[0]) log('loan fields:', Object.keys(loans[0]).join(', '))

  const rows = []
  for (const loan of loans) {
    const items = await itemsOf(loan)
    if (DEBUG && items[0]) log('loan item fields:', Object.keys(items[0]).join(', '))

    const sent = firstOf(loan, ['date_sent', 'date_requested', 'created_at'])
    const closed = firstOf(loan, ['date_closed'])
    const received = firstOf(loan, ['date_received'])
    const due = firstOf(loan, ['date_return_expected'])
    const isGift = !!loan.is_gift

    let specimens = 0
    let records = 0
    let lots = 0
    const families = {}
    for (const it of items) {
      const type = firstOf(it, ['loan_item_object_type', 'object_type']) || ''
      const id = firstOf(it, ['loan_item_object_id', 'object_id'])
      const explicit = Number(it.total) || 0
      let n = 1
      let tax = { order: null, family: null }
      if (/CollectionObject|Specimen|Lot/i.test(type)) {
        tax = await classifyCollectionObject(id)
        n = explicit || tax.total || 1
        records++
      } else if (/Otu/i.test(type)) {
        tax = await classifyOtu(id)
        n = explicit || 1
        lots++
      } else {
        n = explicit || 1
        lots++
      }
      specimens += n
      const fam = tax.family || 'Unidentified'
      const ord = tax.order || 'Unknown order'
      families[`${ord}|${fam}`] = (families[`${ord}|${fam}`] || 0) + n
    }

    rows.push({
      year: yearOf(sent),
      sent: sent ? String(sent).slice(0, 10) : null,
      returned: (closed || received) ? String(closed || received).slice(0, 10) : null,
      due: due ? String(due).slice(0, 10) : null,
      status: closed ? 'closed' : 'open',
      gift: isGift,
      country: loan.recipient_country || null,
      items: items.length,
      records,
      lots,
      specimens,
      taxa: Object.entries(families)
        .map(([k, n]) => ({ order: k.split('|')[0], family: k.split('|')[1], specimens: n }))
        .sort((a, b) => b.specimens - a.specimens)
    })
  }

  rows.sort((a, b) => String(b.sent || '').localeCompare(String(a.sent || '')))

  const byYear = {}
  const byFamily = {}
  for (const r of rows) {
    if (r.year) {
      byYear[r.year] ||= { loans: 0, specimens: 0 }
      byYear[r.year].loans++
      byYear[r.year].specimens += r.specimens
    }
    for (const t of r.taxa) {
      const k = `${t.order}|${t.family}`
      byFamily[k] = (byFamily[k] || 0) + t.specimens
    }
  }
  const open = rows.filter((r) => r.status === 'open')
  const summary = {
    updated: new Date().toISOString().slice(0, 10),
    totals: {
      loans: rows.length,
      specimens: rows.reduce((s, r) => s + r.specimens, 0),
      openLoans: open.length,
      openSpecimens: open.reduce((s, r) => s + r.specimens, 0),
      firstYear: rows.some((r) => r.year) ? Math.min(...rows.map((r) => r.year).filter(Boolean)) : null,
      countries: new Set(rows.map((r) => r.country).filter(Boolean)).size
    },
    byYear: Object.entries(byYear)
      .map(([year, v]) => ({ year: Number(year), ...v }))
      .sort((a, b) => a.year - b.year),
    topFamilies: Object.entries(byFamily)
      .map(([k, specimens]) => ({ order: k.split('|')[0], family: k.split('|')[1], specimens }))
      .sort((a, b) => b.specimens - a.specimens)
      .slice(0, 15),
    loans: rows
  }

  await writeFile(OUT, JSON.stringify(summary, null, 1) + '\n')
  log(`wrote ${summary.totals.loans} loans, ${summary.totals.specimens} specimens`)
}

main().catch(async (e) => {
  console.warn('[loans] Could not refresh the loans summary:', e.message)
  try {
    await readFile(OUT)
    console.warn('[loans] Keeping the existing file.')
  } catch {
    console.warn('[loans] No previous file; the site will show the basic loan counts only.')
  }
  process.exit(0)
})
