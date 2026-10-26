<template>
  <!-- Compact: inside the dark digitization panel on the home page -->
  <div
    v-if="compact"
    class="pg-compact"
  >
    <template v-if="p.loaded && recent.length">
      <div class="flex items-baseline justify-between gap-3">
        <span class="text-sm text-white/70">
          <b class="text-white tabular-nums">+{{ fmt(thisMonth.n) }}</b> in {{ thisMonth.label }}
        </span>
        <RouterLink
          to="/collection#progress"
          class="text-xs !text-[color:var(--eem-gold)] underline"
          >Progress →</RouterLink
        >
      </div>
      <div
        class="pg-spark"
        role="img"
        :aria-label="`Specimens digitized per month: ${recent.map((m) => `${m.label} ${m.n}`).join(', ')}`"
      >
        <span
          v-for="m in recentPadded"
          :key="m.key"
          :title="m.label ? `${m.label}: ${fmt(m.n)}` : ''"
          :style="{ height: `${m.n ? Math.max(6, (m.n / recentMax) * 100) : 2}%` }"
          :class="{ now: m === thisMonth }"
        />
      </div>
      <div
        v-if="goal"
        class="mt-4"
      >
        <div class="flex justify-between text-xs text-white/70">
          <span>{{ year }} goal</span>
          <span class="tabular-nums"><b class="text-white">{{ fmt(yearDone) }}</b> of {{ fmt(goal) }}</span>
        </div>
        <div class="pg-goal mt-1.5">
          <span :style="{ width: `${Math.min(100, (yearDone / goal) * 100)}%` }" />
        </div>
      </div>
    </template>
  </div>

  <!-- Full: a section of the Holdings page -->
  <section
    v-else
    id="progress"
    class="border-t eem-rule"
  >
    <div class="container mx-auto box-border px-4 py-14">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eem-kicker">Digitization</p>
          <h2 class="eem-display mt-3 text-3xl">Progress, month by month</h2>
          <p class="mt-2 eem-muted max-w-2xl">
            Specimens added to the museum's database each month — every one with its label data, catalog number and
            a place in the online collection.
          </p>
        </div>
        <button
          v-if="p.months.length"
          type="button"
          class="eem-link font-semibold"
          @click="downloadCsv"
        >
          Download (CSV)
        </button>
      </div>

      <p
        v-if="!p.loaded"
        class="mt-8 eem-muted"
      >
        Counting…
      </p>

      <template v-else-if="p.months.length">
        <dl class="pg-stats mt-8">
          <div>
            <dt>{{ thisMonth.label }}</dt>
            <dd>+{{ fmt(thisMonth.n) }}</dd>
          </div>
          <div>
            <dt>In {{ year }}</dt>
            <dd>{{ fmt(yearDone) }}</dd>
          </div>
          <div>
            <dt>{{ goal ? `${year} goal` : 'Monthly average' }}</dt>
            <dd v-if="goal">
              {{ Math.round((yearDone / goal) * 100) }}%
              <span class="pg-dd-note">of {{ fmt(goal) }}</span>
            </dd>
            <dd v-else>{{ fmt(average) }}</dd>
          </div>
          <div>
            <dt>Online in total</dt>
            <dd>{{ fmt(p.total) }}</dd>
          </div>
        </dl>

        <div
          v-if="goal"
          class="mt-5"
        >
          <div class="pg-goal light">
            <span :style="{ width: `${Math.min(100, (yearDone / goal) * 100)}%` }" />
            <i
              :style="{ left: `${Math.min(100, (expected / goal) * 100)}%` }"
              :title="`On pace: ${fmt(expected)} by today`"
            />
          </div>
          <p class="mt-1.5 text-xs eem-muted">
            {{ fmt(yearDone) }} of {{ fmt(goal) }} specimens in {{ year }} ·
            {{ yearDone >= expected ? 'ahead of pace' : `${fmt(expected - yearDone)} behind pace` }} (the tick marks where an even
            pace would be today)
          </p>
        </div>

        <!-- Monthly bars -->
        <div
          class="pg-chart mt-8"
          role="img"
          :aria-label="`Specimens digitized per month: ${shown.map((m) => `${m.label} ${m.n}`).join(', ')}`"
        >
          <div
            v-for="m in shown"
            :key="m.key"
            class="pg-col"
            :title="`${m.label}: ${fmt(m.n)} added · ${fmt(m.total)} in total`"
          >
            <span class="pg-val">{{ m.n ? fmt(m.n) : '' }}</span>
            <span
              class="pg-bar"
              :class="{ now: m === thisMonth }"
              :style="{ height: `${m.n ? Math.max(3, (m.n / shownMax) * 100) : 0}%` }"
            />
            <span class="pg-lab">{{ m.short }}<template v-if="m.short === 'Jan' || m === shown[0]"><br />{{ m.year }}</template></span>
          </div>
        </div>
        <p class="mt-3 text-xs eem-muted">
          Counted by the date each specimen record was created; a large batch entered at once appears in that month.
          <template v-if="p.months.length > shown.length">Showing the last {{ shown.length }} months.</template>
        </p>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { fmt } from './useEem.js'
