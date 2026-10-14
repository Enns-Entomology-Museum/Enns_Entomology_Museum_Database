<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Highlights"
      title="Treasures of the collection"
      lede="Type specimens, an extinct butterfly and the historic collections that built the museum — the specimens researchers travel for."
    />

    <!-- Featured: Xerces blue -->
    <section class="container mx-auto box-border px-4 py-14">
      <article class="eem-feature eem-card">
        <img
          :src="img('c-xerces.jpg')"
          alt="Pinned Xerces blue butterfly with its handwritten label"
        />
        <div class="p-6 sm:p-10 flex flex-col justify-center">
          <p class="eem-kicker">Extinct</p>
          <h2 class="eem-display text-3xl sm:text-4xl mt-3">The Xerces blue</h2>
          <p class="mt-1 italic eem-muted">Glaucopsyche xerces</p>
          <p class="mt-4 leading-relaxed">
            This small blue butterfly lived only in the coastal sand dunes of San Francisco. As the city grew over its
            habitat it vanished, and it has not been seen since the early 1940s — one of the first North American
            butterflies known to have been driven extinct by people. Museum specimens like ours are now the only
            record of what it looked like.
          </p>
        </div>
      </article>
    </section>

    <!-- Type specimens -->
    <section class="border-y eem-rule bg-[color:var(--eem-paper-2)]">
      <div class="container mx-auto box-border px-4 py-16 grid lg:grid-cols-12 gap-10">
        <div class="lg:col-span-4">
          <p class="eem-kicker">Type material</p>
          <h2 class="eem-display text-3xl sm:text-4xl mt-3">Type specimens</h2>
          <p class="mt-3 leading-relaxed">
            A type is the specimen a species name is anchored to — the reference every later study goes back to.
            Holotypes, paratypes and other types are the most important specimens a museum can hold.
          </p>
          <p class="mt-3 text-sm eem-muted leading-relaxed">
            Types are among the first specimens we digitize. Researchers can request to study them in person or on
            loan.
          </p>
          <RouterLink
            to="/visit"
            class="eem-btn eem-btn-gold mt-6"
            >Request access →</RouterLink
          >
        </div>

        <div class="lg:col-span-8">
          <div
            v-if="!eem.loaded"
            class="space-y-2"
          >
            <div
              v-for="i in 4"
              :key="i"
              class="eem-skel h-14"
            />
          </div>
          <div
            v-else-if="!types.length"
            class="eem-card p-8"
          >
            <p class="font-bold">Coming online</p>
            <p class="mt-1 eem-muted">
              No type specimens have been digitized yet — this list fills in automatically as they are catalogued.
            </p>
          </div>
          <template v-else>
            <p class="text-sm eem-muted mb-3">
              {{ types.length }} digitized type {{ types.length === 1 ? 'specimen' : 'specimens' }}
              <span v-if="typeKinds.length"> · {{ typeKinds.join(' · ') }}</span>
            </p>
            <ul class="eem-types">
              <li
                v-for="t in types"
                :key="t.catalogNumber"
              >
                <RouterLink
                  :to="{ path: '/specimen', query: { cat: t.catalogNumber } }"
                  class="eem-type-row"
                >
                  <span class="eem-type-kind">{{ t.kind }}</span>
                  <span class="min-w-0 flex-1">
                    <i class="font-semibold">{{ t.name }}</i>
                    <span class="block text-xs eem-muted truncate">{{ t.status }}</span>
                  </span>
                  <span class="eem-type-cat">{{ t.catalogNumber }}</span>
                </RouterLink>
              </li>
            </ul>
          </template>
        </div>
      </div>
    </section>

    <!-- Named collections -->
    <section class="container mx-auto box-border px-4 py-16">
      <p class="eem-kicker">Historic and donated collections</p>
      <h2 class="eem-display text-3xl sm:text-4xl mt-3">Collections within the collection</h2>
      <p class="mt-2 eem-muted max-w-2xl">
        Much of the museum came as whole collections, each with its own history, labels and specialties.
      </p>

      <ul class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <li
          v-for="c in collections"
          :key="c.name"
          class="eem-card eem-coll"
        >
          <img
            v-if="c.img"
            :src="img(c.img)"
            :alt="c.alt"
            loading="lazy"
          />
          <div
            v-else
            class="eem-coll-big"
            aria-hidden="true"
          >
            {{ c.number }}
          </div>
          <div class="p-5">
            <p class="flex items-baseline justify-between gap-3">
              <span class="eem-display text-2xl">{{ c.number }}</span>
              <span class="text-xs font-bold eem-muted">{{ c.year }}</span>
            </p>
            <h3 class="font-bold mt-1">{{ c.name }}</h3>
            <p class="text-sm eem-muted mt-1 leading-relaxed">{{ c.text }}</p>
          </div>
        </li>
      </ul>

      <div class="mt-12 eem-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 eem-accent-l">
        <div>
          <h2 class="eem-display text-2xl">Want to study these specimens?</h2>
          <p class="mt-1 eem-muted">Visits and loans are open to researchers. Teachers can borrow specimen boxes.</p>
        </div>
        <div class="flex flex-wrap gap-3 shrink-0">
          <RouterLink
            to="/visit"
            class="eem-btn eem-btn-gold"
            >Visits &amp; loans</RouterLink
          >
          <RouterLink
            to="/outreach"
            class="eem-btn eem-btn-line"
            >Outreach requests</RouterLink
          >
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import { useEem } from './components/useEem.js'

