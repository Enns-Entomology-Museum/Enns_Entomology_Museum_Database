<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="About"
      :title="'The museum'"
      :lede="`The ${info.fullName} is the insect collection of the ${info.university}, home to ${info.holdings}.`"
    />

    <section class="container mx-auto box-border px-4 py-14 grid lg:grid-cols-12 gap-12">
      <div class="lg:col-span-7 space-y-5 text-[1.06rem] leading-[1.8]">
        <h2 class="eem-display text-3xl leading-tight">A research collection, open to everyone</h2>
        <p>
          The museum preserves pinned, slide-mounted and fluid-preserved insects and other arthropods as a permanent
          record of biodiversity. Each specimen documents a species at a place and a time — evidence that supports
          taxonomy, ecology, agriculture and conservation, and becomes more valuable as landscapes change.
        </p>
        <p>
          We are digitizing the collection in
          <a
            href="https://taxonworks.org"
            target="_blank"
            rel="noopener"
            class="eem-link"
            >TaxonWorks</a
          >: every specimen gets a unique catalog number and QR label, and its data — identity, locality, date and
          collector — is published here and shared with global biodiversity networks.
        </p>
        <p>
          Founded in <strong>1874</strong> with Charles V. Riley as its first curator, the collection was renamed in
          1980 for entomologist Wilbur R. Enns, who directed it for a quarter of a century. Generous donations
          — nearly five million specimens since 1941 — have made it the reference collection for the insects of the
          Ozark Plateau.
        </p>
      </div>

      <aside class="lg:col-span-5 space-y-6">
        <div class="eem-card p-6">
          <p class="eem-kicker">Our work</p>
          <ul class="mt-4 space-y-4">
            <li
              v-for="w in work"
              :key="w.title"
              class="border-l-4 border-[color:var(--eem-gold)] pl-4"
            >
              <h3 class="font-bold">{{ w.title }}</h3>
              <p class="text-sm eem-muted leading-relaxed mt-1">{{ w.text }}</p>
            </li>
          </ul>
        </div>

        <div class="eem-card p-6">
          <p class="eem-kicker">People</p>
          <div class="mt-4 flex items-center gap-4">
            <span
              class="eem-avatar"
              aria-hidden="true"
              >{{ initials(info.director.name) }}</span
            >
            <div>
              <p class="font-bold">{{ info.director.name }}</p>
              <p class="text-sm eem-muted">{{ info.director.role }}</p>
            </div>
          </div>
          <p class="mt-4 text-sm eem-muted">
            With a team of staff, students and collaborators.
          </p>
          <div class="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <RouterLink
              to="/people"
              class="eem-link"
              >Students &amp; collaborators →</RouterLink
            >
            <RouterLink
              to="/visit"
              class="eem-link"
              >Contact &amp; visits →</RouterLink
            >
          </div>
        </div>
      </aside>
    </section>

    <!-- Numbers -->
    <section class="bg-black text-white border-y-4 border-[color:var(--eem-gold)]">
      <dl class="container mx-auto box-border px-4 py-10 grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-8">
        <div
          v-for="n in numbers"
          :key="n.label"
          class="flex flex-col"
        >
          <dt class="order-2 text-sm text-white/70 leading-snug mt-1">{{ n.label }}</dt>
          <dd class="eem-display text-4xl text-[color:var(--eem-gold)] -order-1">{{ n.value }}</dd>
        </div>
      </dl>
    </section>

    <!-- Timeline -->
    <section class="container mx-auto box-border px-4 py-16">
      <p class="eem-kicker">Our story</p>
      <h2 class="eem-display mt-3 text-3xl sm:text-4xl">152 years in the drawers</h2>
      <p class="mt-2 eem-muted max-w-2xl">
        Five curators and directors, and the collectors and agencies whose donations built the museum.
      </p>

      <div class="mt-6 flex flex-wrap gap-2 text-sm">
        <button
          v-for="f in filters"
          :key="f.key"
          type="button"
          class="eem-chip"
          :class="{ on: kind === f.key }"
          :aria-pressed="kind === f.key"
          @click="kind = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <ol class="eem-tl mt-10">
        <li
          v-for="(e, i) in shownEvents"
          :key="e.year + e.title"
          class="eem-tl-item"
          :class="i % 2 ? 'right' : 'left'"
        >
          <span
            class="eem-tl-dot"
            :class="e.kind"
            aria-hidden="true"
          />
          <article class="eem-tl-card eem-card">
            <div
              v-if="e.img"
              class="eem-tl-img"
            >
              <img
                :src="img(e.img)"
                :alt="e.alt"
                :class="{ contain: e.contain }"
                loading="lazy"
              />
            </div>
            <div
              v-else
              class="eem-tl-img eem-tl-noimg"
              aria-hidden="true"
            >
              <span>{{ e.big }}</span>
            </div>
            <div class="p-5 min-w-0">
              <p class="flex items-center gap-3">
                <span class="eem-display text-3xl leading-none">{{ e.year }}</span>
                <span
                  class="eem-tl-tag"
                  :class="e.kind"
                  >{{ KIND[e.kind] }}</span
                >
              </p>
              <h3 class="mt-3 font-bold text-lg leading-snug">{{ e.title }}</h3>
              <p class="mt-1 text-sm eem-muted leading-relaxed">{{ e.text }}</p>
            </div>
          </article>
        </li>
      </ol>
    </section>

    <!-- Inside the collection -->
    <section class="border-t eem-rule bg-[color:var(--eem-paper-2)]">
      <div class="container mx-auto box-border px-4 py-16">
        <p class="eem-kicker">Inside the collection today</p>
        <h2 class="eem-display mt-3 text-3xl sm:text-4xl">More than pinned insects</h2>
        <ul class="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <li
            v-for="(c, i) in holdings"
            :key="c.title"
            class="eem-hold eem-card"
            :class="{ 'lg:col-span-2 lg:row-span-2 big': i === 0, 'lg:col-span-2 wide': i > 4 }"
          >
            <img
              :src="img(c.img)"
              :alt="c.alt"
              loading="lazy"
            />
            <div class="p-4">
              <p class="eem-display text-2xl leading-none">{{ c.value }}</p>
              <h3 class="mt-2 font-bold">{{ c.title }}</h3>
              <p class="mt-1 text-sm eem-muted leading-relaxed">{{ c.text }}</p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- Where we are -->
    <section
      v-if="info.location"
      class="border-t eem-rule"
    >
      <div class="container mx-auto box-border px-4 py-16 grid lg:grid-cols-12 gap-10">
        <div class="lg:col-span-4">
          <p class="eem-kicker">Find us</p>
          <h2 class="eem-display text-3xl mt-3">Where the museum is</h2>
          <p
            v-if="info.address"
            class="mt-4 leading-relaxed"
          >
            {{ info.address }}
          </p>
          <p
            v-if="info.directions"
            class="mt-3 text-sm eem-muted leading-relaxed"
          >
            {{ info.directions }}
          </p>
          <div class="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <RouterLink
              to="/visit"
              class="eem-link font-semibold"
              >Plan a visit →</RouterLink
            >
            <a
              :href="directionsUrl"
              target="_blank"
              rel="noopener"
              class="eem-link"
              >Directions ↗</a
            >
          </div>
        </div>
        <div class="lg:col-span-8 eem-card p-2">
          <ClientOnly>
            <EemMap
              :points="[pin]"
              height="380px"
              :point-zoom="16"
              label="Location of the Enns Entomology Museum"
            />
          </ClientOnly>
        </div>
      </div>
    </section>

    <section class="border-t eem-rule bg-[color:var(--eem-paper-2)]">
      <div class="container mx-auto box-border px-4 py-12">
        <p class="eem-kicker">Cite the database</p>
        <p class="mt-3 max-w-3xl leading-relaxed">
          Enns Entomology Museum, University of Missouri (EEM). Enns Entomology Museum Database. Available at
          <a
            :href="siteUrl"
            class="eem-link break-all"
            >{{ siteUrl }}</a
          >
          (accessed {{ today }}).
        </p>
        <template v-if="info.gbif.doi">
          <p class="eem-kicker mt-8">Cite the dataset in GBIF</p>
          <p class="mt-3 max-w-3xl leading-relaxed">
            Dal Pos D (2026). Enns Entomology Museum Collection (EEM). Enns Entomology Museum. Occurrence dataset
            <a
              :href="`https://doi.org/${info.gbif.doi}`"
              class="eem-link"
              >https://doi.org/{{ info.gbif.doi }}</a
            >
            accessed via GBIF.org on {{ today }}.
          </p>
        </template>
        <p class="mt-6 text-sm eem-muted max-w-3xl">
          The collection is registered in GBIF's
          <a
            :href="`https://www.gbif.org/grscicoll/collection/${info.gbif.grscicollKey}`"
            target="_blank"
            rel="noopener"
            class="eem-link"
            >Registry of Scientific Collections</a
          >
          under the code <b>EEM</b><template v-if="info.gbif.publisherKey">, and the museum is an endorsed
            <a
              :href="`https://www.gbif.org/publisher/${info.gbif.publisherKey}`"
              target="_blank"
              rel="noopener"
              class="eem-link"
              >GBIF data publisher</a
            ></template
          >.<template v-if="!info.gbif.datasetKey">
            Specimen data will be published to GBIF as digitization progresses.</template
          >
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useHead } from '@unhead/vue'
import EemMap from './components/EemMap.vue'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'

