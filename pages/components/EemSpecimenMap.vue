<template>
  <div class="eem-smap">
    <div class="eem-smap-frame">
      <div
        ref="el"
        class="eem-smap-map"
        :style="{ height }"
        role="img"
        :aria-label="`Map of the collecting locality of ${rec.catalogNumber}`"
      />

      <!-- Base map -->
      <div
        class="eem-smap-layers"
        role="group"
        aria-label="Base map"
      >
        <button
          v-for="b in BASES"
          :key="b.key"
          type="button"
          :class="{ on: base === b.key }"
          :aria-pressed="base === b.key"
          @click="base = b.key"
        >
          {{ b.label }}
        </button>
      </div>

      <!-- Zoom presets -->
      <div
        class="eem-smap-zoom"
        role="group"
        aria-label="Zoom"
      >
        <button
          type="button"
          :class="{ on: view === 'locality' }"
          @click="setView('locality')"
        >
          Locality
        </button>
        <button
          type="button"
          :class="{ on: view === 'region' }"
          @click="setView('region')"
        >
          Region
        </button>
        <button
          v-if="others.length"
          type="button"
          :class="{ on: view === 'species' }"
          @click="setView('species')"
        >
          All {{ others.length + 1 }}
        </button>
      </div>
    </div>

    <!-- Legend + georeference -->
    <div class="eem-smap-info">
      <p
        v-if="labelLocality"
        class="eem-smap-label"
      >
        <span class="k">On the label</span>
        <span class="v">“{{ labelLocality }}”</span>
      </p>
      <p
        v-if="precisionNote"
        :class="['eem-smap-flag', precisionNote.level]"
        role="note"
      >
        {{ precisionNote.text }}
      </p>

      <ul class="eem-smap-legend">
        <li><b :class="['sw me', { type: isType }]" />This specimen</li>
        <li v-if="uncertainty"><b class="sw circle" />Uncertainty ± {{ fmtM(uncertainty) }}</li>
        <li v-if="others.length">
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              v-model="showOthers"
              type="checkbox"
            />
            <b class="sw other" />Other EEM specimens of <em>{{ speciesName }}</em> ({{ others.length }})
          </label>
        </li>
        <li v-if="gbifKey">
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              v-model="showGbif"
              type="checkbox"
            />
            <b class="sw gbif" />GBIF records of the species{{ gbifCount ? ` (${gbifCount.toLocaleString('en-US')})` : '' }}
          </label>
          <a
            :href="`https://www.gbif.org/occurrence/search?taxon_key=${gbifKey}&view=MAP`"
            target="_blank"
            rel="noopener"
            class="eem-link text-xs ml-1"
            >map ↗</a
          >
        </li>
      </ul>
      <p
        v-if="gbifKey && showGbif"
        class="mt-1 text-xs eem-muted"
      >
        Shaded hexagons: records from all collections and research-grade iNaturalist observations shared with GBIF.
      </p>

      <p class="eem-smap-geo">
        <span class="mono">{{ lat.toFixed(5) }}, {{ lng.toFixed(5) }}</span>
        <template v-if="rec.georeferencedBy">
          · georeferenced by {{ rec.georeferencedBy }}{{ georefYear ? `, ${georefYear}` : '' }}
        </template>
      </p>
      <p class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
        <button
          type="button"
          class="eem-link"
          @click="copyCoords"
        >
          {{ copied ? 'Copied ✓' : 'Copy coordinates' }}
        </button>
        <a
          :href="`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`"
          target="_blank"
          rel="noopener"
          class="eem-link"
          >Google Maps ↗</a
        >
        <a
          :href="`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`"
          target="_blank"
          rel="noopener"
          class="eem-link"
          >OpenStreetMap ↗</a
        >
      </p>
    </div>
  </div>
</template>

<script setup>
// Map for one specimen:
//  • terrain / satellite / plain base maps (streams and habitat matter for the locality)
//  • the georeference uncertainty as a circle
//  • other Enns Museum specimens of the same species, each linking to its page
//  • quick zooms: locality, region, all specimens of the species
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { makeAPIRequest } from '@/utils/request'

const props = defineProps({
  rec: { type: Object, required: true },
  isType: { type: Boolean, default: false },
  height: { type: String, default: '340px' }
})

const BASES = [
  { key: 'terrain', label: 'Terrain', url: 'World_Topo_Map/MapServer' },
  { key: 'satellite', label: 'Satellite', url: 'World_Imagery/MapServer' },
  { key: 'plain', label: 'Plain', url: 'Canvas/World_Light_Gray_Base/MapServer' }
]

const router = useRouter()
const el = ref(null)
const base = ref('terrain')
const view = ref('locality')
const showOthers = ref(true)
const others = ref([])
const copied = ref(false)
const showGbif = ref(true)
const gbifKey = ref(null)
const gbifCount = ref(0)
let gbifLayer = null
let L = null
let map = null
let tiles = null
let layerMe = null
let layerOthers = null

