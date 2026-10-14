<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="People behind the labels"
      title="Collectors"
      lede="Every specimen carries the name of whoever caught it. These are the collectors in the digitized part of the collection — from the museum's own directors to amateur naturalists."
    />

    <section class="container mx-auto box-border px-4 py-14">
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="q"
          type="search"
          class="eem-filter"
          placeholder="Find a collector"
          aria-label="Find a collector"
        />
        <span class="text-sm eem-muted ml-auto">{{ note }}</span>
      </div>

      <div
        v-if="featured.length && !q"
        class="mt-10"
      >
        <h2 class="eem-group">Museum directors and curators</h2>
        <ul class="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <li
            v-for="c in featured"
            :key="c.name"
          >
            <RouterLink
              :to="{ path: '/collector', query: { name: c.name } }"
              class="eem-card eem-coll-card"
            >
              <img
                v-if="c.img"
                :src="c.img"
                :alt="c.name"
                loading="lazy"
              />
              <span class="p-4 block">
                <span class="font-bold block">{{ c.name }}</span>
                <span class="text-sm eem-muted block">{{ c.role }}</span>
                <span class="eem-badge mt-2">{{ c.n }} specimen{{ c.n === 1 ? '' : 's' }}</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <div class="mt-10">
        <h2 class="eem-group">
          All collectors <span>{{ filtered.length }}</span>
        </h2>
        <p
          v-if="!eem.loaded"
          class="mt-4 eem-muted"
        >
          Loading…
        </p>
        <ul
          v-else
          class="eem-coll-list mt-4"
        >
          <li
            v-for="c in filtered"
            :key="c.name"
          >
            <RouterLink
              :to="{ path: '/collector', query: { name: c.name } }"
              class="eem-coll-row"
            >
              <span class="min-w-0 flex-1 truncate font-medium">{{ c.name }}</span>
              <span class="text-xs eem-muted hidden sm:inline">{{ c.years }}</span>
              <span class="eem-bar"><span :style="{ width: c.w + '%' }" /></span>
              <span class="tabular-nums font-semibold w-10 text-right">{{ c.n }}</span>
            </RouterLink>
          </li>
        </ul>
        <p class="mt-4 text-xs eem-muted">
          Names appear as written on the labels, so one person can be listed under more than one spelling.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import { collectorsOf, fmt, useEem } from './components/useEem.js'
import { DIRECTORS, directorOf } from './components/collectors.js'

useHead({ title: 'Collectors — Enns Entomology Museum' })

const eem = useEem()
const q = ref('')

const all = computed(() => {
  const m = new Map()
  eem.records.forEach((r) => {
    const y = Number(String(r.eventDate || '').slice(0, 4))
    collectorsOf(r).forEach((name) => {
      const c = m.get(name) || { name, n: 0, ys: [] }
      c.n++
      if (y > 1800) c.ys.push(y)
      m.set(name, c)
    })
  })
  const max = Math.max(1, ...[...m.values()].map((c) => c.n))
  return [...m.values()]
    .map((c) => {
      const a = c.ys.length ? Math.min(...c.ys) : null
      const b = c.ys.length ? Math.max(...c.ys) : null
      return { ...c, w: (c.n / max) * 100, years: a ? (a === b ? `${a}` : `${a}–${b}`) : '' }
    })
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
})

const filtered = computed(() => {
  const t = q.value.trim().toLowerCase()
  return t ? all.value.filter((c) => c.name.toLowerCase().includes(t)) : all.value
})

// Directors who appear on labels, merging their name variants
const featured = computed(() =>
  DIRECTORS.map((d) => {
    const names = all.value.filter((c) => directorOf(c.name)?.key === d.key)
    if (!names.length) return null
    const best = names[0]
    return { ...d, name: best.name, n: names.reduce((a, c) => a + c.n, 0) }
  }).filter(Boolean)
)

const note = computed(() => {
  if (!eem.loaded) return ''
  const n = eem.records.length
  const total = eem.totalRecords || n
  return n < total ? `From the ${fmt(n)} most recent of ${fmt(total)} specimens` : `${fmt(all.value.length)} collectors`
})
</script>

<style scoped>
.eem-filter {
  flex: 1 1 16rem;
  max-width: 26rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  padding: 0.55rem 0.8rem;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.eem-filter:focus {
  outline: 2px solid var(--eem-gold);
}
.eem-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--eem-ink);
}
.eem-group span {
  font-size: 0.7rem;
  padding: 0.05rem 0.45rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-coll-card {
  display: block;
  overflow: hidden;
  height: 100%;
  color: var(--eem-ink);
  border-top: 4px solid #000;
}
.eem-coll-card:hover {
  border-top-color: var(--eem-gold);
}
.eem-coll-card img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  object-position: center 25%;
  display: block;
  filter: grayscale(0.2);
}
.eem-badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.1rem 0.45rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-coll-list {
  list-style: none;
  margin: 0;
  padding: 0;
  columns: 1;
}
@media (min-width: 900px) {
  .eem-coll-list {
    columns: 2;
    column-gap: 2.5rem;
  }
}
.eem-coll-list li {
  break-inside: avoid;
}
.eem-coll-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.25rem;
  border-bottom: 1px solid var(--eem-rule);
  color: var(--eem-ink);
}
.eem-coll-row:hover {
  background: var(--eem-paper-2);
}
.eem-bar {
  width: 5rem;
  height: 6px;
  background: var(--eem-paper-2);
  flex-shrink: 0;
}
.eem-bar span {
  display: block;
  height: 100%;
  background: var(--eem-gold);
}
</style>
