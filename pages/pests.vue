<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="For extension & growers"
      title="Pests & invasive species"
      lede="Insects of concern in Missouri — where they have been recorded, what they feed on, and when they are active. Records come from the Enns Museum collection, publications and surveys, GBIF and iNaturalist."
    />

    <!-- Numbers -->
    <section class="border-b eem-rule">
      <dl class="container mx-auto box-border px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        <div
          v-for="s in stats"
          :key="s.label"
        >
          <dt class="eem-kicker !text-[0.68rem]">{{ s.label }}</dt>
          <dd class="eem-display text-4xl mt-2">{{ s.value }}</dd>
          <dd
            v-if="s.note"
            class="text-xs eem-muted mt-1"
          >
            {{ s.note }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="container mx-auto box-border px-4 py-12 grid lg:grid-cols-12 gap-8">
      <!-- Species list -->
      <div class="lg:col-span-4">
        <p class="eem-kicker">Species</p>
        <h2 class="eem-display text-3xl mt-3">What to watch for</h2>

        <input
          v-model="query"
          type="search"
          class="pest-search mt-5"
          placeholder="Search a name, family or host…"
          aria-label="Search species"
        />

        <div
          v-if="statusesPresent.length > 1"
          class="flex flex-wrap gap-1.5 mt-3"
          role="group"
          aria-label="Filter by status"
        >
          <button
            v-for="s in statusesPresent"
            :key="s"
            type="button"
            :class="['pest-chip', { on: status === s }]"
            :aria-pressed="status === s"
            @click="status = status === s ? '' : s"
          >
            {{ s }}
          </button>
        </div>
        <div
          v-if="categoriesPresent.length > 1"
          class="flex flex-wrap gap-1.5 mt-2"
          role="group"
          aria-label="Filter by category"
        >
          <button
            v-for="c in categoriesPresent"
            :key="c"
            type="button"
            :class="['pest-chip', { on: category === c }]"
            :aria-pressed="category === c"
            @click="category = category === c ? '' : c"
          >
            {{ c }}
          </button>
        </div>

        <p
          v-if="!pests.loaded"
          class="mt-6 eem-muted text-sm"
        >
          Loading…
        </p>
        <p
          v-else-if="!pests.species.length"
          class="mt-6 eem-muted text-sm"
        >
          No species have been added yet.
        </p>

        <ul class="mt-5 space-y-2">
          <li v-if="pests.species.length > 1">
            <button
              type="button"
              :class="['pest-item', { on: !selected }]"
              @click="select(null)"
            >
              <span class="pest-thumb pest-thumb-all">All</span>
              <span class="min-w-0">
                <span class="block font-semibold">All tracked species</span>
                <span class="block text-xs eem-muted">Counties shaded by number of species</span>
              </span>
            </button>
          </li>
          <li
            v-for="sp in filtered"
            :key="sp.otuId"
          >
            <button
              type="button"
              :class="['pest-item', { on: selected === sp }]"
              :aria-pressed="selected === sp"
              @click="select(sp)"
            >
              <img
                v-if="sp.photo"
                :src="sp.photo.thumb"
                :alt="''"
                class="pest-thumb"
                loading="lazy"
              />
              <span
                v-else
                class="pest-thumb"
              />
              <span class="min-w-0">
                <span class="block font-semibold leading-snug">{{ sp.common || sp.name }}</span>
                <span
                  v-if="sp.common"
                  class="block text-sm italic leading-snug"
                  >{{ sp.name }}</span
                >
                <span class="block text-xs eem-muted mt-0.5">
                  {{ [sp.family, sp.status, sp.firstRecord && `in MO since ${sp.firstRecord}`].filter(Boolean).join(' · ') }}
                </span>
              </span>
            </button>
          </li>
        </ul>
        <p
          v-if="pests.loaded && pests.species.length && !filtered.length"
          class="mt-4 eem-muted text-sm"
        >
          Nothing matches.
        </p>
      </div>

      <!-- Map + species -->
      <div class="lg:col-span-8 space-y-6">
        <div class="eem-card p-2">
          <div class="flex flex-wrap items-baseline justify-between gap-2 px-3 pt-3 pb-2">
            <h3 class="eem-display text-xl">
              <template v-if="selected">
                Records of <span class="italic">{{ selected.name }}</span> in Missouri
              </template>
              <template v-else>Tracked species by county</template>
            </h3>
            <span
              v-if="selected && !selected.inatLoaded"
              class="text-xs eem-muted"
              >Loading iNaturalist…</span
            >
          </div>
          <ClientOnly>
            <EemPestMap
              :species="selected"
              :all="pests.species"
              height="480px"
              @select="pickCounty"
            />
          </ClientOnly>
        </div>

        <!-- A county picked on the map -->
        <div
          v-if="county"
          class="eem-card p-5 eem-accent-l"
        >
          <div class="flex items-baseline justify-between gap-3">
            <h3 class="eem-display text-lg">{{ county.name }}</h3>
            <button
              type="button"
              class="eem-link text-sm"
              @click="county = null"
            >
              Close
            </button>
          </div>
          <template v-if="selected">
            <p
              v-if="!countyRecord"
              class="text-sm eem-muted mt-2"
            >
              No record of {{ selected.common || selected.name }} here yet.
            </p>
            <ul
              v-else
              class="text-sm mt-2 space-y-1"
            >
              <li v-if="countyRecord.museum">
                {{ countyRecord.museum }} Enns Museum specimen{{ countyRecord.museum === 1 ? '' : 's' }}
                <ul
                  v-if="countyRecord.specimens?.length"
                  class="mt-1 mb-2 space-y-1"
                >
                  <li
                    v-for="s in countyRecord.specimens"
                    :key="s.cat"
                  >
                    <RouterLink
                      :to="{ path: '/specimen', query: { cat: s.cat } }"
                      class="pest-spec"
                    >
                      <span class="pest-spec-cat">{{ s.cat }}</span>
                      <span class="eem-muted">{{ [s.date, s.by].filter(Boolean).join(' · ') }}</span>
                      <span aria-hidden="true">→</span>
                    </RouterLink>
                  </li>
                </ul>
              </li>
              <li
                v-for="(r, i) in countyRecord.reported"
                :key="i"
              >
                Reported{{ r.year ? ` in ${r.year}` : '' }}<span
                  v-if="r.source"
                  class="eem-muted"
                >
                  — {{ r.source }}</span
                >
              </li>
              <li v-if="countyRecord.gbif">
                {{ countyRecord.gbif }} GBIF record(s)
                <a
                  v-if="selected.gbifKey"
                  class="eem-link"
                  :href="`https://www.gbif.org/occurrence/search?taxon_key=${selected.gbifKey}&gadm_gid=USA.26_1`"
                  target="_blank"
                  rel="noopener"
                  >see them ↗</a
                >
              </li>
              <li v-if="countyRecord.inat">
                {{ countyRecord.inat }} iNaturalist observation(s)
                <a
                  v-if="selected.inatId"
                  class="eem-link"
                  :href="`https://www.inaturalist.org/observations?taxon_id=${selected.inatId}&place_id=28&quality_grade=research`"
                  target="_blank"
                  rel="noopener"
                  >see them ↗</a
                >
              </li>
            </ul>
          </template>
          <template v-else>
            <p
              v-if="!countySpecies.length"
              class="text-sm eem-muted mt-2"
            >
              No tracked species recorded here yet.
            </p>
            <ul
              v-else
              class="text-sm mt-2 space-y-1"
            >
              <li
                v-for="sp in countySpecies"
                :key="sp.otuId"
              >
                <button
                  type="button"
                  class="eem-link"
                  @click="select(sp)"
                >
                  {{ sp.common || sp.name }}
                </button>
              </li>
            </ul>
          </template>
        </div>

        <!-- Species card -->
        <article
          v-if="selected"
          class="eem-card overflow-hidden"
        >
          <div class="grid sm:grid-cols-5">
            <figure
              v-if="selected.photo"
              class="sm:col-span-2 bg-[color:var(--eem-paper-2)]"
            >
              <img
                :src="selected.photo.medium"
                :alt="selected.common || selected.name"
                class="w-full h-full object-cover max-h-64 sm:max-h-80"
              />
              <figcaption class="px-3 py-1.5 text-[0.7rem] eem-muted">
                {{ selected.photo.credit }} · {{ selected.photo.source }}
              </figcaption>
            </figure>
            <div :class="['p-6', selected.photo ? 'sm:col-span-3' : 'sm:col-span-5']">
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-if="selected.status"
                  class="pest-badge strong"
                  >{{ selected.status }}</span
                >
                <span
                  v-for="c in selected.categories"
                  :key="c"
                  class="pest-badge"
                  >{{ c }}</span
                >
              </div>
              <h3 class="eem-display text-3xl mt-3 leading-tight">{{ selected.common || selected.name }}</h3>
              <p class="mt-1">
                <i>{{ selected.name }}</i> <span class="eem-muted text-sm">{{ selected.author }}</span>
              </p>
              <p
                v-if="selected.family || selected.order"
                class="text-sm eem-muted"
              >
                {{ [selected.family, selected.order].filter(Boolean).join(' · ') }}
              </p>

              <dl class="pest-facts mt-5">
                <div>
                  <dt>First Missouri record</dt>
                  <dd>{{ selected.firstRecord || '—' }}</dd>
                </div>
                <div>
                  <dt>Counties with records</dt>
                  <dd>{{ countiesOf(selected) }} <span class="eem-muted text-sm">of 115</span></dd>
                </div>
                <div>
                  <dt>Museum specimens (MO)</dt>
                  <dd>{{ museumOf(selected) }}</dd>
                </div>
                <div>
                  <dt>Other records (MO)</dt>
                  <dd class="pest-other">
                    <span>{{ selected.gbifTotal ?? '—' }} <small>GBIF</small></span>
                    <span>{{ selected.inatTotal ?? '—' }} <small>iNaturalist</small></span>
                  </dd>
                </div>
              </dl>

              <div class="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm">
                <RouterLink
                  :to="{ name: 'otus-id', params: { id: selected.otuId } }"
                  class="eem-link"
                  >Species page</RouterLink
                >
                <a
                  v-if="selected.gbifKey"
                  class="eem-link"
                  :href="`https://www.gbif.org/occurrence/search?taxon_key=${selected.gbifKey}&gadm_gid=USA.26_1`"
                  target="_blank"
                  rel="noopener"
                  >GBIF records ↗</a
                >
                <a
                  v-if="selected.inatId"
                  class="eem-link"
                  :href="`https://www.inaturalist.org/taxa/${selected.inatId}`"
                  target="_blank"
                  rel="noopener"
                  >iNaturalist ↗</a
                >
              </div>
            </div>
          </div>

          <div class="grid md:grid-cols-2 gap-6 p-6 border-t eem-rule">
            <section>
              <h4 class="pest-h">Hosts</h4>
              <ul
                v-if="selected.hosts.length"
                class="text-sm space-y-1"
              >
                <li
                  v-for="h in selected.hosts"
                  :key="h.name"
                >
                  <i>{{ h.name }}</i>
                  <span
                    v-if="h.relationship"
                    class="eem-muted"
                  >
                    — {{ h.relationship.toLowerCase() }}</span
                  >
                </li>
              </ul>
              <p
                v-else
                class="text-sm eem-muted"
              >
                No host records yet.
              </p>
            </section>

            <section>
              <h4 class="pest-h">When it is found</h4>
              <template v-if="monthTotal">
                <div
                  class="pest-months"
                  role="img"
                  :aria-label="`Records by month: ${MONTHS.map((m, i) => `${m} ${selected.months[i]}`).join(', ')}`"
                >
                  <div
                    v-for="(n, i) in selected.months"
                    :key="i"
                    class="pest-month"
                    :title="`${MONTHS_LONG[i]}: ${n} record${n === 1 ? '' : 's'}`"
                  >
                    <span
                      class="pest-bar"
                      :style="{ height: `${(n / monthMax) * 100}%` }"
                    />
                    <span class="pest-mlabel">{{ MONTHS[i] }}</span>
                  </div>
                </div>
                <p class="text-xs eem-muted mt-2">
                  {{ monthTotal }} dated records in Missouri (museum specimens, GBIF and iNaturalist).
                </p>
              </template>
              <p
                v-else
                class="text-sm eem-muted"
              >
                No dated records yet.
              </p>
            </section>

            <section
              v-for="(x, i) in selected.texts"
              :key="i"
              class="md:col-span-2"
            >
              <h4 class="pest-h">{{ x.topic }}</h4>
              <p
                v-for="(para, j) in paragraphs(x.text)"
                :key="j"
                class="text-sm leading-relaxed mb-2"
              >
                {{ para }}
              </p>
            </section>

            <section
              v-if="countyList.length"
              class="md:col-span-2"
            >
              <details>
                <summary class="pest-h cursor-pointer">County records ({{ countyList.length }})</summary>
                <table class="pest-table mt-2">
                  <thead>
                    <tr>
                      <th>County</th>
                      <th>Museum</th>
                      <th>Reported</th>
                      <th>GBIF</th>
                      <th>iNaturalist</th>
                      <th>First record</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="c in countyList"
                      :key="c.key"
                    >
                      <td>{{ c.name }}</td>
                      <td>{{ c.museum || '' }}</td>
                      <td>{{ c.reported.length ? '✓' : '' }}</td>
                      <td>{{ c.gbif || '' }}</td>
                      <td>{{ c.inat || '' }}</td>
                      <td>{{ c.firstYear || '' }}</td>
                    </tr>
                  </tbody>
                </table>
              </details>
            </section>
          </div>

          <p class="px-6 py-4 text-sm border-t eem-rule bg-[color:var(--eem-paper-2)]">
            <b>Think you have found it?</b> Note where and when, take clear photos, and contact your local
            <a
              class="eem-link"
              href="https://extension.missouri.edu"
              target="_blank"
              rel="noopener"
              >MU Extension</a
            >
            office. Specimens for the museum are always welcome.
          </p>
        </article>

        <p class="text-xs eem-muted leading-relaxed">
          A shaded county means the species has been recorded there — an empty county does not mean it is absent.
          GBIF records that come from iNaturalist are counted once, as iNaturalist; iNaturalist observations with
          hidden (obscured) locations are not placed on the map. Species are listed
          when tagged in the museum's TaxonWorks database.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import EemPestMap from './components/EemPestMap.vue'
import { useMissouri } from './components/useEem.js'
import { CATEGORIES, STATUSES, usePests } from './components/usePests.js'

useHead({ title: 'Pests & invasive species of Missouri — Enns Entomology Museum' })

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const mo = useMissouri()
const pests = usePests(mo)

const query = ref('')
const status = ref('')
const category = ref('')
const selected = ref(null)
const county = ref(null)

// open the species asked for in the link (/pests?otu=123), or the only one there is
const route = useRoute()
watch(
  () => [pests.species.length, route.query.otu],
  ([n, otu]) => {
    const wanted = otu && pests.species.find((sp) => String(sp.otuId) === String(otu))
    if (wanted) selected.value = wanted
    else if (n === 1 && !selected.value) selected.value = pests.species[0]
  },
  { immediate: true }
)

const statusesPresent = computed(() => STATUSES.filter((s) => pests.species.some((sp) => sp.status === s)))
const categoriesPresent = computed(() => CATEGORIES.filter((c) => pests.species.some((sp) => sp.categories.includes(c))))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return pests.species.filter((sp) => {
    if (status.value && sp.status !== status.value) return false
    if (category.value && !sp.categories.includes(category.value)) return false
    if (!q) return true
    return [sp.name, sp.common, sp.family, sp.order, ...sp.hosts.map((h) => h.name)].some((x) => String(x || '').toLowerCase().includes(q))
  })
})

