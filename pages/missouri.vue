<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Missouri"
      title="Missouri in the drawers"
      lede="Where the museum's Missouri specimens come from, county by county — and the species list they add up to. Empty counties are places still waiting to be digitized or collected."
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
        </div>
      </dl>
    </section>

    <!-- County map -->
    <section class="container mx-auto box-border px-4 py-14 grid lg:grid-cols-12 gap-10">
      <div class="lg:col-span-8">
        <p class="eem-kicker">By county</p>
        <h2 class="eem-display text-3xl mt-3">Digitized specimens per county</h2>
        <p class="mt-2 eem-muted text-sm">Click a county to see what has been found there.</p>
        <div class="eem-card p-2 mt-5">
          <ClientOnly>
            <EemCountyMap
              :counts="counts"
              @select="pick = $event"
            />
          </ClientOnly>
        </div>
      </div>

      <aside class="lg:col-span-4 space-y-5">
        <div
          v-if="pick"
          class="eem-card p-6 eem-accent-t"
        >
          <p class="eem-kicker">{{ /city$/i.test(pick.name) ? 'City' : 'County' }}</p>
          <h3 class="eem-display text-2xl mt-2">{{ pick.name }}</h3>
          <p
            v-if="!picked.length"
            class="mt-3 eem-muted text-sm"
          >
            No specimens from here are online yet.
          </p>
          <template v-else>
            <p class="mt-1 text-sm eem-muted">
              {{ picked.length }} specimen{{ picked.length === 1 ? '' : 's' }} ·
              {{ pickedTaxa.length }} {{ pickedTaxa.length === 1 ? 'taxon' : 'taxa' }}
            </p>
            <ul class="mt-4 space-y-1.5 text-sm">
              <li
                v-for="t in pickedTaxa.slice(0, 12)"
                :key="t.name"
                class="flex justify-between gap-3"
              >
                <i>{{ t.name }}</i><span class="tabular-nums font-semibold">{{ t.n }}</span>
              </li>
            </ul>
          </template>
          <button
            type="button"
            class="eem-link text-sm mt-4"
            @click="pick = null"
          >
            Close
          </button>
        </div>

        <div class="eem-card p-6">
          <p class="eem-kicker">Most specimens</p>
          <ol class="mt-4 space-y-2 text-sm">
            <li
              v-for="c in topCounties"
              :key="c.name"
              class="flex justify-between gap-3"
            >
              <button
                type="button"
                class="text-left hover:underline"
                @click="pick = { name: c.label, key: c.name, n: c.n }"
              >
                {{ c.label }}
              </button>
              <span class="tabular-nums font-semibold">{{ c.n }}</span>
            </li>
          </ol>
          <p
            v-if="!topCounties.length && mo.loaded"
            class="eem-muted text-sm mt-2"
          >
            No Missouri specimens online yet.
          </p>
        </div>

        <div class="eem-card p-6">
          <p class="eem-kicker">Still to come</p>
          <p class="mt-3 text-sm leading-relaxed">
            <b>{{ 115 - countiesWith }}</b> of Missouri's 115 counties have no digitized specimens yet. Have
            specimens from one of them, or want to help collect?
            <RouterLink
              to="/donate"
              class="eem-link"
              >Get in touch</RouterLink
            >.
          </p>
        </div>
      </aside>
    </section>

    <!-- Checklist -->
    <section class="border-t eem-rule bg-[color:var(--eem-paper-2)]">
      <div class="container mx-auto box-border px-4 py-16">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eem-kicker">Checklist</p>
            <h2 class="eem-display text-3xl sm:text-4xl mt-3">Missouri species in the collection</h2>
            <p class="mt-2 eem-muted max-w-2xl">
              Every taxon with at least one digitized Missouri specimen. The list grows as more drawers come online.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <input
              v-model="q"
              type="search"
              class="eem-filter"
              placeholder="Filter by name, family or order"
              aria-label="Filter the checklist"
            />
            <button
              type="button"
              class="eem-btn eem-btn-gold"
              :disabled="!checklist.length"
              @click="downloadCsv"
            >
              Download CSV
            </button>
          </div>
        </div>

        <p
          v-if="!mo.loaded"
          class="mt-8 eem-muted"
        >
          Loading…
        </p>
        <p
          v-else-if="!grouped.length"
          class="mt-8 eem-card p-6 eem-muted"
        >
          {{ checklist.length ? 'Nothing matches that filter.' : 'No Missouri specimens online yet.' }}
        </p>

        <div
          v-else
          class="mt-8 space-y-6"
        >
          <section
            v-for="o in grouped"
            :key="o.name"
            class="eem-card"
          >
            <h3 class="eem-order-head">
              <span>{{ o.name }}</span>
              <span
                v-if="ORDER_NAMES[o.name]"
                class="eem-muted font-normal normal-case tracking-normal"
                >{{ ORDER_NAMES[o.name] }}</span
              >
              <span class="ml-auto eem-muted font-normal normal-case tracking-normal text-xs">{{ o.count }} {{ o.count === 1 ? 'taxon' : 'taxa' }}</span>
            </h3>
            <div class="eem-families">
              <div
                v-for="f in o.families"
                :key="f.name"
                class="eem-family"
              >
                <h4 class="font-bold text-sm">{{ f.name }}</h4>
                <ul class="mt-2 space-y-1 text-sm">
                  <li
                    v-for="t in f.taxa"
                    :key="t.name"
                    class="flex justify-between gap-3"
                  >
                    <i>{{ t.name }}</i>
                    <span
                      class="eem-muted tabular-nums"
                      :title="`${t.n} specimens from ${t.counties} ${t.counties === 1 ? 'county' : 'counties'}`"
                      >{{ t.n }}</span
                    >
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useHead } from '@unhead/vue'
import EemCountyMap from './components/EemCountyMap.vue'
import EemPageHead from './components/EemPageHead.vue'
import { ORDER_NAMES, fmt, normCounty, useMissouri } from './components/useEem.js'

