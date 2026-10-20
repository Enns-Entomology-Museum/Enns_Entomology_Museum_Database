<template>
  <div class="eem min-h-screen">
    <section class="eem-spec-head">
      <div class="container mx-auto box-border px-4 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div class="min-w-0">
          <RouterLink
            to="/"
            class="block w-fit text-xs !text-white/70 hover:!text-[color:var(--eem-gold)]"
            >← Enns Entomology Museum</RouterLink
          >
          <p class="eem-kicker flex mt-1 !text-[color:var(--eem-gold)]">Specimen record</p>
        </div>

        <form
          class="eem-spec-search ml-auto w-full sm:w-auto sm:min-w-[22rem]"
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
            class="eem-btn eem-btn-gold !py-1.5"
          >
            Look up
          </button>
        </form>
      </div>
    </section>

    <section class="container mx-auto box-border px-4 py-8 sm:py-12">
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

      <template v-else>
        <!-- ── Top: identity + photo ─────────────────────────────── -->
        <div class="grid lg:grid-cols-12 gap-8 lg:gap-10">
          <div class="lg:col-span-7 min-w-0">
            <nav
              v-if="lineage.length"
              class="eem-lineage"
              aria-label="Classification"
            >
              <template
                v-for="(t, i) in lineage"
                :key="t.name"
              >
                <span
                  v-if="i"
                  aria-hidden="true"
                  >›</span
                >
                <RouterLink
                  :to="t.to"
                  :title="t.title"
                  ><i v-if="t.italic">{{ t.name }}</i
                  ><template v-else>{{ t.name }}</template></RouterLink
                >
              </template>
            </nav>

            <p class="mt-4 flex flex-wrap items-center gap-2">
              <span class="eem-cat">{{ rec.catalogNumber }}</span>
              <span
                v-if="type"
                :class="['eem-typebadge', { primary: type.primary }]"
                >{{ type.label }}</span
              >
              <span
                v-if="onLoan"
                class="eem-onloan"
                >On loan{{ onLoan.due ? ` · due back ${dueLabel}` : '' }}</span
              >
            </p>
            <h1 class="mt-3 eem-display text-4xl sm:text-5xl leading-tight">
              <i class="font-bold">{{ name }}</i>
            </h1>
            <p
              v-if="rec.scientificNameAuthorship"
              class="mt-1 eem-muted"
            >
              {{ rec.scientificNameAuthorship }}
            </p>

            <!-- Facts at a glance -->
            <ul
              v-if="facts.length"
              class="eem-facts mt-5"
            >
              <li
                v-for="f in facts"
                :key="f.k"
                :title="f.title"
              >
                <span
                  class="eem-facts-ico"
                  aria-hidden="true"
                  >{{ f.icon }}</span
                >{{ f.text }}
              </li>
            </ul>

            <div
              v-if="type"
              :class="['eem-typenote mt-5', { primary: type.primary }]"
            >
              <p class="font-semibold">
                {{ type.label }} of <i>{{ name }}</i
                >{{ rec.scientificNameAuthorship ? ` ${rec.scientificNameAuthorship}` : '' }}
              </p>
              <p class="mt-1 text-sm">
                <template v-if="type.primary"
                  >The name-bearing specimen: the name of this species is tied to it. Type specimens are kept apart in
                  the museum's type collection and marked with a red label.</template
                >
                <template v-else
                  >Part of the type series on which this species was described. Type specimens are kept apart in the
                  museum's type collection.</template
                >
                <RouterLink
                  to="/collection"
                  class="eem-link ml-1"
                  >All types in the collection →</RouterLink
                >
              </p>
            </div>

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

            <!-- Labels, as transcribed -->
            <section
              v-if="labels.length"
              class="mt-8"
            >
              <h2 class="eem-kicker">Labels</h2>
              <p class="mt-1 text-xs eem-muted">Transcribed as written, line by line.</p>
              <div class="eem-labels mt-3">
                <pre
                  v-for="l in labels"
                  :key="l.key"
                  :class="['eem-paperlabel', { red: l.red }]"
                  :title="l.title"
                  >{{ l.text }}</pre
                >
              </div>
            </section>
          </div>

          <aside class="lg:col-span-5 min-w-0 space-y-5">
            <EemSpecimenImages
              :collection-object-id="coId"
              :catalog-number="rec.catalogNumber"
              :title="name"
              @count="nImages = $event"
            />
            <div
              v-if="nImages === 0"
              class="eem-nophoto"
            >
              <span
                class="eem-nophoto-pin"
                aria-hidden="true"
              />
              <p class="eem-display text-lg">Not yet photographed</p>
              <p class="mt-1 text-sm eem-muted max-w-xs">
                Photos are added as specimens are imaged in the museum. The label data are below.
              </p>
            </div>
          </aside>
        </div>

        <!-- ── Data + map ────────────────────────────────────────── -->
        <div class="mt-10 grid lg:grid-cols-12 gap-8 lg:gap-10">
          <div class="lg:col-span-7 min-w-0">
            <div class="eem-data">
              <div class="eem-data-grid">
                <section
                  v-for="block in blocks"
                  :key="block.title"
                >
                  <h2 class="eem-kicker">{{ block.title }}</h2>
                  <dl class="mt-3 space-y-2 text-sm">
                    <div
                      v-for="row in block.rows"
                      :key="row[0]"
                      class="grid grid-cols-[7.5rem_1fr] gap-3"
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
              <footer
                v-if="details.length"
                class="eem-data-foot"
              >
                <span
                  v-for="d in details"
                  :key="d[0]"
                  ><span class="eem-muted">{{ d[0] }}:</span> <span class="break-all">{{ d[1] }}</span></span
                >
              </footer>
            </div>
          </div>

          <aside class="lg:col-span-5 min-w-0 space-y-5">
            <div
              v-if="point"
              class="eem-card p-2 relative"
            >
              <ClientOnly>
                <EemMap
                  :points="[point]"
                  height="300px"
                  :point-zoom="7"
                  label="Collecting locality"
                />
                <div
                  class="eem-inset"
                  aria-hidden="true"
                >
                  <EemMap
                    :points="[{ lat: point.lat, lng: point.lng }]"
                    height="100%"
                    :zoom="0"
                    :point-zoom="0"
                    still
                    label="Locator"
                  />
                </div>
              </ClientOnly>
              <p class="px-2 pt-2 pb-1 text-xs eem-muted">{{ placeLine }}</p>
            </div>
            <div
              v-else
              class="eem-card p-6 eem-muted text-sm"
            >
              This specimen has not been georeferenced yet.
            </div>

            <div class="eem-card p-5 text-sm">
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
                Please cite the catalog number <b>{{ rec.catalogNumber }}</b> and the acronym <b>EEM</b> when you
                publish on this specimen.
              </p>
            </div>
          </aside>
        </div>

        <!-- ── More like this ────────────────────────────────────── -->
        <section
          v-for="g in related"
          :key="g.title"
          class="mt-12"
        >
          <div class="flex flex-wrap items-end justify-between gap-3">
            <h2 class="eem-display text-2xl">
              {{ g.title }} <i v-if="g.italic">{{ g.italic }}</i>
            </h2>
            <RouterLink
              v-if="g.all"
              :to="g.all"
              class="eem-link text-sm"
              >See all {{ g.total }} →</RouterLink
            >
          </div>
          <ul class="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <li
              v-for="r in g.items"
              :key="r.id"
            >
              <RouterLink
                :to="{ path: '/specimen', query: { cat: r.catalogNumber } }"
                :class="['eem-mini group', { 'is-type': typeInfo(r.typeStatus) }]"
              >
                <span class="flex flex-wrap items-center gap-1.5">
                  <span class="eem-mini-cat">{{ r.catalogNumber }}</span>
                  <span
                    v-if="typeInfo(r.typeStatus)"
                    :class="['eem-mini-type', { primary: typeInfo(r.typeStatus).primary }]"
                    >{{ typeInfo(r.typeStatus).label }}</span
                  >
                </span>
                <span class="block mt-2 font-semibold italic leading-snug group-hover:underline">{{
                  nameOf(r)
                }}</span>
                <span class="block mt-1 text-xs eem-muted">{{
                  [r.sex, r.county ? `${r.county} Co.` : r.stateProvince || r.country, r.eventDate]
                    .filter(Boolean)
                    .join(' · ')
                }}</span>
              </RouterLink>
            </li>
          </ul>
        </section>
      </template>
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
import { collectorsOf, findByCatalog, normCat, typeInfo, useEem, useLoans } from './components/useEem.js'

