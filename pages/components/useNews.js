// News for the Enns Museum pages, written in TaxonWorks (Project → News, public).
//
// Pictures: put an image in the news text (Markdown: ![caption](https://…/photo.jpg)).
// News photos are kept in the separate media repository (github.com/Enns-Entomology-Museum/media,
// published at https://enns-entomology-museum.github.io/media/news/…).
// A TaxonWorks image page also works, e.g. ![caption](https://sfg.taxonworks.org/images/1206702):
// the site swaps in the image file itself.
// No photo needed for a specimen: a story without its own image that mentions an EEM
// catalog number (e.g. EEM000000447) uses that specimen's photo from TaxonWorks as cover.
// The first image becomes the story's cover — on the home page, on the news list and
// at the top of the story — and is not repeated inside the text. A story without
// an image gets a cover in the museum's colours.
import { makeAPIRequest } from '@/utils/request'
import { findByCatalog } from './useEem.js'

const TYPE_LABELS = {
  BlogPost: 'Story',
  Notice: 'Notice',
  Paper: 'Publication',
  Event: 'Event'
}

const decode = (s) =>
  String(s || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

export function textOf(html = '') {
  return decode(String(html).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

export function excerptOf(html = '', max = 180) {
  const text = textOf(html)
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text
}

// First <img> of the body → cover; the body keeps the rest
function splitCover(html = '') {
  const m = String(html).match(/<img\b[^>]*>/i)
  if (!m) return { cover: null, body: html }
  const tag = m[0]
  const attr = (name) => (tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i')) || [])[1] || ''
  const cover = { src: decode(attr('src')), alt: decode(attr('alt')), title: decode(attr('title')) }
  // drop the image, and the paragraph around it if that leaves it empty
  let body = String(html).replace(tag, '')
  body = body.replace(/<p>\s*<\/p>/, '')
  return { cover: cover.src ? cover : null, body }
}

// A list whose items are all "Label: link" becomes a set of link cards
//   * Our GBIF publisher page: https://www.gbif.org/publisher/…
function linkCards(html = '') {
  return String(html).replace(/<ul>([\s\S]*?)<\/ul>/g, (whole, inner) => {
    const items = inner.match(/<li>[\s\S]*?<\/li>/g) || []
    const cards = items.map((li) => {
      const m = li.match(/^<li>\s*([^<]*?)\s*[:–—-]?\s*<a href="([^"]+)"[^>]*>[^<]*<\/a>\s*\.?\s*<\/li>$/)
      if (!m || !m[1]) return null
      let host = ''
      try {
        host = new URL(decode(m[2])).hostname.replace(/^www\./, '')
      } catch {
        return null
      }
      return `<a class="ns-linkcard" href="${m[2]}" target="_blank" rel="noopener"><span class="ns-linkcard-t">${m[1].replace(/:$/, '')}</span><span class="ns-linkcard-u">${host} ↗</span></a>`
    })
    return cards.length && cards.every(Boolean) ? `<div class="ns-links">${cards.join('')}</div>` : whole
  })
}

// A link whose text is empty (TaxonWorks writes a pasted address as [](https://…)) gets
// readable text: "specimen EEM000000447" for a specimen page, otherwise the web address
function fillEmptyLinks(html = '') {
  return String(html).replace(/<a ([^>]*?)href="([^"]+)"([^>]*)>\s*<\/a>/g, (w, a, href, b) => {
    const url = decode(href)
    const cat = (url.match(/[?&]cat=([^&#]+)/) || [])[1]
    let text = url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
    if (cat) text = `specimen ${decodeURIComponent(cat)}`
    else if (/#\/news\/\d+/.test(url)) text = 'the full story'
    return `<a ${a}href="${href}"${b}>${text}</a>`
  })
}

// "What this means: …" at the start of a paragraph → bold lead-in
const leadIns = (html = '') => String(html).replace(/<p>([A-Z][^<:.]{2,40}):\s/g, '<p><strong>$1:</strong> ')

export function makeStory(n = {}) {
  const created = new Date(n.created_at)
  const { cover, body } = splitCover(n.body_html || '')
  const words = textOf(body).split(' ').filter(Boolean).length
  const rawType = String(n.type || 'News').split('::').pop()
  return {
    id: n.id,
    title: n.title || '',
    // posts titled "Insect of the month: …" are labelled as such everywhere
    type: /^\s*insect of the month\b/i.test(n.title || '') ? 'Insect of the month' : TYPE_LABELS[rawType] || rawType.replace(/([a-z])([A-Z])/g, '$1 $2'),
    author: n.creator || '',
    iso: n.created_at,
    date: isNaN(created) ? '' : created.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    shortDate: isNaN(created) ? '' : created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    minutes: Math.max(1, Math.round(words / 220)),
    cover,
    body: leadIns(linkCards(fillEmptyLinks(body))),
    excerpt: excerptOf(body)
  }
}

// Images given as a TaxonWorks image page (…/images/123) → the image file
const TW_IMAGE = /^https?:\/\/[^/]*taxonworks[^/]*\/(?:api\/v1\/)?images\/(\d+)\/?$/i
const twCache = new Map()
function twImageUrl(src) {
  const id = (String(src).match(TW_IMAGE) || [])[1]
  if (!id) return Promise.resolve(src)
  if (!twCache.has(id)) {
    twCache.set(
      id,
      makeAPIRequest
        .get(`/images/${id}`)
        .then(({ data }) => data?.original || data?.medium || src)
        .catch(() => src)
    )
  }
  return twCache.get(id)
}

// The photo of the specimen named in a story (first EEM catalog number in the text)
async function specimenCover(story) {
  const m = textOf(story.body).match(/EEM\s?\d{6,9}/i)
  if (!m) return null
  const rec = await findByCatalog(m[0]).catch(() => null)
  if (!rec || rec.dwc_occurrence_object_type !== 'CollectionObject') return null
  const { data } = await makeAPIRequest
    .get('/images', { params: { 'collection_object_id[]': rec.dwc_occurrence_object_id, per: 20, 'extend[]': ['depictions'] } })
    .catch(() => ({ data: [] }))
  const imgs = (Array.isArray(data) ? data : []).filter((im) => im.original || im.medium)
  // prefer a photo of the specimen itself over a photo of its labels
  const pick = imgs.find((im) => !(im.depictions || []).some((d) => /label/i.test(d.caption || ''))) || imgs[0]
  if (!pick) return null
  const name = rec.scientificName || [rec.genus, rec.specificEpithet].filter(Boolean).join(' ')
  const place = [rec.stateProvince, rec.country].filter(Boolean).join(', ')
  return { src: pick.original || pick.medium, alt: [name, place, rec.catalogNumber].filter(Boolean).join(' · '), title: '' }
}

async function resolveImages(story) {
  if (!story.cover) story.cover = await specimenCover(story).catch(() => null)
  if (story.cover) story.cover.src = await twImageUrl(story.cover.src)
  const srcs = [...new Set([...story.body.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gi)].map((m) => decode(m[1])))]
  for (const src of srcs) {
    const url = await twImageUrl(src)
    if (url !== src) story.body = story.body.split(`src="${src}"`).join(`src="${url}"`)
  }
  return story
}

export async function fetchNews(per = 50) {
  const { data } = await makeAPIRequest.get('/news', { params: { per } })
  const stories = (Array.isArray(data) ? data : []).map(makeStory)
  await Promise.all(stories.map(resolveImages))
  return stories.sort((a, b) => String(b.iso).localeCompare(String(a.iso)))
}

export async function fetchStory(id) {
  const { data } = await makeAPIRequest.get(`/news/${id}`)
  return resolveImages(makeStory(data))
}
