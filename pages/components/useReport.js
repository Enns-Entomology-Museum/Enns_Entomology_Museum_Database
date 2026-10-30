// Data for the museum newsletter / report (pages/report.vue)
//
// An issue covers one or two months. Everything in it comes from TaxonWorks:
// the news posts published in those months, and what was added to the database
// in the same period (specimens, taxa, images, type specimens).
import { makeAPIRequest } from '@/utils/request'
import { excerptOf, fetchNews } from './useNews.js'
import { normCounty } from './useEem.js'

// Publishing schedule: Issue 1 covers September–October 2026 (two months);
// from November 2026 the newsletter is monthly.
export const FIRST = { year: 2026, month: 9, months: 2 } // Issue 1: September–October 2026

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n) => String(n).padStart(2, '0')
const lastDay = (y, m) => new Date(y, m, 0).getDate()

// All issues from the first one to today, newest first
export function issues(today = new Date()) {
  const list = []
  let y = FIRST.year
  let m = FIRST.month
  let n = 1
  const endY = today.getFullYear()
  const endM = today.getMonth() + 1
  while (y < endY || (y === endY && m <= endM)) {
    const months = n === 1 ? FIRST.months : 1
    const m2 = m + months - 1
    const y2 = m2 > 12 ? y + 1 : y
    const mm2 = m2 > 12 ? m2 - 12 : m2
    const label =
      months === 1
        ? `${MONTHS[m - 1]} ${y}`
        : y === y2
          ? `${MONTHS[m - 1]}–${MONTHS[mm2 - 1]} ${y}`
          : `${MONTHS[m - 1]} ${y} – ${MONTHS[mm2 - 1]} ${y2}`
    list.push({
      n,
      // (the key keeps notes saved in this browser attached to their issue)
      key: `${months}-${y}-${pad(m)}`,
      label,
      from: `${y}-${pad(m)}-01`,
      to: `${y2}-${pad(mm2)}-${pad(lastDay(y2, mm2))}`,
      current: y2 > endY || (y2 === endY && mm2 >= endM)
    })
    n++
    m += months
    if (m > 12) {
      m -= 12
      y++
    }
  }
  return list.reverse()
}

async function total(url, params = {}) {
  try {
    const { headers, data } = await makeAPIRequest.get(url, { params: { per: 1, ...params } })
    const t = Number(headers['pagination-total'])
    return Number.isFinite(t) ? t : Array.isArray(data) ? data.length : null
  } catch {
    return null
  }
}

const created = (from, to) => ({ user_target: 'created', user_date_start: from, user_date_end: to })

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The `count` months ending with the month of `to` (YYYY-MM-DD), oldest first, each
// flagged when it falls inside the issue [from, to]
export function monthWindow(from, to, count = 12) {
  let y = Number(to.slice(0, 4))
  let m = Number(to.slice(5, 7))
  const out = []
  for (let i = 0; i < count; i++) {
    const start = `${y}-${pad(m)}-01`
    const end = `${y}-${pad(m)}-${pad(lastDay(y, m))}`
    out.unshift({ key: `${y}-${pad(m)}`, label: SHORT[m - 1], year: y, month: m, from: start, to: end, inIssue: end >= from && start <= to })
    m--
    if (m < 1) {
      m = 12
      y--
    }
  }
  return out
}

// Specimens digitized (collection objects created) in each of those months
export async function loadMonthly(from, to, count = 12) {
  const months = monthWindow(from, to, count)
  const counts = await Promise.all(months.map((mo) => total('/collection_objects', created(mo.from, mo.to))))
  return months.map((mo, i) => ({ ...mo, n: counts[i] ?? 0 }))
}