const loans = useLoans()
const eem = useEem()
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
  loadLabels()
}

const nImages = ref(null)
const coId = computed(() =>
  rec.value?.dwc_occurrence_object_type === 'CollectionObject' ? rec.value.dwc_occurrence_object_id : null
)

// ── Label transcriptions (TaxonWorks "buffered" fields) ──────────────────
// A blank line separates physical labels; "[Red label]" marks a red one.
const rawLabels = ref({})
async function loadLabels() {
  rawLabels.value = {}
  nImages.value = null
  if (!coId.value) return
  try {
    const { data } = await makeAPIRequest.get(`/collection_objects/${coId.value}`)
    rawLabels.value = {
      event: data?.buffered_collecting_event,
      det: data?.buffered_determinations,
      other: data?.buffered_other_labels
    }
  } catch {
    rawLabels.value = {}
  }
}
const KIND = { event: 'Collecting event label', det: 'Determination label', other: 'Other label' }
const labels = computed(() =>
  Object.entries(rawLabels.value).flatMap(([kind, text]) =>
    String(text || '')
      .split(/\n\s*\n/)
      .map((t) => t.split('\n').map((l) => l.trimEnd()).join('\n').trim())
      .filter(Boolean)
      .map((t, i) => {
        const red = /^\[red label\]/i.test(t)
        return {
          key: `${kind}-${i}`,
          red,
          title: red ? `${KIND[kind]} (red)` : KIND[kind],
          text: t.replace(/^\[red label\]\s*/i, '')
        }
      })
  )
)

