// Data for the museum newsletter / report (pages/report.vue)
//
// An issue covers one or two months. Everything in it comes from TaxonWorks:
// the news posts published in those months, and what was added to the database
// in the same period (specimens, taxa, images, type specimens).
import { makeAPIRequest } from '@/utils/request'
import { fetchNews } from './useNews.js'

// First issue of the newsletter
export const FIRST = { year: 2026, month: 9 } // September 2026

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n) => String(n).padStart(2, '0')
const lastDay = (y, m) => new Date(y, m, 0).getDate()

// All issues from FIRST to today, newest first. months = 1 (monthly) or 2 (bimonthly)
export function issues(months = 2, today = new Date()) {
  const list = []
  let y = FIRST.year
  let m = FIRST.month
  let n = 1
  const endY = today.getFullYear()
  const endM = today.getMonth() + 1
  while (y < endY || (y === endY && m <= endM)) {
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

export async function loadIssue({ from, to }) {
  const [news, specimens, toDate, taxa, images, types, records] = await Promise.all([
    fetchNews(100).catch(() => []),
    total('/collection_objects', created(from, to)),
    total('/collection_objects', created('2000-01-01', to)),
    total('/otus', created(from, to)),
    total('/images', created(from, to)),
    total('/collection_objects', { type_material: true, ...created(from, to) }),
    makeAPIRequest
      .get('/dwc_occurrences.json', { params: { per: 5000, ...created(from, to) } })
      .then(({ data }) => (Array.isArray(data) ? data : []))
      .catch(() => [])
  ])

  const inPeriod = (iso) => {
    const d = String(iso || '').slice(0, 10)
    return d >= from && d <= to
  }
  const stories = news.filter((n) => inPeriod(n.iso)).sort((a, b) => String(a.iso).localeCompare(String(b.iso)))

  // What was digitized: by order, species, counties
  const byOrder = new Map()
  const species = new Set()
  const places = new Set()
  records.forEach((r) => {
    const o = r.order || 'Unplaced'
    byOrder.set(o, (byOrder.get(o) || 0) + 1)
    if (r.genus && r.specificEpithet) species.add(`${r.genus} ${r.specificEpithet}`)
    if (r.stateProvince === 'Missouri' && r.county) places.add(r.county)
  })
  const orders = [...byOrder.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)

  return {
    stories,
    numbers: {
      specimens,
      toDate,
      taxa,
      images,
      types,
      species: species.size,
      counties: places.size
    },
    orders
  }
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
        '<p style="margin:0 0 8px"><a href="$1" style="color:#8c640a;font-weight:bold">$2 →</a></p>'
      )
    )
    .replace(/<img\b[^>]*src="([^"]+)"[^>]*>/gi, '<img src="$1" width="560" style="width:100%;max-width:560px;height:auto;display:block;margin:12px 0" alt="">')
    .replace(/<p>/g, '<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#222">')
    .replace(/<a /g, '<a style="color:#8c640a" ')
    .replace(/<blockquote>/g, '<blockquote style="margin:16px 0;padding:4px 0 4px 14px;border-left:4px solid #f1b82d;font-style:italic;color:#333">')
    .replace(/<h2>/g, '<h3 style="font-family:Arial,sans-serif;font-size:17px;margin:18px 0 8px;color:#111">')
    .replace(/<\/h2>/g, '</h3>')
}

export function emailHtml({ issue, data, note, siteUrl, info }) {
  const site = siteUrl.replace(/\/?$/, '/')
  const num = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : '—')
  const tile = (value, label) =>
    `<td align="center" style="padding:12px 6px;border:1px solid #e5e0d4;background:#fff"><div style="font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#111">${num(value)}</div><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b665c">${esc(label)}</div></td>`
  const stories = data.stories
    .map(
      (s) => `
      <tr><td style="padding:24px 28px 8px;border-top:1px solid #e5e0d4">
        ${s.cover ? `<a href="${site}#/news/${s.id}"><img src="${esc(s.cover.src)}" width="584" style="width:100%;max-width:584px;height:auto;display:block;margin:0 0 14px" alt="${esc(s.cover.alt)}"></a>` : ''}
        <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8c640a;font-weight:bold">${esc(s.type)} · ${esc(s.date)}</div>
        <h2 style="font-family:Arial,sans-serif;font-size:21px;line-height:1.25;margin:6px 0 12px;color:#111"><a href="${site}#/news/${s.id}" style="color:#111;text-decoration:none">${esc(s.title)}</a></h2>
        <div style="font-family:Georgia,serif">${emailBody(s.body)}</div>
      </td></tr>`
    )
    .join('')
  const noteHtml = note
    ? `<tr><td style="padding:22px 28px;background:#fdf6e0"><div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8c640a;font-weight:bold">From the director</div>${note
        .split(/\n\s*\n/)
        .map((p) => `<p style="font-family:Georgia,serif;margin:8px 0 0;font-size:15px;line-height:1.6;color:#222">${esc(p).replace(/\n/g, '<br>')}</p>`)
        .join('')}<p style="font-family:Arial,sans-serif;margin:10px 0 0;font-size:13px;color:#555">— ${esc(info.director.name)}, ${esc(info.director.role)}</p></td></tr>`
    : ''
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f2efe8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2efe8"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff">
  <tr><td style="background:#000;padding:26px 28px;border-bottom:6px solid #f1b82d">
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#f1b82d;font-weight:bold">Newsletter · Issue ${issue.n} · ${esc(issue.label)}</div>
    <div style="font-family:Arial,sans-serif;font-size:28px;font-weight:bold;color:#fff;margin-top:8px">Enns Entomology Museum</div>
    <div style="font-family:Arial,sans-serif;font-size:13px;color:#bbb;margin-top:4px">${esc(info.university)} · ${esc(info.city)}</div>
  </td></tr>
  ${noteHtml}
  <tr><td style="padding:22px 28px">
    <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8c640a;font-weight:bold;margin-bottom:10px">In ${esc(issue.label)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${tile(data.numbers.specimens, 'specimens digitized')}${tile(data.numbers.species, 'species')}${tile(data.numbers.taxa, 'taxa added')}${tile(data.numbers.toDate, 'online in total')}
    </tr></table>
  </td></tr>
  ${stories || '<tr><td style="padding:20px 28px;font-family:Arial,sans-serif;color:#666">No news posts in this period.</td></tr>'}
  <tr><td style="background:#000;padding:22px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#ccc">
    <a href="${site}" style="color:#f1b82d;font-weight:bold">Visit the museum online</a> ·
    <a href="${site}#/donate" style="color:#f1b82d">Become a Friend of the Museum</a><br>
    ${esc(info.fullName)}, ${esc(info.college)}, ${esc(info.university)} · ${esc(info.city)}
    ${info.email || info.director.email ? `<br><a href="mailto:${esc(info.email || info.director.email)}" style="color:#ccc">${esc(info.email || info.director.email)}</a>` : ''}
  </td></tr>
</table></td></tr></table></body></html>`
}
