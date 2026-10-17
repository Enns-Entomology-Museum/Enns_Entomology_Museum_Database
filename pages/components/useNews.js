// News for the Enns Museum pages, written in TaxonWorks (Project → News, public).
//
// Pictures: put an image in the news text (Markdown: ![caption](https://…/photo.jpg)).
// News photos are kept in the separate media repository (github.com/Enns-Entomology-Museum/media,
// published at https://enns-entomology-museum.github.io/media/news/…).
// A TaxonWorks image page also works, e.g. ![caption](https://sfg.taxonworks.org/images/1206702):
// the site swaps in the image file itself.
// The first image becomes the story's cover — on the home page, on the news list and
// at the top of the story — and is not repeated inside the text. A story without
// an image gets a cover in the museum's colours.
import { makeAPIRequest } from '@/utils/request'

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
    type: TYPE_LABELS[rawType] || rawType.replace(/([a-z])([A-Z])/g, '$1 $2'),
    author: n.creator || '',
    iso: n.created_at,
    date: isNaN(created) ? '' : created.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    shortDate: isNaN(created) ? '' : created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    minutes: Math.max(1, Math.round(words / 220)),
    cover,
    body: leadIns(linkCards(body)),
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

async function resolveImages(story) {
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
