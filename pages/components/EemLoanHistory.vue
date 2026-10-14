<template>
  <div
    v-if="s"
    class="mt-10 grid gap-10 lg:grid-cols-12"
  >
    <!-- Specimens lent per year -->
    <figure class="lg:col-span-7">
      <figcaption class="flex items-baseline justify-between gap-4">
        <span class="text-sm font-bold uppercase tracking-wider eem-muted">Specimens lent per year</span>
        <span class="text-xs eem-muted">Hover a bar for details</span>
      </figcaption>
      <div
        class="relative mt-4"
        @mouseleave="hover = null"
      >
        <div class="eem-ly flex h-44 items-end gap-[2px]">
          <button
            v-for="(b, i) in years"
            :key="b.year"
            type="button"
            class="group relative flex h-full flex-1 items-end"
            :aria-label="`${b.year}: ${b.loans} loans, ${fmt(b.specimens)} specimens`"
            @mouseenter="hover = i"
            @focus="hover = i"
          >
            <span
              class="eem-lbar block w-full"
              :class="{ on: hover === i }"
              :style="{ height: b.specimens ? `${Math.max(2, (b.specimens / maxYear) * 100)}%` : '0' }"
            />
          </button>
        </div>
        <div class="mt-2 flex gap-[2px] text-[0.68rem] eem-muted">
          <span
            v-for="(b, i) in years"
            :key="b.year"
            class="flex-1 text-center"
            >{{ i % labelStep === 0 || i === years.length - 1 ? b.year : '' }}</span
          >
        </div>
        <div
          v-if="hover !== null"
          class="eem-ltip"
          :style="{ left: `${((hover + 0.5) / years.length) * 100}%` }"
        >
          <b>{{ years[hover].year }}</b> · {{ years[hover].loans }} loan{{ years[hover].loans === 1 ? '' : 's' }} ·
          {{ fmt(years[hover].specimens) }} specimens
        </div>
      </div>
    </figure>

    <!-- Most borrowed families -->
    <div class="lg:col-span-5">
      <p class="text-sm font-bold uppercase tracking-wider eem-muted">Most borrowed groups</p>
      <ul class="mt-4 space-y-2.5">
        <li
          v-for="f in s.topFamilies.slice(0, 8)"
          :key="f.order + f.family"
          class="text-sm"
        >
          <div class="flex items-baseline justify-between gap-3">
            <span
              ><b>{{ f.family }}</b> <span class="eem-muted">{{ f.order }}</span></span
            >
            <span class="tabular-nums eem-muted">{{ fmt(f.specimens) }}</span>
          </div>
          <div class="eem-ltrack mt-1">
            <span :style="{ width: `${(f.specimens / s.topFamilies[0].specimens) * 100}%` }" />
          </div>
        </li>
      </ul>
    </div>

    <!-- Loans table -->
    <div class="lg:col-span-12">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <p class="text-sm font-bold uppercase tracking-wider eem-muted">Loans</p>
        <button
          v-if="s.loans.length > 8"
          type="button"
          class="eem-link text-sm font-semibold"
          @click="all = !all"
        >
          {{ all ? 'Show fewer' : `Show all ${s.loans.length}` }}
        </button>
      </div>
      <div class="mt-3 overflow-x-auto">
        <table class="eem-ltable w-full text-sm">
          <thead>
            <tr>
              <th>Sent</th>
              <th>Status</th>
              <th>Contents</th>
              <th class="text-right">Items</th>
              <th class="text-right">Specimens</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(l, i) in shown"
              :key="i"
            >
              <td class="whitespace-nowrap">{{ monthYear(l.sent) || '—' }}</td>
              <td>
                <span
                  class="eem-lstatus"
                  :class="l.status"
                  >{{ l.status === 'open' ? 'Out' : 'Returned' }}</span
                >
                <span
                  v-if="l.status === 'open' && l.due"
                  class="ml-1 text-xs eem-muted"
                  >due {{ monthYear(l.due) }}</span
                >
              </td>
              <td class="min-w-[16rem]">
                <span
                  v-for="(t, j) in l.taxa.slice(0, 3)"
                  :key="j"
                  >{{ j ? ', ' : '' }}{{ t.family === 'Unidentified' ? t.order : t.family }} {{ fmt(t.specimens) }}</span
                >
                <span
                  v-if="l.taxa.length > 3"
                  class="eem-muted"
                >
                  + {{ l.taxa.length - 3 }} more</span
                >
              </td>
              <td class="text-right tabular-nums">{{ l.items }}</td>
              <td class="text-right font-semibold tabular-nums">{{ fmt(l.specimens) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mt-3 text-xs eem-muted">
        Loans recorded in TaxonWorks, updated {{ s.updated }}. Bulk loans count the number of specimens entered on the
        loan (for example “Elateridae — 500”). Borrowers’ details are not shown.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { fmt, useLoanSummary } from './useEem.js'

const summary = useLoanSummary()
const s = computed(() => summary.data)

const hover = ref(null)
const all = ref(false)

const years = computed(() => {
  const list = s.value?.byYear || []
  if (!list.length) return []
  const map = new Map(list.map((y) => [y.year, y]))
  const out = []
  for (let y = list[0].year; y <= Math.max(list.at(-1).year, new Date().getFullYear()); y++) {
    out.push(map.get(y) || { year: y, loans: 0, specimens: 0 })
  }
  return out
})
const maxYear = computed(() => Math.max(1, ...years.value.map((y) => y.specimens)))
const labelStep = computed(() => (years.value.length > 16 ? 5 : years.value.length > 8 ? 2 : 1))
const shown = computed(() => (all.value ? s.value.loans : s.value.loans.slice(0, 8)))

const monthYear = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''
</script>

<style scoped>
.eem-ly {
  border-bottom: 1px solid var(--eem-ink, #000);
}
.eem-lbar {
  background: var(--eem-ink, #000);
  border-radius: 3px 3px 0 0;
  transition: background-color 0.15s ease;
}
.eem-lbar.on {
  background: var(--eem-gold, #f1b82d);
}
.eem-ltip {
  position: absolute;
  top: -0.5rem;
  transform: translate(-50%, -100%);
  white-space: nowrap;
  background: #000;
  color: #fff;
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
  pointer-events: none;
}
.eem-ltrack {
  height: 6px;
  background: color-mix(in srgb, var(--eem-ink, #000) 8%, transparent);
}
.eem-ltrack span {
  display: block;
  height: 100%;
  background: var(--eem-gold, #f1b82d);
}
.eem-ltable th {
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.5rem 0.75rem 0.5rem 0;
  border-bottom: 2px solid var(--eem-ink, #000);
}
.eem-ltable th.text-right {
  text-align: right;
}
.eem-ltable td {
  padding: 0.6rem 0.75rem 0.6rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--eem-ink, #000) 12%, transparent);
  vertical-align: top;
}
.eem-lstatus {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.05rem 0.4rem;
  border: 1px solid currentColor;
}
.eem-lstatus.open {
  background: var(--eem-gold, #f1b82d);
  border-color: var(--eem-gold, #f1b82d);
  color: #000;
}
.eem-lstatus.closed {
  opacity: 0.6;
}
</style>