// Museum pin for the "Where the museum is" map
const pin = info.location
  ? {
      lat: info.location.lat,
      lng: info.location.lng,
      html: `<strong>${info.fullName}</strong>${info.address ? `<br>${info.address}` : ''}`
    }
  : null
const directionsUrl = info.location
  ? `https://www.openstreetmap.org/directions?to=${info.location.lat}%2C${info.location.lng}`
  : info.mapUrl

useHead({ title: 'About — Enns Entomology Museum' })

const { project_url } = __APP_ENV__
const siteUrl = project_url || 'https://enns-entomology-museum.github.io/Enns_Entomology_Museum_Database/'
const today = new Date().toISOString().slice(0, 10)

const base = import.meta.env.BASE_URL || '/'
const img = (f) => `${base}images/history/${f}`

const numbers = [
  { value: '152', label: 'years of collecting' },
  { value: '5', label: 'curators and directors' },
  { value: '7M+', label: 'specimens in the collection' },
  { value: '4.9M', label: 'specimens donated since 1941' },
  { value: '80–90%', label: 'from the Ozark Plateau' }
]

const KIND = { people: 'Director', gift: 'Donation', milestone: 'Milestone' }
const filters = [
  { key: 'all', label: 'Everything' },
  { key: 'people', label: 'Directors' },
  { key: 'gift', label: 'Donations' }
]
const kind = ref('all')

