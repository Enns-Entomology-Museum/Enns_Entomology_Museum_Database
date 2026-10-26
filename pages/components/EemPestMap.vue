<template>
  <div class="eem-pmap-wrap">
    <div
      ref="el"
      class="eem-pmap"
      :style="{ height }"
      role="img"
      :aria-label="label"
    />
    <ul
      class="eem-pmap-legend"
      aria-hidden="true"
    >
      <template v-if="species">
        <li
          v-for="k in KINDS"
          :key="k.key"
        >
          <i :style="{ background: palette[k.key] }" />{{ k.label }}
          <span class="tabular-nums eem-muted">{{ kindCounts[k.key] }}</span>
        </li>
        <li v-if="mixedCount">
          <i :style="{ background: `repeating-linear-gradient(45deg, ${palette.museum} 0 4px, ${palette.other} 4px 8px)` }" />Several kinds of
          record <span class="tabular-nums eem-muted">{{ mixedCount }}</span>
        </li>
        <li><i :style="{ background: EMPTY_C }" />No record yet</li>
        <li v-if="pinned.length">
          <b class="eem-pmap-dot" />Enns Museum specimen, exact locality <span class="tabular-nums eem-muted">{{ pinned.length }}</span>
        </li>
      </template>
      <template v-else>
        <li><i :style="{ background: EMPTY_C }" />None yet</li>
        <li
          v-for="b in legend"
          :key="b.label"
        >
          <i :style="{ background: b.color }" />{{ b.label }}
        </li>
      </template>
    </ul>
  </div>
</template>

<script setup>
// Missouri county map for the Pests & invasives page.
//  • one species: each county coloured by its strongest kind of record
//    (Enns Museum specimen > reported in the literature or a survey > GBIF or iNaturalist)
//  • no species: counties shaded by how many tracked species are recorded there
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { countyKey, evidenceOf } from './usePests.js'

const props = defineProps({
  species: { type: Object, default: null },
  all: { type: Array, default: () => [] },
  height: { type: String, default: '520px' }
})
const emit = defineEmits(['select'])

const KINDS = [
  { key: 'museum', label: 'Enns Museum specimen' },
  { key: 'reported', label: 'Reported (publication or survey)' },
  { key: 'other', label: 'GBIF or iNaturalist records' }
]
// Categorical slots, validated for colour-vision deficiency in light and dark
const LIGHT = { museum: '#c48a0e', reported: '#2a78d6', other: '#1baf7a' }
const DARK = { museum: '#b8860b', reported: '#3987e5', other: '#199e70' }
const EMPTY_LIGHT = '#ece8de'
const EMPTY_DARK = '#2c2b27'
const RAMP = ['#f7e3a6', '#f1b82d', '#c48a0e', '#7a5406']

const el = ref(null)
const isDark = ref(false)
const palette = computed(() => (isDark.value ? DARK : LIGHT))
const EMPTY_C = computed(() => (isDark.value ? EMPTY_DARK : EMPTY_LIGHT))
let L = null
let map = null
let layer = null
let pins = null
const router = useRouter()
let geo = null
let observer = null

const kindCounts = computed(() => {
  const c = { museum: 0, reported: 0, other: 0 }
  Object.values(props.species?.records || {}).forEach((r) => {
    if (r.museum) c.museum++
    if (r.reported.length) c.reported++
    if (r.gbif || r.inat) c.other++
  })
  return c
})

// All kinds of record in a county, strongest first (museum > reported > other)
function kindsOf(r) {
  if (!r) return []
  return [r.museum && 'museum', r.reported.length && 'reported', (r.gbif || r.inat) && 'other'].filter(Boolean)
}
const mixedCount = computed(() => Object.values(props.species?.records || {}).filter((r) => kindsOf(r).length > 1).length)