useHead({ title: 'Missouri — Enns Entomology Museum' })

const mo = useMissouri()
const pick = ref(null)
const q = ref('')

const counts = computed(() => {
  const c = {}
  mo.records.forEach((r) => {
    const k = normCounty(r.county)
    if (k) c[k] = (c[k] || 0) + 1
  })
  return c
})
const countiesWith = computed(() => Object.keys(counts.value).length)

const title = (k) => k.replace(/(^|\s|\.)([a-z])/g, (m, a, b) => a + b.toUpperCase())

const topCounties = computed(() =>
  Object.entries(counts.value)
    .map(([name, n]) => ({ name, n, label: title(name) }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)
)

const taxonOf = (r) => [r.genus, r.specificEpithet].filter(Boolean).join(' ') || r.family || r.order || 'Unidentified'

const picked = computed(() => (pick.value ? mo.records.filter((r) => normCounty(r.county) === pick.value.key) : []))
const pickedTaxa = computed(() => {
  const m = new Map()
  picked.value.forEach((r) => m.set(taxonOf(r), (m.get(taxonOf(r)) || 0) + 1))
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
})

const checklist = computed(() => {
  const m = new Map()
  mo.records.forEach((r) => {
    const name = taxonOf(r)
    const key = `${r.order}|${r.family}|${name}`
    const t = m.get(key) || {
      order: r.order || 'Unplaced',
      family: r.family || 'Unplaced',
      genus: r.genus || '',
      species: r.specificEpithet || '',
      name,
      n: 0,
      countySet: new Set()
    }
    t.n++
    if (r.county) t.countySet.add(normCounty(r.county))
    m.set(key, t)
  })
  return [...m.values()].map((t) => ({ ...t, counties: t.countySet.size }))
})

const grouped = computed(() => {
  const term = q.value.trim().toLowerCase()
  const list = checklist.value.filter((t) => !term || `${t.order} ${t.family} ${t.name}`.toLowerCase().includes(term))
  const orders = new Map()
  list.forEach((t) => {
    if (!orders.has(t.order)) orders.set(t.order, new Map())
    const fams = orders.get(t.order)
    if (!fams.has(t.family)) fams.set(t.family, [])
    fams.get(t.family).push(t)
  })
  return [...orders.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, fams]) => ({
      name,
      count: [...fams.values()].reduce((a, f) => a + f.length, 0),
      families: [...fams.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([fname, taxa]) => ({ name: fname, taxa: taxa.sort((a, b) => a.name.localeCompare(b.name)) }))
    }))
})

const stats = computed(() => [
  { label: 'Missouri specimens', value: mo.loaded ? fmt(mo.total) : '—' },
  { label: 'Counties represented', value: mo.loaded ? `${countiesWith.value} / 115` : '—' },
  { label: 'Taxa', value: mo.loaded ? fmt(checklist.value.length) : '—' },
  { label: 'Orders', value: mo.loaded ? fmt(new Set(checklist.value.map((t) => t.order)).size) : '—' }
])

function downloadCsv() {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['order', 'family', 'genus', 'specificEpithet', 'taxon', 'specimens', 'counties'],
    ...checklist.value
      .slice()
      .sort((a, b) => `${a.order}${a.family}${a.name}`.localeCompare(`${b.order}${b.family}${b.name}`))
      .map((t) => [t.order, t.family, t.genus, t.species, t.name, t.n, t.counties])
  ]
  const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `EEM_Missouri_checklist_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.eem-filter {
  min-width: 14rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  padding: 0.55rem 0.8rem;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.eem-filter:focus {
  outline: 2px solid var(--eem-gold);
}
.eem-order-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.9rem 1.25rem;
  background: #000;
  color: #fff;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.eem-order-head .eem-muted {
  color: rgba(255, 255, 255, 0.65);
}
.eem-families {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1.25rem 2rem;
  padding: 1.25rem;
}
.eem-family {
  border-left: 3px solid var(--eem-gold);
  padding-left: 0.85rem;
}
</style>
