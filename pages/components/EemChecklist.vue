<template>
  <div>
    <!-- Controls -->
    <div class="eem-ck-bar">
      <input
        v-model="q"
        type="search"
        class="eem-ck-search"
        placeholder="Search a species, genus, family or order"
        aria-label="Search the checklist"
      />
      <div
        class="eem-ck-chips"
        role="radiogroup"
        aria-label="Show"
      >
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          role="radio"
          :aria-checked="show === f.key"
          :class="{ on: show === f.key }"
          @click="show = f.key"
        >
          {{ f.label }} <span>{{ fmt(counts[f.key]) }}</span>
        </button>
      </div>
      <button
        type="button"
        class="eem-btn eem-btn-gold"
        :disabled="!merged.length"
        @click="downloadCsv"
      >
        Download CSV
      </button>
    </div>

    <!-- Sources -->
    <div
      class="eem-ck-sources"
      role="group"
      aria-label="Sources to include"
    >
      <span class="eem-ck-sources-label">Recorded by</span>
      <button
        v-for="src in SOURCES.filter((x) => available[x.key])"
        :key="src.key"
        type="button"
        :class="['eem-ck-srcbtn', { on: sources.has(src.key) }]"
        :aria-pressed="sources.has(src.key)"
        @click="toggleSource(src.key)"
      >
        <span :class="['eem-src', src.cls]">{{ src.badge }}</span>
        {{ src.label }}
        <span class="tabular-nums">{{ fmt(sourceCounts[src.key]) }}</span>
      </button>
      <button
        v-if="sources.size < SOURCES.filter((x) => available[x.key]).length"
        type="button"
        class="eem-link text-sm"
        @click="sources = new Set(SOURCES.map((x) => x.key))"
      >
        Show all sources
      </button>
    </div>

    <!-- Legend -->
    <p class="eem-ck-legend">
      <span><span class="eem-src eem-src-eem">EEM</span> specimens in the Enns Museum</span>
      <span><span class="eem-src eem-src-gbif">GBIF</span> recorded in Missouri on GBIF — click to see the records</span>
      <span v-if="inat"><span class="eem-src eem-src-inat">iNat</span> research-grade iNaturalist observations in Missouri</span>
      <span v-if="pestByName.size"><span class="eem-src eem-src-pest">PEST</span> pest or invasive species — see the Pests page</span>
      <span><i class="eem-ck-muted-demo">Grey names</i> not yet in the museum</span>
    </p>

    <p
      v-if="!ready"
      class="mt-6 eem-muted"
    >
      Loading the checklist…
    </p>
    <p
      v-else-if="!groups.length"
      class="mt-6 eem-card p-6 eem-muted"
    >
      Nothing matches.
    </p>

    <div
      v-else
      class="mt-6 space-y-3"
    >
      <details
        v-for="o in groups"
        :key="o.name"
        class="eem-ck-order"
        :open="openAll || openOrders.has(o.name)"
        @toggle="onToggle(o.name, $event)"
      >
        <summary>
          <span class="eem-ck-oname">{{ o.name }}</span>
          <span
            v-if="ORDER_NAMES[o.name]"
            class="eem-ck-common"
            >{{ ORDER_NAMES[o.name] }}</span
          >
          <span class="eem-ck-ocount">
            <b>{{ fmt(o.total) }}</b> species
            <template v-if="o.inEem"> · <b class="eem-ck-gold">{{ fmt(o.inEem) }}</b> in the museum</template>
          </span>
          <span
            class="eem-ck-meter"
            :title="`${o.inEem} of ${o.total} in the museum`"
            aria-hidden="true"
            ><span :style="{ width: (o.total ? (o.inEem / o.total) * 100 : 0) + '%' }"
          /></span>
        </summary>

        <div
          v-if="openAll || openOrders.has(o.name)"
          class="eem-ck-fams"
        >
          <section
            v-for="f in o.families"
            :key="f.name"
            class="eem-ck-fam"
          >
            <h4>
              {{ f.name }} <span>{{ f.taxa.length }}</span>
            </h4>
            <ul>
              <li
                v-for="t in f.taxa"
                :key="t.name"
                :class="{ gbifonly: !t.eem }"
              >
                <component
                  :is="t.otu ? 'RouterLink' : 'span'"
                  :to="t.otu ? { name: 'otus-id-overview', params: { id: t.otu } } : undefined"
                  class="eem-ck-name"
                  ><i>{{ t.name }}</i></component
                >
                <span class="eem-ck-srcs">
                  <span
                    v-if="t.eem"
                    class="eem-src eem-src-eem"
                    :title="`${t.eem} specimen${t.eem === 1 ? '' : 's'} in the Enns Museum`"
                    >EEM {{ t.eem }}</span
                  >
                  <a
                    v-if="t.gbif"
                    class="eem-src eem-src-gbif"
                    :href="gbifLink(t.key)"
                    target="_blank"
                    rel="noopener"
                    :title="`${t.gbif} GBIF records in Missouri — open on GBIF`"
                    >GBIF</a
                  >
                  <a
                    v-if="t.inat"
                    class="eem-src eem-src-inat"
                    :href="inatLink(t.inatId)"
                    target="_blank"
                    rel="noopener"
                    :title="`${t.inat} research-grade iNaturalist observations in Missouri — open on iNaturalist`"
                    >iNat</a
                  >
                  <RouterLink
                    v-if="t.pest"
                    class="eem-src eem-src-pest"
                    :to="{ path: '/pests', query: { otu: t.pest.otuId } }"
                    :title="t.pest.status || 'Pest or invasive species'"
                    >PEST</RouterLink
                  >
                </span>
              </li>
            </ul>
          </section>
        </div>
      </details>
    </div>

    <p
      v-if="gbif"
      class="mt-6 text-xs eem-muted leading-relaxed"
    >
      GBIF data: {{ fmt(gbif.records) }} insect occurrence records from Missouri, GBIF.org (snapshot of
      {{ gbif.updated }}),
      <a
        :href="gbif.query"
        target="_blank"
        rel="noopener"
        class="eem-link"
        >view the search on GBIF</a
      >. Names follow the GBIF Backbone Taxonomy; museum records are matched to them by name. GBIF records
      include observations and other collections and have not been checked by the museum.
      <template v-if="inat">
        iNaturalist: {{ fmt(inat.species.length) }} species with research-grade observations in Missouri (snapshot of
        {{ inat.updated }}),
        <a
          :href="inat.query"
          target="_blank"
          rel="noopener"
          class="eem-link"
          >view on iNaturalist</a
        >; names follow iNaturalist's taxonomy, so a few species may appear under two names.
      </template>
    </p>
  </div>