// ── Classification trail and facts at a glance ───────────────────────────
const lineage = computed(() => {
  const r = rec.value || {}
  const out = []
  if (r.order) out.push({ name: r.order, to: { path: '/specimens', query: { order: r.order } }, title: `All ${r.order} specimens` })
  if (r.family) out.push({ name: r.family, to: { path: '/specimens', query: { family: r.family } }, title: `All ${r.family} specimens` })
  if (r.genus) out.push({ name: r.genus, italic: true, to: { path: '/specimens', query: { q: r.genus } }, title: `All ${r.genus} specimens` })
  return out
})

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function niceDate(d = '') {
  const m = String(d).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/)
  if (!m) return d
  const [, y, mo, da] = m
  return [da ? Number(da) : '', mo ? MONTHS[Number(mo) - 1] : '', y].filter(Boolean).join(' ')
}

const placeLine = computed(() => {
  const r = rec.value || {}
  return [r.county ? `${r.county} Co.` : '', r.stateProvince, r.country].filter(Boolean).join(', ')
})

const facts = computed(() => {
  const r = rec.value || {}
  const sex = /^m/i.test(r.sex || '') ? '♂' : /^f/i.test(r.sex || '') ? '♀' : ''
  const where = r.county ? `${r.county} Co., ${r.stateProvince || r.country}` : r.stateProvince ? `${r.stateProvince}, ${r.country}` : r.country
  return [
    where && { k: 'where', icon: '◉', text: where, title: 'Where it was collected' },
    (r.eventDate || r.verbatimEventDate) && { k: 'when', icon: '◷', text: niceDate(r.eventDate || r.verbatimEventDate), title: 'Date collected' },
    r.sex && { k: 'sex', icon: sex || '•', text: r.sex.charAt(0).toUpperCase() + r.sex.slice(1), title: 'Sex' },
    r.lifeStage && !/^adult$/i.test(r.lifeStage) && { k: 'stage', icon: '•', text: r.lifeStage, title: 'Life stage' },
    r.preparations && { k: 'prep', icon: '⊥', text: r.preparations === 'Pin' ? 'Pinned' : r.preparations, title: 'Preparation' },
    Number(r.individualCount) > 1 && { k: 'n', icon: '×', text: `${r.individualCount} specimens`, title: 'Count' }
  ].filter(Boolean)
})

// ── More like this (from the records already loaded for the home page) ───
const nameOf = (r) => [r.genus, r.specificEpithet].filter(Boolean).join(' ') || r.scientificName || r.family || r.order || 'Unidentified'
const related = computed(() => {
  const r = rec.value
  if (!r) return []
  const others = eem.records.filter((o) => o.id !== r.id && o.catalogNumber)
  const groups = []
  const seen = new Set()
  if (r.recordedBy && r.eventDate) {
    const same = others.filter((o) => o.eventDate === r.eventDate && o.recordedBy === r.recordedBy && (o.verbatimLocality || o.locality) === (r.verbatimLocality || r.locality))
    if (same.length) {
      same.forEach((o) => seen.add(o.id))
      groups.push({ title: 'From the same collecting event', items: same.slice(0, 8), total: same.length })
    }
  }
  if (r.genus && r.specificEpithet) {
    const sp = others.filter((o) => o.genus === r.genus && o.specificEpithet === r.specificEpithet && !seen.has(o.id))
    if (sp.length) {
      const nm = `${r.genus} ${r.specificEpithet}`
      groups.push({ title: 'More', italic: nm, items: sp.slice(0, 8), total: sp.length, all: sp.length > 8 ? { path: '/specimens', query: { q: nm } } : null })
    }
  }
  return groups
})

watch(cat, load, { immediate: true })
watch(cat, (v) => (q.value = v))

