<template>
  <div class="eem">
    <!-- Hero -->
    <section class="eem-hero">
      <div class="container mx-auto box-border px-4 pt-14 pb-16 sm:pt-20 sm:pb-20 grid lg:grid-cols-12 gap-12 items-center">
        <div class="lg:col-span-7 min-w-0">
          <p class="eem-kicker !text-[color:var(--eem-gold)]">University of Missouri · Since 1874</p>
          <h1 class="eem-display mt-5 text-white uppercase leading-[0.92] text-[2.3rem] min-[400px]:text-[2.7rem] sm:text-7xl lg:text-[5.4rem]">
            Enns<br />
            <span class="text-[color:var(--eem-gold)]">Entomology</span><br />
            Museum
          </h1>
          <p class="mt-7 text-lg sm:text-xl leading-relaxed text-white/80 max-w-xl">
            More than 7 million insects, most from the Ozark Plateau and Missouri, preserved for
            research, teaching and the public since 1874 — and now, one specimen at a time, coming online.
          </p>

          <EemSearch class="mt-9 max-w-xl" />
          <p class="mt-3 text-sm text-white/60">
            One box for everything: type a name to find a taxon, or a catalog number from a specimen label.
            Prefer to browse? <RouterLink to="/tree" class="!text-[color:var(--eem-gold)] underline">Explore the taxonomic tree</RouterLink>.
          </p>
        </div>

        <!-- Digitization meter -->
        <aside class="lg:col-span-5">
          <div class="eem-meter">
            <p class="eem-kicker">Digitization</p>
            <p class="mt-4 eem-display text-5xl sm:text-6xl tabular-nums leading-none">
              <span :class="{ 'eem-skel': specimens === null }">{{ fmt(specimens) }}</span>
            </p>
            <p class="mt-2 text-white/70">specimens online so far</p>

            <div
              class="eem-bar mt-7"
              role="img"
              :aria-label="`${fmt(specimens)} of about ${fmt(COLLECTION_ESTIMATE)} specimens digitized`"
            >
              <span :style="{ width: barWidth }" />
            </div>
            <div class="mt-2 flex justify-between text-xs text-white/60">
              <span>{{ pct }}</span>
              <span>~{{ (COLLECTION_ESTIMATE / 1e6).toFixed(0) }} million specimens in the collection</span>
            </div>

            <p
              v-if="since"
              class="mt-6 text-sm text-white/70"
            >
              Digitizing since <strong class="text-white">{{ since }}</strong> — every record links back to a
              physical specimen in our drawers.
            </p>
          </div>
        </aside>
      </div>
    </section>

    <!-- Numbers -->
    <section class="border-b eem-rule">
      <div class="container mx-auto box-border px-4">
        <dl class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div
            v-for="s in stats"
            :key="s.label"
            class="eem-stat"
          >
            <dt class="text-xs font-bold uppercase tracking-[0.14em] eem-muted">{{ s.label }}</dt>
            <dd class="eem-display mt-2 text-4xl tabular-nums">
              <span :class="{ 'eem-skel': s.value === undefined }">{{ fmt(s.value) }}</span>
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- Missouri checklist -->
    <EemMissouriBand />

    <!-- What's in the drawers + map -->
    <section class="container mx-auto box-border px-4 py-16 sm:py-20 grid lg:grid-cols-12 gap-12">
      <div class="lg:col-span-5">
        <p class="eem-kicker">What’s been digitized</p>
        <h2 class="eem-display mt-3 text-3xl sm:text-4xl">Orders in the database</h2>
        <p class="mt-3 eem-muted">{{ sampleNote }}</p>

        <ul class="mt-7 space-y-3">
          <li
            v-for="o in orders"
            :key="o.name"
          >
            <div class="flex items-baseline justify-between gap-3">
              <span>
                <strong class="font-semibold">{{ o.name }}</strong>
                <span
                  v-if="ORDER_NAMES[o.name]"
                  class="eem-muted text-sm"
                >
                  · {{ ORDER_NAMES[o.name] }}</span
                >
              </span>
              <span class="tabular-nums text-sm font-semibold">{{ fmt(o.n) }}</span>
            </div>
            <div class="eem-hbar mt-1.5">
              <span :style="{ width: o.share + '%' }" />
            </div>
          </li>
          <li
            v-if="eem.loaded && !orders.length"
            class="eem-muted"
          >
            No records yet.
          </li>
        </ul>
        <RouterLink
          to="/collection"
          class="eem-link inline-block mt-7"
          >Explore the collection →</RouterLink
        >
      </div>

      <div class="lg:col-span-7">
        <p class="eem-kicker">Where they come from</p>
        <h2 class="eem-display mt-3 text-3xl sm:text-4xl">Collecting localities</h2>
        <div class="mt-6 eem-card p-2">
          <ClientOnly>
            <EemMap
              :points="points"
              height="440px"
            />
          </ClientOnly>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="s in states.slice(0, 8)"
            :key="s.name"
            class="eem-chip"
            >{{ s.name }} <b>{{ s.n }}</b></span
          >
        </div>
      </div>
    </section>

    <!-- Specimen photos -->
    <EemPhotos />

    <!-- Recently digitized -->
    <section class="eem-recent border-y eem-rule">
      <div class="container mx-auto box-border px-4 py-16 sm:py-20">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eem-kicker">Fresh from the drawers</p>
            <h2 class="eem-display mt-3 text-3xl sm:text-4xl">Recently digitized</h2>
          </div>
          <RouterLink
            to="/resources/tw/filter/dwc_otus"
            class="eem-link"
            >Search all specimens →</RouterLink
          >
        </div>

        <ul class="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <template v-if="!eem.loaded">
            <li
              v-for="n in 4"
              :key="n"
              class="eem-skel block h-44 w-full"
            />
          </template>
          <li
            v-for="r in recent"
            :key="r.id"
          >
            <RouterLink
              :to="{ path: '/specimen', query: { cat: r.catalogNumber } }"
              class="eem-label group block h-full"
            >
              <span class="eem-label-cat">{{ r.catalogNumber || 'No catalog number' }}</span>
              <span class="block mt-3 text-[1.02rem] font-semibold leading-snug italic group-hover:underline">{{
                taxonOf(r)
              }}</span>
              <span class="block mt-1 text-xs eem-muted">{{ r.order }}<template v-if="r.family"> · {{ r.family }}</template></span>
              <span class="block mt-3 text-sm leading-snug">{{ placeOf(r) }}</span>
              <span class="block mt-1 text-sm eem-muted">{{ r.eventDate || r.year || 'Date unknown' }}<template v-if="r.recordedBy"> · {{ r.recordedBy }}</template></span>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- News -->
    <div class="border-b eem-rule">
      <EemNews />
    </div>

    <!-- Use the collection -->
    <section class="container mx-auto box-border px-4 py-16 sm:py-20">
      <p class="eem-kicker">Use the collection</p>
      <h2 class="eem-display mt-3 text-3xl sm:text-4xl max-w-2xl">Open to researchers, students and the public</h2>

      <div class="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <RouterLink
          v-for="c in uses"
          :key="c.title"
          :to="c.to"
          class="eem-use group"
        >
          <span class="eem-use-num">{{ c.n }}</span>
          <h3 class="eem-display text-xl mt-6 group-hover:underline underline-offset-4 decoration-[color:var(--eem-gold)] decoration-2">{{ c.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed eem-muted">{{ c.text }}</p>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import EemMap from './components/EemMap.vue'
import EemMissouriBand from './components/EemMissouriBand.vue'
import EemNews from './components/EemNews.vue'
import EemPhotos from './components/EemPhotos.vue'
import EemSearch from './components/EemSearch.vue'
import { COLLECTION_ESTIMATE, ORDER_NAMES, countBy, fmt, useEem } from './components/useEem.js'

useHead({ title: 'Enns Entomology Museum — University of Missouri' })

const eem = useEem()

const specimens = computed(() =>
  eem.stats['Collection objects'] !== undefined ? eem.stats['Collection objects'] : eem.totalRecords
)

const barWidth = computed(() => {
  const n = specimens.value || 0
  return Math.max(0.6, (n / COLLECTION_ESTIMATE) * 100) + '%'
})
const pct = computed(() => {
  const n = specimens.value
  if (!n) return '0%'
  const p = (n / COLLECTION_ESTIMATE) * 100
  return p < 0.01 ? '< 0.01%' : `${p.toFixed(p < 1 ? 2 : 1)}%`
})

const since = computed(() => {
  const dates = eem.records.map((r) => r.created_at).filter(Boolean).sort()
  if (!dates.length) return ''
  const d = new Date(dates[0])
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const stats = computed(() => [
  { label: 'Specimens', value: eem.stats['Collection objects'] },
  { label: 'Taxa', value: eem.stats['Otus'] },
  { label: 'Collecting events', value: eem.stats['Collecting events'] },
  { label: 'Georeferenced', value: eem.stats['Georeferences'] },
  { label: 'Images', value: eem.stats['Images'] },
  { label: 'Loans', value: eem.stats['Loans'] }
])

const orders = computed(() => {
  const list = countBy(eem.records, 'order').slice(0, 10)
  const max = Math.max(1, ...list.map((o) => o.n))
  return list.map((o) => ({ ...o, share: (o.n / max) * 100 }))
})

const sampleNote = computed(() => {
  if (!eem.loaded) return 'Counting records…'
  const n = eem.records.length
  const total = eem.totalRecords || n
  return n < total
    ? `Based on the ${fmt(n)} most recently digitized specimens (of ${fmt(total)}).`
    : `Every digitized specimen, grouped by insect order.`
})

const states = computed(() => countBy(eem.records, 'stateProvince'))

const points = computed(() =>
  eem.records
    .filter((r) => r.decimalLatitude && r.decimalLongitude)
    .map((r) => ({
      lat: Number(r.decimalLatitude),
      lng: Number(r.decimalLongitude),
      html: `<strong>${r.catalogNumber || ''}</strong><br><i>${r.scientificName || ''}</i><br>${placeOf(r)}`
    }))
)

const recent = computed(() => eem.records.slice(0, 8))

function taxonOf(r) {
  return (r.scientificName || [r.genus, r.specificEpithet].filter(Boolean).join(' ') || r.family || r.order || 'Unidentified')
    .replace(/\s+\(?[A-Z][^()]*,\s*\d{4}\)?$/, '')
}

function placeOf(r) {
  return [r.county ? `${r.county} Co.` : '', r.stateProvince, r.country === 'United States' ? 'USA' : r.country]
    .filter(Boolean)
    .join(', ') || r.verbatimLocality || 'Locality not given'
}

const uses = [
  { n: '01', title: 'Research loans', text: 'Borrow specimens for taxonomic and ecological research.', to: '/visit' },
  { n: '02', title: 'Visit the collection', text: 'Work with the drawers in person — by appointment.', to: '/visit' },
  { n: '03', title: 'Teaching & outreach', text: 'Classes, extension programs and public events.', to: '/outreach' },
  { n: '04', title: 'Donate specimens', text: 'Give your collection a permanent, documented home.', to: '/donate' }
]
</script>

<style scoped>
.eem-hero {
  background:
    radial-gradient(circle at 88% 10%, rgba(241, 184, 45, 0.18), transparent 40%),
    #000;
  border-bottom: 6px solid var(--eem-gold);
}
.eem-meter {
  background: #111;
  border: 1px solid #2d2d2d;
  border-top: 4px solid var(--eem-gold);
  padding: 1.75rem;
  color: #fff;
}
.eem-bar {
  height: 14px;
  background: #2b2b2b;
  border-radius: 2px;
  overflow: hidden;
}
.eem-bar span {
  display: block;
  height: 100%;
  background: var(--eem-gold);
  transition: width 1s ease;
}
.eem-stat {
  padding: 1.6rem 1rem 1.6rem 0;
  border-bottom: 1px solid var(--eem-rule);
}
@media (min-width: 1024px) {
  .eem-stat {
    border-bottom: 0;
  }
  .eem-stat + .eem-stat {
    padding-left: 1.25rem;
    border-left: 1px solid var(--eem-rule);
  }
}
.eem-hbar {
  height: 8px;
  background: var(--eem-paper-2);
  border-radius: 1px;
}
.eem-hbar span {
  display: block;
  height: 100%;
  background: var(--eem-gold);
  border-radius: 1px;
  transition: width 0.8s ease;
}
.eem-chip {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
}
.eem-chip b {
  margin-left: 0.25rem;
  color: var(--eem-gold-deep);
}
.eem-recent {
  background: var(--eem-paper-2);
}
/* Specimen cards styled like museum data labels */
.eem-label {
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-left: 4px solid #000;
  padding: 1rem 1.1rem 1.1rem;
  color: var(--eem-ink) !important;
  font-family: 'Inter', system-ui, sans-serif;
  transition: border-color 0.15s, transform 0.15s;
}
.eem-label:hover {
  border-left-color: var(--eem-gold);
  transform: translateY(-2px);
}
.eem-label-cat {
  display: inline-block;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.15rem 0.45rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-use {
  display: block;
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-top: 4px solid #000;
  padding: 1.4rem 1.4rem 1.6rem;
  color: var(--eem-ink) !important;
  transition: border-color 0.15s;
}
.eem-use:hover {
  border-top-color: var(--eem-gold);
}
.eem-use-num {
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 900;
  font-size: 2.2rem;
  line-height: 1;
  color: var(--eem-gold);
  -webkit-text-stroke: 1px #000;
}
</style>