</template>

<script setup>
import { computed, ref, shallowRef, onMounted, watch } from 'vue'
import { makeAPIRequest } from '@/utils/request'
import { ORDER_NAMES, fmt } from './useEem.js'

const props = defineProps({
  // Missouri DwC records from the museum
  records: { type: Array, default: () => [] },
  recordsLoaded: { type: Boolean, default: false },
  // tracked pests and invasives: [{ name, otuId, status }]
  pests: { type: Array, default: () => [] }
})

const FILTERS = [
  { key: 'all', label: 'All species' },
  { key: 'eem', label: 'In the museum' },
  { key: 'gbif', label: 'Not yet in the museum' },
  { key: 'pest', label: 'Pests & invasives' }
]
// Which sources to include: a species is listed when any ticked source records it
const SOURCES = [
  { key: 'eem', badge: 'EEM', cls: 'eem-src-eem', label: 'Museum specimens' },
  { key: 'gbif', badge: 'GBIF', cls: 'eem-src-gbif', label: 'GBIF records' },
  { key: 'inat', badge: 'iNat', cls: 'eem-src-inat', label: 'iNaturalist' }
]
const sources = ref(new Set(SOURCES.map((x) => x.key)))
function toggleSource(key) {
  const s = new Set(sources.value)
  if (s.has(key)) s.delete(key)
  else s.add(key)
  // never leave nothing ticked: clicking the last one shows that source only
  sources.value = s.size ? s : new Set([key])
}
const filters = computed(() => FILTERS.filter((f) => f.key !== 'pest' || pestByName.value.size))
const pestByName = computed(() => new Map(props.pests.map((p) => [p.name, p])))

