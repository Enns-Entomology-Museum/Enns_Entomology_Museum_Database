<template>
  <div class="eem min-h-screen">
    <section class="eem-col-head">
      <div class="container mx-auto box-border px-4 py-10 sm:py-14 grid md:grid-cols-[1fr_auto] gap-8 items-end">
        <div>
          <RouterLink
            to="/collectors"
            class="block w-fit text-sm !text-white/70 hover:!text-[color:var(--eem-gold)]"
            >← All collectors</RouterLink
          >
          <p class="eem-kicker mt-6 !text-[color:var(--eem-gold)]">Collector</p>
          <h1 class="eem-display text-4xl sm:text-5xl mt-3 text-white">{{ name || 'Unknown collector' }}</h1>
          <p
            v-if="director"
            class="mt-3 text-white/75 max-w-2xl"
          >
            <b class="text-[color:var(--eem-gold)]">{{ director.role }}.</b> {{ director.bio }}
          </p>
        </div>
        <img
          v-if="director?.img"
          :src="director.img"
          :alt="name"
          class="eem-col-photo"
        />
      </div>
    </section>

    <section class="container mx-auto box-border px-4 py-12">
      <p
        v-if="!eem.loaded"
        class="eem-muted"
      >
        Loading…
      </p>
      <p
        v-else-if="!recs.length"
        class="eem-card p-6 eem-muted"
      >
        No digitized specimens collected by {{ name }} yet.
      </p>

      <template v-else>
        <dl class="eem-col-stats">
          <div
            v-for="s in stats"
            :key="s.label"
          >
            <dt>{{ s.label }}</dt>
            <dd>{{ s.value }}</dd>
          </div>
        </dl>

        <div class="mt-10 grid lg:grid-cols-12 gap-10">
          <div class="lg:col-span-7">
            <h2 class="eem-group">Specimens</h2>
            <ul class="mt-2">
              <li
                v-for="r in shown"
                :key="r.id"
              >
                <RouterLink
                  :to="{ path: '/specimen', query: { cat: r.catalogNumber } }"
                  class="eem-col-row"
                >
                  <span class="eem-cat">{{ r.catalogNumber }}</span>
                  <span class="min-w-0 flex-1">
                    <i class="font-semibold">{{ taxonOf(r) }}</i>
                    <span class="block text-xs eem-muted truncate">{{ place(r) }}</span>
                  </span>
                  <span class="text-xs eem-muted tabular-nums">{{ r.eventDate || '' }}</span>
                </RouterLink>
              </li>
            </ul>
            <button
              v-if="recs.length > limit"
              type="button"
              class="eem-btn eem-btn-line mt-4"
              @click="limit += 25"
            >
              Show more ({{ recs.length - limit }} left)
            </button>

            <h2 class="eem-group mt-10">What they collected</h2>
            <ul class="mt-3 flex flex-wrap gap-2">
              <li
                v-for="o in orders"
                :key="o.name"
                class="eem-chip"
              >
                {{ o.name }} <b>{{ o.n }}</b>
              </li>
            </ul>

            <template v-if="coCollectors.length">
              <h2 class="eem-group mt-10">Collected with</h2>
              <ul class="mt-3 flex flex-wrap gap-2">
                <li
                  v-for="c in coCollectors"
                  :key="c.name"
                >
                  <RouterLink
                    :to="{ path: '/collector', query: { name: c.name } }"
                    class="eem-chip hover:!border-[color:var(--eem-ink)]"
                    >{{ c.name }} <b>{{ c.n }}</b></RouterLink
                  >
                </li>
              </ul>
            </template>
          </div>

          <aside class="lg:col-span-5">
            <div class="eem-card p-2">
              <ClientOnly>
                <EemMap
                  :points="points"
                  height="420px"
                  :label="`Map of places where ${name} collected`"
                />
              </ClientOnly>
            </div>
            <p class="mt-2 text-xs eem-muted">{{ points.length }} georeferenced {{ points.length === 1 ? 'specimen' : 'specimens' }}</p>
          </aside>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import EemMap from './components/EemMap.vue'
