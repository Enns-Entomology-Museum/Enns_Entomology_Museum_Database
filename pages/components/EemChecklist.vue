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
          v-for="f in FILTERS"
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

    <!-- Legend -->
    <p class="eem-ck-legend">
      <span><span class="eem-src eem-src-eem">EEM</span> specimens in the Enns Museum</span>
      <span><span class="eem-src eem-src-gbif">GBIF</span> recorded in Missouri on GBIF — click to see the records</span>
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
  recordsLoaded: { type: Boolean, default: false }
})

const FILTERS = [
  { key: 'all', label: 'All species' },
  { key: 'eem', label: 'In the museum' },
  { key: 'gbif', label: 'Not yet in the museum' }
]

const q = ref('')
const show = ref('all')
const gbif = shallowRef(null)
const gbifLoaded = ref(false)
const otuByName = shallowRef(new Map())
const openOrders = ref(new Set())

const ready = computed(() => props.recordsLoaded && gbifLoaded.value)

onMounted(async () => {
  const base = import.meta.env.BASE_URL || '/'
  try {
    const r = await fetch(`${base}data/gbif-missouri.json`)
    if (r.ok) gbif.value = await r.json()
  } catch {
    /* museum-only checklist */
  }
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

// One row per taxon, museum and GBIF merged by name
const merged = computed(() => {
  const map = new Map()
  const g = gbif.value
  if (g) {
    g.species.forEach(([key, name, fi, n]) => {
      const [family, oi] = g.families[fi] || ['', 0]
      map.set(name, { name, key, order: g.orders[oi] || 'Unplaced', family: family || 'Unplaced', gbif: n, eem: 0 })
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
      eem: 0
    }
    t.eem++
    map.set(name, t)
  })
  return [...map.values()].map((t) => ({ ...t, otu: otuByName.value.get(t.name.replace(/ sp\.$/, '')) }))
})

const counts = computed(() => ({
  all: merged.value.length,
  eem: merged.value.filter((t) => t.eem).length,
  gbif: merged.value.filter((t) => !t.eem).length
}))

const openAll = computed(() => q.value.trim().length > 1)

const groups = computed(() => {
  const term = q.value.trim().toLowerCase()
  const list = merged.value.filter(
    (t) =>
      (show.value === 'all' || (show.value === 'eem' ? t.eem : !t.eem)) &&
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
    ['order', 'family', 'taxon', 'in_enns_museum', 'eem_specimens', 'gbif_taxon_key', 'gbif_missouri_records'],
    ...merged.value
      .slice()
      .sort((a, b) => `${a.order}${a.family}${a.name}`.localeCompare(`${b.order}${b.family}${b.name}`))
      .map((t) => [t.order, t.family, t.name, t.eem ? 'yes' : 'no', t.eem, t.key || '', t.gbif])
  ]
  const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `Missouri_insects_EEM_GBIF_${new Date().toISOString().slice(0, 10)}.csv`
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