useHead({ title: 'Highlights — Enns Entomology Museum' })

const eem = useEem()
const base = import.meta.env.BASE_URL || '/'
const img = (f) => `${base}images/history/${f}`

const KINDS = ['holotype', 'neotype', 'lectotype', 'syntype', 'paralectotype', 'paratype', 'allotype', 'topotype']
const ORDER = Object.fromEntries(KINDS.map((k, i) => [k, i]))

const types = computed(() =>
  eem.records
    .filter((r) => r.typeStatus && String(r.typeStatus).trim())
    .map((r) => {
      const status = String(r.typeStatus).split('|')[0].trim()
      const kind = KINDS.find((k) => status.toLowerCase().startsWith(k)) || 'type'
      return {
        catalogNumber: r.catalogNumber,
        name: [r.genus, r.specificEpithet].filter(Boolean).join(' ') || r.scientificName || r.family,
        status,
        kind
      }
    })
    .sort((a, b) => (ORDER[a.kind] ?? 99) - (ORDER[b.kind] ?? 99) || a.name.localeCompare(b.name))
)

const typeKinds = computed(() => {
  const c = {}
  types.value.forEach((t) => (c[t.kind] = (c[t.kind] || 0) + 1))
  return Object.entries(c).map(([k, n]) => `${n} ${k}${n > 1 ? 's' : ''}`)
})

const collections = [
  { year: '1941', number: '300,000', name: 'G. W. Bock beetles', text: 'Papered beetles, many still in their original envelopes.', img: '1941-bock.jpg', alt: 'Box of papered beetles' },
  { year: '1961', number: '35,000', name: 'E. P. Meiners collection', text: 'A large private collection, rich in Lepidoptera.', img: '1961-meiners.jpg', alt: 'Pinned moth with old labels' },
  { year: '1996', number: '4.5 million', name: 'MDC aquatic insects', text: 'Statewide stream samples from the Missouri Department of Conservation, preserved in ethanol.', img: 'c-wet.jpg', alt: 'Shelves of vials of preserved aquatic insects' },
  { year: '2012', number: '5,880', name: 'Glen Smart Lepidoptera', text: 'Spread moths and butterflies.', img: '2012-smart.jpg', alt: 'Drawer of spread moths' },
  { year: '2022', number: '22,000', name: 'Rae Letsinger Lepidoptera', text: 'One of the largest recent private donations.', img: '2022-letsinger.jpg', alt: 'Drawer of tiger moths' },
  { year: '2025', number: '2,500', name: 'Ken McCarty Ozark bees', text: 'Native bees from the Ozark prairies.', img: '2025-mccarty.jpg', alt: 'Drawer of pinned bumble bees' },
  { year: 'Special', number: '1,780', name: 'Fossil insects', text: 'Insect fossils in 19 drawers.', img: 'c-fossils.jpg', alt: 'Fossil slabs in a drawer' },
  { year: 'Special', number: '≈ 309', name: 'Insect galls', text: 'Galls on their host plants, in 24 drawers.', img: 'c-galls.jpg', alt: 'Leaves with insect galls' },
  { year: 'Special', number: '35,000', name: 'Microscope slides', text: 'Slide-mounted specimens in 442 boxes.', img: 'c-slides.jpg', alt: 'Cabinet of slide boxes' }
]
</script>

<style scoped>
.eem-feature {
  display: grid;
  overflow: hidden;
  border-top: 4px solid var(--eem-gold);
}
.eem-feature img {
  width: 100%;
  height: 100%;
  max-height: 26rem;
  object-fit: cover;
  display: block;
}
@media (min-width: 900px) {
  .eem-feature {
    grid-template-columns: 1fr 1fr;
  }
  .eem-feature img {
    max-height: none;
    min-height: 22rem;
  }
}
.eem-types {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 2px solid var(--eem-ink);
}
.eem-type-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 0.5rem;
  border-bottom: 1px solid var(--eem-rule);
  color: var(--eem-ink);
}
.eem-type-row:hover {
  background: var(--eem-card);
}
.eem-type-kind {
  flex-shrink: 0;
  width: 6.5rem;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #b42318;
}
.eem-type-cat {
  flex-shrink: 0;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  background: var(--eem-gold);
  color: #000;
}
@media (max-width: 520px) {
  .eem-type-kind {
    width: auto;
  }
  .eem-type-row {
    flex-wrap: wrap;
    gap: 0.4rem 0.8rem;
  }
}
.eem-coll {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.eem-coll img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
}
.eem-coll-big {
  aspect-ratio: 16 / 10;
  display: grid;
  place-items: center;
  background: var(--eem-gold);
  color: #000;
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 900;
  font-size: 2.2rem;
}
</style>