const q = ref('')
const show = ref('all')
const gbif = shallowRef(null)
const gbifLoaded = ref(false)
const inat = shallowRef(null)
const otuByName = shallowRef(new Map())
const openOrders = ref(new Set())

const ready = computed(() => props.recordsLoaded && gbifLoaded.value)

// The GBIF and iNaturalist lists are made when the site is deployed (scripts/).
// When working locally without them (npm run dev), the published copies are used.
const LIVE = 'https://enns-entomology-museum.github.io/Enns_Entomology_Museum_Database/'
async function loadData(file) {
  const base = import.meta.env.BASE_URL || '/'
  for (const root of [base, LIVE]) {
    try {
      const r = await fetch(`${root}data/${file}`)
      if (r.ok && /json/.test(r.headers.get('content-type') || '')) return await r.json()
    } catch {
      /* try the next copy */
    }
  }
  return null
}

onMounted(async () => {
  const [g, i] = await Promise.all([loadData('gbif-missouri.json'), loadData('inat-missouri.json')])
  gbif.value = g
  inat.value = i
  gbifLoaded.value = true
})

// Link museum taxa to their taxon pages
watch(
  () => props.records,
  async (recs) => {
    const otus = new Map()
    recs.forEach((r) => {
      const n = [r.genus, r.specificEpithet].filter(Boolean).join(' ')
      if (n && r.otu_id && !otus.has(n)) otus.set(n, r.otu_id)
    })
    otuByName.value = otus
  },
  { immediate: true }
)

const gbifLink = (key) => `https://www.gbif.org/occurrence/search?taxon_key=${key}&gadm_gid=USA.26_1`
const inatLink = (id) => `https://www.inaturalist.org/observations?taxon_id=${id}&place_id=28&quality_grade=research`

// One row per taxon, museum and GBIF merged by name
const merged = computed(() => {
  const map = new Map()
  const g = gbif.value
  if (g) {
    g.species.forEach(([key, name, fi, n]) => {
      const [family, oi] = g.families[fi] || ['', 0]
      map.set(name, { name, key, order: g.orders[oi] || 'Unplaced', family: family || 'Unplaced', gbif: n, eem: 0, inat: 0 })
    })
  }
  const i = inat.value
  if (i) {
    i.species.forEach(([id, name, fi, n]) => {
      const [family, oi] = i.families[fi] || ['', 0]
      const t = map.get(name) || { name, key: null, order: i.orders[oi] || 'Unplaced', family: family || 'Unplaced', gbif: 0, eem: 0, inat: 0 }
      t.inat = n
      t.inatId = id
      map.set(name, t)
    })
  }
  props.records.forEach((r) => {
    const name =
      [r.genus, r.specificEpithet].filter(Boolean).join(' ') + (r.specificEpithet ? '' : r.genus ? ' sp.' : '') ||
      `${r.family || r.order || 'Unidentified'} (undetermined)`
    const t = map.get(name) || {
      name,
      key: null,
      order: r.order || 'Unplaced',
      family: r.family || 'Unplaced',
      gbif: 0,
      eem: 0,
      inat: 0
    }
    t.eem++
    map.set(name, t)
  })
  return [...map.values()].map((t) => ({
    ...t,
    otu: otuByName.value.get(t.name.replace(/ sp\.$/, '')),
    pest: pestByName.value.get(t.name) || null
  }))
})

const available = computed(() => ({ eem: true, gbif: !!gbif.value, inat: !!inat.value }))
const sourceCounts = computed(() => ({
  eem: merged.value.filter((t) => t.eem).length,
  gbif: merged.value.filter((t) => t.gbif).length,
  inat: merged.value.filter((t) => t.inat).length
}))
// species recorded by at least one of the ticked sources
const visible = computed(() => merged.value.filter((t) => [...sources.value].some((k) => available.value[k] && t[k])))

