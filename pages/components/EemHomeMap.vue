<template>
  <div class="eem-hmap-wrap">
    <div
      ref="el"
      class="eem-hmap"
      :style="{ height }"
      role="img"
      :aria-label="`Map of ${sites.length} collecting localities`"
    />

    <div class="eem-hmap-bar">
      <!-- Legend: colour = insect order of most specimens at the site -->
      <ul
        class="eem-hmap-legend"
        aria-label="Map legend"
      >
        <li
          v-for="o in colored"
          :key="o.name"
        >
          <i :style="{ background: colorOf(o.name) }" />{{ o.name }}
        </li>
        <li v-if="hasOther"><i class="other" />Other orders</li>
        <li class="eem-muted">Larger dot = more specimens</li>
      </ul>

      <button
        v-if="outside.length && !showAll"
        type="button"
        class="eem-hmap-btn"
        @click="showAll = true"
      >
        +{{ outside.length }} {{ outside.length === 1 ? 'locality' : 'localities' }} elsewhere ({{ outsidePlaces }}) — show all
      </button>
      <button
        v-else-if="showAll || focusState || filterOrder"
        type="button"
        class="eem-hmap-btn"
        @click="reset"
      >
        Reset view
      </button>
    </div>
  </div>
</template>

<script setup>
// Collecting localities on the home page.
//  • one dot per locality, sized by the number of specimens, coloured by insect order
//  • opens on North America; other continents are one click away
//  • focusState (a state chip) zooms to that state; filterOrder (an order bar) shows only that order
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { orderColor } from './useEem.js'

const props = defineProps({
  records: { type: Array, default: () => [] },
  // the (up to three) main insect orders that get their own colour; the rest are "Other orders"
  mainOrders: { type: Array, default: () => [] },
  focusState: { type: String, default: '' },
  filterOrder: { type: String, default: '' },
  height: { type: String, default: '440px' }
})
const emit = defineEmits(['reset'])

const el = ref(null)
const isDark = ref(false)
const showAll = ref(false)
let L = null
let map = null
let tiles = null
let layer = null
let observer = null

const colorOf = (order) => orderColor(order, props.mainOrders, isDark.value)
const colored = computed(() => props.mainOrders.map((name) => ({ name })))

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const placeOf = (r) =>
  [r.county ? `${r.county} Co.` : '', r.stateProvince, r.country === 'United States' ? 'USA' : r.country].filter(Boolean).join(', ') ||
  r.verbatimLocality ||
  'Locality not given'
const taxonOf = (r) =>
  (r.scientificName || [r.genus, r.specificEpithet].filter(Boolean).join(' ') || r.family || r.order || 'Unidentified').replace(
    /\s+\(?[A-Z][^()]*,\s*\d{4}\)?$/,
    ''
  )

// Group georeferenced records into localities (same coordinates, 4 decimals ≈ 10 m)
const sites = computed(() => {
  const m = new Map()
  props.records.forEach((r) => {
    const lat = Number(r.decimalLatitude)
    const lng = Number(r.decimalLongitude)
    if (!r.decimalLatitude || !r.decimalLongitude || !Number.isFinite(lat) || !Number.isFinite(lng)) return
    const k = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (!m.has(k)) m.set(k, { lat, lng, records: [], place: placeOf(r), state: r.stateProvince || '' })
    m.get(k).records.push(r)
  })
  return [...m.values()].map((s) => {
    const byOrder = {}
    s.records.forEach((r) => (byOrder[r.order || 'Unknown'] = (byOrder[r.order || 'Unknown'] || 0) + 1))
    const main = Object.entries(byOrder).sort((a, b) => b[1] - a[1])[0][0]
    return { ...s, n: s.records.length, byOrder, main }
  })
})

const hasOther = computed(() => sites.value.some((s) => !colorOf(s.main)))

// North America (incl. Central America and the Caribbean) is the default frame
const inNorthAmerica = (s) => s.lat > 5 && s.lat < 75 && s.lng > -170 && s.lng < -50
const outside = computed(() => sites.value.filter((s) => !inNorthAmerica(s)))
const outsidePlaces = computed(() => [...new Set(outside.value.map((s) => s.records[0].country || s.state).filter(Boolean))].slice(0, 3).join(', '))

const visible = (s) => !props.filterOrder || s.records.some((r) => r.order === props.filterOrder)

function popup(s) {
  const recs = props.filterOrder ? s.records.filter((r) => r.order === props.filterOrder) : s.records
  const list = recs
    .slice(0, 8)
    .map(
      (r) =>
        `<li><a href="#/specimen?cat=${encodeURIComponent(r.catalogNumber || '')}"><b>${esc(r.catalogNumber)}</b> <i>${esc(taxonOf(r))}</i></a></li>`
    )
    .join('')
  const more = recs.length > 8 ? `<li class="more">+ ${recs.length - 8} more</li>` : ''
  const orders = Object.entries(s.byOrder)
    .sort((a, b) => b[1] - a[1])
    .map(([o, n]) => `${esc(o)} ${n}`)
    .join(' · ')
  return `<div class="eem-hmap-pop"><p class="t">${esc(s.place)}</p><p class="m">${s.n} specimen${s.n === 1 ? '' : 's'} · ${orders}</p><ul>${list}${more}</ul></div>`
}

