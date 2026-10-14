<template>
  <div class="eem min-h-screen">
    <section class="eem-spec-head">
      <div class="container mx-auto box-border px-4 py-10 sm:py-14">
        <RouterLink
          to="/"
          class="block w-fit text-sm !text-white/70 hover:!text-[color:var(--eem-gold)]"
          >← Enns Entomology Museum</RouterLink
        >
        <p class="eem-kicker flex mt-6 !text-[color:var(--eem-gold)]">Specimen record</p>

        <form
          class="eem-spec-search mt-4 max-w-lg"
          role="search"
          @submit.prevent="go"
        >
          <label
            for="eem-cat"
            class="sr-only"
            >Catalog number</label
          >
          <input
            id="eem-cat"
            v-model="q"
            type="search"
            placeholder="Catalog number, e.g. EEM000000108"
          />
          <button
            type="submit"
            class="eem-btn eem-btn-gold"
          >
            Look up
          </button>
        </form>
      </div>
    </section>

    <section class="container mx-auto box-border px-4 py-10 sm:py-14">
      <p
        v-if="!cat"
        class="eem-card p-6 eem-muted"
      >
        Enter a catalog number (printed on the specimen’s QR label) to see its record.
      </p>
      <p
        v-else-if="loading"
        class="eem-muted"
      >
        Looking up {{ cat }}…
      </p>
      <div
        v-else-if="!rec"
        class="eem-card p-6"
      >
        <p class="font-semibold">No specimen found with catalog number “{{ cat }}”.</p>
        <p class="mt-2 eem-muted text-sm">
          Check the number on the label, or it may not have been digitized yet.
        </p>
      </div>

      <div
        v-else
        class="grid lg:grid-cols-12 gap-10"
      >
        <div class="lg:col-span-7">
          <p class="flex flex-wrap items-center gap-2">
            <span class="eem-cat">{{ rec.catalogNumber }}</span>
            <span
              v-if="onLoan"
              class="eem-onloan"
              >On loan{{ onLoan.due ? ` · due back ${dueLabel}` : '' }}</span
            >
          </p>
          <h1 class="mt-4 eem-display text-4xl sm:text-5xl leading-tight">
            <i class="font-bold">{{ name }}</i>
          </h1>
          <p class="mt-2 eem-muted">
            {{ [rec.scientificNameAuthorship, rec.order, rec.family].filter(Boolean).join(' · ') }}
          </p>

          <div class="mt-5 flex flex-wrap gap-3">
            <RouterLink
              v-if="rec.otu_id"
              :to="{ name: 'otus-id-overview', params: { id: rec.otu_id } }"
              class="eem-btn eem-btn-line !text-[color:var(--eem-ink)]"
              >Taxon page →</RouterLink
            >
            <button
              type="button"
              class="eem-btn eem-btn-line"
              @click="copy(citation, 'top')"
            >
              {{ copiedWhat === 'top' ? 'Copied ✓' : 'Copy citation' }}
            </button>
          </div>

          <!-- Label-style data blocks -->
          <div class="mt-10 grid sm:grid-cols-2 gap-5">
            <section
              v-for="block in blocks"
              :key="block.title"
              class="eem-block"
            >
              <h2 class="eem-kicker">{{ block.title }}</h2>
              <dl class="mt-3 space-y-2 text-sm">
                <div
                  v-for="row in block.rows"
                  :key="row[0]"
                  class="grid grid-cols-[8.5rem_1fr] gap-3"
                >
                  <dt class="eem-muted">{{ row[0] }}</dt>
                  <dd class="font-medium break-words">
                    <template v-if="row[0] === 'Collector'">
                      <template
                        v-for="(c, i) in collectorsOf(rec)"
                        :key="c"
                        ><span v-if="i">, </span
                        ><RouterLink
                          :to="{ path: '/collector', query: { name: c } }"
                          class="eem-link"
                          >{{ c }}</RouterLink
                        ></template
                      >
                    </template>
                    <template v-else>{{ row[1] }}</template>
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <aside class="lg:col-span-5 space-y-5">
          <EemSpecimenImages
            :collection-object-id="rec.dwc_occurrence_object_type === 'CollectionObject' ? rec.dwc_occurrence_object_id : null"
            :catalog-number="rec.catalogNumber"
            :title="name"
          />
          <div
            v-if="point"
            class="eem-card p-2"
          >
            <ClientOnly>
              <EemMap
                :points="[point]"
                height="360px"
              />
            </ClientOnly>
          </div>
          <div
            v-else
            class="eem-card p-6 eem-muted text-sm"
          >
            This specimen has not been georeferenced yet.
          </div>

          <div class="mt-5 eem-card p-5 text-sm">
            <p class="eem-kicker">Cite this specimen</p>
            <div
              class="eem-cite-tabs mt-3"
              role="tablist"
              aria-label="Citation format"
            >
              <button
                v-for="f in FORMATS"
                :key="f.key"
                type="button"
                role="tab"
                :aria-selected="fmtKey === f.key"
                @click="fmtKey = f.key"
              >
                {{ f.label }}
              </button>
            </div>
            <pre
              class="eem-cite-text"
              :class="{ mono: fmtKey === 'bibtex' || fmtKey === 'ris' }"
              >{{ citeText }}</pre
            >
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="eem-btn eem-btn-gold !py-1.5 !px-3 !text-sm"
                @click="copy(citeText, 'cite')"
              >
                {{ copiedWhat === 'cite' ? 'Copied ✓' : 'Copy' }}
              </button>
              <button
                v-if="fmtKey === 'bibtex' || fmtKey === 'ris'"
                type="button"
                class="eem-btn eem-btn-line !py-1.5 !px-3 !text-sm"
                @click="download"
              >
                Download .{{ fmtKey === 'bibtex' ? 'bib' : 'ris' }}
              </button>
              <button
                type="button"
                class="eem-btn eem-btn-line !py-1.5 !px-3 !text-sm"
                @click="copy(permalink, 'link')"
              >
                {{ copiedWhat === 'link' ? 'Link copied ✓' : 'Copy link' }}
              </button>
            </div>
            <p class="mt-3 text-xs eem-muted break-all">
              Permanent link: <a
                :href="permalink"
                class="eem-link"
                >{{ permalink }}</a
              >
            </p>
            <p class="mt-2 text-xs eem-muted">
              Please cite the catalog number <b>{{ rec.catalogNumber }}</b> and the acronym <b>EEM</b> when you publish
              on this specimen.
            </p>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import EemMap from './components/EemMap.vue'
