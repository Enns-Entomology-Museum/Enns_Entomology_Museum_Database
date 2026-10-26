<template>
  <div class="eem-cmap-wrap">
    <div
      ref="el"
      class="eem-cmap"
      :style="{ height }"
      role="region"
      :aria-label="label"
    />
    <div
      class="eem-cmap-legend"
      aria-hidden="true"
    >
      <span class="eem-cmap-legend-item"><i :style="{ background: EMPTY }" />None yet</span>
      <span
        v-for="b in legend"
        :key="b.label"
        class="eem-cmap-legend-item"
        ><i :style="{ background: b.color }" />{{ b.label }}</span
      >
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // { 'boone': 8, 'st. louis': 1, ... } keys as returned by normCounty()
  counts: { type: Object, default: () => ({}) },
  height: { type: String, default: '520px' },
  label: { type: String, default: 'Map of Missouri counties shaded by number of digitized specimens' }
})
const emit = defineEmits(['select'])

const EMPTY = '#ece8de'
const RAMP = ['#f7e3a6', '#fdb719', '#c48a0e', '#7a5406']

const el = ref(null)
let L = null
let map = null
let layer = null
let geo = null

const max = computed(() => Math.max(1, ...Object.values(props.counts)))

// Four equal-ish steps up to the maximum
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
  breaks.value.forEach((b, i) => {
    if (n >= b) c = RAMP[i]
  })
  return c
}

const keyOf = (name) =>
  String(name)
    .toLowerCase()
    .replace(/^st\.? /, 'st. ')

function draw() {
  if (!map || !L || !geo) return
  if (layer) layer.remove()
  layer = L.geoJSON(geo, {
    style: (f) => {
      const n = props.counts[keyOf(f.properties.name)] || 0
      return { color: '#8a8478', weight: 0.7, fillColor: colorFor(n), fillOpacity: 0.92 }
    },
    onEachFeature: (f, lyr) => {
      const n = props.counts[keyOf(f.properties.name)] || 0
      const name = /city$/i.test(f.properties.name) ? f.properties.name : `${f.properties.name} County`
      lyr.bindTooltip(`<b>${name}</b><br>${n ? `${n} specimen${n === 1 ? '' : 's'}` : 'No specimens yet'}`, {
        sticky: true
      })
      lyr.on({
        mouseover: () => lyr.setStyle({ weight: 2.2, color: '#000' }),
        mouseout: () => layer.resetStyle(lyr),
        click: () => emit('select', { name: f.properties.name, key: keyOf(f.properties.name), n })
      })
    }
  }).addTo(map)
  map.fitBounds(layer.getBounds(), { padding: [10, 10] })
}

onMounted(async () => {
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = mod.default || mod
  map = L.map(el.value, { scrollWheelZoom: false, zoomSnap: 0.25, attributionControl: true }).setView([38.4, -92.4], 6)
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri · Counties: US Census', maxZoom: 12, opacity: 0.6 }
  ).addTo(map)
  const base = import.meta.env.BASE_URL || '/'
  geo = await fetch(`${base}data/mo-counties.json`).then((r) => r.json())
  draw()
})

watch(() => props.counts, draw, { deep: true })

onBeforeUnmount(() => {
  if (map) map.remove()
})
</script>

<style scoped>
.eem-cmap {
  width: 100%;
  background: var(--eem-paper);
  z-index: 0;
}
.eem-cmap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin-top: 0.75rem;
  font-size: 0.78rem;
  color: var(--eem-ink-soft);
}
.eem-cmap-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.eem-cmap-legend-item i {
  width: 0.9rem;
  height: 0.9rem;
  border: 1px solid #8a8478;
}
</style>
