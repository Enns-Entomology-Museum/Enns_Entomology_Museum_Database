<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Research"
      title="Research using the collection"
      lede="Publications built on specimens from the Enns Entomology Museum — new species, revisions, faunal surveys and ecological studies."
    />

    <section class="container mx-auto box-border px-4 py-12 grid lg:grid-cols-12 gap-10">
      <div class="lg:col-span-8">
        <p
          v-if="loading"
          class="eem-muted"
        >
          {{ searchingLive ? 'Searching the scientific literature… (this takes a few seconds)' : 'Loading…' }}
        </p>

        <template v-else>
          <!-- Numbers -->
          <dl class="rs-stats">
            <div>
              <dt>Publications</dt>
              <dd>{{ fmt(items.length) }}</dd>
            </div>
            <div>
              <dt>Since</dt>
              <dd>{{ firstYear || '—' }}</dd>
            </div>
            <div>
              <dt>Journals & series</dt>
              <dd>{{ fmt(journals) }}</dd>
            </div>
            <div>
              <dt>Last 5 years</dt>
              <dd>{{ fmt(recent) }}</dd>
            </div>
          </dl>

          <!-- Per year -->
          <div
            v-if="years.length > 1"
            class="rs-chart mt-8"
            role="img"
            :aria-label="`Publications per year: ${years.filter((y) => y.n).map((y) => `${y.year} ${y.n}`).join(', ')}`"
          >
            <div
              v-for="y in years"
              :key="y.year"
              class="rs-col"
              :title="`${y.year}: ${y.n} publication${y.n === 1 ? '' : 's'}`"
            >
              <span
                class="rs-bar"
                :style="{ height: `${y.n ? Math.max(4, (y.n / yearMax) * 100) : 0}%` }"
              />
              <span
                v-if="y.year % 5 === 0"
                class="rs-lab"
                >{{ y.year }}</span
              >
            </div>
          </div>

          <!-- Tools -->
          <div class="mt-8 flex flex-wrap items-center gap-2">
            <input
              v-model="q"
              type="search"
              class="rs-search"
              placeholder="Search title, author, journal or year"
              aria-label="Search publications"
            />
            <button
              v-for="f in FILTERS"
              :key="f.key"
              type="button"
              :class="['rs-chip', { on: filter === f.key }]"
              :aria-pressed="filter === f.key"
              @click="filter = f.key"
            >
              {{ f.label }} <span>{{ fmt(counts[f.key]) }}</span>
            </button>
          </div>
          <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <button
              type="button"
              class="eem-link"
              @click="downloadCsv"
            >
              Download list (CSV)
            </button>
            <button
              type="button"
              class="eem-link"
              @click="copyRefs"
            >
              {{ copied ? 'Copied ✓' : 'Copy as reference list' }}
            </button>
          </div>

          <!-- List by year -->
          <div
            v-for="g in groups"
            :key="g.year"
            class="mt-8"
          >
            <h2 class="rs-year">{{ g.year }}</h2>
            <ul class="mt-2 divide-y divide-[color:var(--eem-rule)]">
              <li
                v-for="p in g.items"
                :key="p.key"
                class="py-3"
              >
                <p class="text-sm eem-muted">{{ authorsOf(p) }}</p>
                <p class="mt-0.5 font-semibold leading-snug">
                  <a
                    v-if="p.url"
                    :href="p.url"
                    target="_blank"
                    rel="noopener"
                    class="rs-title"
                    >{{ p.title }}</a
                  >
                  <template v-else>{{ p.title }}</template>
                </p>
                <p class="mt-1 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                  <i v-if="p.journal">{{ p.journal }}</i>
                  <a
                    v-if="p.doi"
                    :href="`https://doi.org/${p.doi}`"
                    target="_blank"
                    rel="noopener"
                    class="rs-doi"
                    >doi:{{ p.doi }}</a
                  >
                  <span
                    v-if="p.confirmed"
                    class="rs-badge ok"
                    title="Checked by the museum"
                    >Confirmed</span
                  >
                  <span
                    v-else
                    class="rs-badge"
                    title="Found by full-text search for the museum's name or coden; not yet checked"
                    >Found by search</span
                  >
                </p>
              </li>
            </ul>
          </div>
          <p
            v-if="!groups.length"
            class="mt-8 eem-muted"
          >
            Nothing matches.
          </p>

          <p class="mt-10 text-xs eem-muted leading-relaxed">
            “Found by search” lists publications whose full text mentions the Enns Entomology Museum or the codens
            UMRM and UMC (University of Missouri, Columbia), found automatically in OpenAlex and Europe PMC<template v-if="updated"> (updated {{ updated }})</template>. They are
            checked by the museum and marked “Confirmed” once verified. Publications without an open full text cannot
            be found this way —
            <a
              :href="`mailto:${info.director.email}?subject=${encodeURIComponent('Publication using Enns Museum specimens')}`"
              class="eem-link"
              >tell us about yours</a
            >.
          </p>
        </template>
      </div>

      <!-- Side: how to cite -->
      <aside class="lg:col-span-4 space-y-5">
        <div class="eem-card p-6 eem-accent-t lg:sticky lg:top-6">
          <p class="eem-kicker">Using our specimens?</p>
          <h3 class="eem-display text-xl mt-3">How to cite the collection</h3>
          <p class="mt-3 text-sm leading-relaxed">In <i>Material examined</i>, use the collection code:</p>
          <p class="rs-cite mt-2">
            EEM — Enns Entomology Museum, University of Missouri, Columbia, Missouri, USA
            (<a
              :href="grscicoll"
              target="_blank"
              rel="noopener"
              class="rs-cite-link"
              >{{ grscicoll.replace('https://', '') }}</a
            >)
          </p>
          <button
            type="button"
            class="eem-link text-sm mt-2"
            @click="copyText(CODE_TEXT, copiedCode)"
          >
            {{ copiedCode ? 'Copied ✓' : 'Copy' }}
          </button>
          <p class="mt-2 text-xs eem-muted">Older literature also uses <b>UMRM</b> or <b>UMC</b> (University of Missouri, Columbia).</p>
          <template v-if="info.gbif.doi">
            <p class="mt-4 text-sm leading-relaxed">When you use our data from GBIF, cite the dataset:</p>
            <p class="rs-cite mt-2">
              Enns Entomology Museum, University of Missouri. Enns Entomology Museum Collection. Occurrence dataset
              <a
                :href="`https://doi.org/${info.gbif.doi}`"
                target="_blank"
                rel="noopener"
                class="rs-cite-link"
                >https://doi.org/{{ info.gbif.doi }}</a
              >, accessed via GBIF.org.
            </p>
          </template>
          <p class="mt-4 text-sm leading-relaxed">Suggested acknowledgement:</p>
          <p class="rs-cite mt-2">
            We thank the Enns Entomology Museum, University of Missouri (EEM), for the loan of specimens.
          </p>
          <button
            type="button"
            class="eem-link text-sm mt-2"
            @click="copyText(ACK)"
          >
            {{ copiedAck ? 'Copied ✓' : 'Copy' }}
          </button>
          <p class="mt-5 text-sm leading-relaxed">
            The collection is registered in GBIF's
            <a
              :href="`https://www.gbif.org/grscicoll/collection/${info.gbif.grscicollKey}`"
              target="_blank"
              rel="noopener"
              class="eem-link"
              >Registry of Scientific Collections</a
            >. Published a paper with our specimens?
            <a
              :href="`mailto:${info.director.email}?subject=${encodeURIComponent('Publication using Enns Museum specimens')}`"
              class="eem-link"
              >Send it to us</a
            >
            — we keep a copy in the museum library.
          </p>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'
