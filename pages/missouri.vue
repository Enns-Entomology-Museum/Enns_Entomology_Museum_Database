<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Missouri checklist"
      title="Insects of Missouri"
      lede="Every insect species recorded in Missouri — the ones preserved in the Enns Museum, and the ones known from GBIF records that the collection does not have yet."
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
          <p
            v-if="s.note"
            class="text-xs eem-muted mt-1"
          >
            {{ s.note }}
          </p>
        </div>
      </dl>
    </section>

    <!-- Checklist -->
    <section
      id="checklist"
      class="bg-[color:var(--eem-paper-2)] border-b eem-rule"
    >
      <div class="container mx-auto box-border px-4 py-14">
        <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p class="eem-kicker">Checklist</p>
            <h2 class="eem-display text-3xl sm:text-4xl mt-3">Species list</h2>
            <p class="mt-2 eem-muted max-w-2xl">
              Open an order to see its families and species. Species not yet in the museum are the gaps we would
              most like to fill — specimens of them are welcome.
            </p>
          </div>
          <button
            type="button"
            class="eem-link font-semibold"
            @click="scrollTo('counties')"
          >
            County map ↓
          </button>
        </div>
        <EemChecklist
          ref="ck"
          :records="mo.records"
          :records-loaded="mo.loaded"
        />
      </div>
    </section>

    <!-- County map -->
    <section
      id="counties"
      class="container mx-auto box-border px-4 py-16 grid lg:grid-cols-12 gap-10"
    >
      <div class="lg:col-span-8">
        <p class="eem-kicker">Our specimens by county</p>
        <h2 class="eem-display text-3xl sm:text-4xl mt-3">Where the museum's specimens come from</h2>
        <p class="mt-2 eem-muted text-sm">
          Digitized Enns Museum specimens only. Click a county to see what has been found there.
        </p>
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

  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useHead } from '@unhead/vue'
import EemChecklist from './components/EemChecklist.vue'
import EemCountyMap from './components/EemCountyMap.vue'
import EemPageHead from './components/EemPageHead.vue'
import { fmt, normCounty, useMissouri } from './components/useEem.js'

useHead({ title: 'Insects of Missouri — checklist — Enns Entomology Museum' })

const mo = useMissouri()
const pick = ref(null)
const ck = ref(null)
const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

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

const ckCounts = computed(() => ck.value?.counts || null)
const stats = computed(() => [
  { label: 'Species recorded', value: ckCounts.value ? fmt(ckCounts.value.all) : '—', note: 'museum + GBIF' },
  { label: 'In the museum', value: ckCounts.value ? fmt(ckCounts.value.eem) : '—', note: 'with digitized specimens' },
  { label: 'Museum specimens', value: mo.loaded ? fmt(mo.total) : '—', note: 'from Missouri' },
  { label: 'Counties', value: mo.loaded ? `${countiesWith.value} / 115` : '—', note: 'with museum specimens' }
])

</script>

<style scoped></style>
