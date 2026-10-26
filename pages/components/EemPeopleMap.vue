<template>
  <div>
    <div
      ref="el"
      class="eem-pplmap"
      :style="{ height }"
      role="region"
      :aria-label="`Map of where the ${people.length} members of the museum community are based`"
    />
    <ul
      class="eem-pplmap-legend"
      aria-label="Map legend"
    >
      <li
        v-for="g in legend"
        :key="g.key"
      >
        <i :class="{ hollow: !g.color }" :style="g.color ? { background: g.color } : {}" />{{ g.label }}
      </li>
      <li class="eem-muted">Larger dot = more people in that place</li>
    </ul>
  </div>
</template>

<script setup>
// Where the museum community is based: one dot per place, sized by the number of
// people there, coloured by group (team, students, collaborators; former staff hollow).
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // [{ name, lat, lng, city, country, group, role }]
  people: { type: Array, default: () => [] },
  // [{ key, label }] in display order
  groups: { type: Array, default: () => [] },
  height: { type: String, default: '520px' }
})

// Three categorical slots, validated for colour-vision deficiency (light / dark)
const LIGHT = { team: '#2a78d6', students: '#eb6834', collab: '#1baf7a' }
const DARK = { team: '#3987e5', students: '#d95926', collab: '#199e70' }

const el = ref(null)
const isDark = ref(false)
let L = null
let map = null
let tiles = null
let layer = null
let observer = null

const colorOf = (g) => (isDark.value ? DARK : LIGHT)[g] || null
const legend = computed(() =>
  props.groups.filter((g) => props.people.some((p) => p.group === g.key)).map((g) => ({ ...g, color: colorOf(g.key) }))
)
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// People in the same town share one dot (2 decimals ≈ 1 km)
const places = computed(() => {
  const m = new Map()
  props.people.forEach((p) => {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return
    const k = `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`
    if (!m.has(k)) m.set(k, { lat: p.lat, lng: p.lng, place: [p.city, p.country].filter(Boolean).join(', '), people: [] })
    m.get(k).people.push(p)
  })
  return [...m.values()].map((pl) => {
    const count = {}
    pl.people.forEach((p) => (count[p.group] = (count[p.group] || 0) + 1))
    // colour = the group most present here (team first on ties)
    const main = props.groups.map((g) => g.key).sort((a, b) => (count[b] || 0) - (count[a] || 0))[0]
    return { ...pl, main }
  })
})

function draw() {
  if (!map || !L) return
  if (layer) layer.remove()
  layer = L.layerGroup()
  const bounds = []
  ;[...places.value]
    .sort((a, b) => b.people.length - a.people.length)
    .forEach((pl) => {
      const n = pl.people.length
      const r = Math.round(Math.min(30, 12 + Math.sqrt(n) * 5))
      const c = colorOf(pl.main)
      const icon = L.divIcon({
        className: '',
        html: `<span class="eem-ppl-dot${c ? '' : ' hollow'}" style="width:${r}px;height:${r}px;${c ? `background:${c};` : ''}">${n > 1 ? `<b>${n}</b>` : ''}</span>`,
        iconSize: [r, r],
        iconAnchor: [r / 2, r / 2]
      })
      const list = pl.people.map((p) => `<li><b>${esc(p.name)}</b>${p.role ? `<span>${esc(p.role)}</span>` : ''}</li>`).join('')
      L.marker([pl.lat, pl.lng], { icon, riseOnHover: true, title: `${pl.place}: ${n}` })
        .bindTooltip(`<b>${esc(pl.place || 'Location')}</b><br>${n} ${n === 1 ? 'person' : 'people'}`, { direction: 'top', offset: [0, -8] })
        .bindPopup(`<div class="eem-ppl-pop"><p>${esc(pl.place)}</p><ul>${list}</ul></div>`, { maxWidth: 280 })
        .addTo(layer)
      bounds.push([pl.lat, pl.lng])
    })
  layer.addTo(map)
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 })
  else if (bounds.length) map.setView(bounds[0], 6)
}

function setTiles() {
  if (tiles) tiles.remove()
  const style = isDark.value ? 'Dark_Gray_Base' : 'World_Light_Gray_Base'
  tiles = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/{z}/{y}/{x}`, {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 12
  }).addTo(map)
}

onMounted(async () => {
  isDark.value = document.documentElement.classList.contains('dark')
  observer = new MutationObserver(() => (isDark.value = document.documentElement.classList.contains('dark')))
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = mod.default || mod
  map = L.map(el.value, { scrollWheelZoom: false, worldCopyJump: true, minZoom: 2 }).setView([30, -40], 2)
  setTiles()
  draw()
})

watch(() => places.value.length, draw)
watch(isDark, () => {
  if (!map) return
  setTiles()
  draw()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (map) map.remove()
})
</script>

<style scoped>
.eem-pplmap {
  width: 100%;
  z-index: 0;
  background: var(--eem-paper-2);
}
@media (max-width: 640px) {
  .eem-pplmap {
    height: 360px !important;
  }
}
.eem-pplmap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.1rem;
  margin-top: 0.75rem;
  font-size: 0.8rem;
}
.eem-pplmap-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.eem-pplmap-legend i {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
}
.eem-pplmap-legend i.hollow {
  border: 2px solid #8a8478;
  box-shadow: none;
}
</style>

<style>
.eem-ppl-dot {
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition: transform 0.15s;
}
.eem-ppl-dot:hover {
  transform: scale(1.15);
}
.eem-ppl-dot.hollow {
  background: rgba(255, 255, 255, 0.85);
  border: 2.5px solid #8a8478;
}
.eem-ppl-dot b {
  font: 800 11px/1 ui-sans-serif, system-ui, sans-serif;
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
}
.eem-ppl-dot.hollow b {
  color: #2b2925;
  text-shadow: none;
}
.eem-ppl-pop p {
  margin: 0 0 0.35rem;
  font-weight: 800;
}
.eem-ppl-pop ul {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 12rem;
  overflow-y: auto;
}
.eem-ppl-pop li {
  padding: 0.2rem 0;
  font-size: 0.82rem;
  line-height: 1.25;
}
.eem-ppl-pop li span {
  display: block;
  font-size: 0.72rem;
  opacity: 0.7;
}
</style>