function icon(s) {
  const r = Math.round(Math.min(26, 9 + Math.sqrt(s.n) * 3.2))
  const c = colorOf(s.main)
  const dim = props.focusState && s.state !== props.focusState
  return L.divIcon({
    className: '',
    html: `<span class="eem-hmap-dot${c ? '' : ' other'}${dim ? ' dim' : ''}" style="width:${r}px;height:${r}px;${c ? `background:${c};` : ''}">${
      s.n >= 5 ? `<b>${s.n}</b>` : ''
    }</span>`,
    iconSize: [r, r],
    iconAnchor: [r / 2, r / 2]
  })
}

function draw() {
  if (!map || !L) return
  if (layer) layer.remove()
  layer = L.layerGroup()
  // big sites first so small ones stay clickable on top
  ;[...sites.value]
    .filter(visible)
    .sort((a, b) => b.n - a.n)
    .forEach((s) => {
      const m = L.marker([s.lat, s.lng], { icon: icon(s), riseOnHover: true, keyboard: true, title: `${s.place}: ${s.n}` })
      m.bindTooltip(`<b>${esc(s.place)}</b><br>${s.n} specimen${s.n === 1 ? '' : 's'}`, { direction: 'top', offset: [0, -6] })
      m.bindPopup(() => popup(s), { maxWidth: 280 })
      m.addTo(layer)
    })
  layer.addTo(map)
}

function frame(animate = true) {
  if (!map || !L) return
  let pick = sites.value.filter(visible)
  if (props.focusState) pick = pick.filter((s) => s.state === props.focusState)
  else if (!showAll.value) pick = pick.filter(inNorthAmerica).length ? pick.filter(inNorthAmerica) : pick
  if (!pick.length) return
  const b = L.latLngBounds(pick.map((s) => [s.lat, s.lng]))
  const opts = { padding: [40, 40], maxZoom: props.focusState ? 9 : 7, animate, duration: 0.8 }
  if (animate) map.flyToBounds(b, opts)
  else map.fitBounds(b, opts)
}

function setTiles() {
  if (tiles) tiles.remove()
  const style = isDark.value ? 'Dark_Gray_Base' : 'World_Light_Gray_Base'
  tiles = L.tileLayer(`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${style}/MapServer/tile/{z}/{y}/{x}`, {
    attribution: 'Tiles &copy; Esri',
    maxZoom: 16
  }).addTo(map)
}

function reset() {
  showAll.value = false
  emit('reset')
}

onMounted(async () => {
  isDark.value = document.documentElement.classList.contains('dark')
  observer = new MutationObserver(() => (isDark.value = document.documentElement.classList.contains('dark')))
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = mod.default || mod
  map = L.map(el.value, { scrollWheelZoom: false, worldCopyJump: true, minZoom: 2 }).setView([38.6, -92.4], 4)
  setTiles()
  draw()
  frame(false)
})

watch(isDark, () => {
  if (!map) return
  setTiles()
  draw()
})
watch(
  () => sites.value.length,
  () => {
    draw()
    frame(false)
  }
)
watch(
  () => [props.focusState, props.filterOrder, showAll.value],
  () => {
    draw()
    frame(true)
  }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  if (map) map.remove()
})
</script>

<style scoped>
.eem-hmap {
  width: 100%;
  overflow: hidden;
  z-index: 0;
  background: var(--eem-paper-2);
}
@media (max-width: 640px) {
  .eem-hmap {
    height: 340px !important;
  }
}
.eem-hmap-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem 1rem;
  margin-top: 0.75rem;
  padding: 0 0.25rem;
}
.eem-hmap-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  font-size: 0.78rem;
}
.eem-hmap-legend li {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.eem-hmap-legend i {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
}
.eem-hmap-legend i.other {
  background: transparent;
  border: 2px solid #8a8478;
  box-shadow: none;
}
.eem-hmap-btn {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.3rem 0.7rem;
  border: 1.5px solid var(--eem-gold);
}
.eem-hmap-btn:hover {
  background: var(--eem-gold);
  color: #000;
}
</style>

<style>
/* Map markers and popups live outside the component's scope */
.eem-hmap-dot {
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  transition:
    opacity 0.3s,
    transform 0.15s;
}
.eem-hmap-dot:hover {
  transform: scale(1.15);
}
.eem-hmap-dot.other {
  background: rgba(255, 255, 255, 0.85);
  border: 2.5px solid #8a8478;
}
.eem-hmap-dot.dim {
  opacity: 0.2;
}
.eem-hmap-dot b {
  font: 800 10px/1 ui-sans-serif, system-ui, sans-serif;
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
}
.eem-hmap-dot.other b {
  color: #2b2925;
  text-shadow: none;
}
.eem-hmap-pop .t {
  font-weight: 800;
  margin: 0;
}
.eem-hmap-pop .m {
  margin: 0.15rem 0 0.4rem;
  font-size: 0.75rem;
  opacity: 0.75;
}
.eem-hmap-pop ul {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 11rem;
  overflow-y: auto;
}
.eem-hmap-pop li {
  padding: 0.15rem 0;
  font-size: 0.8rem;
}
.eem-hmap-pop li b {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.72rem;
}
.eem-hmap-pop li.more {
  opacity: 0.7;
}
</style>
