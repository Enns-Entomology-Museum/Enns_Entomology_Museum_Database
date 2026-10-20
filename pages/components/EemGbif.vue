<template>
  <section
    v-if="info.gbif.datasetKey"
    class="eem-gbif border-b eem-rule"
    aria-labelledby="eem-gbif-title"
  >
    <div class="container mx-auto box-border px-4 py-10 grid lg:grid-cols-12 gap-8">
      <div class="lg:col-span-5 min-w-0">
        <p class="eem-kicker">Open data</p>
        <div class="mt-3 flex items-center gap-3">
          <img
            v-if="logoOk"
            :src="logoSrc"
            alt="GBIF"
            class="eem-gbif-logo"
            @error="logoOk = false"
          />
          <span
            v-else
            class="eem-gbif-wordmark"
            >GBIF</span
          >
          <h2
            id="eem-gbif-title"
            class="eem-display text-2xl sm:text-3xl leading-tight"
          >
            Published through GBIF
          </h2>
        </div>
        <p class="mt-3 eem-muted text-sm leading-relaxed max-w-md">
          Every digitized specimen is shared with the Global Biodiversity Information Facility, the international
          network for open biodiversity data, under a {{ licence }} licence.
        </p>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <a
            v-if="info.gbif.doi"
            :href="`https://doi.org/${info.gbif.doi}`"
            target="_blank"
            rel="noopener"
            class="eem-doi"
            :title="`Dataset DOI ${info.gbif.doi}`"
            ><span class="eem-doi-k">DOI</span><span class="eem-doi-v">{{ info.gbif.doi }}</span></a
          >
          <a
            :href="`https://www.gbif.org/dataset/${info.gbif.datasetKey}`"
            target="_blank"
            rel="noopener"
            class="eem-link text-sm font-semibold"
            >Dataset on GBIF ↗</a
          >
        </div>
      </div>

      <div class="lg:col-span-7 min-w-0">
        <dl class="eem-gbif-stats">
          <div>
            <dt>Records on GBIF</dt>
            <dd>
              <span :class="{ 'eem-skel': !loaded }">{{ loaded ? fmt(records) : '—' }}</span>
            </dd>
            <p
              v-if="loaded && records === 0"
              class="eem-gbif-note"
            >
              being indexed by GBIF
            </p>
          </div>
          <div>
            <dt>Citations</dt>
            <dd>
              <span :class="{ 'eem-skel': !loaded }">{{ loaded ? fmt(citeCount) : '—' }}</span>
            </dd>
            <p class="eem-gbif-note">papers using our GBIF data</p>
          </div>
          <div>
            <dt>Licence</dt>
            <dd class="!text-xl">{{ licence }}</dd>
            <p class="eem-gbif-note">free to use, with credit</p>
          </div>
        </dl>

        <details
          class="eem-gbif-cites mt-4"
          :open="citations.length > 0 && citations.length <= 3"
        >
          <summary>
            {{ citations.length ? `Papers citing the dataset (${fmt(citeCount)})` : 'Papers citing the dataset' }}
          </summary>
          <ol
            v-if="citations.length"
            class="mt-3 space-y-3"
          >
            <li
              v-for="c in citations"
              :key="c.id"
              class="text-sm leading-snug"
            >
              <span class="eem-muted">{{ c.authors }}{{ c.year ? ` (${c.year})` : '' }}.</span>
              <a
                v-if="c.url"
                :href="c.url"
                target="_blank"
                rel="noopener"
                class="eem-link"
                >{{ c.title }}</a
              ><template v-else>{{ c.title }}</template
              ><span
                v-if="c.source"
                class="eem-muted"
              >
                · <i>{{ c.source }}</i></span
              >
            </li>
          </ol>
          <p
            v-else
            class="mt-3 text-sm eem-muted"
          >
            No citations yet. GBIF tracks papers that cite the dataset DOI and lists them here automatically.
          </p>
          <a
            v-if="citeCount > citations.length"
            :href="`https://www.gbif.org/resource/search?contentType=literature&gbifDatasetKey=${info.gbif.datasetKey}`"
            target="_blank"
            rel="noopener"
            class="mt-3 inline-block eem-link text-sm"
            >All {{ fmt(citeCount) }} on GBIF ↗</a
          >
        </details>

        <div class="eem-gbif-cite mt-4">
          <p class="text-xs font-bold uppercase tracking-[0.14em] eem-muted">Cite the dataset</p>
          <p class="mt-1 text-sm leading-relaxed">{{ citation }}</p>
          <button
            type="button"
            class="mt-2 eem-link text-sm font-semibold"
            @click="copy"
          >
            {{ copied ? 'Copied ✓' : 'Copy citation' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
// The museum's GBIF dataset: DOI, number of records and papers citing it
// (GBIF literature tracking), fetched live from api.gbif.org.
import { computed, onMounted, ref } from 'vue'
import info from './museumInfo.js'
import { fmt } from './useEem.js'

const API = 'https://api.gbif.org/v1'
const key = info.gbif.datasetKey
const base = import.meta.env.BASE_URL || '/'
const logoSrc = `${base}${info.gbif.logo || 'images/gbif-logo.svg'}`
const logoOk = ref(true)

const loaded = ref(false)
const records = ref(0)
const citeCount = ref(0)
const citations = ref([])
const gbifCitation = ref('')
const licenceUrl = ref('')
const copied = ref(false)

const LICENCES = { 'by/4.0': 'CC BY 4.0', 'by-nc/4.0': 'CC BY-NC 4.0', 'zero/1.0': 'CC0' }
const licence = computed(() => {
  const k = Object.keys(LICENCES).find((l) => licenceUrl.value.includes(l))
  return k ? LICENCES[k] : 'CC BY 4.0'
})

const today = new Date().toISOString().slice(0, 10)
const citation = computed(
  () =>
    gbifCitation.value ||
    `Enns Entomology Museum Collection (EEM). Occurrence dataset https://doi.org/${info.gbif.doi} accessed via GBIF.org on ${today}.`
)

const authorList = (a = []) => {
  const names = a.map((p) => [p.lastName, (p.firstName || '').charAt(0)].filter(Boolean).join(' '))
  return names.length > 3 ? `${names[0]} et al.` : names.join(', ')
}

onMounted(async () => {
  if (!key) return
  const get = (path) => fetch(`${API}${path}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
  const [ds, occ, lit] = await Promise.allSettled([
    get(`/dataset/${key}`),
    get(`/occurrence/search?datasetKey=${key}&limit=0`),
    get(`/literature/search?gbifDatasetKey=${key}&limit=20`)
  ])
  if (ds.status === 'fulfilled') {
    gbifCitation.value = ds.value.citation?.text || ''
    licenceUrl.value = ds.value.license || ''
  }
  if (occ.status === 'fulfilled') records.value = occ.value.count || 0
  if (lit.status === 'fulfilled') {
    citeCount.value = lit.value.count || 0
    citations.value = (lit.value.results || [])
      .slice()
      .sort((a, b) => (b.year || 0) - (a.year || 0))
      .map((c) => ({
        id: c.id,
        title: c.title,
        year: c.year,
        source: c.source,
        authors: authorList(c.authors),
        url: c.identifiers?.doi ? `https://doi.org/${c.identifiers.doi}` : c.websites?.[0] || ''
      }))
  }
  loaded.value = true
})

