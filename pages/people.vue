<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="People"
      title="Students & collaborators"
      lede="The museum is a place to learn, do research and work together. Here is how to get involved — and who is already part of it."
    />

    <!-- Ways in -->
    <section class="container mx-auto box-border px-4 py-14">
      <ul class="grid lg:grid-cols-3 gap-6">
        <li
          v-for="(p, i) in paths"
          :id="p.id"
          :key="p.id"
          class="eem-card eem-path"
        >
          <span class="eem-display text-5xl text-[color:var(--eem-gold-deep)]">{{ String(i + 1).padStart(2, '0') }}</span>
          <h2 class="eem-display mt-3 text-2xl">{{ p.title }}</h2>
          <p class="mt-2 eem-muted leading-relaxed">{{ p.lede }}</p>
          <ul class="mt-5 space-y-3">
            <li
              v-for="b in p.items"
              :key="b.title"
              class="border-l-4 border-[color:var(--eem-gold)] pl-4"
            >
              <h3 class="font-bold">{{ b.title }}</h3>
              <p class="text-sm eem-muted leading-relaxed mt-0.5">{{ b.text }}</p>
            </li>
          </ul>
          <p
            v-if="p.note"
            class="mt-5 text-sm leading-relaxed"
          >
            {{ p.note }}
          </p>
          <div class="mt-auto pt-6 flex flex-wrap gap-3">
            <a
              :href="mailto(p.subject)"
              class="eem-btn eem-btn-gold"
              >{{ p.cta }}</a
            >
            <RouterLink
              v-if="p.id === 'collaborators'"
              to="/visit"
              class="eem-btn eem-btn-line"
              >Visits &amp; loans</RouterLink
            >
          </div>
        </li>
      </ul>
      <p class="mt-6 text-sm eem-muted">
        Write to
        <a
          :href="mailto('')"
          class="eem-link"
          >{{ email }}</a
        >
        — a few lines about who you are and what interests you is all it takes to start.
      </p>
    </section>

    <!-- Community -->
    <section class="border-t eem-rule bg-[color:var(--eem-paper-2)]">
      <div class="container mx-auto box-border px-4 py-16">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eem-kicker">Our community</p>
            <h2 class="eem-display mt-3 text-3xl sm:text-4xl">Who works with the collection</h2>
            <p class="mt-2 eem-muted max-w-2xl">
              Staff, students and collaborators who have joined the museum network.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <a
              :href="`${NETWORK}/join`"
              target="_blank"
              rel="noopener"
              class="eem-btn eem-btn-gold"
              >Add yourself</a
            >
            <a
              :href="NETWORK"
              target="_blank"
              rel="noopener"
              class="eem-btn eem-btn-line"
              >Community map ↗</a
            >
          </div>
        </div>

        <p
          v-if="loading"
          class="mt-8 eem-muted"
        >
          Loading…
        </p>

        <template v-else>
          <div
            v-for="g in groups"
            :key="g.key"
            class="mt-10"
          >
            <h3 class="eem-group">
              {{ g.label }} <span>{{ g.people.length }}</span>
            </h3>
            <ul class="mt-4 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <li
                v-for="p in g.people"
                :key="p.name"
                class="eem-card eem-person"
              >
                <span
                  class="eem-initials"
                  aria-hidden="true"
                  >{{ initials(p.name) }}</span
                >
                <div class="min-w-0 flex-1">
                  <p class="font-bold leading-tight">
                    {{ p.name }}<span
                      v-if="p.deceased"
                      class="eem-muted font-normal"
                      title="In memoriam"
                    >
                      †</span
                    >
                  </p>
                  <p class="text-sm eem-muted mt-0.5">
                    {{ p.historical ? [p.formerRole, [p.startYear, p.endYear].filter(Boolean).join('–')].filter(Boolean).join(', ') : p.title || p.careerStage }}
                  </p>
                  <p
                    v-if="p.deceased && (p.born || p.died)"
                    class="text-xs eem-muted"
                  >
                    In memoriam · {{ p.born || '?' }}–{{ p.died || '?' }}
                  </p>
                  <p class="text-sm mt-0.5">{{ cleanAff(p.affiliation) }}</p>
                  <p
                    v-if="p.note"
                    class="text-sm mt-2 italic leading-snug"
                  >
                    {{ p.note }}
                  </p>
                  <p
                    v-if="p.taxa?.length"
                    class="mt-2 flex flex-wrap gap-1"
                  >
                    <span
                      v-for="t in p.taxa"
                      :key="t"
                      class="eem-taxon"
                      >{{ t }}</span
                    >
                  </p>
                  <p class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                    <a
                      v-if="p.orcid"
                      :href="`https://orcid.org/${p.orcid}`"
                      target="_blank"
                      rel="noopener"
                      class="eem-link"
                      >ORCID</a
                    >
                    <a
                      v-if="p.website"
                      :href="p.website"
                      target="_blank"
                      rel="noopener"
                      class="eem-link"
                      >Website</a
                    >
                    <span
                      v-if="p.startYear && !p.historical"
                      class="eem-muted font-normal"
                      >with the museum since {{ p.startYear }}</span
                    >
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <p class="mt-6 text-xs eem-muted">
            Only people who chose to appear publicly are listed. Updated {{ updated }}.
          </p>
        </template>
      </div>
    </section>

    <!-- Live community network: map, table, timeline and visitors -->
    <section class="container mx-auto box-border px-4 py-16">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eem-kicker">Community map</p>
          <h2 class="eem-display mt-3 text-3xl sm:text-4xl">Our network and visitors</h2>
          <p class="mt-2 eem-muted max-w-2xl">
            Everyone connected to the museum, on a map and in a table, with how the community has grown over time and
            the schools, classes and groups that have visited. Use the Map / List switch inside to change view.
          </p>
        </div>
        <a
          :href="NETWORK"
          target="_blank"
          rel="noopener"
          class="eem-btn eem-btn-line"
          >Open full screen ↗</a
        >
      </div>
      <div class="eem-network mt-6">
        <iframe
          :src="NETWORK"
          title="Enns Entomology Museum community map and visitors"
          loading="lazy"
          referrerpolicy="no-referrer"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'