const lat = computed(() => Number(props.rec.decimalLatitude))
const lng = computed(() => Number(props.rec.decimalLongitude))
const uncertainty = computed(() => Number(props.rec.coordinateUncertaintyInMeters) || 0)
const georefYear = computed(() => String(props.rec.georeferencedDate || '').slice(0, 4))
// What the label says, to compare with the georeference
const labelLocality = computed(() => {
  const v = props.rec.verbatimLocality || ''
  if (v) return v
  return String(props.rec.verbatimLabel || '')
    .split('\n')
    .slice(0, 2)
    .join(', ')
})

// Warn when the point is only approximate
const precisionNote = computed(() => {
  const u = uncertainty.value
  if (!u) return { level: 'info', text: 'Uncertainty not recorded: treat the point as approximate.' }
  if (u > 10000)
    return {
      level: 'warn',
      text: `Approximate locality: the point could be anywhere within ${fmtM(u)} — probably a town or county centre rather than the exact collecting site.`
    }
  return null
})

const speciesName = computed(() => [props.rec.genus, props.rec.specificEpithet].filter(Boolean).join(' '))

const fmtM = (m) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.round(m)} m`)
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

async function loadOthers() {
  others.value = []
  if (!props.rec.genus || !props.rec.specificEpithet) return
  try {
    const { data } = await makeAPIRequest.get('/dwc_occurrences.json', {
      params: { genus: props.rec.genus, specificEpithet: props.rec.specificEpithet, per: 500 }
    })
    others.value = (Array.isArray(data) ? data : []).filter(
      (r) =>
        r.catalogNumber !== props.rec.catalogNumber &&
        r.decimalLatitude &&
        r.decimalLongitude &&
        Number.isFinite(Number(r.decimalLatitude)) &&
        Number.isFinite(Number(r.decimalLongitude))
    )
  } catch {
    /* the map works without them */
  }
}

async function loadGbif() {
  gbifKey.value = null
  gbifCount.value = 0
  if (!speciesName.value.includes(' ')) return
  try {
    const m = await fetch(`https://api.gbif.org/v1/species/match?${new URLSearchParams({ name: speciesName.value })}`).then((r) => r.json())
    if (!m.usageKey || m.matchType === 'NONE' || !['SPECIES', 'SUBSPECIES'].includes(m.rank)) return
    gbifKey.value = m.usageKey
    const c = await fetch(`https://api.gbif.org/v1/occurrence/search?taxonKey=${m.usageKey}&hasCoordinate=true&limit=0`).then((r) => r.json())
    gbifCount.value = c.count || 0
  } catch {
    /* GBIF unreachable: no background layer */
  }
}

function drawGbif() {
  if (gbifLayer) gbifLayer.remove()
  gbifLayer = null
  if (!showGbif.value || !gbifKey.value) return
  const q = new URLSearchParams({ srs: 'EPSG:3857', taxonKey: gbifKey.value, bin: 'hex', hexPerTile: 45, style: 'classic-noborder.poly' })
  gbifLayer = L.tileLayer(`https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?${q}`, {
    opacity: 0.55,
    zIndex: 5,
    attribution: 'Records &copy; GBIF'
  }).addTo(map)
}

function setTiles() {
  if (tiles) tiles.remove()
  const b = BASES.find((x) => x.key === base.value)
  tiles = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/${b.url}/tile/{z}/{y}/{x}`, {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 17
  }).addTo(map)
}

function drawMe() {
  if (layerMe) layerMe.remove()
  layerMe = L.layerGroup()
  if (uncertainty.value) {
    L.circle([lat.value, lng.value], {
      radius: uncertainty.value,
      color: '#f1b82d',
      weight: 2,
      dashArray: '5 5',
      fillColor: '#f1b82d',
      fillOpacity: 0.12,
      interactive: false
    }).addTo(layerMe)
  }
  L.circleMarker([lat.value, lng.value], {
    radius: 7,
    color: '#fff',
    weight: 2.5,
    fillColor: props.isType ? '#be2828' : '#111',
    fillOpacity: 1
  })
    .bindTooltip(`<b>${esc(props.rec.catalogNumber)}</b> — this specimen${labelLocality.value ? `<br>“${esc(labelLocality.value)}”` : ''}`, {
      direction: 'top',
      offset: [0, -6]
    })
    .addTo(layerMe)
  layerMe.addTo(map)
}

function drawOthers() {
  if (layerOthers) layerOthers.remove()
  layerOthers = null
  if (!showOthers.value || !others.value.length) return
  layerOthers = L.layerGroup()
  // one dot per locality
  const groups = new Map()
  others.value.forEach((r) => {
    const k = `${Number(r.decimalLatitude).toFixed(4)},${Number(r.decimalLongitude).toFixed(4)}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(r)
  })
  groups.forEach((list) => {
    const r0 = list[0]
    const m = L.circleMarker([Number(r0.decimalLatitude), Number(r0.decimalLongitude)], {
      radius: list.length > 1 ? 6 : 4.5,
      color: '#fff',
      weight: 1.5,
      fillColor: '#f1b82d',
      fillOpacity: 1
    })
    const place = [r0.county ? `${r0.county} Co.` : '', r0.stateProvince, r0.country === 'United States' ? 'USA' : r0.country].filter(Boolean).join(', ')
    m.bindTooltip(
      `<b>${list.length} specimen${list.length === 1 ? '' : 's'}</b>${place ? ` · ${esc(place)}` : ''}<br>${list
        .slice(0, 4)
        .map((x) => `${esc(x.catalogNumber)}${x.eventDate ? ` · ${esc(String(x.eventDate).slice(0, 4))}` : ''}`)
        .join('<br>')}${list.length > 4 ? '<br>…' : ''}<br><em>Click to open</em>`,
      { direction: 'top', offset: [0, -5] }
    )
    m.on('click', () => router.push({ path: '/specimen', query: { cat: r0.catalogNumber } }))
    m.addTo(layerOthers)
  })
  layerOthers.addTo(map)
  layerMe?.eachLayer((l) => l.bringToFront?.())
}