export async function loadIssue({ from, to }) {
  const dayBefore = (iso) => {
    const d = new Date(`${iso}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  const [news, specimens, toDate, taxa, images, types, records, monthly, atStart, before] = await Promise.all([
    fetchNews(100).catch(() => []),
    total('/collection_objects', created(from, to)),
    total('/collection_objects', created('2000-01-01', to)),
    total('/otus', created(from, to)),
    total('/images', created(from, to)),
    total('/collection_objects', { type_material: true, ...created(from, to) }),
    makeAPIRequest
      .get('/dwc_occurrences.json', { params: { per: 5000, ...created(from, to) } })
      .then(({ data }) => (Array.isArray(data) ? data : []))
      .catch(() => []),
    loadMonthly(from, to).catch(() => []),
    total('/collection_objects', created('2000-01-01', dayBefore(from))),
    allRecords(created('2000-01-01', dayBefore(from)))
  ])

  const inPeriod = (iso) => {
    const d = String(iso || '').slice(0, 10)
    return d >= from && d <= to
  }
  const inIssue = news.filter((n) => inPeriod(n.iso)).sort((a, b) => String(a.iso).localeCompare(String(b.iso)))
  // "Insect of the month": a news post whose title starts with "Insect of the month".
  // The latest one in the period goes on the front page; it is not repeated with the stories.
  const insectPosts = inIssue.filter((n) => isInsectPost(n.title))
  const insect = insectPosts.length ? toInsect(insectPosts[insectPosts.length - 1]) : null
  const stories = inIssue.filter((n) => !isInsectPost(n.title))

  // What was digitized: by order, species, counties
  const byOrder = new Map()
  const species = new Set()
  const places = new Set()
  const byCounty = {} // 'boone' → specimens digitized this issue (Missouri)
  records.forEach((r) => {
    const o = r.order || 'Unplaced'
    byOrder.set(o, (byOrder.get(o) || 0) + 1)
    if (r.genus && r.specificEpithet) species.add(`${r.genus} ${r.specificEpithet}`)
    if (r.stateProvince === 'Missouri' && r.county) {
      places.add(r.county)
      const k = normCounty(r.county).toLowerCase()
      byCounty[k] = (byCounty[k] || 0) + 1
    }
  })
  const orders = [...byOrder.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
  const highlights = newInCollection(records, before.list, before.complete)
  const closer = closerLook(records)

  return {
    stories,
    insect,
    numbers: {
      specimens,
      toDate,
      taxa,
      images,
      types,
      species: species.size,
      counties: places.size,
      atStart
    },
    byCounty,
    orders,
    monthly,
    highlights,
    closer
  }
}

function groupCounties(recs) {
  const by = new Map()
  recs.forEach((r) => {
    if (!by.has(r.name)) by.set(r.name, [])
    by.get(r.name).push(r.county.replace(/ Co\.$/, ''))
  })
  return [...by.entries()]
    .map(([name, cs]) => ({ name, n: cs.length, county: `${listOf(cs.sort())} Co.` }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
}

// ── A closer look at what was digitized ──────────────────────────────────
const yearOf = (r) => {
  const y = Number(r.year || String(r.eventDate || '').slice(0, 4))
  return y > 1700 && y <= new Date().getFullYear() ? y : null
}
export function closerLook(records) {
  const total = records.length
  if (!total) return null
  const pct = (n) => Math.round((n / total) * 100)
  const toSpecies = records.filter((r) => r.specificEpithet).length
  const geo = records.filter((r) => r.decimalLatitude && r.decimalLongitude).length
  const dated = records.filter((r) => yearOf(r)).length

  const decades = new Map()
  records.forEach((r) => {
    const y = yearOf(r)
    if (y) decades.set(Math.floor(y / 10) * 10, (decades.get(Math.floor(y / 10) * 10) || 0) + 1)
  })
  // every decade from the first to the last, including empty ones
  const keys = [...decades.keys()]
  const decadeList = []
  if (keys.length) for (let d = Math.min(...keys); d <= Math.max(...keys); d += 10) decadeList.push({ label: `${d}s`, n: decades.get(d) || 0 })

  const fam = new Map()
  records.forEach((r) => r.family && fam.set(r.family, (fam.get(r.family) || 0) + 1))
  const families = [...fam.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)

  const oldest = records
    .filter((r) => yearOf(r))
    .sort((a, b) => yearOf(a) - yearOf(b))[0]

  const states = new Set(records.map((r) => r.stateProvince).filter(Boolean))
  const countries = new Set(records.map((r) => r.country).filter(Boolean))
  const missouri = records.filter((r) => r.stateProvince === 'Missouri').length
  const collectors = new Set(
    records.flatMap((r) => String(r.recordedBy || '').split(/\s*\|\s*|\s*;\s*/)).map((x) => x.trim()).filter((x) => x && !/^unknown$/i.test(x))
  )

  return {
    total,
    quality: [
      { label: 'Identified to species', n: toSpecies, pct: pct(toSpecies) },
      { label: 'With map coordinates', n: geo, pct: pct(geo) },
      { label: 'With a collecting date', n: dated, pct: pct(dated) }
    ],
    decades: decadeList,
    families: families.slice(0, 8),
    familyCount: families.length,
    oldest: oldest
      ? {
          year: yearOf(oldest),
          name: cleanName(oldest) || oldest.family || oldest.order || 'Unidentified',
          place: [oldest.county ? `${normCounty(oldest.county).replace(/\b[a-z]/g, (x) => x.toUpperCase())} Co.` : '', oldest.stateProvince, oldest.country === 'United States' ? '' : oldest.country].filter(Boolean).join(', '),
          collector: String(oldest.recordedBy || '').replace(/\s*\|\s*/g, ', '),
          cat: oldest.catalogNumber || ''
        }
      : null,
    missouriPct: pct(missouri),
    states: states.size,
    countries: countries.size,
    collectors: collectors.size
  }
}

// Short version of a story: its paragraphs only (no headings, quotes or link lists)
export const shortText = (html = '', max = 210) =>
  excerptOf(
    String(html)
      .replace(/<(h[1-6]|blockquote|ul|ol|figure|div)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/p>/gi, ' </p>'),
    max
  )

// ── New in the collection ──────────────────────────────────────────
// All Darwin Core records created in a window (paged, up to `maxPages` × 5000)
async function allRecords(params, maxPages = 10) {
  const list = []
  for (let page = 1; page <= maxPages; page++) {
    try {
      const { data } = await makeAPIRequest.get('/dwc_occurrences.json', { params: { per: 5000, page, ...params } })
      const rows = Array.isArray(data) ? data : []
      list.push(...rows)
      if (rows.length < 5000) return { list, complete: true }
    } catch {
      return { list, complete: false }
    }
  }
  return { list, complete: false }
}

// "a", "a and b", "a, b and c"
export const listOf = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

const speciesOf = (r) => (r.genus && r.specificEpithet ? `${r.genus} ${r.specificEpithet}` : '')
const cleanName = (r) => {
  const n = r.scientificName || speciesOf(r) || ''
  const a = r.scientificNameAuthorship || ''
  return a && n.endsWith(a) ? n.slice(0, -a.length).trim() : n
}
const isMo = (r) => r.stateProvince === 'Missouri' && r.county
const countyName = (c) => `${normCounty(c).replace(/\b[a-z]/g, (x) => x.toUpperCase())} Co.`

// Highlights of what was digitized in the period, compared with everything before it:
//  • species with their first specimen in the database
//  • type specimens catalogued
//  • first record of a species from a Missouri county
export function newInCollection(records, before, complete = true) {
  const known = new Set(before.map(speciesOf).filter(Boolean))
  const knownCounty = new Set(before.filter(isMo).map((r) => `${speciesOf(r)}|${normCounty(r.county)}`))

  const firstSpecies = new Map()
  const countyRecs = new Map()
  const types = []
  records.forEach((r) => {
    const sp = speciesOf(r)
    if (sp && !known.has(sp) && !firstSpecies.has(sp)) firstSpecies.set(sp, { name: cleanName(r) || sp, order: r.order || '', family: r.family || '', cat: r.catalogNumber || '' })
    if (sp && isMo(r)) {
      const k = `${sp}|${normCounty(r.county)}`
      if (!knownCounty.has(k) && !countyRecs.has(k)) countyRecs.set(k, { name: cleanName(r) || sp, county: countyName(r.county), cat: r.catalogNumber || '' })
    }
    if (r.typeStatus) types.push({ name: cleanName(r), status: String(r.typeStatus).split(/\s*\|\s*/)[0], cat: r.catalogNumber || '' })
  })
  const bySpecies = (a, b) => a.name.localeCompare(b.name)
  return {
    species: [...firstSpecies.values()].sort(bySpecies),
    types: types.sort(bySpecies),
    counties: [...countyRecs.values()].sort((a, b) => a.county.localeCompare(b.county) || bySpecies(a, b)),
    // the same records grouped by species: "Belostoma flumineum — Adair, Atchison and Boone Co."
    countyGroups: groupCounties([...countyRecs.values()]),
    complete
  }
}

// ── Insect of the month (chosen in TaxonWorks) ───────────────────────────
// Write a news post in TaxonWorks (Project → News, public) titled
//   "Insect of the month: <common or scientific name>"
// and a short text that names the specimen's catalog number (e.g. EEM000000447): the
// specimen's photo is taken from TaxonWorks automatically (see useNews.js), and the
// newsletter links to the specimen's page. A photo added to the post is used instead.
export const INSECT_RE = /^\s*insect of the month\s*[:–—-]?\s*/i
export const isInsectPost = (title = '') => INSECT_RE.test(title)

function toInsect(story) {
  const name = story.title.replace(INSECT_RE, '').trim() || 'Insect of the month'
  const plain = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const cat = (plain(story.body).match(/EEM\s?\d{6,9}/i) || [''])[0].replace(/\s+/, '')
  let body = String(story.body || '')

  // the pull quote: the first > quote of the post
  let quote = ''
  body = body.replace(/<blockquote>([\s\S]*?)<\/blockquote>/, (w, inner) => {
    quote = plain(inner)
    return ''
  })

  // the fact file: the first list whose lines start with a bold label ("**Family:** …")
  let facts = []
  body = body.replace(/(<h[23][^>]*>[^<]*<\/h[23]>\s*)?<ul>([\s\S]*?)<\/ul>/, (w, head, inner) => {
    const items = (inner.match(/<li>[\s\S]*?<\/li>/g) || []).map((li) => li.match(/^<li>\s*<strong>([\s\S]*?)<\/strong>\s*:?\s*([\s\S]*?)<\/li>$/))
    if (!items.length || items.some((m) => !m)) return w
    facts = items.map((m) => ({ label: plain(m[1]).replace(/:$/, ''), html: m[2].trim() }))
    return ''
  })

  // link cards ("See the specimen: …") are replaced by the newsletter's own link line
  body = body.replace(/<div class="ns-links">[\s\S]*?<\/div>/g, '').replace(/<p>\s*<\/p>/g, '')

  return { id: story.id, name, cover: story.cover, body, quote, facts, excerpt: story.excerpt, date: story.date, cat }
}

// ── E-mail version ────────────────────────────────────────────────────────
// Plain tables and inline styles only: what e-mail programs understand.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Story text for e-mail: keep paragraphs, lists, links, bold/italic; style inline
function emailBody(html) {
  return String(html || '')
    .replace(/<div class="ns-links">([\s\S]*?)<\/div>/g, (w, inner) =>
      inner.replace(
        /<a class="ns-linkcard" href="([^"]+)"[^>]*><span class="ns-linkcard-t">([\s\S]*?)<\/span><span class="ns-linkcard-u">[\s\S]*?<\/span><\/a>/g,
        '<p style="margin:0 0 8px"><a href="$1" style="color:#000000;font-weight:bold">$2 →</a></p>'
      )
    )
    .replace(/<img\b[^>]*src="([^"]+)"[^>]*>/gi, '<img src="$1" width="760" style="width:100%;max-width:760px;height:auto;display:block;margin:12px 0" alt="">')
    .replace(/<p>/g, '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#222">')
    .replace(/<a /g, '<a style="color:#000000" ')
    .replace(/<blockquote>/g, '<blockquote style="margin:16px 0;padding:4px 0 4px 14px;border-left:4px solid #fdb719;font-style:italic;color:#333">')
    .replace(/<h2>/g, '<h3 style="font-family:Arial,sans-serif;font-size:17px;margin:18px 0 8px;color:#111">')
    .replace(/<\/h2>/g, '</h3>')
}

// A horizontal bar made of table cells: the one kind of chart every e-mail program
// (Outlook included) draws. pct = 0–100
function bar(pct, color, track = '#f2efe8') {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  const fill = p > 0 ? `<td width="${Math.max(1, p)}%" bgcolor="${color}" style="background:${color};height:12px;font-size:0;line-height:0">&nbsp;</td>` : ''
  const rest = p < 100 ? `<td bgcolor="${track}" style="background:${track};height:12px;font-size:0;line-height:0">&nbsp;</td>` : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse"><tr>${fill}${rest}</tr></table>`
}

export function emailHtml({ issue, data, note, siteUrl, info }) {
  const site = siteUrl.replace(/\/?$/, '/')
  const num = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : '—')
  const tile = (value, label) =>
    `<td align="center" style="padding:12px 6px;border:1px solid #e5e0d4;background:#fff"><div style="font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#111">${num(value)}</div><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b665c">${esc(label)}</div></td>`
  // Stories: short versions with a link to the full story online
  const url = (st) => `${site}#/news/${st.id}`
  const btn = (st) => `<a href="${url(st)}" style="display:inline-block;background:#000;color:#fdb719;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:7px 12px;margin-top:10px">Read the full story →</a>`
  const meta = (st) => `<div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b665c;font-weight:bold">${esc(st.type)} · ${esc(st.date)}</div>`
  const title = (st, size) => `<h3 style="font-family:Arial,sans-serif;font-size:${size}px;line-height:1.25;margin:5px 0 8px;padding-bottom:7px;border-bottom:2px solid #000;color:#000"><a href="${url(st)}" style="color:#000;text-decoration:none">${esc(st.title)}</a></h3>`
  const card = (st) => `<td valign="top" width="50%" style="padding:0 6px 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd8cc;border-top:5px solid #fdb719"><tr><td style="padding:0">
      ${st.cover ? `<a href="${url(st)}"><img src="${esc(st.cover.src)}" width="370" style="width:100%;max-width:370px;height:auto;display:block" alt="${esc(st.cover.alt)}"></a>` : ''}
      <div style="padding:12px 14px 14px">
        ${meta(st)}
        ${title(st, 17)}
        <div style="font-family:Georgia,serif;font-size:14px;line-height:1.5;color:#222">${esc(shortText(st.body, 210))}</div>
        ${btn(st)}
      </div>
      </td></tr></table>
    </td>`
  const [lead, ...rest] = data.stories
  const pairs = []
  for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2))
  const stories = lead
    ? `<tr><td style="padding:22px 22px 8px;background:#f6f4ef;border-top:1px solid #e5e0d4">
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#000;font-weight:bold;margin:0 6px 12px">News from the museum</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 6px 14px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd8cc;border-top:5px solid #fdb719"><tr><td style="padding:0">
            ${lead.cover ? `<a href="${url(lead)}"><img src="${esc(lead.cover.src)}" width="762" style="width:100%;max-width:762px;height:auto;display:block" alt="${esc(lead.cover.alt)}"></a>` : ''}
            <div style="padding:16px 18px 18px">
              ${meta(lead)}
              ${title(lead, 22)}
              <div style="font-family:Georgia,serif;font-size:15px;line-height:1.55;color:#222">${esc(shortText(lead.body, 420))}</div>
              ${btn(lead)}
            </div>
          </td></tr></table>
        </td></tr></table>
        ${pairs.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${pairs.map((p) => `<tr>${p.map(card).join('')}${p.length === 1 ? '<td width="50%"></td>' : ''}</tr>`).join('')}</table>` : ''}
      </td></tr>`
    : ''
  const noteHtml = note
    ? `<tr><td style="padding:24px 28px;background:#ffedcf">
        <div style="display:inline-block;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#000;font-weight:bold;border-bottom:3px solid #000;padding-bottom:5px;margin-bottom:12px">From the director</div>
        ${note
          .split(/\n\s*\n/)
          .map((p) => `<p style="font-family:Georgia,serif;margin:0 0 12px;font-size:16px;line-height:1.6;color:#111">${esc(p).replace(/\n/g, '<br>')}</p>`)
          .join('')}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:6px"><tr>
          <td style="padding-right:12px"><img src="${site}images/history/2026-dalpos.jpg" width="56" height="56" style="width:56px;height:56px;border-radius:28px;display:block;border:3px solid #fff" alt=""></td>
          <td><div style="font-family:Georgia,serif;font-style:italic;font-size:17px;color:#111">${esc(info.director.name)}</div><div style="font-family:Arial,sans-serif;font-size:12px;color:#6b665c">${esc(info.director.role)}, ${esc(info.fullName)}</div></td>
        </tr></table>
      </td></tr>`
    : ''
  const insect = data.insect
  const insectHtml = insect
    ? `<tr><td bgcolor="#f6f4ef" style="padding:0;background:#f6f4ef;border-bottom:6px solid #000">
        ${insect.cover ? `<a href="${site}#/news/${insect.id}"><img src="${esc(insect.cover.src)}" width="820" style="width:100%;max-width:820px;height:auto;display:block;background:#f6f4ef" alt="${esc(insect.cover.alt || insect.name)}"></a>` : ''}
        <div style="padding:20px 28px 24px;border-top:6px solid #fdb719;background:#f6f4ef">
          <span style="display:inline-block;background:#000;color:#fdb719;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:4px 8px">Insect of the month</span>
          <h2 style="font-family:Arial,sans-serif;font-size:28px;line-height:1.15;margin:10px 0 4px;color:#000">${esc(insect.name)}</h2>
          ${insect.cover?.alt ? `<div style="font-family:Georgia,serif;font-style:italic;font-size:14px;color:#6b665c;margin:0 0 14px">${esc(insect.cover.alt)}</div>` : ''}
          ${insect.quote ? `<div style="font-family:Georgia,serif;font-size:19px;line-height:1.4;font-style:italic;color:#000;border-left:5px solid #fdb719;padding:4px 0 4px 14px;margin:6px 0 16px">${esc(insect.quote)}</div>` : ''}
          ${
            insect.facts.length
              ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="margin:0 0 16px;border:2px solid #000;background:#ffffff"><tr><td colspan="2" style="background:#000;color:#fdb719;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:6px 10px">Fact file</td></tr>${insect.facts
                  .map(
                    (f) => `<tr><td valign="top" style="width:150px;padding:7px 10px;border-top:1px solid #e5e0d4;font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#000">${esc(f.label)}</td><td valign="top" style="padding:7px 10px;border-top:1px solid #e5e0d4;font-family:Arial,sans-serif;font-size:13px;color:#222">${f.html.replace(/<a /g, '<a style="color:#000" ')}</td></tr>`
                  )
                  .join('')}</table>`
              : ''
          }
          <div style="font-family:Georgia,serif">${emailBody(insect.body.replace(/<img\b[^>]*>/gi, ''))}</div>
          ${insect.cat ? `<a href="${site}#/specimen?cat=${encodeURIComponent(insect.cat)}" style="display:inline-block;background:#000;color:#fdb719;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:8px 14px;margin-top:4px">See specimen ${esc(insect.cat)} online →</a>` : ''}
        </div>
      </td></tr>`
    : ''
  // "In this issue": numbered entries, two per row; stories link to the full story online
  const h0 = data.highlights
  const contents = [
    insect ? { kicker: 'Insect of the month', title: insect.name, href: `${site}#/news/${insect.id}` } : null,
    { kicker: 'The numbers', title: `${num(data.numbers.specimens)} specimens digitized in ${issue.label}` },
    h0 && (h0.species.length || h0.types.length || h0.counties.length)
      ? {
          kicker: 'New in the collection',
          title: listOf(
            [
              h0.species.length ? `${h0.species.length} new species` : '',
              h0.types.length ? `${h0.types.length} type specimen${h0.types.length === 1 ? '' : 's'}` : '',
              h0.counties.length ? `${h0.counties.length} new county record${h0.counties.length === 1 ? '' : 's'}` : ''
            ].filter(Boolean)
          )
        }
      : null,
    ...data.stories.map((st) => ({ kicker: st.type, title: st.title, href: `${site}#/news/${st.id}` })),
    { kicker: 'Get involved', title: 'Visit, borrow, donate, become a Friend of the Museum', href: `${site}#/donate` }
  ].filter(Boolean)
  const entry = (c, i) =>
    c
      ? `<td valign="top" width="50%" style="padding:10px 12px 10px 0;border-bottom:1px solid #e5e0d4"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td valign="top" style="width:34px;font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#fdb719;line-height:1">${i + 1}</td>
          <td valign="top"><div style="font-family:Arial,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#000;font-weight:bold">${esc(c.kicker)}</div>
          <div style="font-family:Arial,sans-serif;font-size:14px;font-weight:bold;line-height:1.3;margin-top:2px">${c.href ? `<a href="${c.href}" style="color:#111;text-decoration:none">${esc(c.title)}</a>` : `<span style="color:#111">${esc(c.title)}</span>`}</div></td>
        </tr></table></td>`
      : '<td width="50%"></td>'
  const rows = []
  for (let i = 0; i < contents.length; i += 2) rows.push(`<tr>${entry(contents[i], i)}${entry(contents[i + 1], i + 1)}</tr>`)
  const contentsHtml = `<tr><td style="padding:22px 28px 18px;border-bottom:1px solid #e5e0d4">
      <div style="display:inline-block;font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#000;font-weight:bold;border-bottom:3px solid #fdb719;padding-bottom:5px;margin-bottom:6px">In this issue</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join('')}</table>
    </td></tr>`
  const mMax = Math.max(1, ...(data.monthly || []).map((m) => m.n))
  const growth =
    typeof data.numbers.atStart === 'number' && typeof data.numbers.toDate === 'number'
      ? `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;margin:14px 0 0"><b>${num(data.numbers.atStart)} → ${num(data.numbers.toDate)}</b> specimens online (+${num(data.numbers.toDate - data.numbers.atStart)})</div>`
      : ''
  const countyList = Object.entries(data.byCounty || {}).sort((a, b) => b[1] - a[1])
  const countiesHtml = countyList.length
    ? `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;margin:12px 0 0"><b>Missouri counties this issue:</b> ${countyList
        .slice(0, 12)
        .map(([k, n]) => `${esc(k.replace(/\b\w/g, (c) => c.toUpperCase()))} (${num(n)})`)
        .join(', ')}${countyList.length > 12 ? ` and ${countyList.length - 12} more` : ''}</div>`
    : ''
  const cl = data.closer
  const decMax = cl ? Math.max(1, ...cl.decades.map((d) => d.n)) : 1
  const fact = (v, l) => `<td align="center" style="padding:10px 4px;border:1px solid #e5e0d4"><div style="font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#000">${v}</div><div style="font-family:Arial,sans-serif;font-size:11px;color:#6b665c">${l}</div></td>`
  const closerHtml = cl
    ? `<tr><td style="padding:22px 28px;border-top:1px solid #e5e0d4">
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#000;font-weight:bold;margin-bottom:10px">A closer look at the ${num(cl.total)} specimens</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:4px solid #000"><tr>
          ${fact(num(cl.familyCount), 'families')}${fact(num(cl.collectors), 'collectors')}${fact(`${cl.missouriPct}%`, 'from Missouri')}${fact(num(cl.states), cl.states === 1 ? 'state' : 'states')}
        </tr></table>
        <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#111;margin:16px 0 6px">How complete are the records?</div>
        ${cl.quality
          .map(
            (q) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px"><tr><td style="font-family:Arial,sans-serif;font-size:13px;color:#333;width:190px">${esc(q.label)}</td><td>${bar(q.pct, '#000000')}</td><td align="right" style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;width:48px">${q.pct}%</td></tr></table>`
          )
          .join('')}
        ${
          cl.decades.length
            ? `<div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#111;margin:16px 0 6px">When they were collected</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cl.decades
                .map(
                  (d) => `<tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#555;width:56px;padding:2px 0">${d.label}</td><td style="padding:2px 6px">${bar((d.n / decMax) * 100, '#fdb719', '#ffffff')}</td><td align="right" style="font-family:Arial,sans-serif;font-size:12px;width:48px">${num(d.n)}</td></tr>`
                )
                .join('')}</table>`
            : ''
        }
        ${
          cl.families.length
            ? `<div style="font-family:Arial,sans-serif;font-size:13px;color:#333;margin:14px 0 0"><b>Top families:</b> ${cl.families
                .map((f) => `${esc(f.name)} (${num(f.n)})`)
                .join(', ')}</div>`
            : ''
        }
        ${
          cl.oldest
            ? `<div style="background:#ffedcf;padding:12px 14px;margin-top:14px;font-family:Arial,sans-serif;font-size:13px;color:#111;line-height:1.5"><b style="font-size:11px;letter-spacing:1px;text-transform:uppercase">Oldest specimen this issue · ${cl.oldest.year}</b><br><i style="font-family:Georgia,serif">${esc(cl.oldest.name)}</i>${cl.oldest.place ? `, ${esc(cl.oldest.place)}` : ''}${cl.oldest.collector ? `, leg. ${esc(cl.oldest.collector)}` : ''}</div>`
            : ''
        }
      </td></tr>`
    : ''
  const h = data.highlights
  const LIM = 8
  const hlBlock = (title, items, line, count = items.length) =>
    items.length
      ? `<td valign="top" style="padding:0 10px 12px 0;width:33%"><div style="font-family:Arial,sans-serif;font-size:13px;font-weight:bold;color:#111;border-bottom:3px solid #fdb719;padding-bottom:4px;margin-bottom:6px"><span style="font-size:19px">${count}</span> ${esc(title)}</div>${items
          .slice(0, LIM)
          .map((x) => `<div style="font-family:Georgia,serif;font-size:13px;line-height:1.35;color:#111;padding:3px 0;border-bottom:1px dotted #e5e0d4"><i>${esc(x.name)}</i><div style="font-family:Arial,sans-serif;font-size:11px;color:#6b665c">${esc(line(x))}</div></div>`)
          .join('')}${items.length > LIM ? `<div style="font-family:Arial,sans-serif;font-size:11px;color:#6b665c;margin-top:4px">and ${items.length - LIM} more</div>` : ''}</td>`
      : ''
  const highlightsHtml =
    h && (h.species.length || h.types.length || h.counties.length)
      ? `<tr><td style="padding:22px 28px;border-top:1px solid #e5e0d4"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#000;font-weight:bold;margin-bottom:10px">New in the collection</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${[
          hlBlock(h.species.length === 1 ? 'species new to our database' : 'species new to our database', h.species, (x) => [x.order, x.family].filter(Boolean).join(', ')),
          hlBlock(h.types.length === 1 ? 'type specimen catalogued' : 'type specimens catalogued', h.types, (x) => [x.status, x.cat].filter(Boolean).join(' · ')),
          hlBlock(h.counties.length === 1 ? 'new Missouri county record' : 'new Missouri county records', h.countyGroups, (x) => x.county, h.counties.length)
        ].join('')}</tr></table></td></tr>`
      : ''
  const oMax = Math.max(1, ...(data.orders || []).map((o) => o.n))
  const ordersHtml = (data.orders || []).length
    ? `<div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#111;margin:18px 0 6px">Digitized this period, by order</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${data.orders
        .slice(0, 8)
        .map(
          (o) => `<tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#333;width:110px;padding:3px 0">${esc(o.name)}</td><td style="padding:3px 6px">${bar((o.n / oMax) * 100, '#fdb719', '#f2efe8')}</td><td align="right" style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;width:48px">${num(o.n)}</td></tr>`
        )
        .join('')}</table>`
    : ''
  const monthlyHtml = (data.monthly || []).length
    ? `<div style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#111;margin:18px 0 6px">Specimens digitized per month</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${data.monthly
        .map(
          (m) => `<tr><td style="font-family:Arial,sans-serif;font-size:12px;color:#555;width:70px;padding:2px 0">${m.label} ${String(m.year).slice(2)}</td><td style="padding:2px 6px">${bar((m.n / mMax) * 100, m.inIssue ? '#c99412' : '#d6d2c8', '#ffffff')}</td><td align="right" style="font-family:Arial,sans-serif;font-size:12px;color:#111;width:56px;${m.inIssue ? 'font-weight:bold' : ''}">${num(m.n)}</td></tr>`
        )
        .join('')}</table>`
    : ''
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2efe8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe8"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="820" cellpadding="0" cellspacing="0" style="width:100%;max-width:820px;background:#ffffff">
  <tr><td bgcolor="#000000" style="background:#000000;padding:22px 28px 18px">
    <a href="${site}"><img src="${site}images/eem-logo-rev-horiz.png" width="420" style="width:100%;max-width:420px;height:auto;display:block;border:0" alt="Enns Entomology Museum, University of Missouri"></a>
  </td></tr>
  <tr><td bgcolor="#fdb719" style="background:#fdb719;padding:10px 28px 9px">
    <!-- the newsletter name sits on the gold bar in black: it stays readable even in mail programs that drop colors -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="bottom" style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.15;font-style:italic;color:#000000"><i>The Enns Report</i><br><span style="font-family:Arial,sans-serif;font-size:10px;line-height:1.6;font-style:normal;font-weight:bold;letter-spacing:2px;color:#000000">NEWSLETTER OF THE ENNS ENTOMOLOGY MUSEUM</span></td>
      <td valign="bottom" align="right" style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;font-weight:bold;letter-spacing:1px;color:#000000;white-space:nowrap;padding-left:12px">ISSUE ${issue.n}<br>${esc(issue.label).toUpperCase()}</td>
    </tr></table>
  </td></tr>
  ${insectHtml}
  ${noteHtml}
  ${contentsHtml}
  <tr><td style="padding:22px 28px">
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#000000;font-weight:bold;margin-bottom:10px">In ${esc(issue.label)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${tile(data.numbers.specimens, 'specimens digitized')}${tile(data.numbers.species, 'species')}${tile(data.numbers.taxa, 'taxa added')}${tile(data.numbers.toDate, 'online in total')}
    </tr></table>
    ${growth}
    ${monthlyHtml}
    ${countiesHtml}
    ${ordersHtml}
  </td></tr>
  ${closerHtml}
  ${highlightsHtml}
  ${stories || '<tr><td style="padding:20px 28px;font-family:Arial,sans-serif;color:#666">No news posts in this period.</td></tr>'}
  <tr><td style="background:#000;padding:22px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#ccc">
    <a href="${site}" style="color:#fdb719;font-weight:bold">Visit the museum online</a> ·
    <a href="${site}#/donate" style="color:#fdb719">Become a Friend of the Museum</a><br>
    ${esc(info.fullName)}, ${esc(info.college)}, ${esc(info.university)} · ${esc(info.city)}
    ${info.email || info.director.email ? `<br><a href="mailto:${esc(info.email || info.director.email)}" style="color:#ccc">${esc(info.email || info.director.email)}</a>` : ''}
  </td></tr>
</table></td></tr></table></body></html>`
}