import EemSpecimenImages from './components/EemSpecimenImages.vue'
import { collectorsOf, findByCatalog, normCat, useLoans } from './components/useEem.js'

const loans = useLoans()
const route = useRoute()
const router = useRouter()

const q = ref(route.query.cat || '')
const cat = computed(() => String(route.query.cat || '').trim())
const rec = ref(null)
const loading = ref(false)

function go() {
  const v = q.value.trim()
  if (v) router.push({ path: '/specimen', query: { cat: v } })
}

async function load() {
  rec.value = null
  if (!cat.value) return
  loading.value = true
  // Accept "108", "EEM108", "EEM000000108" or "EEM 000000108"
  try {
    rec.value = await findByCatalog(cat.value)
  } catch {
    rec.value = null
  } finally {
    loading.value = false
  }
}

watch(cat, load, { immediate: true })

const name = computed(() => {
  const r = rec.value || {}
  return (
    [r.genus, r.specificEpithet, r.infraspecificEpithet].filter(Boolean).join(' ') ||
    r.scientificName ||
    r.family ||
    r.order ||
    'Unidentified'
  )
})

function val(...vals) {
  return vals.find((v) => v !== undefined && v !== null && String(v).trim() !== '')
}

const blocks = computed(() => {
  const r = rec.value || {}
  const make = (title, rows) => ({ title, rows: rows.filter(([, v]) => val(v)) })
  return [
    make('Locality', [
      ['Country', r.country],
      ['State / province', r.stateProvince],
      ['County', r.county],
      ['Locality', r.verbatimLocality || r.locality],
      ['Coordinates', r.decimalLatitude ? `${Number(r.decimalLatitude).toFixed(4)}, ${Number(r.decimalLongitude).toFixed(4)}` : ''],
      ['Elevation', r.minimumElevationInMeters ? `${r.minimumElevationInMeters} m` : '']
    ]),
    make('Collecting event', [
      ['Date', r.eventDate || r.verbatimEventDate],
      ['Collector', r.recordedBy],
      ['Method', r.samplingProtocol],
      ['Habitat', r.habitat]
    ]),
    make('Specimen', [
      ['Preparation', r.preparations],
      ['Sex', r.sex],
      ['Life stage', r.lifeStage],
      ['Count', r.individualCount],
      ['Type status', r.typeStatus]
    ]),
    make('Identification', [
      ['Determined by', r.identifiedBy],
      ['Year', r.dateIdentified],
      ['Basis of record', r.basisOfRecord],
      ['Occurrence ID', r.occurrenceID]
    ])
  ].filter((b) => b.rows.length)
})

const point = computed(() => {
  const r = rec.value
  if (!r?.decimalLatitude || !r?.decimalLongitude) return null
  return { lat: Number(r.decimalLatitude), lng: Number(r.decimalLongitude), html: `<strong>${r.catalogNumber}</strong>` }
})

const citation = computed(() => {
  const r = rec.value || {}
  const today = new Date().toISOString().slice(0, 10)
  return `Enns Entomology Museum, University of Missouri (EEM). Specimen ${r.catalogNumber || ''}, ${name.value}.${
    r.occurrenceID ? ` Occurrence ID ${r.occurrenceID}.` : ''
  } Enns Entomology Museum Database, ${permalink.value} (accessed ${today}).`
})

