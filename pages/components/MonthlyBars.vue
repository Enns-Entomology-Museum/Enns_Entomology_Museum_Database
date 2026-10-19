<template>
  <figure class="mb-chart">
    <figcaption class="mb-cap">
      <span class="mb-title">Specimens digitized per month</span>
      <span class="mb-key"><span class="mb-sw mb-sw-on" /> this issue <span class="mb-sw" /> earlier months</span>
    </figcaption>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="mb-svg"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- baseline -->
      <line
        :x1="PADX"
        :x2="W - PADX"
        :y1="BASE"
        :y2="BASE"
        stroke="#bdb7aa"
        stroke-width="1"
      />
      <g
        v-for="(m, i) in series"
        :key="m.key"
      >
        <title>{{ m.label }} {{ m.year }}: {{ fmt(m.n) }} specimens</title>
        <!-- hit area (taller than the bar) -->
        <rect
          :x="x(i)"
          :y="TOP"
          :width="bw"
          :height="BASE - TOP + 22"
          fill="transparent"
        />
        <path
          v-if="m.n > 0"
          :d="bar(i, m.n)"
          :fill="m.inIssue ? GOLD : GREY"
        />
        <!-- value: on the months of the issue, and on the highest month -->
        <text
          v-if="m.n > 0 && (m.inIssue || m.n === max)"
          :x="x(i) + bw / 2"
          :y="y(m.n) - 5"
          text-anchor="middle"
          class="mb-val"
          :class="{ 'mb-val-on': m.inIssue }"
        >{{ short(m.n) }}</text>
        <text
          :x="x(i) + bw / 2"
          :y="BASE + 14"
          text-anchor="middle"
          class="mb-month"
          :class="{ 'mb-month-on': m.inIssue }"
        >{{ m.label }}</text>
        <text
          v-if="i === 0 || m.month === 1"
          :x="x(i) + bw / 2"
          :y="BASE + 27"
          text-anchor="middle"
          class="mb-year"
        >{{ m.year }}</text>
      </g>
    </svg>
    <p class="mb-note">
      {{ fmt(total) }} specimens in the last {{ series.length }} months
      <template v-if="best"> · busiest month: {{ best.label }} {{ best.year }} ({{ fmt(best.n) }})</template>
    </p>
  </figure>
</template>

<script setup>
import { computed } from 'vue'
import { fmt } from './useEem.js'

// Bars: specimens digitized in each of the last 12 months; the months of the issue in
// a deeper Mizzou gold (#c99412, readable on white), the earlier months in grey. One series, one axis, values only on the
// months of the issue (and on the highest bar). Hover a bar for its number.
const props = defineProps({ series: { type: Array, default: () => [] } })

const W = 640
const H = 190
const PADX = 6
const TOP = 18
const BASE = H - 34
const GOLD = '#c99412'
const GREY = '#d6d2c8'

const max = computed(() => Math.max(1, ...props.series.map((m) => m.n)))
const step = computed(() => (W - PADX * 2) / Math.max(1, props.series.length))
const bw = computed(() => Math.min(40, step.value - 6))
const x = (i) => PADX + i * step.value + (step.value - bw.value) / 2
const y = (n) => BASE - (n / max.value) * (BASE - TOP - 10)

// bar with 3px rounded top corners, square at the baseline
function bar(i, n) {
  const x0 = x(i)
  const w = bw.value
  const top = y(n)
  const r = Math.min(3, w / 2, BASE - top)
  return `M${x0},${BASE}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + w - r}Q${x0 + w},${top} ${x0 + w},${top + r}V${BASE}Z`
}

const short = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n))
const total = computed(() => props.series.reduce((s, m) => s + m.n, 0))
const best = computed(() => (total.value ? props.series.reduce((a, b) => (b.n > a.n ? b : a)) : null))
const ariaLabel = computed(() => `Specimens digitized per month: ${props.series.map((m) => `${m.label} ${m.year} ${m.n}`).join(', ')}`)
</script>

<style scoped>
.mb-chart {
  margin: 1.4rem 0 0;
}
.mb-cap {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.4rem 1rem;
  font-size: 0.78rem;
  margin-bottom: 0.4rem;
}
.mb-title {
  font-weight: 700;
}
.mb-key {
  color: #6b665c;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.mb-sw {
  display: inline-block;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 2px;
  background: #d6d2c8;
  margin-left: 0.4rem;
}
.mb-sw-on {
  background: #c99412;
  margin-left: 0;
}
.mb-svg {
  width: 100%;
  height: auto;
  display: block;
}
.mb-val {
  font: 600 11px 'Inter', system-ui, sans-serif;
  fill: #6b665c;
  font-variant-numeric: tabular-nums;
}
.mb-val-on {
  fill: #111;
  font-weight: 800;
}
.mb-month {
  font: 500 11px 'Inter', system-ui, sans-serif;
  fill: #6b665c;
}
.mb-month-on {
  fill: #111;
  font-weight: 800;
}
.mb-year {
  font: 500 9.5px 'Inter', system-ui, sans-serif;
  fill: #9a9488;
}
.mb-note {
  margin-top: 0.3rem;
  font-size: 0.78rem;
  color: #6b665c;
}
@media print {
  .mb-svg path,
  .mb-sw {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .mb-chart {
    break-inside: avoid;
  }
}
</style>
