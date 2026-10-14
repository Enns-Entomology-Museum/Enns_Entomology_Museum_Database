<template>
  <VCard>
    <VCardHeader class="flex items-center justify-between gap-3">
      <h2 class="text-md">iNaturalist observations</h2>
      <a
        v-if="taxonId"
        :href="`https://www.inaturalist.org/taxa/${taxonId}`"
        target="_blank"
        rel="noopener"
        class="text-sm font-semibold underline"
        >Open in iNaturalist ↗</a
      >
    </VCardHeader>
    <VCardContent class="text-sm">
      <VSpinner
        v-if="loading"
        logo-class="w-8 h-8"
        legend=""
      />
      <p
        v-else-if="!taxonId"
        class="text-base-soft"
      >
        <i>{{ name }}</i> was not found on iNaturalist.
      </p>

      <template v-else>
        <dl class="grid grid-cols-3 gap-3">
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">Observations</dt>
            <dd class="text-xl font-bold">{{ fmt(counts.all) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">Research grade</dt>
            <dd class="text-xl font-bold">{{ fmt(counts.rg) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">In Missouri</dt>
            <dd class="text-xl font-bold">{{ fmt(counts.mo) }}</dd>
          </div>
        </dl>

        <p
          v-if="!photos.length"
          class="mt-4 text-base-soft"
        >
          No research-grade photos yet.
        </p>
        <ul
          v-else
          class="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2"
        >
          <li
            v-for="p in photos"
            :key="p.id"
          >
            <a
              :href="`https://www.inaturalist.org/observations/${p.obs}`"
              target="_blank"
              rel="noopener"
              class="block aspect-square overflow-hidden rounded-sm bg-base-muted"
              :title="`${p.place} · ${p.attribution}`"
            >
              <img
                :src="p.url"
                :alt="`Observation of ${name}${p.place ? ' — ' + p.place : ''}`"
                loading="lazy"
                class="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </a>
          </li>
        </ul>
        <p class="mt-3 text-xs text-base-soft">
          Community observations from iNaturalist, research grade only. Photos © their observers; click for licence
          and details.
        </p>
      </template>
    </VCardContent>
  </VCard>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { canonicalName, fmt } from '../_eem/name.js'

const props = defineProps({
  taxon: { type: Object, default: () => ({}) },
  otu: { type: Object, default: () => ({}) }
})

const API = 'https://api.inaturalist.org/v1'
const MISSOURI = 28 // iNaturalist place id

const name = canonicalName(props.taxon, props.otu)
const loading = ref(true)
const taxonId = ref(null)
const counts = ref({ all: null, rg: null, mo: null })
const photos = ref([])

async function total(params) {
  const q = new URLSearchParams({ taxon_id: taxonId.value, per_page: 0, ...params })
  const r = await fetch(`${API}/observations?${q}`)
  return (await r.json()).total_results
}

onMounted(async () => {
  try {
    if (!name) return
    const r = await fetch(`${API}/taxa?q=${encodeURIComponent(name)}&per_page=5&is_active=true`)
    const data = await r.json()
    const hit = (data.results || []).find((t) => t.name?.toLowerCase() === name.toLowerCase())
    if (!hit) return
    taxonId.value = hit.id

    const [all, rg, mo, obs] = await Promise.all([
      total({}),
      total({ quality_grade: 'research' }),
      total({ place_id: MISSOURI }),
      fetch(
        `${API}/observations?${new URLSearchParams({
          taxon_id: hit.id,
          quality_grade: 'research',
          photos: true,
          per_page: 8,
          order_by: 'votes'
        })}`
      ).then((x) => x.json())
    ])
    counts.value = { all, rg, mo }
    photos.value = (obs.results || [])
      .map((o) => {
        const ph = o.photos?.[0]
        return ph
          ? {
              id: ph.id,
              obs: o.id,
              url: ph.url.replace('square', 'medium'),
              attribution: ph.attribution,
              place: o.place_guess || ''
            }
          : null
      })
      .filter(Boolean)
  } catch {
    taxonId.value = taxonId.value || null
  } finally {
    loading.value = false
  }
})
</script>