import { fmt } from './components/useEem.js'
import { harvest } from './components/citationsHarvest.js'

useHead({ title: 'Research using the collection — Enns Entomology Museum' })

// Sources in TaxonWorks tagged with this keyword are shown as "Confirmed"
const CONFIRM_KEYWORD = 'Uses EEM specimens'
const ACK = 'We thank the Enns Entomology Museum, University of Missouri (EEM), for the loan of specimens.'
const grscicoll = `https://scientific-collections.gbif.org/collection/${info.gbif.grscicollKey}`
const CODE_TEXT = `EEM — Enns Entomology Museum, University of Missouri, Columbia, Missouri, USA (${grscicoll})`
const LIVE = 'https://enns-entomology-museum.github.io/Enns_Entomology_Museum_Database/'
const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'found', label: 'Found by search' }
]

const loading = ref(true)
const searchingLive = ref(false)
const items = ref([])
const updated = ref('')
const q = ref('')
const filter = ref('all')
const copied = ref(false)
const copiedAck = ref(false)
const copiedCode = ref(false)

const norm = (t) =>
  String(t || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
const keyOf = (p) => (p.doi ? `doi:${String(p.doi).toLowerCase()}` : `t:${norm(p.title)}`)

async function loadFile(file) {
  const base = import.meta.env.BASE_URL || '/'
  for (const root of [base, LIVE]) {
    try {
      const r = await fetch(`${root}data/${file}`)
      if (r.ok && /json/.test(r.headers.get('content-type') || '')) return await r.json()
    } catch {
      /* next */
    }
  }
  return null
}

// Sources tagged in TaxonWorks
async function loadConfirmed() {
  try {
    const { data: terms } = await makeAPIRequest.get('/controlled_vocabulary_terms', { params: { per: 1000 } })
    const kw = (terms || []).find((t) => t.type === 'Keyword' && norm(t.name) === norm(CONFIRM_KEYWORD))
    if (!kw) return []
    const { data } = await makeAPIRequest.get('/sources', { params: { 'keyword_id_and[]': kw.id, in_project: true, per: 1000 } })
    return (data || []).map((s) => {
      const text = String(s.cached || '').replace(/<[^>]+>/g, '')
      const title = (text.match(/\(\d{4}[a-z]?\)\s*(.+?)\.\s/) || [])[1] || text
      return {
        title,
        year: Number(s.year) || null,
        authors: s.cached_author_string ? [s.cached_author_string] : [],
        journal: String(s.journal || s.booktitle || '').replace(/<[^>]+>/g, ''),
        doi: s.doi || '',
        url: s.doi ? `https://doi.org/${s.doi}` : s.url || '',
        confirmed: true
      }
    })
  } catch {
    return []
  }
}

onMounted(async () => {
  const [file, confirmed] = await Promise.all([loadFile('eem-citations.json'), loadConfirmed()])
  let found = file?.items || null
  updated.value = file?.updated || ''
  if (!found) {
    // no deploy-time list yet: search now, in the browser
    searchingLive.value = true
    try {
      found = await harvest(async (url) => {
        const r = await fetch(url)
        return r.ok ? r.json() : {}
      })
    } catch {
      found = []
    }
  }
  const map = new Map()
  found.forEach((p) => map.set(keyOf(p), { ...p, confirmed: false }))
  confirmed.forEach((p) => {
    const k = keyOf(p)
    map.set(k, { ...(map.get(k) || {}), ...p, authors: map.get(k)?.authors?.length ? map.get(k).authors : p.authors, confirmed: true })
  })
  items.value = [...map.values()].map((p) => ({ ...p, key: keyOf(p) }))
  loading.value = false
})

const counts = computed(() => ({
  all: items.value.length,
  confirmed: items.value.filter((p) => p.confirmed).length,
  found: items.value.filter((p) => !p.confirmed).length
}))

const authorsOf = (p) => {
  const a = p.authors || []
  if (!a.length) return ''
  return a.length > 3 ? `${a[0]} et al.` : a.join(', ')
}

const shown = computed(() => {
  const term = q.value.trim().toLowerCase()
  return items.value.filter(
    (p) =>
      (filter.value === 'all' || (filter.value === 'confirmed' ? p.confirmed : !p.confirmed)) &&
      (!term || `${p.title} ${(p.authors || []).join(' ')} ${p.journal} ${p.year}`.toLowerCase().includes(term))
  )
})

const groups = computed(() => {
  const m = new Map()
  shown.value.forEach((p) => {
    const y = p.year || 'Year unknown'
    if (!m.has(y)) m.set(y, [])
    m.get(y).push(p)
  })
  return [...m.entries()]
    .sort((a, b) => (Number(b[0]) || 0) - (Number(a[0]) || 0))
    .map(([year, list]) => ({ year, items: list.sort((a, b) => a.title.localeCompare(b.title)) }))
})

const firstYear = computed(() => Math.min(...items.value.map((p) => p.year).filter(Boolean)) || '')
const journals = computed(() => new Set(items.value.map((p) => p.journal).filter(Boolean)).size)
const recent = computed(() => {
  const y = new Date().getFullYear()
  return items.value.filter((p) => p.year && p.year > y - 5).length
})
const years = computed(() => {
  const ys = items.value.map((p) => p.year).filter(Boolean)
  if (!ys.length) return []
  const out = []
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) out.push({ year: y, n: ys.filter((x) => x === y).length })
  return out
})
const yearMax = computed(() => Math.max(1, ...years.value.map((y) => y.n)))

