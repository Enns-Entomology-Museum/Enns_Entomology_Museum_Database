<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="The collection"
      title="Holdings"
      :lede="`The Enns Entomology Museum houses ${info.holdings}. This page summarizes what has been digitized so far — it grows with every drawer.`"
    />

    <section class="container mx-auto box-border px-4 py-14 grid lg:grid-cols-12 gap-12">
      <!-- Orders & families -->
      <div class="lg:col-span-7">
        <p class="eem-kicker">By order</p>
        <h2 class="eem-display mt-3 text-3xl">Orders and families</h2>
        <p class="mt-2 eem-muted text-sm">
          {{ sampleNote }}
          <RouterLink
            to="/tree"
            class="eem-link"
            >Browse the full taxonomic tree →</RouterLink
          >
        </p>

        <div class="mt-6 border-t eem-rule">
          <details
            v-for="o in orders"
            :key="o.name"
            class="eem-order border-b eem-rule"
          >
            <summary class="flex items-center gap-4 py-4 cursor-pointer">
              <span class="flex-1 min-w-0">
                <strong class="font-semibold text-lg">{{ o.name }}</strong>
                <span
                  v-if="ORDER_NAMES[o.name]"
                  class="eem-muted"
                >
                  · {{ ORDER_NAMES[o.name] }}</span
                >
              </span>
              <span class="eem-hbar w-28 sm:w-40 hidden sm:block"><span :style="{ width: o.share + '%' }" /></span>
              <span class="tabular-nums font-semibold w-14 text-right">{{ fmt(o.n) }}</span>
              <span
                class="eem-chev"
                aria-hidden="true"
                >▾</span
              >
            </summary>
            <ul class="pb-4 pl-1 grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <li
                v-for="f in o.families"
                :key="f.name"
                class="flex justify-between gap-3"
              >
                <span>{{ f.name }}</span>
                <span class="tabular-nums eem-muted">{{ fmt(f.n) }}</span>
              </li>
            </ul>
          </details>
          <p
            v-if="eem.loaded && !orders.length"
            class="py-6 eem-muted"
          >
            No records yet.
          </p>
        </div>
      </div>

      <!-- Side facts -->
      <aside class="lg:col-span-5 space-y-6">
        <div class="eem-card p-6">
          <p class="eem-kicker">Where</p>
          <h3 class="eem-display text-xl mt-2">States &amp; provinces</h3>
          <ul class="mt-4 space-y-2 text-sm">
            <li
              v-for="s in states.slice(0, 10)"
              :key="s.name"
              class="flex justify-between gap-3"
            >
              <RouterLink
                v-if="s.name === 'Missouri'"
                to="/missouri"
                class="hover:underline !text-[color:var(--eem-ink)] font-semibold"
                >Missouri →</RouterLink
              >
              <span v-else>{{ s.name }}</span><span class="tabular-nums font-semibold">{{ fmt(s.n) }}</span>
            </li>
          </ul>
        </div>

        <div class="eem-card p-6">
          <p class="eem-kicker">Who</p>
          <h3 class="eem-display text-xl mt-2">Collectors</h3>
          <ul class="mt-4 space-y-2 text-sm">
            <li
              v-for="c in collectors.slice(0, 10)"
              :key="c.name"
              class="flex justify-between gap-3"
            >
              <RouterLink
                :to="{ path: '/collector', query: { name: c.name } }"
                class="hover:underline !text-[color:var(--eem-ink)]"
                >{{ c.name }}</RouterLink
              ><span class="tabular-nums font-semibold">{{ fmt(c.n) }}</span>
            </li>
          </ul>
        </div>

        <div class="eem-card p-6">
          <p class="eem-kicker">When</p>
          <h3 class="eem-display text-xl mt-2">Specimens by decade collected</h3>
          <div
            class="eem-decades mt-5"
            role="img"
            :aria-label="decades.length ? `Specimens by decade collected: ${decades.map((d) => `${d.name}: ${d.n}`).join(', ')}` : 'Specimens by decade collected'"
          >
            <div
              v-for="d in decades"
              :key="d.name"
              class="eem-decade"
              :title="`${d.name}: ${d.n} specimens`"
            >
              <span
                class="eem-decade-bar"
                :style="{ height: d.h + '%' }"
              />
              <span class="eem-decade-lab">{{ d.short }}</span>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <!-- Type specimens -->
    <EemTypes />

    <!-- Digitization progress -->
    <EemProgress />

    <!-- Loans -->
    <section class="border-t eem-rule">
      <div class="container mx-auto box-border px-4 py-14">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eem-kicker">Loans</p>
            <h2 class="eem-display mt-3 text-3xl">Specimens at work</h2>
            <p class="mt-2 eem-muted max-w-2xl">
              Specimens travel to researchers around the world for study. These numbers count loans recorded in the
              museum’s database, including bulk loans of unsorted material.
            </p>
          </div>
          <RouterLink
            to="/visit#loans"
            class="eem-link font-semibold"
            >Request a loan →</RouterLink
          >
        </div>

        <dl class="eem-loan-stats mt-8">
          <div>
            <dt>Loans</dt>
            <dd>{{ fmt(ls.data ? ls.data.totals.loans : eem.stats['Loans']) }}</dd>
          </div>
          <div>
            <dt>Specimens loaned</dt>
            <dd>{{ fmt(ls.data ? ls.data.totals.specimens : loans.everLoaned) }}</dd>
          </div>
          <div>
            <dt>Out on loan now</dt>
            <dd v-if="ls.data">
              {{ fmt(ls.data.totals.openSpecimens) }}
              <span class="block text-xs font-normal eem-muted">in {{ ls.data.totals.openLoans }} loan{{ ls.data.totals.openLoans === 1 ? '' : 's' }}</span>
            </dd>
            <dd v-else>{{ loans.loaded ? fmt(loans.items.length) : '—' }}</dd>
          </div>
        </dl>

        <EemLoanHistory />

        <div
          v-if="!ls.data && loanTaxa.length"
          class="mt-8"
        >
          <h3 class="text-sm font-bold uppercase tracking-wider eem-muted">Currently on loan</h3>
          <ul class="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <li
              v-for="t in loanTaxa"
              :key="t.name"
              class="eem-card px-4 py-3 flex items-center gap-3"
            >
              <span class="min-w-0 flex-1">
                <i class="font-semibold">{{ t.name }}</i>
                <span class="block text-xs eem-muted">{{ [t.order, t.family].filter(Boolean).join(' · ') }}</span>
              </span>
              <span class="text-right">
                <span class="eem-loan-n">{{ t.n }}</span>
                <span
                  v-if="t.due"
                  class="block text-[0.7rem] eem-muted mt-1"
                  >due {{ t.due }}</span
                >
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="border-t eem-rule bg-[color:var(--eem-paper-2)]">
      <div class="container mx-auto box-border px-4 py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 class="eem-display text-2xl">Looking for something specific?</h2>
          <p class="mt-1 eem-muted">Filter all digitized specimens by name, locality or collector, and download them as Darwin Core.</p>
        </div>
        <div class="flex flex-wrap gap-3 shrink-0">
          <RouterLink
            to="/highlights"
            class="eem-btn eem-btn-line"
            >Highlights</RouterLink
          >
          <RouterLink
            to="/missouri"
            class="eem-btn eem-btn-line"
            >Missouri</RouterLink
          >
          <RouterLink
            to="/collectors"
            class="eem-btn eem-btn-line"
            >Collectors</RouterLink
          >
          <RouterLink
            to="/library"
            class="eem-btn eem-btn-line"
            >Library</RouterLink
          >
          <RouterLink
            to="/tree"
            class="eem-btn eem-btn-line"
            >Taxonomic tree</RouterLink
          >
          <RouterLink
            to="/specimens"
            class="eem-btn eem-btn-gold"
            >Search specimens →</RouterLink
          >
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'
import EemLoanHistory from './components/EemLoanHistory.vue'
import EemTypes from './components/EemTypes.vue'
import EemProgress from './components/EemProgress.vue'
import { ORDER_NAMES, collectorsOf, countBy, fmt, useEem, useLoanSummary, useLoans } from './components/useEem.js'