function copy() {
  navigator.clipboard?.writeText(citation.value).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  })
}
</script>

<style scoped>
.eem-gbif {
  background: var(--eem-card);
}
.eem-gbif-logo {
  height: 2.6rem;
  width: auto;
}
.eem-gbif-wordmark {
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  letter-spacing: 0.04em;
  padding: 0.35rem 0.55rem;
  border: 2px solid var(--eem-ink);
  border-radius: 4px;
}
.eem-doi {
  display: inline-flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  font-size: 0.78rem;
  font-weight: 700;
  border: 1px solid #000;
  text-decoration: none !important;
}
.eem-doi-k {
  background: #000;
  color: var(--eem-gold);
  padding: 0.25rem 0.55rem 0.25rem 0.7rem;
  letter-spacing: 0.06em;
}
.eem-doi-v {
  background: var(--eem-paper);
  color: var(--eem-ink);
  padding: 0.25rem 0.75rem 0.25rem 0.55rem;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
}
.eem-doi:hover .eem-doi-v {
  background: var(--eem-gold);
  color: #000;
}
.eem-gbif-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid var(--eem-rule);
}
.eem-gbif-stats > div {
  padding: 0.9rem 1rem;
  border-right: 1px solid var(--eem-rule);
  border-bottom: 1px solid var(--eem-rule);
  background: var(--eem-paper);
}
.eem-gbif-stats dt {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.eem-gbif-stats dd {
  margin-top: 0.35rem;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.9rem;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.eem-gbif-note {
  margin-top: 0.2rem;
  font-size: 0.72rem;
  color: var(--eem-ink-soft);
}
.eem-gbif-cites summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
}
.eem-gbif-cites ol {
  list-style: decimal;
  padding-left: 1.3rem;
}
.eem-gbif-cite {
  padding: 0.8rem 1rem;
  border: 1px solid var(--eem-rule);
  background: var(--eem-paper);
}
@media (max-width: 520px) {
  .eem-gbif-stats dd {
    font-size: 1.4rem;
  }
}
</style>