const reference = (p) =>
  `${(p.authors || []).join(', ')}${p.authors?.length ? ' ' : ''}(${p.year || 'n.d.'}) ${p.title}.${p.journal ? ` ${p.journal}.` : ''}${p.doi ? ` https://doi.org/${p.doi}` : ''}`

async function copyText(t, flag = copiedAck) {
  try {
    await navigator.clipboard.writeText(t)
    flag.value = true
    setTimeout(() => (flag.value = false), 2000)
  } catch {
    /* clipboard blocked */
  }
}
const copyRefs = () =>
  copyText(
    shown.value
      .slice()
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .map(reference)
      .join('\n'),
    copied
  )

function downloadCsv() {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['year', 'authors', 'title', 'journal', 'doi', 'url', 'status'],
    ...shown.value.map((p) => [p.year, (p.authors || []).join('; '), p.title, p.journal, p.doi, p.url, p.confirmed ? 'confirmed' : 'found by search'])
  ]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  a.download = `EEM_publications_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.rs-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid var(--eem-rule);
  background: var(--eem-card);
}
.rs-stats > div {
  padding: 1rem 1.2rem;
  border-right: 1px solid var(--eem-rule);
  border-bottom: 1px solid var(--eem-rule);
}
.rs-stats dt {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.rs-stats dd {
  margin-top: 0.4rem;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 2rem;
  font-variant-numeric: tabular-nums;
}
.rs-chart {
  display: flex;
  align-items: stretch;
  gap: 2px;
  height: 8rem;
  padding-bottom: 1.4rem;
  border-bottom: 1px solid var(--eem-rule);
}
.rs-col {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}
.rs-bar {
  width: 80%;
  background: var(--eem-gold);
  border-radius: 3px 3px 0 0;
}
.rs-col:hover .rs-bar {
  background: var(--eem-gold-deep);
}
.rs-lab {
  position: absolute;
  bottom: -1.3rem;
  font-size: 0.68rem;
  color: var(--eem-ink-soft);
}
.rs-search {
  flex: 1 1 16rem;
  min-width: 0;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  padding: 0.5rem 0.8rem;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.rs-chip {
  padding: 0.35rem 0.8rem;
  border: 2px solid var(--eem-rule);
  border-radius: 2px;
  font-size: 0.82rem;
  font-weight: 700;
  background: var(--eem-card);
}
.rs-chip span {
  font-weight: 500;
  color: var(--eem-ink-soft);
}
.rs-chip.on {
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}
.rs-chip.on span {
  color: rgba(255, 255, 255, 0.7);
}
.rs-year {
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.3rem;
  padding-bottom: 0.3rem;
  border-bottom: 3px solid var(--eem-gold);
}
.rs-title {
  color: var(--eem-ink);
}
.rs-title:hover {
  text-decoration: underline;
  text-decoration-color: var(--eem-gold);
}
.rs-doi {
  color: var(--eem-gold-deep);
  font-size: 0.8rem;
  word-break: break-all;
}
.rs-badge {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.05rem 0.4rem;
  border-radius: 2px;
  border: 1px dashed var(--eem-ink-soft);
  color: var(--eem-ink-soft);
}
.rs-badge.ok {
  border: 1px solid #000;
  background: #000;
  color: var(--eem-gold);
}
.rs-cite-link {
  color: var(--eem-gold-deep);
  text-decoration: underline;
  word-break: break-all;
}
.rs-cite {
  padding: 0.7rem 0.9rem;
  background: var(--eem-paper-2);
  border-left: 4px solid var(--eem-gold);
  font-size: 0.85rem;
  line-height: 1.5;
}
@media (max-width: 640px) {
  .rs-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
