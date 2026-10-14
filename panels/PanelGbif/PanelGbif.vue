<template>
  <VCard>
    <VCardHeader class="flex items-center justify-between gap-3">
      <h2 class="text-md">GBIF — Global Biodiversity Information Facility</h2>
      <a
        v-if="match"
        :href="`https://www.gbif.org/species/${match.usageKey}`"
        target="_blank"
        rel="noopener"
        class="text-sm font-semibold underline"
        >Open in GBIF ↗</a
      >
    </VCardHeader>
    <VCardContent class="text-sm">
      <VSpinner
        v-if="loading"
        logo-class="w-8 h-8"
        legend=""
      />
      <p
        v-else-if="!match"
        class="text-base-soft"
      >
        No confident GBIF match for <i>{{ name }}</i>. The spelling or classification may differ from GBIF’s
        backbone.
      </p>

      <template v-else>
        <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span class="text-base font-semibold"><i>{{ match.canonicalName }}</i></span>
          <span class="eem-pill">{{ (match.status || '').toLowerCase() }}</span>
          <span
            v-if="match.matchType !== 'EXACT'"
            class="text-base-soft"
            >({{ match.matchType.toLowerCase() }} match)</span
          >
        </div>

        <dl class="mt-4 grid grid-cols-3 gap-3">
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">Occurrences</dt>
            <dd class="text-xl font-bold">{{ fmt(counts.all) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">In the USA</dt>
            <dd class="text-xl font-bold">{{ fmt(counts.us) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">In Missouri</dt>
            <dd class="text-xl font-bold">{{ fmt(counts.mo) }}</dd>
          </div>
        </dl>

        <div
          ref="mapEl"
          class="eem-gbif-map mt-4"
          role="img"
          :aria-label="`GBIF occurrence density map for ${match.canonicalName}`"
        />
        <p class="mt-2 text-xs text-base-soft">
          Density of all GBIF occurrence records, including museum specimens and observations worldwide.
        </p>
      </template>
    </VCardContent>
  </VCard>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { canonicalName, fmt } from '../_eem/name.js'

const props = defineProps({
  taxon: { type: Object, default: () => ({}) },
  otu: { type: Object, default: () => ({}) }
})

const name = canonicalName(props.taxon, props.otu)
const loading = ref(true)
const match = ref(null)
const counts = ref({ all: null, us: null, mo: null })
const mapEl = ref(null)
let map = null

const API = 'https://api.gbif.org/v1'

async function count(params) {
  const q = new URLSearchParams({ taxonKey: match.value.usageKey, limit: 0, ...params })
  const r = await fetch(`${API}/occurrence/search?${q}`)
  return (await r.json()).count
}

async function drawMap() {
  await nextTick()
  if (!mapEl.value) return
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  const L = mod.default || mod
  map = L.map(mapEl.value, { scrollWheelZoom: false, worldCopyJump: true }).setView([30, -40], 1)
  L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri', maxZoom: 12 }
  ).addTo(map)
  L.tileLayer(
    `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${match.value.usageKey}&style=orangeHeat.point&srs=EPSG:3857`,
    { attribution: 'Occurrences &copy; <a href="https://www.gbif.org">GBIF</a>', maxZoom: 12 }
  ).addTo(map)
}

onMounted(async () => {
  try {
    if (!name) return
    const r = await fetch(`${API}/species/match?name=${encodeURIComponent(name)}&kingdom=Animalia`)
    const m = await r.json()
    if (m.usageKey && m.matchType !== 'NONE' && (m.confidence ?? 0) >= 90) {
      match.value = m
      const [all, us, mo] = await Promise.all([
        count({}),
        count({ country: 'US' }),
        count({ country: 'US', stateProvince: 'Missouri' })
      ])
      counts.value = { all, us, mo }
    }
  } catch {
    match.value = null
  } finally {
    loading.value = false
    if (match.value) drawMap()
  }
})

onBeforeUnmount(() => map?.remove())
</script>

<style scoped>
.eem-pill {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.05rem 0.5rem;
  border-radius: 2px;
  background: #000;
  color: #f1b82d;
}
.eem-gbif-map {
  height: 280px;
  border-radius: 4px;
  overflow: hidden;
  z-index: 0;
}
</style>
