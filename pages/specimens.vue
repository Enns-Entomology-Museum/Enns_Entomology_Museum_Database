<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="The collection online"
      title="Specimens"
    >
      Every digitized specimen in the Enns Museum — search by name, catalog number, collector or place, and narrow
      down with the filters.
    </EemPageHead>

    <section class="container mx-auto box-border px-4 py-10">
      <!-- All specimens / type specimens -->
      <div
        class="sp-tabs"
        role="tablist"
        aria-label="Which specimens"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="!onlyTypes"
          @click="showTypes(false)"
        >
          All specimens <span>{{ fmt(records.length) }}</span>
        </button>
        <button
          type="button"
          role="tab"
          class="is-types"
          :aria-selected="onlyTypes"
          @click="showTypes(true)"
        >
          Type specimens <span>{{ fmt(allTypes.length) }}</span>
        </button>
      </div>

      <div
        v-if="onlyTypes"
        class="sp-typebar"
      >
        <p class="text-sm">
          The museum's type collection: {{ fmt(allTypes.length) }} specimen{{ allTypes.length === 1 ? '' : 's' }} of
          {{ fmt(typeNames) }} name{{ typeNames === 1 ? '' : 's' }}. Name-bearing types (holotypes, lectotypes, neotypes,
          syntypes) in red, paratypes and other types in pink.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="k in typeKindList"
            :key="k.kind"
            type="button"
            :class="['sp-kind', k.primary ? 'primary' : 'secondary', { on: typeKind === k.kind }]"
            :aria-pressed="typeKind === k.kind"
            @click="typeKind = typeKind === k.kind ? '' : k.kind"
          >
            {{ k.label }} <b>{{ fmt(k.n) }}</b>
          </button>
        </div>
      </div>

      <!-- Search -->
      <form
        class="sp-search"
        role="search"
        @submit.prevent
      >
        <input
          v-model="q"
          type="search"
          placeholder="Name, catalog number, collector, county or locality…"
          aria-label="Search specimens"
        />
        <span
          v-if="loaded"
          class="sp-count"
          >{{ fmt(filtered.length) }} of {{ fmt(records.length) }} specimens</span
        >
      </form>

      <!-- Active filters -->
      <div
        v-if="active.length"
        class="mt-3 flex flex-wrap items-center gap-2"
      >
        <button
          v-for="a in active"
          :key="a.key"
          type="button"
          class="sp-pill"
          :title="`Remove ${a.label}`"
          @click="clear(a.key)"
        >
          {{ a.label }} <span aria-hidden="true">×</span>
        </button>
        <button
          type="button"
          class="eem-link text-sm"
          @click="clearAll"
        >
          Clear all
        </button>
      </div>

      <p
        v-if="!loaded"
        class="mt-10 eem-muted"
      >
        Loading the collection…
      </p>

      <div
        v-else
        class="mt-6 grid lg:grid-cols-12 gap-8"
      >
        <!-- Filters -->
        <aside class="lg:col-span-3">
          <button
            type="button"
            class="sp-toggle lg:hidden"
            :aria-expanded="showFilters"
            @click="showFilters = !showFilters"
          >
            {{ showFilters ? 'Hide filters' : 'Show filters' }}
          </button>
          <div :class="['space-y-6', { 'hidden lg:block': !showFilters }]">
            <fieldset
              v-for="f in FACETS"
              v-show="facetValues(f.key).length"
              :key="f.key"
              class="sp-facet"
            >
              <legend>{{ f.label }}</legend>
              <ul>
                <li
                  v-for="v in facetValues(f.key).slice(0, open[f.key] ? 200 : 8)"
                  :key="v.name"
                >
                  <button
                    type="button"
                    :class="{ on: sel[f.key] === v.name }"
                    :aria-pressed="sel[f.key] === v.name"
                    @click="setFacet(f.key, v.name)"
                  >
                    <span class="truncate">{{ v.name }}</span>
                    <span class="tabular-nums">{{ fmt(v.n) }}</span>
                  </button>
                </li>
              </ul>
              <button
                v-if="facetValues(f.key).length > 8"
                type="button"
                class="sp-more"
                @click="open[f.key] = !open[f.key]"
              >
                {{ open[f.key] ? 'Fewer' : `All ${facetValues(f.key).length}` }}
              </button>
            </fieldset>

            <fieldset
              v-if="yearSpan"
              class="sp-facet"
            >
              <legend>Collected</legend>
              <div class="flex items-center gap-2 text-sm">
                <input
                  v-model.number="from"
                  type="number"
                  :min="yearSpan[0]"
                  :max="yearSpan[1]"
                  :placeholder="String(yearSpan[0])"
                  aria-label="From year"
                  class="sp-year"
                />
                <span>–</span>
                <input
                  v-model.number="to"
                  type="number"
                  :min="yearSpan[0]"
                  :max="yearSpan[1]"
                  :placeholder="String(yearSpan[1])"
                  aria-label="To year"
                  class="sp-year"
                />
              </div>
            </fieldset>

            <fieldset class="sp-facet">
              <legend>Show only</legend>
              <label class="sp-check">
                <input
                  v-model="onlyTypes"
                  type="checkbox"
                />
                Type specimens <span class="tabular-nums eem-muted">{{ fmt(typeCount) }}</span>
              </label>
              <label class="sp-check">
                <input
                  v-model="onlyPhotos"
                  type="checkbox"
                />
                With a photo <span class="tabular-nums eem-muted">{{ fmt(photoCount) }}</span>
              </label>
              <label class="sp-check">
                <input
                  v-model="onlyMapped"
                  type="checkbox"
                />
                With coordinates <span class="tabular-nums eem-muted">{{ fmt(mappedCount) }}</span>
              </label>
            </fieldset>
          </div>
        </aside>

        <!-- Results -->
        <div class="lg:col-span-9 min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div
              class="sp-tabs"
              role="tablist"
            >
              <button
                v-for="v in ['list', 'map']"
                :key="v"
                type="button"
                role="tab"
                :aria-selected="view === v"
                :class="{ on: view === v }"
                @click="view = v"
              >
                {{ v === 'list' ? 'List' : `Map (${fmt(points.length)})` }}
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-sm">
              <label
                v-if="view === 'list'"
                class="flex items-center gap-2"
              >
                Sort
                <select
                  v-model="sort"
                  class="sp-select"
                >
                  <option value="name">Name</option>
                  <option value="date-desc">Newest collected</option>
                  <option value="date-asc">Oldest collected</option>
                  <option value="cat">Catalog number</option>
                  <option value="added">Recently digitized</option>
                </select>
              </label>
              <button
                type="button"
                class="eem-link"
                :disabled="!filtered.length"
                @click="downloadCsv"
              >
                Download CSV
              </button>
              <button
                type="button"
                class="eem-link"
                @click="copyLink"
              >
                {{ copied ? 'Link copied ✓' : 'Copy link to this search' }}
              </button>
            </div>
          </div>

          <p
            v-if="!filtered.length"
            class="eem-card p-6 eem-muted"
          >
            No specimens match. Try fewer filters or another spelling.
          </p>

          <!-- Map -->
          <template v-else-if="view === 'map'">
            <ClientOnly>
              <EemMap
                :points="points"
                height="560px"
                label="Map of the filtered specimens"
              />
            </ClientOnly>
            <p class="mt-2 text-xs eem-muted">
              {{ fmt(points.length) }} of {{ fmt(filtered.length) }} specimens have coordinates. Click a point for the
              specimen.
            </p>
          </template>

          <!-- List -->
          <template v-else>
            <div class="sp-table-wrap">
              <table class="sp-table">
                <thead>
                  <tr>
                    <th>Catalog no.</th>
                    <th>Specimen</th>
                    <th>Where</th>
                    <th>When</th>
                    <th>Collector</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in sorted.slice(0, limit)"
                    :key="r.id"
                    @click="openSpecimen(r)"
                  >
                    <td class="whitespace-nowrap">
                      <RouterLink
                        v-if="r.cat"
                        :to="{ path: '/specimen', query: { cat: r.cat } }"
                        class="sp-cat"
                        @click.stop
                        >{{ r.cat }}</RouterLink
                      >
                      <span
                        v-else
                        class="eem-muted"
                        >—</span
                      >
                    </td>
                    <td>
                      <div class="flex items-center gap-3">
                        <img
                          v-if="r.photo"
                          :src="r.photo"
                          alt=""
                          loading="lazy"
                          class="sp-thumb"
                        />
                        <div class="min-w-0">
                          <component
                            :is="r.otu ? 'RouterLink' : 'span'"
                            :to="r.otu ? { name: 'otus-id-overview', params: { id: r.otu } } : undefined"
                            class="sp-name"
                            @click.stop
                            ><i v-if="r.italic">{{ r.name }}</i
                            ><template v-else>{{ r.name }}</template></component
                          >
                          <span
                            v-if="r.type"
                            :class="['sp-type', r.primaryType ? 'primary' : 'secondary']"
                            >{{ r.type }}</span
                          >
                          <span class="block text-xs eem-muted">{{ [r.order, r.family].filter(Boolean).join(' · ') }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="text-sm">
                      {{ r.where }}
                      <span
                        v-if="r.locality"
                        class="block text-xs eem-muted sp-clip"
                        >{{ r.locality }}</span
                      >
                    </td>
                    <td class="text-sm whitespace-nowrap">{{ r.date || '—' }}</td>
                    <td class="text-sm">{{ r.collector || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              v-if="sorted.length > limit"
              class="mt-5 text-center"
            >
              <button
                type="button"
                class="eem-btn eem-btn-line"
                @click="limit += 100"
              >
                Show more ({{ fmt(sorted.length - limit) }} left)
              </button>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import EemPageHead from './components/EemPageHead.vue'
import EemMap from './components/EemMap.vue'
import { collectorsOf, fmt, normCat, typeInfo, typeKinds, useSpecimenImages } from './components/useEem.js'

useHead({ title: 'Specimens — Enns Entomology Museum' })

// While the collection online is small, everything is loaded once and filtered in
// the browser. Past this many records, switch the filters to TaxonWorks queries.
const MAX = 20000

const FACETS = [
  { key: 'order', label: 'Order' },
  { key: 'family', label: 'Family' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State / province' },
  { key: 'county', label: 'County' },
  { key: 'collector', label: 'Collector' }
]

const route = useRoute()
const router = useRouter()
const imgs = useSpecimenImages()

const loaded = ref(false)
const raw = ref([])
const q = ref(String(route.query.q || ''))
const sel = reactive(Object.fromEntries(FACETS.map((f) => [f.key, String(route.query[f.key] || '')])))
const from = ref(route.query.from ? Number(route.query.from) : null)
const to = ref(route.query.to ? Number(route.query.to) : null)
const onlyTypes = ref(route.query.types === '1')
const typeKind = ref(String(route.query.kind || ''))
const onlyPhotos = ref(route.query.photos === '1')
const onlyMapped = ref(route.query.mapped === '1')
const view = ref(route.query.view === 'map' ? 'map' : 'list')
const sort = ref(String(route.query.sort || 'name'))
const limit = ref(100)
const open = reactive({})
const showFilters = ref(false)
const copied = ref(false)

onMounted(async () => {
  try {
    const { data } = await makeAPIRequest.get('/dwc_occurrences.json', { params: { per: MAX } })
    raw.value = Array.isArray(data) ? data : []
  } catch {
    raw.value = []
  } finally {
    loaded.value = true
  }
})

const photoByCat = computed(() => {
  const m = new Map()
  imgs.items.forEach((i) => i.cat && !m.has(i.cat) && m.set(i.cat, i.thumb))
  return m
})

const records = computed(() =>
  raw.value.map((r) => {
    const species = [r.genus, r.specificEpithet].filter(Boolean).join(' ')
    const name = species || r.scientificName || r.family || r.order || 'Unidentified'
    const ti = typeInfo(r.typeStatus)
    const lat = Number(r.decimalLatitude)
    const lng = Number(r.decimalLongitude)
    const cat = r.catalogNumber || ''
    const year = Number(r.year || String(r.eventDate || '').slice(0, 4)) || null
    return {
      id: r.id,
      cat,
      name,
      italic: !!r.genus,
      order: r.order || '',
      family: r.family || '',
      country: r.country || '',
      state: r.stateProvince || '',
      county: r.county ? String(r.county).replace(/\s+(county|co\.?)$/i, '') : '',
      locality: r.verbatimLocality || r.locality || '',
      where: [r.county && `${String(r.county).replace(/\s+(county|co\.?)$/i, '')} Co.`, r.stateProvince, r.country].filter(Boolean).join(', '),
      date: r.eventDate || r.verbatimEventDate || '',
      year,
      collectors: collectorsOf(r),
      collector: collectorsOf(r).join(', '),
      type: ti ? ti.label : '',
      typeKind: ti ? ti.label.toLowerCase() : '',
      primaryType: !!ti?.primary,
      otu: r.otu_id || null,
      lat: Number.isFinite(lat) && r.decimalLatitude !== null && r.decimalLatitude !== '' ? lat : null,
      lng: Number.isFinite(lng) && r.decimalLongitude !== null && r.decimalLongitude !== '' ? lng : null,
      photo: photoByCat.value.get(normCat(cat)) || '',
      text: [cat, name, r.scientificName, r.family, r.order, r.country, r.stateProvince, r.county, r.verbatimLocality, r.locality, collectorsOf(r).join(' '), r.fieldNumber].join(' ').toLowerCase()
    }
  })
)

const yearSpan = computed(() => {
  const ys = records.value.map((r) => r.year).filter(Boolean)
  return ys.length ? [Math.min(...ys), Math.max(...ys)] : null
})

// Every filter except the one named (for facet counts)
function matches(r, except) {
  const term = q.value.trim().toLowerCase()
  if (term && !term.split(/\s+/).every((t) => r.text.includes(t))) return false
  for (const f of FACETS) {
    if (f.key === except || !sel[f.key]) continue
    if (f.key === 'collector' ? !r.collectors.includes(sel.collector) : r[f.key] !== sel[f.key]) return false
  }
  if (from.value && (!r.year || r.year < from.value)) return false
  if (to.value && (!r.year || r.year > to.value)) return false
  if (onlyTypes.value && !r.type) return false
  if (onlyTypes.value && typeKind.value && r.typeKind !== typeKind.value) return false
  if (onlyPhotos.value && !r.photo) return false
  if (onlyMapped.value && r.lat === null) return false
  return true
}

const filtered = computed(() => records.value.filter((r) => matches(r)))

function facetValues(key) {
  const m = new Map()
  records.value
    .filter((r) => matches(r, key))
    .forEach((r) => (key === 'collector' ? r.collectors : [r[key]]).forEach((v) => v && m.set(v, (m.get(v) || 0) + 1)))
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
}

const allTypes = computed(() => records.value.filter((r) => r.type))
const typeNames = computed(() => new Set(allTypes.value.map((r) => r.name)).size)
const typeKindList = computed(() => typeKinds(allTypes.value.map((r) => ({ kind: r.typeKind }))))
function showTypes(on) {
  onlyTypes.value = on
  if (!on) typeKind.value = ''
}

const typeCount = computed(() => filtered.value.filter((r) => r.type).length)
const photoCount = computed(() => filtered.value.filter((r) => r.photo).length)
const mappedCount = computed(() => filtered.value.filter((r) => r.lat !== null).length)

const sorted = computed(() => {
  const list = filtered.value.slice()
  const by = {
    name: (a, b) => a.name.localeCompare(b.name) || a.cat.localeCompare(b.cat),
    'date-desc': (a, b) => String(b.date).localeCompare(String(a.date)),
    'date-asc': (a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date).localeCompare(String(b.date)),
    cat: (a, b) => a.cat.localeCompare(b.cat),
    added: (a, b) => (b.id || 0) - (a.id || 0)
  }
  return list.sort(by[sort.value] || by.name)
})

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const base = import.meta.env.BASE_URL || '/'
const points = computed(() =>
  filtered.value
    .filter((r) => r.lat !== null && r.lng !== null)
    .map((r) => ({
      lat: r.lat,
      lng: r.lng,
      title: r.name,
      html: `<b><i>${esc(r.name)}</i></b><br>${esc(r.where)}${r.date ? `<br>${esc(r.date)}` : ''}${r.cat ? `<br><a href="${base}#/specimen?cat=${encodeURIComponent(r.cat)}">${esc(r.cat)} →</a>` : ''}`
    }))
)

const active = computed(() => [
  ...FACETS.filter((f) => sel[f.key]).map((f) => ({ key: f.key, label: `${f.label}: ${sel[f.key]}` })),
  ...(from.value || to.value ? [{ key: 'years', label: `Collected ${from.value || '…'}–${to.value || '…'}` }] : []),
  ...(onlyTypes.value ? [{ key: 'types', label: typeKind.value ? `Type specimens: ${typeKind.value}s` : 'Type specimens' }] : []),
  ...(onlyPhotos.value ? [{ key: 'photos', label: 'With a photo' }] : []),
  ...(onlyMapped.value ? [{ key: 'mapped', label: 'With coordinates' }] : [])
])

function setFacet(key, value) {
  sel[key] = sel[key] === value ? '' : value
}
function clear(key) {
  if (key in sel) sel[key] = ''
  if (key === 'years') from.value = to.value = null
  if (key === 'types') showTypes(false)
  if (key === 'photos') onlyPhotos.value = false
  if (key === 'mapped') onlyMapped.value = false
}
function clearAll() {
  FACETS.forEach((f) => (sel[f.key] = ''))
  from.value = to.value = null
  onlyTypes.value = onlyPhotos.value = onlyMapped.value = false
  typeKind.value = ''
  q.value = ''
}

// Keep the search in the address, so it can be shared
watch(
  [q, () => ({ ...sel }), from, to, onlyTypes, typeKind, onlyPhotos, onlyMapped, view, sort],
  () => {
    limit.value = 100
    const query = {
      ...(q.value.trim() ? { q: q.value.trim() } : {}),
      ...Object.fromEntries(FACETS.filter((f) => sel[f.key]).map((f) => [f.key, sel[f.key]])),
      ...(from.value ? { from: String(from.value) } : {}),
      ...(to.value ? { to: String(to.value) } : {}),
      ...(onlyTypes.value ? { types: '1' } : {}),
      ...(onlyTypes.value && typeKind.value ? { kind: typeKind.value } : {}),
      ...(onlyPhotos.value ? { photos: '1' } : {}),
      ...(onlyMapped.value ? { mapped: '1' } : {}),
      ...(view.value === 'map' ? { view: 'map' } : {}),
      ...(sort.value !== 'name' ? { sort: sort.value } : {})
    }
    router.replace({ query })
  },
  { deep: true }
)

function openSpecimen(r) {
  if (r.cat) router.push({ path: '/specimen', query: { cat: r.cat } })
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard blocked */
  }
}

function downloadCsv() {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['catalogNumber', 'name', 'order', 'family', 'country', 'stateProvince', 'county', 'locality', 'eventDate', 'recordedBy', 'typeStatus', 'decimalLatitude', 'decimalLongitude'],
    ...sorted.value.map((r) => [r.cat, r.name, r.order, r.family, r.country, r.state, r.county, r.locality, r.date, r.collector, r.type, r.lat ?? '', r.lng ?? ''])
  ]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([rows.map((x) => x.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  a.download = `EEM_specimens_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.sp-search {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
}
.sp-search input {
  flex: 1 1 22rem;
  min-width: 0;
  padding: 0.8rem 1rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
  font-size: 1.05rem;
}
.sp-search input:focus {
  outline: 2px solid var(--eem-gold);
}
.sp-count {
  font-size: 0.9rem;
  color: var(--eem-ink-soft);
  font-variant-numeric: tabular-nums;
}
.sp-pill {
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  background: #000;
  color: var(--eem-gold);
  font-size: 0.8rem;
  font-weight: 600;
}
:global(.dark) .sp-pill {
  background: var(--eem-gold);
  color: #000;
}
.sp-toggle {
  width: 100%;
  padding: 0.55rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  font-weight: 700;
  margin-bottom: 1rem;
}
.sp-facet legend {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--eem-gold-deep);
  margin-bottom: 0.4rem;
}
.sp-facet ul {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sp-facet li button {
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  width: 100%;
  text-align: left;
  padding: 0.22rem 0.5rem;
  border-radius: 2px;
  font-size: 0.86rem;
  color: var(--eem-ink);
}
.sp-facet li button:hover {
  background: var(--eem-paper-2);
}
.sp-facet li button span:last-child {
  color: var(--eem-ink-soft);
  font-size: 0.78rem;
}
.sp-facet li button.on {
  background: #000;
  color: var(--eem-gold);
  font-weight: 700;
}
.sp-facet li button.on span:last-child {
  color: rgba(255, 255, 255, 0.7);
}
:global(.dark) .sp-facet li button.on {
  background: var(--eem-gold);
  color: #000;
}
.sp-more {
  margin-top: 0.3rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--eem-gold-deep);
  text-decoration: underline;
}
.sp-year {
  width: 5.5rem;
  padding: 0.35rem 0.5rem;
  border: 1.5px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.sp-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.86rem;
  padding: 0.18rem 0;
}
.sp-check input {
  accent-color: #f1b82d;
}
.sp-tabs {
  display: flex;
  border: 2px solid var(--eem-ink);
}
.sp-tabs button {
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 700;
  background: var(--eem-card);
}
.sp-tabs button + button {
  border-left: 1px solid var(--eem-rule);
}
.sp-tabs button.on {
  background: #000;
  color: var(--eem-gold);
}
.sp-select {
  padding: 0.3rem 0.5rem;
  border: 1.5px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.sp-table-wrap {
  overflow-x: auto;
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-top: 4px solid #000;
}
.sp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.sp-table th {
  text-align: left;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
  padding: 0.65rem 0.8rem;
  border-bottom: 1px solid var(--eem-rule);
  white-space: nowrap;
}
.sp-table td {
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--eem-rule);
  vertical-align: top;
}
.sp-table tbody tr {
  cursor: pointer;
  transition: background 0.12s;
}
.sp-table tbody tr:hover {
  background: #fdf6e0;
}
:global(.dark) .sp-table tbody tr:hover {
  background: #26241d;
}
.sp-cat {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--eem-gold-deep);
}
.sp-cat:hover {
  text-decoration: underline;
}
.sp-name {
  font-weight: 600;
  color: var(--eem-ink);
}
a.sp-name:hover {
  text-decoration: underline;
  text-decoration-color: var(--eem-gold);
}
.sp-type {
  margin-left: 0.4rem;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.05rem 0.35rem;
  border-radius: 2px;
  border: 1px solid var(--eem-rule);
}
.sp-type.primary {
  background: #be2828;
  border-color: #be2828;
  color: #fff;
}
.sp-type.secondary {
  background: #f6d5d1;
  border-color: #e3a59e;
  color: #8a1c1c;
}
.sp-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 1rem;
  border-bottom: 2px solid var(--eem-ink);
}
.sp-tabs button {
  padding: 0.55rem 1rem;
  font-weight: 700;
  font-size: 0.9rem;
  border-radius: 2px 2px 0 0;
  color: var(--eem-ink-soft);
}
.sp-tabs button span {
  margin-left: 0.3rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  opacity: 0.75;
}
.sp-tabs button[aria-selected='true'] {
  background: #000;
  color: var(--eem-gold);
}
.sp-tabs button.is-types[aria-selected='true'] {
  background: #be2828;
  color: #fff;
}
.sp-typebar {
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-left: 4px solid #be2828;
}
.sp-kind {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.3rem 0.7rem;
  border: 1.5px solid;
  border-radius: 2px;
}
.sp-kind b {
  margin-left: 0.2rem;
  font-variant-numeric: tabular-nums;
}
.sp-kind.primary {
  border-color: #be2828;
  color: #be2828;
}
.sp-kind.secondary {
  border-color: #e3a59e;
  color: #8a1c1c;
}
.sp-kind.primary.on {
  background: #be2828;
  color: #fff;
}
.sp-kind.secondary.on {
  background: #f6d5d1;
}
.sp-thumb {
  width: 2.6rem;
  height: 2.6rem;
  object-fit: cover;
  border-radius: 2px;
  flex: none;
}
.sp-clip {
  max-width: 18rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