const counts = computed(() => ({
  all: visible.value.length,
  eem: visible.value.filter((t) => t.eem).length,
  gbif: visible.value.filter((t) => !t.eem).length,
  pest: visible.value.filter((t) => t.pest).length
}))

const openAll = computed(() => q.value.trim().length > 1)

const groups = computed(() => {
  const term = q.value.trim().toLowerCase()
  const list = visible.value.filter(
    (t) =>
      (show.value === 'all' || (show.value === 'pest' ? t.pest : show.value === 'eem' ? t.eem : !t.eem)) &&
      (term.length < 2 || `${t.order} ${t.family} ${t.name}`.toLowerCase().includes(term))
  )
  const orders = new Map()
  list.forEach((t) => {
    if (!orders.has(t.order)) orders.set(t.order, new Map())
    const fams = orders.get(t.order)
    if (!fams.has(t.family)) fams.set(t.family, [])
    fams.get(t.family).push(t)
  })
  return [...orders.entries()]
    .map(([name, fams]) => {
      const families = [...fams.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([fname, taxa]) => ({ name: fname, taxa: taxa.sort((a, b) => a.name.localeCompare(b.name)) }))
      const all = families.flatMap((f) => f.taxa)
      return { name, families, total: all.length, inEem: all.filter((t) => t.eem).length }
    })
    .sort((a, b) => b.total - a.total)
})

function onToggle(name, e) {
  if (openAll.value) return
  const s = new Set(openOrders.value)
  if (e.target.open) s.add(name)
  else s.delete(name)
  openOrders.value = s
}