const events = [
  { year: 1874, kind: 'milestone', img: '1874-riley.jpg', alt: 'Charles V. Riley examining a specimen', title: 'The museum is founded', text: 'Charles V. Riley, Missouri’s first State Entomologist, becomes the first curator of the collection.' },
  { year: 1941, kind: 'gift', img: '1941-bock.jpg', alt: 'Box of papered beetles from the Bock collection', title: '300,000 beetles from G. W. Bock', text: 'A donation of papered beetles — many still in their original envelopes.' },
  { year: 1953, kind: 'people', img: '1953-enns.jpg', alt: 'Portrait of Wilbur R. Enns', title: 'Dr. Wilbur R. Enns, Director', text: 'Leads the museum for 25 years and shapes it into a research collection.' },
  { year: 1961, kind: 'gift', img: '1961-meiners.jpg', alt: 'Pinned moth with handwritten labels', title: '35,000 insects from E. P. Meiners', text: 'A large private collection, rich in Lepidoptera, joins the museum.' },
  { year: 1978, kind: 'people', img: '1978-yonke.jpg', alt: 'Portrait of Thomas Yonke', title: 'Dr. Thomas Yonke, Director', text: 'Directs the museum for 13 years.' },
  { year: 1980, kind: 'milestone', img: '1980-plaque.jpg', alt: 'Brass plaque reading Wilbur R. Enns Entomology Museum', contain: true, title: 'Renamed the Enns Entomology Museum', text: 'The collection takes the name of Wilbur R. Enns.' },
  { year: 1991, kind: 'people', img: '1991-sites.jpg', alt: 'Portrait of Robert Sites', title: 'Dr. Robert Sites, Director', text: 'Thirty-five years of leadership, with a strong focus on aquatic insects.' },
  { year: 1996, kind: 'gift', img: null, big: '4.5M', title: '4.5 million aquatic insects from MDC', text: 'The Missouri Department of Conservation deposits its statewide aquatic invertebrate samples — the largest donation in the museum’s history.' },
  { year: 2012, kind: 'gift', img: '2012-smart.jpg', alt: 'Drawer of spread moths', title: '5,880 Lepidoptera from Glen Smart', text: 'Moths and butterflies, carefully spread and labelled.' },
  { year: 2022, kind: 'gift', img: '2022-letsinger.jpg', alt: 'Drawer of tiger moths', title: '22,000 Lepidoptera from Rae Letsinger', text: 'One of the largest recent private donations.' },
  { year: 2025, kind: 'gift', img: '2025-mccarty.jpg', alt: 'Pinned bumble bees in a drawer', title: '2,500 Ozark bees from Ken McCarty', text: 'A regional bee collection that anchors our pollinator work.' },
  { year: 2026, kind: 'people', img: '2026-dalpos.jpg', alt: 'Portrait of Davide Dal Pos', title: 'Dr. Davide Dal Pos, Director', text: 'A new chapter: digitization and open data for the whole collection.' }
]
const shownEvents = computed(() => (kind.value === 'all' ? events : events.filter((e) => e.kind === kind.value)))

