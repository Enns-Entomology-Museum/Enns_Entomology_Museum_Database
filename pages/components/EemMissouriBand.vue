<template>
  <section
    class="eem-moband"
    aria-labelledby="eem-moband-title"
  >
    <div class="container mx-auto box-border px-4 py-12 grid lg:grid-cols-12 gap-8 items-center">
      <div class="lg:col-span-5">
        <p class="eem-moband-kicker">Missouri checklist</p>
        <h2
          id="eem-moband-title"
          class="eem-display text-4xl sm:text-5xl mt-3 leading-[0.95]"
        >
          Insects of Missouri
        </h2>
        <p class="mt-4 leading-relaxed max-w-md">
          Every insect species recorded in the state — which ones the museum holds, and which ones we are still
          looking for.
        </p>
      </div>

      <dl class="lg:col-span-4 grid grid-cols-2 gap-6">
        <div>
          <dt class="eem-moband-label">Species recorded</dt>
          <dd class="eem-display text-4xl sm:text-5xl">{{ summary ? fmt(summary.speciesAll || summary.species) : '—' }}</dd>
          <dd class="text-xs mt-1 opacity-75">{{ summary?.speciesAll ? 'GBIF + iNaturalist' : 'GBIF records for Missouri' }}</dd>
        </div>
        <div>
          <dt class="eem-moband-label">In the museum</dt>
          <dd class="eem-display text-4xl sm:text-5xl">{{ mo.loaded ? fmt(museumSpecies) : '—' }}</dd>
          <dd class="text-xs mt-1 opacity-75">identified to species, from digitized specimens</dd>
        </div>
      </dl>

      <div class="lg:col-span-3 flex lg:justify-end">
        <RouterLink
          to="/missouri"
          class="eem-moband-btn"
          >Open the checklist →</RouterLink
        >
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { fmt, useMissouri } from './useEem.js'

const mo = useMissouri()
const summary = ref(null)

const museumSpecies = computed(
  () =>
    new Set(
      mo.records.map((r) => [r.genus, r.specificEpithet].filter(Boolean).join(' ')).filter((n) => n.includes(' '))
    ).size
)

onMounted(async () => {
  try {
    const base = import.meta.env.BASE_URL || '/'
    const r = await fetch(`${base}data/gbif-missouri-summary.json`)
    if (r.ok) summary.value = await r.json()
  } catch {
    /* numbers stay as dashes */
  }
})
</script>

<style scoped>
.eem-moband {
  background: var(--eem-gold);
  color: #000;
  border-bottom: 4px solid #000;
}
.eem-moband-kicker {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.eem-moband-kicker::before {
  content: '';
  width: 1.6rem;
  height: 2px;
  background: #000;
}
.eem-moband-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.eem-moband-btn {
  display: inline-block;
  padding: 0.95rem 1.4rem;
  background: #000;
  color: var(--eem-gold) !important;
  font-weight: 800;
  border: 2px solid #000;
  white-space: nowrap;
}
.eem-moband-btn:hover {
  background: transparent;
  color: #000 !important;
}
</style>