// Striped SVG patterns for counties with several kinds of record
function ensurePatterns() {
  const svg = el.value?.querySelector('.leaflet-overlay-pane svg')
  if (!svg) return
  let defs = svg.querySelector('defs#eem-mix')
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    defs.id = 'eem-mix'
    svg.prepend(defs)
  }
  const combos = [
    ['museum', 'reported'],
    ['museum', 'other'],
    ['reported', 'other'],
    ['museum', 'reported', 'other']
  ]
  defs.innerHTML = combos
    .map((ks) => {
      const w = 5
      const bands = ks.map((k, i) => `<rect x="${i * w}" y="0" width="${w}" height="${w * ks.length}" fill="${palette.value[k]}"/>`).join('')
      return `<pattern id="eem-mix-${ks.join('-')}" patternUnits="userSpaceOnUse" width="${w * ks.length}" height="${w * ks.length}" patternTransform="rotate(45)">${bands}</pattern>`
    })
    .join('')
}

// overview: number of species per county
const speciesPerCounty = computed(() => {
  const c = {}
  props.all.forEach((sp) => Object.keys(sp.records).forEach((k) => (c[k] = (c[k] || 0) + 1)))
  return c
})
const max = computed(() => Math.max(1, ...Object.values(speciesPerCounty.value)))
const breaks = computed(() => {
  const m = max.value
  if (m <= 4) return [1, 2, 3, 4].slice(0, m)
  return [1, Math.ceil(m * 0.25), Math.ceil(m * 0.5), Math.ceil(m * 0.75)]
})
const legend = computed(() =>
  breaks.value.map((b, i) => {
    const next = breaks.value[i + 1]
    const range = next ? (next - 1 > b ? `${b}–${next - 1}` : `${b}`) : `${b}+`
    return { color: RAMP[i], label: `${range} species` }
  })
)
const rampColor = (n) => {
  if (!n) return EMPTY_C.value
  let c = RAMP[0]
  breaks.value.forEach((b, i) => n >= b && (c = RAMP[i]))
  return c
}

const label = computed(() =>
  props.species
    ? `Map of Missouri counties with records of ${props.species.name}`
    : 'Map of Missouri counties shaded by the number of tracked pest and invasive species recorded'
)

const nice = (name) => (/city$/i.test(name) ? name : `${name} County`)

function tooltip(name, key) {
  if (!props.species) {
    const n = speciesPerCounty.value[key] || 0
    const list = props.all.filter((sp) => sp.records[key]).map((sp) => sp.common || sp.name)
    return `<b>${nice(name)}</b><br>${n ? `${n} species: ${list.slice(0, 6).join(', ')}${list.length > 6 ? '…' : ''}` : 'No records yet'}`
  }
  const r = props.species.records[key]
  if (!r) return `<b>${nice(name)}</b><br>No record yet`
  const lines = []
  if (r.museum) lines.push(`${r.museum} museum specimen${r.museum === 1 ? '' : 's'}`)
  if (r.reported.length) lines.push(`Reported${r.reported.some((x) => x.year) ? ` (${Math.min(...r.reported.filter((x) => x.year).map((x) => x.year))})` : ''}`)
  if (r.gbif) lines.push(`${r.gbif} GBIF record${r.gbif === 1 ? '' : 's'}`)
  if (r.inat) lines.push(`${r.inat} iNaturalist observation${r.inat === 1 ? '' : 's'}`)
  if (r.firstYear) lines.push(`First record: ${r.firstYear}`)
  return `<b>${nice(name)}</b><br>${lines.join('<br>')}`
}

function fillFor(key) {
  if (!props.species) return rampColor(speciesPerCounty.value[key] || 0)
  const kinds = kindsOf(props.species.records[key])
  if (kinds.length > 1) return `url(#eem-mix-${kinds.join('-')})`
  const kind = evidenceOf(props.species.records[key])
  return kind ? palette.value[kind] : EMPTY_C.value
}