useHead({ title: 'Students & collaborators — Enns Entomology Museum' })

const NETWORK = 'https://enns-museum-community.netlify.app'
const base = import.meta.env.BASE_URL || '/'
const email = info.director.email || info.email
const mailto = (subject) => `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`

// Edit the text of the three paths here
const paths = [
  {
    id: 'undergraduates',
    title: 'Undergraduates',
    lede: 'No experience needed — curiosity and care with fragile things are enough.',
    items: [
      { title: 'Work in the collection', text: 'Paid student positions digitizing, labelling and imaging specimens, when funding is available.' },
      { title: 'Research experience', text: 'Independent projects for credit or an honors thesis, built on specimens and their data.' },
      { title: 'Courses and outreach', text: 'Classes that use the collection, and museum events, school visits and the Showcase.' }
    ],
    cta: 'Ask about openings',
    subject: 'Undergraduate opportunities at the Enns Museum'
  },
  {
    id: 'graduate',
    title: 'Graduate students',
    lede: 'M.S. and Ph.D. projects advised by the museum director, through graduate programs at the University of Missouri.',
    items: [
      { title: 'Systematics & morphology', text: 'Taxonomy, phylogeny and comparative anatomy — especially parasitoid wasps and hoverflies.' },
      { title: 'Biodiversity informatics', text: 'Digitization, specimen data, georeferencing and open biodiversity databases.' },
      { title: 'Collections & change', text: 'Using historical specimens to study how Missouri’s insects have changed.' }
    ],
    note: 'Get in touch early, ideally a year before you apply: assistantships are limited, and we are happy to help with fellowship applications such as the NSF GRFP.',
    cta: 'Email about a project',
    subject: 'Graduate study at the Enns Museum'
  },
  {
    id: 'collaborators',
    title: 'Collaborators',
    lede: 'Researchers, agencies, educators and naturalists — the collection is open to everyone working on insects.',
    items: [
      { title: 'Specimens and data', text: 'Loans, visits to work with the drawers, and data shared through TaxonWorks and GBIF.' },
      { title: 'Expertise', text: 'Help identify and curate groups you know — and become a research associate.' },
      { title: 'Joint projects', text: 'Grants, co-advised students, publications and outreach.' }
    ],
    cta: 'Start a conversation',
    subject: 'Collaboration with the Enns Museum'
  }
]

const loading = ref(true)
const data = ref({ people: [], updated: '' })

onMounted(async () => {
  // Copy of the public list from the museum-network repo (public/associates-public.json)
  const sources = [`${base}data/community.json`]
  for (const url of sources) {
    try {
      const r = await fetch(url)
      if (!r.ok) continue
      const json = await r.json()
      if (Array.isArray(json?.people)) {
        data.value = json
        break
      }
    } catch {
      /* try the next source */
    }
  }
  loading.value = false
})

const GROUPS = [
  { key: 'team', label: 'Museum team' },
  { key: 'students', label: 'Students' },
  { key: 'collab', label: 'Research associates & collaborators' },
  { key: 'former', label: 'Former staff & in memoriam' }
]

function groupOf(p) {
  if (p.historical) return 'former'
  if (p.staff || /technician|curator|collection manager/i.test(p.title || '')) return 'team'
  if (/research associate|collaborator/i.test(p.role || '')) return 'collab'
  if (/student|mentee/i.test(`${p.role} ${p.careerStage}`)) return 'students'
  return 'collab'
}

const groups = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    people: data.value.people.filter((p) => groupOf(p) === g.key).sort((a, b) => (a.staff === b.staff ? 0 : a.staff ? -1 : 1))
  })).filter((g) => g.people.length)
)

const updated = computed(() => {
  const d = new Date(data.value.updated)
  return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
})

const cleanAff = (a = '') => a.replace(/University of missouri/i, 'University of Missouri').replace(/ - Columbia$/, '')

function initials(n = '') {
  return n
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}
</script>

<style scoped>
.eem-network {
  border: 1px solid var(--eem-rule);
  border-top: 4px solid #000;
  background: var(--eem-card);
}
.eem-network iframe {
  display: block;
  width: 100%;
  height: min(80vh, 760px);
  min-height: 560px;
  border: 0;
}
.eem-path {
  display: flex;
  flex-direction: column;
  padding: 1.75rem;
  border-top: 4px solid #000;
  scroll-margin-top: 6rem;
}
.eem-group {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--eem-ink);
}
.eem-group span {
  font-size: 0.7rem;
  padding: 0.05rem 0.45rem;
  background: var(--eem-gold);
  color: #000;
  border-radius: 2px;
}
.eem-person {
  display: flex;
  gap: 1rem;
  padding: 1.1rem;
  height: 100%;
  box-sizing: border-box;
}
.eem-initials {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  background: #000;
  color: var(--eem-gold);
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 800;
}
.eem-taxon {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.05rem 0.45rem;
  border: 1px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-paper);
}
</style>
