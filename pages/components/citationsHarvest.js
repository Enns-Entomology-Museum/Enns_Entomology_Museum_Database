// Finding publications that mention the Enns Entomology Museum (or its coden
// UMRM) in their full text, in OpenAlex and Europe PMC. Used by
// scripts/eem-citations.mjs (at deploy) and by pages/research.vue (live, when
// the deploy-time list is missing). `getJson(url)` is passed in by the caller.
export const MAILTO = 'davide.dalpos@missouri.edu' // OpenAlex "polite pool"

// Exact phrases searched in the full text of publications
export const PHRASES = [
  'Enns Entomology Museum',
  'Enns Entomological Museum',
  'W. R. Enns Entomology',
  'Wilbur R. Enns Entomology',
  'Enns Insect Collection',
  'University of Missouri Insect Collection'
]
// Codens (UMRM, and UMC = University of Missouri, Columbia): too short to search
// alone, so only in Europe PMC, together with Missouri and taxonomic wording
const EUROPE_PMC_QUERIES = [
  ...PHRASES.map((p) => `"${p}"`),
  '"UMRM" AND "Missouri" AND (holotype OR paratype OR specimens OR "material examined")',
  '"UMC" AND "University of Missouri" AND ("material examined" OR "specimens examined" OR holotype OR paratype)'
]
// Publications the search finds that do not actually use the collection
// (a DOI, or the exact title). Add to this list when you spot one.
export const EXCLUDE = [
  'Effect of Feeding Prosopis juliflora Pods and Leaves on Performance and Carcass Characteristics of Afar Sheep',
  'Effect of Solid Surface Vitrification on Viability and Morphology of Canine Cumulus-Oocyte Complex',
  'Radiosensitivity of Vetiver to Acute and Chronic Gamma Irradiation',
  'Osher @ Mizzou : spring 2019 course catalog'
]

export async function harvest(getJson, exclude = EXCLUDE) {
  const norm = (t) =>
    String(t || '')
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const skip = new Set(exclude.map((x) => (/^10\./.test(x) ? x.toLowerCase() : norm(x))))
  const found = new Map()
  const keyOf = (doi, title) => (doi ? `doi:${doi.toLowerCase()}` : `t:${String(title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`)
  const add = (w, via) => {
    if (!w.title) return
    const k = keyOf(w.doi, w.title)
    const prev = found.get(k)
    if (prev) {
      prev.via = [...new Set([...prev.via, via])]
      for (const f of ['journal', 'authors', 'year', 'doi', 'url']) prev[f] ||= w[f]
    } else found.set(k, { ...w, via: [via] })
  }
  const clean = (s) =>
    String(s || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  // OpenAlex full-text search
  for (const phrase of PHRASES) {
    let cursor = '*'
    for (let i = 0; i < 10 && cursor; i++) {
      const url = `https://api.openalex.org/works?filter=fulltext.search:${encodeURIComponent(`"${phrase}"`)}&per-page=200&cursor=${encodeURIComponent(cursor)}&select=id,doi,title,publication_year,type,authorships,primary_location&mailto=${MAILTO}`
      const d = await getJson(url)
      ;(d.results || []).forEach((w) => {
        const doi = (w.doi || '').replace(/^https?:\/\/doi\.org\//, '')
        if (['dataset', 'paratext', 'peer-review'].includes(w.type) || /^10\.5281\/zenodo/i.test(doi)) return
        add(
          {
            title: clean(w.title),
            year: w.publication_year || null,
            authors: (w.authorships || []).map((a) => a.author?.display_name).filter(Boolean),
            journal: w.primary_location?.source?.display_name || '',
            doi,
            url: doi ? `https://doi.org/${doi}` : w.primary_location?.landing_page_url || w.id
          },
          'OpenAlex'
        )
      })
      cursor = d.meta?.next_cursor
      if (!d.results?.length) break
    }
  }

  // Europe PMC (full text of open-access articles)
  for (const query of EUROPE_PMC_QUERIES) {
    let cursor = '*'
    for (let i = 0; i < 10 && cursor; i++) {
      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=200&resultType=lite&cursorMark=${encodeURIComponent(cursor)}`
      const d = await getJson(url)
      const rows = d.resultList?.result || []
      rows.forEach((r) => {
        const authors = String(r.authorString || '')
          .replace(/\.$/, '')
          .split(/,\s*/)
          .filter(Boolean)
        add(
          {
            title: clean(r.title).replace(/\.$/, ''),
            year: Number(r.pubYear) || null,
            authors,
            journal: clean(r.journalTitle || r.bookOrReportDetails?.publisher || ''),
            doi: r.doi || '',
            url: r.doi ? `https://doi.org/${r.doi}` : r.pmcid ? `https://europepmc.org/article/PMC/${r.pmcid}` : `https://europepmc.org/article/${r.source}/${r.id}`
          },
          'Europe PMC'
        )
      })
      const next = d.nextCursorMark
      cursor = rows.length && next && next !== cursor ? next : null
    }
  }

  return [...found.values()]
    .filter((w) => !skip.has(String(w.doi).toLowerCase()) && !skip.has(norm(w.title)))
    .sort((a, b) => (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title))
}