const type = computed(() => (rec.value ? typeInfo(rec.value.typeStatus) : null))

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
      ['Year', r.dateIdentified]
    ])
  ].filter((b) => b.rows.length)
})

// Technical identifiers, shown small under the data
const details = computed(() => {
  const r = rec.value || {}
  return [
    ['Basis of record', r.basisOfRecord],
    ['Occurrence ID', r.occurrenceID]
  ].filter(([, v]) => val(v))
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
    r.recordedBy ? `${collectorsOf(r).join(', ')} leg.` : '',
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
.eem-typebadge {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  border: 1.5px solid #e3a59e;
  background: #f6d5d1;
  color: #8a1c1c;
}
.eem-typebadge.primary {
  background: #be2828;
  border-color: #be2828;
  color: #fff;
}
.eem-typenote {
  max-width: 40rem;
  padding: 0.8rem 1rem;
  border: 1px solid var(--eem-rule);
  border-left: 4px solid #e3a59e;
  background: var(--eem-card);
}
.eem-typenote.primary {
  border-left-color: #be2828;
  background: color-mix(in srgb, #be2828 7%, var(--eem-card));
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

.eem-lineage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem 0.5rem;
  font-size: 0.8rem;
  color: var(--eem-ink-soft);
}
.eem-lineage a {
  color: inherit !important;
  text-decoration: underline;
  text-decoration-color: var(--eem-rule);
  text-underline-offset: 3px;
}
.eem-lineage a:hover {
  text-decoration-color: var(--eem-gold);
}
.eem-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.eem-facts li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.3rem 0.7rem;
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-radius: 999px;
}
.eem-facts-ico {
  color: var(--eem-gold-deep, #9a7412);
  font-weight: 800;
}
.eem-labels {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 0.8rem;
}
.eem-paperlabel {
  margin: 0;
  max-width: 15rem;
  padding: 0.55rem 0.7rem;
  background: #fffdf6;
  color: #1a1a1a;
  border: 1px solid #d8d2c2;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04), 0 3px 8px rgba(0, 0, 0, 0.07);
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.72rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.eem-paperlabel:nth-child(even) {
  transform: rotate(0.6deg);
}
.eem-paperlabel:nth-child(odd) {
  transform: rotate(-0.5deg);
}
.eem-paperlabel.red {
  background: #f4c9c4;
  border-color: #d99a93;
  color: #3a0d0a;
  font-weight: 700;
}
.eem-nophoto {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 10rem;
  padding: 1.5rem;
  border: 2px dashed var(--eem-rule);
  background: repeating-linear-gradient(-45deg, transparent 0 12px, rgba(0, 0, 0, 0.02) 12px 24px), var(--eem-card);
}
.eem-nophoto-pin {
  position: relative;
  width: 3px;
  height: 3.2rem;
  margin-bottom: 1rem;
  background: #777;
}
.eem-nophoto-pin::before {
  content: '';
  position: absolute;
  top: -0.35rem;
  left: 50%;
  width: 0.8rem;
  height: 0.8rem;
  transform: translateX(-50%);
  border-radius: 50%;
  background: var(--eem-gold);
  border: 1.5px solid #000;
}
@media (min-width: 1024px) {
  .eem-nophoto {
    min-height: 18rem;
  }
}
.eem-data {
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-top: 4px solid #000;
}
.eem-data-grid {
  display: grid;
  gap: 1.6rem 2rem;
  padding: 1.4rem 1.4rem 1.2rem;
}
@media (min-width: 640px) {
  .eem-data-grid {
    grid-template-columns: 1fr 1fr;
  }
}
.eem-data-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 1.4rem;
  padding: 0.7rem 1.4rem;
  border-top: 1px solid var(--eem-rule);
  font-size: 0.72rem;
}
.eem-inset {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 9rem;
  height: 5.6rem;
  border: 2px solid #fff;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
  z-index: 500;
  pointer-events: none;
  overflow: hidden;
}
.eem-mini {
  display: block;
  height: 100%;
  padding: 0.8rem 0.9rem;
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-left: 4px solid #000;
  color: var(--eem-ink) !important;
  transition: border-color 0.15s, transform 0.15s;
}
.eem-mini:hover {
  border-left-color: var(--eem-gold);
  transform: translateY(-2px);
}
.eem-mini.is-type {
  border-left-color: #be2828;
}
.eem-mini-cat {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-mini-type {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.1rem 0.35rem;
  border: 1.5px solid #e3a59e;
  background: #f6d5d1;
  color: #8a1c1c;
}
.eem-mini-type.primary {
  background: #be2828;
  border-color: #be2828;
  color: #fff;
}
</style>
