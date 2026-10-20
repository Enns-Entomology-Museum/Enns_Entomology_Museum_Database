<template>
  <div
    ref="el"
    class="eem-map"
    :style="{ height }"
    role="img"
    :aria-label="label"
  />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // [{ lat, lng, title, html }]
  points: { type: Array, default: () => [] },
  height: { type: String, default: '420px' },
  label: { type: String, default: 'Map of collecting localities' },
  zoom: { type: Number, default: 4 },
  // zoom used when there is a single point
  pointZoom: { type: Number, default: 8 },
  // a fixed, non-interactive map (e.g. a small locator inset)
  still: { type: Boolean, default: false }
})

const el = ref(null)
let L = null
let map = null
let layer = null

function draw() {
  if (!map || !L) return
  if (layer) layer.remove()
  layer = L.layerGroup()
  const bounds = []
  props.points.forEach((p) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return
    const m = L.circleMarker([p.lat, p.lng], {
      radius: 6,
      color: '#000',
      weight: 1.5,
      fillColor: '#F1B82D',
      fillOpacity: 0.9
    })
    if (p.html) m.bindPopup(p.html)
    m.addTo(layer)
    bounds.push([p.lat, p.lng])
  })
  layer.addTo(map)
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 })
  else if (bounds.length === 1) map.setView(bounds[0], props.pointZoom)
}

onMounted(async () => {
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = mod.default || mod
  const still = props.still
    ? { dragging: false, zoomControl: false, attributionControl: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false }
    : { zoomControl: true }
  map = L.map(el.value, { scrollWheelZoom: false, ...still }).setView([38.6, -92.4], props.zoom)
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri — Esri, DeLorme, NAVTEQ', maxZoom: 16 }
  ).addTo(map)
  draw()
})

watch(() => props.points, draw, { deep: false })

onBeforeUnmount(() => {
  if (map) map.remove()
})
</script>

<style scoped>
.eem-map {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
  z-index: 0;
  background: var(--eem-paper-2);
}
</style>