useHead({ title: 'Holdings — Enns Entomology Museum' })

const eem = useEem()
const loans = useLoans()
const ls = useLoanSummary()

const monthYear = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '')

const loanTaxa = computed(() => {
  const map = new Map()
  loans.items.forEach((i) => {
    const t = map.get(i.name) || { name: i.name, order: i.order, family: i.family, n: 0, dues: [] }
    t.n++
    if (i.due) t.dues.push(i.due)
    map.set(i.name, t)
  })
  return [...map.values()]
    .map((t) => ({ ...t, due: monthYear(t.dues.sort()[0]) }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
})

const orders = computed(() => {
  const list = countBy(eem.records, 'order')
  const max = Math.max(1, ...list.map((o) => o.n))
  return list.map((o) => ({
    ...o,
    share: (o.n / max) * 100,
    families: countBy(
      eem.records.filter((r) => r.order === o.name),
      'family'
    )
  }))
})

const states = computed(() => countBy(eem.records, 'stateProvince'))
const collectors = computed(() => {
  const m = new Map()
  eem.records.forEach((r) => collectorsOf(r).forEach((c) => m.set(c, (m.get(c) || 0) + 1)))
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
})

const decades = computed(() => {
  const map = new Map()
  eem.records.forEach((r) => {
    const y = Number(String(r.eventDate || r.year || '').slice(0, 4))
    if (y > 1800) {
      const d = Math.floor(y / 10) * 10
      map.set(d, (map.get(d) || 0) + 1)
    }
  })
  const keys = [...map.keys()].sort()
  if (!keys.length) return []
  const all = []
  for (let d = keys[0]; d <= keys[keys.length - 1]; d += 10) all.push({ d, n: map.get(d) || 0 })
  const max = Math.max(1, ...all.map((x) => x.n))
  return all.map(({ d, n }) => ({ name: `${d}s`, short: `’${String(d).slice(2)}`, n, h: n ? Math.max(4, (n / max) * 100) : 0 }))
})

const sampleNote = computed(() => {
  if (!eem.loaded) return 'Counting records…'
  const n = eem.records.length
  const total = eem.totalRecords || n
  return n < total
    ? `Based on the ${fmt(n)} most recently digitized specimens (of ${fmt(total)}). Open an order to see its families.`
    : `All ${fmt(total)} digitized specimens. Open an order to see its families.`
})
</script>

<style scoped>
.eem-loan-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid var(--eem-rule);
  background: var(--eem-card);
}
@media (min-width: 768px) {
  .eem-loan-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.eem-loan-stats > div {
  padding: 1.1rem 1.25rem;
  border-right: 1px solid var(--eem-rule);
  border-bottom: 1px solid var(--eem-rule);
}
.eem-loan-stats dt {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.eem-loan-stats dd {
  margin: 0.35rem 0 0;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 900;
  font-size: 2.4rem;
  line-height: 1.1;
}
.eem-loan-n {
  display: inline-block;
  min-width: 1.9rem;
  text-align: center;
  font-weight: 800;
  font-size: 0.85rem;
  padding: 0.1rem 0.45rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-hbar {
  height: 8px;
  background: var(--eem-paper-2);
}
.eem-hbar span {
  display: block;
  height: 100%;
  background: var(--eem-gold);
}
.eem-order summary {
  list-style: none;
}
.eem-order summary::-webkit-details-marker {
  display: none;
}
.eem-chev {
  transition: transform 0.2s;
  color: var(--eem-ink-soft);
}
.eem-order[open] .eem-chev {
  transform: rotate(180deg);
}
.eem-decades {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 140px;
  border-bottom: 1px solid var(--eem-rule);
}
.eem-decade {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}
.eem-decade-bar {
  width: 80%;
  background: var(--eem-gold);
  border-radius: 3px 3px 0 0;
}
.eem-decade-lab {
  position: absolute;
  bottom: -1.4rem;
  font-size: 0.65rem;
  color: var(--eem-ink-soft);
}
</style>
