<template>
  <section
    id="types"
    class="border-t eem-rule"
  >
    <div class="container mx-auto box-border px-4 py-14">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eem-kicker">Type specimens</p>
          <h2 class="eem-display mt-3 text-3xl">Name-bearing types</h2>
          <p class="mt-2 eem-muted max-w-2xl">
            The specimens on which species names are founded — the museum's most valuable holdings. Primary types
            (holotypes, lectotypes, neotypes, syntypes) are marked in red, as on their labels; paratypes and other
            types of the type series in pink.
          </p>
        </div>
        <div
          v-if="rows.length"
          class="flex flex-wrap gap-x-5 gap-y-1"
        >
          <RouterLink
            :to="{ path: '/specimens', query: { types: '1' } }"
            class="eem-link font-semibold"
            >Search them on the Specimens page →</RouterLink
          >
          <button
            type="button"
            class="eem-link font-semibold"
            @click="downloadCsv"
          >
            Download list (CSV)
          </button>
        </div>
      </div>

      <p
        v-if="!loaded"
        class="mt-8 eem-muted"
      >
        Loading the type collection…
      </p>
      <p
        v-else-if="!rows.length"
        class="mt-8 eem-card p-6 eem-muted"
      >
        No type specimens have been digitized yet.
      </p>

      <template v-else>
        <!-- Numbers -->
        <dl class="ty-stats mt-8">
          <div>
            <dt>Type specimens</dt>
            <dd>{{ fmt(rows.length) }}</dd>
          </div>
          <div class="is-primary">
            <dt>Primary types</dt>
            <dd>{{ fmt(primaryCount) }}</dd>
          </div>
          <div class="is-secondary">
            <dt>Paratypes &amp; other types</dt>
            <dd>{{ fmt(rows.length - primaryCount) }}</dd>
          </div>
          <div>
            <dt>Names with types</dt>
            <dd>{{ fmt(names.length) }}</dd>
          </div>
        </dl>

        <!-- Filters -->
        <div class="mt-6 flex flex-wrap items-center gap-2">
          <input
            v-if="names.length > 8"
            v-model="q"
            type="search"
            class="ty-search"
            placeholder="Search a name, family or country"
            aria-label="Search type specimens"
          />
          <button
            v-for="k in kinds"
            :key="k.name"
            type="button"
            :class="['ty-chip', k.primary ? 'primary' : 'secondary', { on: kind === k.name }]"
            :aria-pressed="kind === k.name"
            @click="kind = kind === k.name ? '' : k.name"
          >
            {{ k.name }} <span>{{ k.n }}</span>
          </button>
        </div>

        <!-- List, one card per name -->
        <ul class="mt-6 grid md:grid-cols-2 gap-3">
          <li
            v-for="n in shown"
            :key="n.name"
            class="eem-card ty-name"
          >
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <component
                :is="n.otu ? 'RouterLink' : 'span'"
                :to="n.otu ? { name: 'otus-id-overview', params: { id: n.otu } } : undefined"
                class="ty-title"
                v-html="n.html"
              />
              <span class="text-xs eem-muted">{{ [n.order, n.family].filter(Boolean).join(' · ') }}</span>
            </div>
            <ul class="mt-2 flex flex-wrap gap-1.5">
              <li
                v-for="s in n.specimens"
                :key="s.id"
              >
                <RouterLink
                  :to="s.cat ? { path: '/specimen', query: { cat: s.cat } } : '/specimen'"
                  :class="['ty-spec', s.primary ? 'primary' : 'secondary']"
                  :title="[s.cat, s.where, s.date].filter(Boolean).join(' · ')"
                >
                  <b>{{ s.kind }}</b> {{ s.cat }}
                </RouterLink>
              </li>
            </ul>
            <p
              v-if="n.where"
              class="mt-2 text-xs eem-muted"
            >
              {{ n.where }}
            </p>
          </li>
        </ul>
        <p
          v-if="!shown.length"
          class="mt-6 eem-muted"
        >
          Nothing matches.
        </p>
      </template>
    </div>
  </section>
</template>

<script setup>
// Type specimens digitized in TaxonWorks (collection objects with type material)
import { computed, onMounted, ref } from 'vue'
import { makeAPIRequest } from '@/utils/request'
import { fmt } from './useEem.js'

const PRIMARY = ['holotype', 'lectotype', 'neotype', 'syntype']
const ORDER = ['holotype', 'lectotype', 'neotype', 'syntype', 'paralectotype', 'paratype', 'allotype', 'topotype']

const loaded = ref(false)
const rows = ref([]) // one per specimen and type designation
const q = ref('')
const kind = ref('')

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const rank = (k) => {
  const i = ORDER.indexOf(k)
  return i < 0 ? ORDER.length : i
}

