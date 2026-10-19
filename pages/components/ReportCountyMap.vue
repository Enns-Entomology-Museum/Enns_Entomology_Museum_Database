<template>
  <figure
    v-if="paths.length"
    class="rc-chart"
  >
    <figcaption class="rc-cap">
      <span class="rc-title">Where this issue's specimens come from</span>
      <span class="rc-sub">{{ withRecords }} of 115 Missouri counties</span>
    </figcaption>
    <div class="rc-row">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        class="rc-svg"
        role="img"
        :aria-label="aria"
      >
        <path
          v-for="p in paths"
          :key="p.key"
          :d="p.d"
          :fill="colorFor(p.n)"
          stroke="#fff"
          stroke-width="0.8"
          stroke-linejoin="round"
        ><title>{{ p.label }}: {{ p.n ? `${fmt(p.n)} specimen${p.n === 1 ? '' : 's'}` : 'none this issue' }}</title></path>
      </svg>
      <div class="rc-side">
        <ul class="rc-legend">
          <li
            v-for="b in legend"
            :key="b.label"
          >
            <i :style="{ background: b.color }" />{{ b.label }}
          </li>
          <li><i :style="{ background: EMPTY }" />none this issue</li>
        </ul>
        <ol
          v-if="top.length"
          class="rc-top"
        >
          <li
            v-for="t in top"
            :key="t.key"
          >
            <span>{{ t.label }}</span><b>{{ fmt(t.n) }}</b>
          </li>
        </ol>
      </div>
    </div>
  </figure>
</template>

<script setup>
import { computed, onMounted, shallowRef } from 'vue'
import { fmt, normCounty } from './useEem.js'

// Missouri counties shaded by the specimens digitized in this issue — drawn as plain SVG
// (prints crisply, no map tiles). Same gold ramp as the county map of the Missouri page.
// counts: { 'boone': 12, 'st. louis': 3, … } (normCounty().toLowerCase())
const props = defineProps({ counts: { type: Object, default: () => ({}) } })

const W = 420
const H = 380
const EMPTY = '#ece8de'
const RAMP = ['#f7e3a6', '#f1b82d', '#c48a0e', '#7a5406']

const geo = shallowRef(null)
onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || '/'
    geo.value = await fetch(`${base}data/mo-counties.json`).then((r) => r.json())
  } catch {
    geo.value = null
  }
})

const keyOf = (name) => normCounty(name).toLowerCase()

// equirectangular projection scaled by cos(latitude) — fine for one state
const paths = computed(() => {
  const fs = geo.value?.features || []
  if (!fs.length) return []
  const rings = (g) => (g.type === 'Polygon' ? g.coordinates : g.coordinates.flat())
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  const k = Math.cos((38.4 * Math.PI) / 180)
  for (const f of fs) for (const ring of rings(f.geometry)) for (const [lon, lat] of ring) {
    minX = Math.min(minX, lon * k); maxX = Math.max(maxX, lon * k); minY = Math.min(minY, lat); maxY = Math.max(maxY, lat)
  }
  const s = Math.min((W - 8) / (maxX - minX), (H - 8) / (maxY - minY))
  const ox = (W - (maxX - minX) * s) / 2
  const oy = (H - (maxY - minY) * s) / 2
  const px = (lon) => (ox + (lon * k - minX) * s).toFixed(1)
  const py = (lat) => (oy + (maxY - lat) * s).toFixed(1)
  return fs.map((f) => {
    const name = f.properties.name
    const key = keyOf(name)
    const d = rings(f.geometry).map((ring) => 'M' + ring.map(([lon, lat]) => `${px(lon)},${py(lat)}`).join('L') + 'Z').join('')
    return { key, d, n: props.counts[key] || 0, label: /city$/i.test(name) ? name : `${name} County` }
  })
})

const max = computed(() => Math.max(1, ...Object.values(props.counts)))
const breaks = computed(() => {
  const m = max.value
  if (m <= 4) return [1, 2, 3, 4].slice(0, m)
  return [1, Math.ceil(m * 0.25), Math.ceil(m * 0.5), Math.ceil(m * 0.75)]
})
const legend = computed(() =>
  breaks.value.map((b, i) => {
    const next = breaks.value[i + 1]
    return { color: RAMP[i], label: next ? (next - 1 > b ? `${b}–${next - 1}` : `${b}`) : `${b}+` }
  })
)
function colorFor(n) {
  if (!n) return EMPTY
  let c = RAMP[0]
  breaks.value.forEach((b, i) => { if (n >= b) c = RAMP[i] })
  return c
}
const withRecords = computed(() => paths.value.filter((p) => p.n).length)
const top = computed(() => paths.value.filter((p) => p.n).sort((a, b) => b.n - a.n).slice(0, 5))
const aria = computed(() => `Missouri counties with specimens digitized this issue: ${top.value.map((t) => `${t.label} ${t.n}`).join(', ')}`)
</script>

<style scoped>
.rc-chart {
  margin: 1.4rem 0 0;
  break-inside: avoid;
}
.rc-cap {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.3rem 1rem;
  font-size: 0.78rem;
  margin-bottom: 0.4rem;
}
.rc-title {
  font-weight: 700;
}
.rc-sub {
  color: #6b665c;
}
.rc-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 1.2rem;
  align-items: center;
}
.rc-svg {
  width: 100%;
  height: auto;
  display: block;
}
.rc-legend {
  display: grid;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #6b665c;
}
.rc-legend li {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.rc-legend i {
  width: 0.9rem;
  height: 0.9rem;
  border: 1px solid #c9c3b6;
}
.rc-top {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.15rem;
  font-size: 0.82rem;
  list-style: decimal;
  padding-left: 1.1rem;
}
.rc-top li span {
  margin-right: 0.4rem;
}
.rc-top b {
  font-variant-numeric: tabular-nums;
}
@media (max-width: 640px) {
  .rc-row {
    grid-template-columns: 1fr;
  }
}
@media print {
  .rc-svg path,
  .rc-legend i {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