function select(sp) {
  selected.value = sp
  county.value = null
}
const pickCounty = (c) => (county.value = c)

const countyRecord = computed(() => (selected.value && county.value ? selected.value.records[county.value.key] : null))
const countySpecies = computed(() => (county.value ? pests.species.filter((sp) => sp.records[county.value.key]) : []))

const countiesOf = (sp) => Object.keys(sp.records).length
const museumOf = (sp) => Object.values(sp.records).reduce((n, r) => n + r.museum, 0)

const title = (k) => k.replace(/(^|\s|\.)([a-z])/g, (m, a, b) => a + b.toUpperCase())
const countyList = computed(() =>
  Object.entries(selected.value?.records || {})
    .map(([key, r]) => ({ key, name: title(key), ...r }))
    .sort((a, b) => a.name.localeCompare(b.name))
)

const monthTotal = computed(() => (selected.value ? selected.value.months.reduce((a, b) => a + b, 0) : 0))
const monthMax = computed(() => Math.max(1, ...(selected.value?.months || [0])))

const paragraphs = (text) =>
  String(text || '')
    .replace(/<[^>]+>/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

const withRecords = computed(() => {
  const set = new Set()
  pests.species.forEach((sp) => Object.keys(sp.records).forEach((k) => set.add(k)))
  return set.size
})
const stats = computed(() => {
  const n = (s) => pests.species.filter((sp) => sp.status === s).length
  const ready = pests.loaded
  return [
    { label: 'Species tracked', value: ready ? pests.species.length : '—', note: 'pests and invasives' },
    { label: 'Established invasives', value: ready ? n('Established invasive') : '—', note: 'non-native, reproducing in MO' },
    { label: 'Under surveillance', value: ready ? n('Under surveillance') : '—', note: 'not yet recorded in MO' },
    { label: 'Counties', value: ready ? `${withRecords.value} / 115` : '—', note: 'with at least one record' }
  ]
})
</script>

<style scoped>
.pest-search {
  width: 100%;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
  font-size: 0.9rem;
}
.pest-chip {
  padding: 0.25rem 0.7rem;
  border: 1.5px solid var(--eem-rule);
  border-radius: 2px;
  font-size: 0.78rem;
  font-weight: 600;
}
.pest-chip.on {
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}
:global(.dark) .pest-chip.on {
  background: var(--eem-gold);
  border-color: var(--eem-gold);
  color: #000;
}
.pest-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  text-align: left;
  padding: 0.55rem;
  border: 1px solid var(--eem-rule);
  border-radius: 4px;
  background: var(--eem-card);
  transition: border-color 0.15s;
}
.pest-item:hover {
  border-color: var(--eem-gold);
}
.pest-item.on {
  border-color: var(--eem-gold);
  box-shadow: inset 4px 0 0 var(--eem-gold);
}
.pest-thumb {
  flex: none;
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 2px;
  object-fit: cover;
  background: var(--eem-paper-2);
}
.pest-thumb-all {
  display: grid;
  place-items: center;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 0.8rem;
  text-transform: uppercase;
  background: #000;
  color: var(--eem-gold);
}
.pest-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--eem-rule);
  border-radius: 2px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.pest-badge.strong {
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}
.pest-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem 1.5rem;
}
.pest-facts dt {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.pest-facts dd {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
}
.pest-other {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.9rem;
}
.pest-other small {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--eem-ink-soft);
}
.pest-h {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--eem-gold-deep);
  margin-bottom: 0.5rem;
}
.pest-months {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 2px;
  height: 7rem;
}
.pest-month {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}
.pest-bar {
  display: block;
  width: 70%;
  min-height: 2px;
  background: var(--eem-gold);
  border-radius: 3px 3px 0 0;
}
.pest-mlabel {
  font-size: 0.68rem;
  color: var(--eem-ink-soft);
}
.pest-table {
  width: 100%;
  font-size: 0.82rem;
  border-collapse: collapse;
}
.pest-table th {
  text-align: left;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--eem-rule);
}
.pest-table td {
  padding: 0.3rem 0.4rem;
  border-bottom: 1px solid var(--eem-rule);
  font-variant-numeric: tabular-nums;
}
.pest-spec {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--eem-rule, #e5e1d8);
  text-decoration: none;
}
.pest-spec:hover {
  border-color: var(--eem-gold);
}
.pest-spec-cat {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  background: var(--eem-gold);
  color: #000;
}
</style>