onMounted(async () => {
  try {
    const { data } = await makeAPIRequest.get('/collection_objects', {
      params: { type_material: true, per: 2000, 'extend[]': ['dwc_fields', 'type_material'] }
    })
    const out = []
    ;(Array.isArray(data) ? data : []).forEach((co) => {
      const d = co.dwc || {}
      const tms = co.type_materials?.length ? co.type_materials : [{ type_type: d.typeStatus || 'type', object_tag: '' }]
      tms.forEach((tm) => {
        const k = String(tm.type_type || d.typeStatus || 'type').toLowerCase()
        // "holotype of <i>Aphelocheirus</i> … Sites, 2006" → the name part
        const html = String(tm.object_tag || '').replace(/^\s*\S+\s+of\s+/i, '') || `<i>${d.scientificName || 'Unidentified'}</i>`
        out.push({
          id: `${co.id}-${k}`,
          kind: cap(k),
          primary: PRIMARY.includes(k),
          rank: rank(k),
          html,
          name: html.replace(/<[^>]+>/g, ''),
          otu: d.otu_id || null,
          order: d.order || '',
          family: d.family || '',
          cat: d.catalogNumber || '',
          where: [d.country, d.stateProvince].filter(Boolean).join(', '),
          date: d.eventDate || ''
        })
      })
    })
    rows.value = out
  } catch {
    rows.value = []
  } finally {
    loaded.value = true
  }
})

const primaryCount = computed(() => rows.value.filter((r) => r.primary).length)

const kinds = computed(() => {
  const m = new Map()
  rows.value.forEach((r) => m.set(r.kind, { name: r.kind, n: (m.get(r.kind)?.n || 0) + 1, primary: r.primary, rank: r.rank }))
  return [...m.values()].sort((a, b) => a.rank - b.rank)
})

const names = computed(() => {
  const m = new Map()
  rows.value.forEach((r) => {
    if (!m.has(r.name)) m.set(r.name, { name: r.name, html: r.html, otu: r.otu, order: r.order, family: r.family, specimens: [], places: new Set() })
    const n = m.get(r.name)
    n.specimens.push(r)
    if (r.where) n.places.add(r.where)
  })
  return [...m.values()]
    .map((n) => ({
      ...n,
      specimens: n.specimens.sort((a, b) => a.rank - b.rank || a.cat.localeCompare(b.cat)),
      where: [...n.places].join(' · ')
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const shown = computed(() => {
  const term = q.value.trim().toLowerCase()
  return names.value.filter(
    (n) =>
      (!kind.value || n.specimens.some((s) => s.kind === kind.value)) &&
      (!term || `${n.name} ${n.order} ${n.family} ${n.where}`.toLowerCase().includes(term))
  )
})

function downloadCsv() {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    ['catalog_number', 'type_status', 'name', 'order', 'family', 'locality', 'date'],
    ...rows.value
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name) || a.rank - b.rank)
      .map((r) => [r.cat, r.kind.toLowerCase(), r.name, r.order, r.family, r.where, r.date])
  ]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([lines.map((l) => l.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  a.download = `EEM_type_specimens_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.ty-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid var(--eem-rule);
  background: var(--eem-card);
}
@media (min-width: 768px) {
  .ty-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.ty-stats .is-primary dd {
  color: #be2828;
}
.ty-stats .is-secondary dd {
  color: #b5524a;
}
.ty-stats > div {
  padding: 1.1rem 1.25rem;
  border-right: 1px solid var(--eem-rule);
  border-bottom: 1px solid var(--eem-rule);
}
.ty-stats dt {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.ty-stats dd {
  margin-top: 0.4rem;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 2rem;
  font-variant-numeric: tabular-nums;
}
.ty-search {
  flex: 1 1 16rem;
  min-width: 0;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  padding: 0.45rem 0.8rem;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.ty-chip {
  padding: 0.3rem 0.8rem;
  border: 2px solid var(--eem-rule);
  border-radius: 2px;
  font-size: 0.82rem;
  font-weight: 700;
  background: var(--eem-card);
}
.ty-chip span {
  font-weight: 500;
  color: var(--eem-ink-soft);
  margin-left: 0.15rem;
}
.ty-chip.primary {
  border-color: #be2828;
  color: #be2828;
}
.ty-chip.on {
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}
.ty-chip.on span {
  color: rgba(255, 255, 255, 0.7);
}
.ty-chip.secondary {
  border-color: #e3a59e;
  background: #f6d5d1;
  color: #8a1c1c;
}
.ty-chip.secondary.on {
  background: #8a1c1c;
  border-color: #8a1c1c;
  color: #fff;
}
.ty-chip.primary.on {
  background: #be2828;
  border-color: #be2828;
  color: #fff;
}
.ty-name {
  padding: 1rem 1.15rem;
}
.ty-title {
  font-weight: 600;
  color: var(--eem-ink);
}
a.ty-title:hover {
  text-decoration: underline;
  text-decoration-color: var(--eem-gold);
}
.ty-spec {
  display: inline-block;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  padding: 0.1rem 0.5rem;
  border-radius: 2px;
  border: 1px solid var(--eem-rule);
  color: var(--eem-ink);
  background: var(--eem-paper);
}
.ty-spec b {
  font-weight: 800;
}
.ty-spec.primary {
  background: #be2828;
  border-color: #be2828;
  color: #fff;
}
.ty-spec.secondary {
  background: #f6d5d1;
  border-color: #e3a59e;
  color: #8a1c1c;
}
.ty-spec:hover {
  border-color: var(--eem-gold);
}
@media (max-width: 520px) {
  .ty-stats dd {
    font-size: 1.5rem;
  }
}
</style>