function setView(v, animate = true) {
  view.value = v
  if (!map) return
  const here = L.latLng(lat.value, lng.value)
  const opt = { animate, duration: 0.6 }
  if (v === 'region') return animate ? map.flyTo(here, 6, opt) : map.setView(here, 6)
  if (v === 'species' && others.value.length) {
    const b = L.latLngBounds([here, ...others.value.map((r) => [Number(r.decimalLatitude), Number(r.decimalLongitude)])])
    return animate ? map.flyToBounds(b, { padding: [30, 30], maxZoom: 10, ...opt }) : map.fitBounds(b, { padding: [30, 30], maxZoom: 10 })
  }
  // locality: show the whole uncertainty circle, never closer than street level
  const r = Math.max(uncertainty.value, 300)
  const b = here.toBounds(r * 2.4)
  return animate ? map.flyToBounds(b, { maxZoom: 15, ...opt }) : map.fitBounds(b, { maxZoom: 15 })
}

function copyCoords() {
  navigator.clipboard?.writeText(`${lat.value.toFixed(6)}, ${lng.value.toFixed(6)}`).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  })
}

onMounted(async () => {
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = mod.default || mod
  map = L.map(el.value, { scrollWheelZoom: false, zoomControl: true }).setView([lat.value, lng.value], 10)
  setTiles()
  drawMe()
  setView('locality', false)
  await Promise.all([loadOthers(), loadGbif()])
  drawOthers()
  drawGbif()
})

watch(base, () => map && setTiles())
watch(showOthers, () => map && drawOthers())
watch(showGbif, () => map && drawGbif())
watch(
  () => props.rec.catalogNumber,
  async () => {
    if (!map) return
    drawMe()
    setView('locality', false)
    await Promise.all([loadOthers(), loadGbif()])
    drawOthers()
    drawGbif()
  }
)

onBeforeUnmount(() => map && map.remove())
</script>

<style scoped>
.eem-smap-frame {
  position: relative;
}
.eem-smap-map {
  width: 100%;
  z-index: 0;
  background: var(--eem-paper-2);
}
.eem-smap-layers,
.eem-smap-zoom {
  position: absolute;
  z-index: 500;
  display: flex;
  background: #000;
  border: 1px solid #000;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}
.eem-smap-layers {
  top: 10px;
  right: 10px;
}
.eem-smap-zoom {
  bottom: 22px;
  left: 10px;
}
.eem-smap-layers button,
.eem-smap-zoom button {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  color: #fff;
}
.eem-smap-layers button.on,
.eem-smap-zoom button.on {
  background: var(--eem-gold);
  color: #000;
}
.eem-smap-info {
  padding: 0.6rem 0.5rem 0.3rem;
}
.eem-smap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  font-size: 0.78rem;
}
.eem-smap-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.eem-smap-legend .sw {
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
}
.eem-smap-legend .sw.me {
  background: #111;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #888;
}
.eem-smap-legend .sw.me.type {
  background: #be2828;
}
.eem-smap-legend .sw.other {
  background: #f1b82d;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px #888;
}
.eem-smap-legend .sw.circle {
  border: 2px dashed #c48a0e;
  background: rgba(241, 184, 45, 0.15);
}
.eem-smap-label {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.6rem;
  align-items: baseline;
  margin-bottom: 0.6rem;
  font-size: 0.85rem;
}
.eem-smap-label .k {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.eem-smap-label .v {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
}
.eem-smap-flag {
  margin-bottom: 0.6rem;
  padding: 0.45rem 0.7rem;
  font-size: 0.78rem;
  border-left: 4px solid var(--eem-gold);
  background: color-mix(in srgb, var(--eem-gold) 12%, transparent);
}
.eem-smap-flag.info {
  border-left-color: var(--eem-rule);
  background: var(--eem-paper-2);
}
.eem-smap-legend .sw.gbif {
  border-radius: 2px;
  background: linear-gradient(135deg, #f7e3a6, #e08a2f 60%, #b02a1a);
}
.eem-smap-geo {
  margin-top: 0.5rem;
  font-size: 0.78rem;
  color: var(--eem-ink-soft);
}
.mono {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  color: var(--eem-ink);
}
</style>