import { doneIn, goalFor, useProgress } from './useProgress.js'

defineProps({ compact: { type: Boolean, default: false } })

const p = useProgress()
const year = new Date().getFullYear()
const goal = goalFor(year)

const thisMonth = computed(() => p.months[p.months.length - 1] || { n: 0, label: '' })
const recent = computed(() => p.months.slice(-12))
// always twelve slots, empty ones first while there are fewer months
const recentPadded = computed(() => [
  ...Array.from({ length: Math.max(0, 12 - recent.value.length) }, (_, i) => ({ key: `pad-${i}`, n: 0, label: '' })),
  ...recent.value
])
const recentMax = computed(() => Math.max(1, ...recent.value.map((m) => m.n)))
const shown = computed(() => p.months.slice(-24))
const shownMax = computed(() => Math.max(1, ...shown.value.map((m) => m.n)))
const yearDone = computed(() => (p.loaded ? doneIn(year) : 0))
const average = computed(() => (p.months.length ? Math.round(p.total / p.months.length) : 0))
// where an even pace through the year would be today
const expected = computed(() => {
  if (!goal) return 0
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  return Math.round(goal * ((Date.now() - start) / (end - start)))
})

function downloadCsv() {
  const rows = [['month', 'specimens_added', 'total_online'], ...p.months.map((m) => [m.key, m.n, m.total])]
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(',')).join('\r\n')], { type: 'text/csv' }))
  a.download = `EEM_digitization_by_month_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.pg-compact {
  margin-top: 1.4rem;
  padding-top: 1.1rem;
  border-top: 1px solid #2d2d2d;
}
.pg-spark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 2.6rem;
  margin-top: 0.6rem;
}
.pg-spark span {
  flex: 1;
  max-width: 1.4rem;
  min-height: 2px;
  background: rgba(253, 183, 25, 0.45);
  border-radius: 2px 2px 0 0;
}
.pg-spark span.now {
  background: var(--eem-gold);
}
.pg-goal {
  position: relative;
  height: 8px;
  background: #2b2b2b;
  border-radius: 2px;
}
.pg-goal.light {
  height: 12px;
  background: var(--eem-paper-2);
}
.pg-goal span {
  display: block;
  height: 100%;
  background: var(--eem-gold);
  border-radius: 2px;
  transition: width 1s ease;
}
.pg-goal i {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 2px;
  background: var(--eem-ink);
}
.pg-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid var(--eem-rule);
  background: var(--eem-card);
}
.pg-stats > div {
  padding: 1rem 1.2rem;
  border-right: 1px solid var(--eem-rule);
  border-bottom: 1px solid var(--eem-rule);
}
.pg-stats dt {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.pg-stats dd {
  margin-top: 0.4rem;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 2rem;
  font-variant-numeric: tabular-nums;
}
.pg-dd-note {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--eem-ink-soft);
}
.pg-chart {
  display: flex;
  align-items: stretch;
  gap: 4px;
  height: 14rem;
  padding-bottom: 2.2rem;
  border-bottom: 1px solid var(--eem-rule);
}
.pg-col {
  position: relative;
  flex: 1;
  max-width: 4.5rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  min-width: 0;
}
.pg-bar {
  width: 70%;
  max-width: 3rem;
  background: rgba(253, 183, 25, 0.6);
  border-radius: 4px 4px 0 0;
}
.pg-bar.now {
  background: var(--eem-gold);
}
.pg-col:hover .pg-bar {
  background: var(--eem-gold-deep);
}
.pg-val {
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.25rem;
}
.pg-lab {
  position: absolute;
  bottom: -2.1rem;
  font-size: 0.68rem;
  line-height: 1.2;
  text-align: center;
  color: var(--eem-ink-soft);
}
@media (max-width: 640px) {
  .pg-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pg-val {
    display: none;
  }
}
</style>