import { collectorsOf, countBy, fmt, useEem } from './components/useEem.js'
import { directorOf } from './components/collectors.js'

const route = useRoute()
const eem = useEem()
const name = computed(() => String(route.query.name || '').trim())
const director = computed(() => directorOf(name.value))
const limit = ref(25)
watch(name, () => (limit.value = 25))

useHead({ title: () => `${name.value || 'Collector'} — Enns Entomology Museum` })

const recs = computed(() =>
  eem.records
    .filter((r) => collectorsOf(r).includes(name.value))
    .sort((a, b) => String(a.eventDate || '').localeCompare(String(b.eventDate || '')))
)
const shown = computed(() => recs.value.slice(0, limit.value))

const taxonOf = (r) => [r.genus, r.specificEpithet].filter(Boolean).join(' ') || r.family || r.order || 'Unidentified'
const place = (r) =>
  [r.verbatimLocality || r.locality, r.county ? `${r.county} Co.` : '', r.stateProvince, r.country === 'United States' ? '' : r.country]
    .filter(Boolean)
    .join(', ')

const years = computed(() => {
  const ys = recs.value.map((r) => Number(String(r.eventDate || '').slice(0, 4))).filter((y) => y > 1800)
  if (!ys.length) return '—'
  const a = Math.min(...ys)
  const b = Math.max(...ys)
  return a === b ? `${a}` : `${a}–${b}`
})

const orders = computed(() => countBy(recs.value, 'order'))

const stats = computed(() => [
  { label: 'Specimens', value: fmt(recs.value.length) },
  { label: 'Years', value: years.value },
  { label: 'Taxa', value: fmt(new Set(recs.value.map(taxonOf)).size) },
  { label: 'Places', value: fmt(new Set(recs.value.map((r) => [r.stateProvince, r.country].filter(Boolean).join(', ')).filter(Boolean)).size) }
])

const coCollectors = computed(() => {
  const m = new Map()
  recs.value.forEach((r) =>
    collectorsOf(r)
      .filter((c) => c !== name.value)
      .forEach((c) => m.set(c, (m.get(c) || 0) + 1))
  )
  return [...m.entries()].map(([n, c]) => ({ name: n, n: c })).sort((a, b) => b.n - a.n)
})

const points = computed(() =>
  recs.value
    .filter((r) => r.decimalLatitude && r.decimalLongitude)
    .map((r) => ({
      lat: Number(r.decimalLatitude),
      lng: Number(r.decimalLongitude),
      html: `<b>${r.catalogNumber}</b><br><i>${taxonOf(r)}</i><br>${r.eventDate || ''}`
    }))
)
</script>

<style scoped>
.eem-col-head {
  background: #000;
  color: #fff;
  border-bottom: 6px solid var(--eem-gold);
}
.eem-col-photo {
  width: 9rem;
  height: 9rem;
  object-fit: cover;
  object-position: center 25%;
  border: 3px solid var(--eem-gold);
}
.eem-col-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid var(--eem-rule);
  background: var(--eem-card);
}
@media (min-width: 768px) {
  .eem-col-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.eem-col-stats > div {
  padding: 1rem 1.25rem;
  border-right: 1px solid var(--eem-rule);
  border-bottom: 1px solid var(--eem-rule);
}
.eem-col-stats dt {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.eem-col-stats dd {
  margin: 0.3rem 0 0;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 900;
  font-size: 2rem;
  line-height: 1.1;
}
.eem-group {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--eem-ink);
}
.eem-col-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.6rem 0.25rem;
  border-bottom: 1px solid var(--eem-rule);
  color: var(--eem-ink);
}
.eem-col-row:hover {
  background: var(--eem-paper-2);
}
.eem-cat {
  flex-shrink: 0;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  padding: 0.25rem 0.65rem;
  border: 1px solid var(--eem-rule);
  background: var(--eem-card);
  color: var(--eem-ink);
}
.eem-chip b {
  font-size: 0.75rem;
  padding: 0 0.35rem;
  background: var(--eem-paper-2);
}
@media (max-width: 520px) {
  .eem-col-row {
    flex-wrap: wrap;
  }
}
</style>