const holdings = [
  { img: 'c-compactors.jpg', alt: 'Aisle of compactor cabinets', value: '7M+', title: 'Specimens in the collection', text: 'Pinned, papered, slide-mounted and fluid-preserved material, 80–90% from the Ozark Plateau.' },
  { img: 'c-xerces.jpg', alt: 'Pinned Xerces blue butterfly', value: 'Type material', title: 'Rare and extinct species', text: 'Including the extinct Xerces blue and primary type specimens.' },
  { img: 'c-odonata.jpg', alt: 'Drawer of papered dragonflies', value: '38 drawers', title: 'Papered Odonata', text: 'Dragonflies and damselflies kept in envelopes.' },
  { img: 'c-galls.jpg', alt: 'Leaves with insect galls in a drawer', value: '24 drawers', title: 'Insect galls', text: 'About 309 galls on their host plants.' },
  { img: 'c-fossils.jpg', alt: 'Fossil insect slabs in a drawer', value: '1,780', title: 'Fossils', text: 'Insect fossils in 19 drawers.' },
  { img: 'c-slides.jpg', alt: 'Cabinet of microscope slide boxes', value: '35,000', title: 'Microscope slides', text: 'Stored in 442 slide boxes.' },
  { img: 'c-wet.jpg', alt: 'Shelves of vials and jars of preserved insects', value: '4.5M', title: 'Wet collection', text: 'Aquatic insects in ethanol, mostly from the MDC donation.' }
]


const work = [
  { title: 'Research', text: 'Specimens and data for taxonomists, ecologists and agricultural scientists.' },
  { title: 'Digitization', text: 'Cataloguing, imaging and georeferencing the collection, drawer by drawer.' },
  { title: 'Teaching', text: 'Hands-on material for University of Missouri courses and student projects.' },
  { title: 'Outreach', text: 'Extension programs, school visits and public events across Missouri.' }
]

function initials(n = '') {
  return n
    .split(/\s+/)
    .map((w) => w[0])
    .filter((c) => c && c === c.toUpperCase())
    .slice(0, 2)
    .join('')
}
</script>

<style scoped>

.eem-chip {
  padding: 0.35rem 0.9rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  font-weight: 600;
}
.eem-chip.on {
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}

.dark .eem-chip.on {
  background: var(--eem-gold);
  border-color: var(--eem-gold);
  color: #000;
}

/* Timeline */
.eem-tl {
  position: relative;
  list-style: none;
  padding: 0 0 0 1.75rem;
}
.eem-tl::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  bottom: 0.5rem;
  left: 0.45rem;
  width: 3px;
  background: var(--eem-gold);
}
.eem-tl-item {
  position: relative;
  margin-bottom: 1.75rem;
}
.eem-tl-dot {
  position: absolute;
  left: -1.75rem;
  top: 1.4rem;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 999px;
  background: var(--eem-paper);
  border: 3px solid var(--eem-ink);
  box-sizing: border-box;
}
.eem-tl-dot.people {
  background: var(--eem-gold);
}
.eem-tl-dot.gift {
  background: #000;
}
.eem-tl-card {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  overflow: hidden;
}
.eem-tl-img {
  background: #111;
  min-height: 100%;
}
.eem-tl-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.eem-tl-img img.contain {
  object-fit: contain;
  background: #b8893c;
}
.eem-tl-noimg {
  display: grid;
  place-items: center;
  background: var(--eem-gold);
  color: #000;
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 900;
  font-size: 1.6rem;
}
.eem-tl-tag {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 2px;
  border: 1.5px solid currentColor;
}
.eem-tl-tag.people {
  background: var(--eem-gold);
  border-color: var(--eem-gold);
  color: #000;
}
.eem-tl-tag.gift {
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}
@media (max-width: 479px) {
  .eem-tl-card {
    grid-template-columns: 5.5rem minmax(0, 1fr);
  }
  .eem-tl-card .p-5 {
    padding: 0.9rem;
  }
}
@media (min-width: 1024px) {
  .eem-tl {
    padding: 0;
  }
  .eem-tl::before {
    left: 50%;
    transform: translateX(-50%);
  }
  .eem-tl-item {
    width: calc(50% - 2.25rem);
    margin-bottom: -2.5rem;
  }
  .eem-tl-item:last-child {
    margin-bottom: 0;
  }
  .eem-tl-item.right {
    margin-left: auto;
  }
  .eem-tl-item.left .eem-tl-dot {
    left: auto;
    right: -2.85rem;
  }
  .eem-tl-item.right .eem-tl-dot {
    left: -2.85rem;
  }
  .eem-tl-card {
    grid-template-columns: 9.5rem minmax(0, 1fr);
  }
}

/* Holdings grid */
.eem-hold {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.eem-hold img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  display: block;
}
@media (min-width: 1024px) {
  .eem-hold.wide {
    flex-direction: row;
  }
  .eem-hold.wide img {
    width: 45%;
    height: 13rem;
    aspect-ratio: auto;
  }
  .eem-hold.big img {
    aspect-ratio: auto;
    flex: 1;
    min-height: 0;
  }
}
.eem-avatar {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 999px;
  background: #000;
  color: var(--eem-gold);
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
}
</style>