function downloadCsv() {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['order', 'family', 'taxon', 'in_enns_museum', 'eem_specimens', 'gbif_taxon_key', 'gbif_missouri_records', 'inat_taxon_id', 'inat_missouri_observations', 'pest_or_invasive'],
    ...merged.value
      .slice()
      .sort((a, b) => `${a.order}${a.family}${a.name}`.localeCompare(`${b.order}${b.family}${b.name}`))
      .map((t) => [t.order, t.family, t.name, t.eem ? 'yes' : 'no', t.eem, t.key || '', t.gbif, t.inatId || '', t.inat || '', t.pest ? t.pest.status || 'yes' : ''])
  ]
  const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `Missouri_insects_EEM_GBIF_iNat_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

defineExpose({ counts })
</script>

<style scoped>
.eem-ck-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.eem-ck-search {
  flex: 1 1 18rem;
  min-width: 0;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  padding: 0.6rem 0.85rem;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.eem-ck-search:focus {
  outline: 2px solid var(--eem-gold);
}
.eem-ck-chips {
  display: flex;
  flex-wrap: wrap;
  border: 2px solid var(--eem-ink);
}
.eem-ck-chips button {
  padding: 0.45rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.eem-ck-chips button + button {
  border-left: 1px solid var(--eem-rule);
}
.eem-ck-chips button span {
  font-size: 0.75rem;
  color: var(--eem-ink-soft);
  margin-left: 0.2rem;
}
.eem-ck-chips button.on {
  background: #000;
  color: var(--eem-gold);
}
.eem-ck-chips button.on span {
  color: rgba(255, 255, 255, 0.7);
}
.eem-ck-sources {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.9rem;
}
.eem-ck-sources-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
  margin-right: 0.25rem;
}
.eem-ck-srcbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.75rem;
  border: 2px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--eem-ink-soft);
  opacity: 0.6;
}
.eem-ck-srcbtn > span:last-child {
  font-size: 0.75rem;
  font-weight: 500;
}
.eem-ck-srcbtn.on {
  border-color: var(--eem-ink);
  color: var(--eem-ink);
  opacity: 1;
}
.eem-ck-srcbtn::before {
  content: '';
  width: 0.8rem;
  height: 0.8rem;
  border: 1.5px solid currentColor;
  border-radius: 2px;
}
.eem-ck-srcbtn.on::before {
  background: var(--eem-gold);
  border-color: var(--eem-ink);
  box-shadow: inset 0 0 0 2px var(--eem-card);
}
.eem-ck-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.5rem;
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--eem-ink-soft);
}
.eem-ck-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}
.eem-src {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1.5;
  padding: 0 0.35rem;
  border-radius: 2px;
  white-space: nowrap;
}
.eem-src-eem {
  background: var(--eem-gold);
  color: #000;
}
.eem-src-gbif {
  background: transparent;
  color: #4c9a2a;
  border: 1px solid #4c9a2a;
}
a.eem-src-gbif:hover {
  background: #4c9a2a;
  color: #fff;
}
.eem-src-inat {
  color: #2f7d4f;
  border: 1px dashed #2f7d4f;
}
a.eem-src-inat:hover {
  background: #2f7d4f;
  color: #fff;
}
.eem-src-pest {
  background: #000;
  color: var(--eem-gold) !important;
}
:global(.dark) .eem-src-pest {
  background: var(--eem-gold);
  color: #000 !important;
}
.eem-ck-order {
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
}
.eem-ck-order > summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 0.9rem;
  padding: 0.9rem 1.1rem;
  cursor: pointer;
  list-style: none;
}
.eem-ck-order > summary::-webkit-details-marker {
  display: none;
}
.eem-ck-order > summary::before {
  content: '+';
  display: inline-grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
  border: 1.5px solid var(--eem-ink);
  font-weight: 800;
  flex-shrink: 0;
}
.eem-ck-order[open] > summary::before {
  content: '−';
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}
.eem-ck-order[open] > summary {
  border-bottom: 1px solid var(--eem-rule);
}
.eem-ck-oname {
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.eem-ck-common {
  color: var(--eem-ink-soft);
  font-size: 0.9rem;
}
.eem-ck-ocount {
  margin-left: auto;
  font-size: 0.82rem;
  color: var(--eem-ink-soft);
}
.eem-ck-gold {
  color: var(--eem-gold-deep);
}
.eem-ck-meter {
  width: 6rem;
  height: 6px;
  background: var(--eem-paper-2);
}
.eem-ck-meter span {
  display: block;
  height: 100%;
  min-width: 2px;
  background: var(--eem-gold);
}
.eem-ck-fams {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 1.25rem 2rem;
  padding: 1.25rem 1.1rem 1.4rem;
}
.eem-ck-fam h4 {
  font-weight: 700;
  font-size: 0.9rem;
  padding-bottom: 0.3rem;
  border-bottom: 2px solid var(--eem-gold);
}
.eem-ck-fam h4 span {
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--eem-ink-soft);
}
.eem-ck-fam ul {
  margin-top: 0.35rem;
}
.eem-ck-fam li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.18rem 0;
  font-size: 0.86rem;
}
.eem-ck-fam li.gbifonly .eem-ck-muted-demo {
  color: var(--eem-ink-soft);
}
.eem-ck-name {
  color: var(--eem-ink-soft);
}
.eem-ck-muted-demo {
  color: var(--eem-ink-soft);
}
.eem-ck-name {
  min-width: 0;
  color: var(--eem-ink);
}
a.eem-ck-name:hover {
  text-decoration: underline;
  text-decoration-color: var(--eem-gold);
}
.eem-ck-srcs {
  display: inline-flex;
  gap: 0.25rem;
  flex-shrink: 0;
}
@media (max-width: 640px) {
  .eem-ck-chips {
    flex: 1 1 100%;
    flex-wrap: nowrap;
  }
  .eem-ck-chips button {
    flex: 1 1 0;
    padding: 0.45rem 0.4rem;
    font-size: 0.75rem;
    line-height: 1.2;
  }
  .eem-ck-chips button span {
    display: block;
    margin: 0.1rem 0 0;
  }
  .eem-ck-meter {
    display: none;
  }
  .eem-ck-ocount {
    margin-left: 0;
    width: 100%;
    padding-left: 2.3rem;
  }
}
</style>