// Enns Museum specimens with coordinates → one dot per locality (several specimens can share it)
const pinned = computed(() => (props.species?.specimens || []).filter((s) => s.lat != null && s.lng != null))
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function drawPins() {
  if (pins) pins.remove()
  pins = null
  if (!map || !L || !pinned.value.length) return
  const groups = new Map()
  pinned.value.forEach((s) => {
    const k = `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(s)
  })
  pins = L.layerGroup()
  groups.forEach((list) => {
    const { lat, lng } = list[0]
    const m = L.circleMarker([lat, lng], {
      radius: list.length > 1 ? 4.5 : 3.5,
      color: '#fff',
      weight: 1.5,
      fillColor: '#d62828',
      fillOpacity: 1
    })
    const rows = list
      .map((s) => `<b>${esc(s.cat)}</b>${s.type ? ` · ${esc(s.type)}` : ''}<br><span>${esc(s.date)}${s.by ? ` · ${esc(s.by)}` : ''}</span>`)
      .join('<br>')
    m.bindTooltip(`${list.length > 1 ? `<b>${list.length} Enns Museum specimens</b><br>` : ''}${rows}<br><em>Click to open ${list.length > 1 ? 'the first' : 'the specimen'}</em>`)
    m.on('click', () => router.push({ path: '/specimen', query: { cat: list[0].cat } }))
    pins.addLayer(m)
  })
  pins.addTo(map)
}

function draw(fit = false) {
  if (!map || !L || !geo) return
  if (layer) layer.remove()
  ensurePatterns()
  layer = L.geoJSON(geo, {
    style: (f) => ({
      color: isDark.value ? '#55524b' : '#8a8478',
      weight: 0.7,
      fillColor: fillFor(countyKey(f.properties.name)),
      fillOpacity: 0.92
    }),
    onEachFeature: (f, lyr) => {
      const key = countyKey(f.properties.name)
      lyr.bindTooltip(() => tooltip(f.properties.name, key), { sticky: true })
      lyr.on({
        mouseover: () => lyr.setStyle({ weight: 2.2, color: isDark.value ? '#fff' : '#000' }),
        mouseout: () => layer.resetStyle(lyr),
        click: () => emit('select', { name: nice(f.properties.name), key })
      })
    }
  }).addTo(map)
  ensurePatterns() // the overlay SVG exists only after the first layer is added
  if (fit) map.fitBounds(layer.getBounds(), { padding: [10, 10] })
  drawPins()
}

onMounted(async () => {
  isDark.value = document.documentElement.classList.contains('dark')
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = mod.default || mod
  map = L.map(el.value, { scrollWheelZoom: false, zoomSnap: 0.25 }).setView([38.4, -92.4], 6)
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri · Counties: US Census · Records: TaxonWorks, GBIF, iNaturalist', maxZoom: 12, opacity: 0.6 }
  ).addTo(map)
  const base = import.meta.env.BASE_URL || '/'
  geo = await fetch(`${base}data/mo-counties.json`).then((r) => r.json())
  draw(true)
})

// redraw when records arrive (iNaturalist fills in over time) or the species changes
watch(
  () => [
    props.species,
    isDark.value,
    JSON.stringify(props.species ? props.species.records : speciesPerCounty.value),
    pinned.value.length
  ],
  () => draw()
)

onBeforeUnmount(() => {
  observer?.disconnect()
  if (map) map.remove()
})
</script>

<style scoped>
.eem-pmap {
  width: 100%;
  background: var(--eem-paper);
  z-index: 0;
}
@media (max-width: 640px) {
  .eem-pmap {
    height: 340px !important;
  }
}
.eem-pmap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.1rem;
  margin-top: 0.75rem;
  padding: 0 0.25rem;
  font-size: 0.78rem;
  color: var(--eem-ink-soft);
}
.eem-pmap-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.eem-pmap-dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 999px;
  background: #d62828;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px #8a8478;
}
.eem-pmap-legend i {
  width: 0.9rem;
  height: 0.9rem;
  border: 1px solid #8a8478;
}
</style>