const onLoan = computed(() => {
  const c = normCat(rec.value?.catalogNumber)
  return c ? loans.items.find((i) => i.cat === c) : null
})
const dueLabel = computed(() =>
  onLoan.value?.due
    ? new Date(`${onLoan.value.due}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : ''
)

const FORMATS = [
  { key: 'text', label: 'Text' },
  { key: 'material', label: 'Material examined' },
  { key: 'bibtex', label: 'BibTeX' },
  { key: 'ris', label: 'RIS' }
]
const fmtKey = ref('text')
const copiedWhat = ref('')

const permalink = computed(() => {
  const { origin } = typeof window !== 'undefined' ? window.location : { origin: '' }
  const base = import.meta.env.BASE_URL || '/'
  return `${origin}${base}#/specimen?cat=${encodeURIComponent(rec.value?.catalogNumber || '')}`
})

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii']
function labelDate(d = '') {
  const m = String(d).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/)
  if (!m) return d
  const [, y, mo, da] = m
  return [da ? Number(da) : '', mo ? ROMAN[Number(mo) - 1] : '', y].filter(Boolean).join('.')
}

// Taxonomic "material examined" style, as printed in papers
const material = computed(() => {
  const r = rec.value || {}
  const country = r.country === 'United States' ? 'USA' : r.country
  const where = [country, r.stateProvince, r.county ? `${r.county} Co.` : '', r.verbatimLocality || r.locality]
    .filter(Boolean)
    .join(': ')
    .replace(/: ([^:]+ Co\.): /, ': $1, ')
  const coords = r.decimalLatitude
    ? `${Number(r.decimalLatitude).toFixed(4)}, ${Number(r.decimalLongitude).toFixed(4)}`
    : ''
  const sexSym = /^m/i.test(r.sex || '') ? '♂' : /^f/i.test(r.sex || '') ? '♀' : ' ex.'
  const n = r.individualCount || 1
  return [
    `${where}${coords ? `, ${coords}` : ''}`,
    labelDate(r.eventDate || r.verbatimEventDate),
    r.recordedBy ? `${r.recordedBy} leg.` : '',
    `${n}${sexSym} (EEM, ${r.catalogNumber})`
  ]
    .filter(Boolean)
    .join(', ') + '.'
})

const bibKey = computed(() => `EEM_${(rec.value?.catalogNumber || '').replace(/^EEM0*/, '')}`)
const accessed = new Date().toISOString().slice(0, 10)

const bibtex = computed(() => {
  const r = rec.value || {}
  return `@misc{${bibKey.value},
  author = {{Enns Entomology Museum, University of Missouri}},
  title = {Specimen ${r.catalogNumber}: \\textit{${name.value}}},
  howpublished = {Enns Entomology Museum Database},
  url = {${permalink.value}},${r.occurrenceID ? `\n  note = {Occurrence ID ${r.occurrenceID}},` : ''}
  urldate = {${accessed}}
}`
})

const ris = computed(() => {
  const r = rec.value || {}
  return [
    'TY  - DATA',
    'AU  - Enns Entomology Museum, University of Missouri',
    `TI  - Specimen ${r.catalogNumber}: ${name.value}`,
    'T2  - Enns Entomology Museum Database',
    `UR  - ${permalink.value}`,
    r.occurrenceID ? `N1  - Occurrence ID ${r.occurrenceID}` : null,
    `Y2  - ${accessed}`,
    'ER  - '
  ]
    .filter(Boolean)
    .join('\n')
})

const citeText = computed(
  () => ({ text: citation.value, material: material.value, bibtex: bibtex.value, ris: ris.value })[fmtKey.value]
)

function copy(text, what) {
  navigator.clipboard?.writeText(text).then(() => {
    copiedWhat.value = what
    setTimeout(() => (copiedWhat.value = ''), 1600)
  })
}

function download() {
  const isBib = fmtKey.value === 'bibtex'
  const blob = new Blob([citeText.value], { type: isBib ? 'application/x-bibtex' : 'application/x-research-info-systems' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${rec.value?.catalogNumber || 'specimen'}.${isBib ? 'bib' : 'ris'}`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

useHead({
  title: () => (rec.value ? `${rec.value.catalogNumber} · ${name.value} — Enns Entomology Museum` : 'Specimen — Enns Entomology Museum')
})
</script>

<style scoped>
.eem-spec-head {
  background: #000;
  color: #fff;
  border-bottom: 6px solid var(--eem-gold);
}
.eem-spec-search {
  display: flex;
  background: #fff;
  padding: 4px;
  border-radius: 2px;
}
.eem-spec-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  padding: 0.6rem 0.9rem;
  color: #111;
  background: transparent;
}
.eem-cat {
  display: inline-block;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.6rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-cite-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  border-bottom: 2px solid var(--eem-ink);
}
.eem-cite-tabs button {
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 2px 2px 0 0;
  color: var(--eem-ink-soft);
}
.eem-cite-tabs button[aria-selected='true'] {
  background: #000;
  color: var(--eem-gold);
}
.eem-cite-text {
  margin: 0.75rem 0 0;
  padding: 0.85rem 0.95rem;
  background: var(--eem-paper);
  border: 1px solid var(--eem-rule);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  line-height: 1.6;
  font-size: 0.85rem;
}
.eem-cite-text.mono {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.75rem;
}
.eem-onloan {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  background: #000;
  color: var(--eem-gold);
}
.eem-block {
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-left: 4px solid #000;
  padding: 1.1rem 1.2rem 1.2rem;
}
</style>
