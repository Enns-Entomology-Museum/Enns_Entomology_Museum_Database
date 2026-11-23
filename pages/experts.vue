<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Find an expert"
      title="Who works on which insects?"
      lede="The museum's collaboration network: researchers, students and curators who work with the Enns Entomology Museum, by the insect orders and families they study. Pick a group, or type a family name."
    />

    <section class="container mx-auto box-border px-4 py-10">
      <!-- search and orders -->
      <div class="ex-search">
        <input
          v-model="query"
          type="search"
          class="ex-input"
          placeholder="Order or family, e.g. Hymenoptera, Syrphidae"
          aria-label="Insect order or family"
          list="ex-options"
        />
        <datalist id="ex-options">
          <option
            v-for="g in allGroups"
            :key="g"
            :value="g"
          />
        </datalist>
        <button
          v-if="query"
          type="button"
          class="eem-btn eem-btn-line"
          @click="query = ''"
        >
          Clear
        </button>
      </div>
      <div class="ex-orders">
        <button
          v-for="o in orders"
          :key="o.name"
          type="button"
          class="ex-order"
          :class="{ on: fold(query) === fold(o.name) }"
          @click="query = fold(query) === fold(o.name) ? '' : o.name"
        >
          {{ o.name }} <b>{{ o.n }}</b>
        </button>
      </div>

      <p
        v-if="loading"
        class="eem-muted mt-6"
      >
        Loading the network…
      </p>
      <template v-else>
        <p class="ex-count">
          <template v-if="query">
            <b>{{ found.length }}</b> {{ found.length === 1 ? 'person works' : 'people work' }} on
            <b>{{ query }}</b> ·
            <a
              :href="`${NETWORK}/?group=${encodeURIComponent(query)}`"
              target="_blank"
              rel="noopener"
            >see them on the network map ↗</a>
          </template>
          <template v-else>
            <b>{{ found.length }}</b> people in the network · pick a group to narrow the list
          </template>
        </p>

        <div class="ex-grid">
          <article
            v-for="p in found"
            :key="(p.name || '') + (p.affiliation || '') + (p.city || '')"
            class="ex-card"
          >
            <h3>{{ p.name || p.affiliation }}</h3>
            <p class="ex-aff">
              {{ [p.name ? p.affiliation : '', p.department].filter(Boolean).join(' · ') }}
            </p>
            <p class="ex-place">
              {{ [p.city, p.country].filter(Boolean).join(', ') }}<template v-if="p.careerStage"> · {{ p.careerStage }}</template>
            </p>
            <div class="ex-tags">
              <span
                v-for="t in p.taxa || []"
                :key="t"
                class="ex-tag"
                :class="{ hit: query && fold(t).includes(fold(query)) }"
              >{{ t }}</span>
            </div>
            <p
              v-if="p.families"
              class="ex-fam"
            >
              {{ p.families }}
            </p>
            <p class="ex-links">
              <a
                v-if="p.orcid"
                :href="`https://orcid.org/${p.orcid}`"
                target="_blank"
                rel="noopener"
              >ORCID</a>
              <a
                v-if="p.website && /^https?:\/\//i.test(p.website)"
                :href="p.website"
                target="_blank"
                rel="noopener"
              >Website</a>
            </p>
          </article>
        </div>
        <p
          v-if="query && !found.length"
          class="eem-muted mt-4"
        >
          Nobody in the network lists {{ query }} yet.
        </p>

        <div class="ex-join eem-card">
          <p class="eem-kicker">Not listed?</p>
          <p class="mt-2">
            If you work with the museum, add yourself to the network — with the orders and families you study — and you
            will appear here and on the
            <a
              :href="NETWORK"
              target="_blank"
              rel="noopener"
            >network map</a>.
          </p>
          <a
            :href="`${NETWORK}/join`"
            class="eem-btn mt-4 inline-block"
            target="_blank"
            rel="noopener"
          >Add yourself to the network</a>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'
import EemPageHead from './components/EemPageHead.vue'

useHead({ title: 'Find an expert — Enns Entomology Museum' })

// The live list of the collaboration network (the same file as the People page and the network map)
const NETWORK = 'https://enns-museum-community.netlify.app'
const base = import.meta.env.BASE_URL || '/'
const route = useRoute()
const router = useRouter()

const people = ref([])
const loading = ref(true)
const query = ref(String(route.query.group || ''))
watch(query, (q) => router.replace({ query: q ? { group: q } : {} }))

const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const familiesOf = (p) => String(p.families || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean)
const groupsOf = (p) => [...(p.taxa || []), ...familiesOf(p)]

onMounted(async () => {
  for (const url of [`${NETWORK}/associates-public.json`, `${base}data/community.json`]) {
    try {
      const r = await fetch(url)
      if (!r.ok) continue
      const json = await r.json()
      if (Array.isArray(json?.people)) {
        people.value = json.people.filter((p) => !p.historical && groupsOf(p).length)
        break
      }
    } catch {
      /* try the next source */
    }
  }
  loading.value = false
})

const orders = computed(() => {
  const n = {}
  for (const p of people.value) for (const t of p.taxa || []) n[t] = (n[t] || 0) + 1
  return Object.entries(n).map(([name, count]) => ({ name, n: count })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
})
const allGroups = computed(() => [...new Set(people.value.flatMap(groupsOf))].sort())
const found = computed(() => {
  const q = fold(query.value)
  return people.value
    .filter((p) => !q || groupsOf(p).some((g) => fold(g).includes(q)))
    .sort((a, b) => (a.name || a.affiliation || '').localeCompare(b.name || b.affiliation || ''))
})
</script>

<style scoped>
.ex-search {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.ex-input {
  flex: 1;
  max-width: 34rem;
  padding: 0.7rem 0.9rem;
  border: 2px solid #000;
  font-size: 1rem;
  background: #fff;
}
.ex-orders {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 1rem;
}
.ex-order {
  padding: 0.3rem 0.7rem;
  border: 1px solid #000;
  background: #fff;
  font-size: 0.85rem;
  cursor: pointer;
}
.ex-order b {
  margin-left: 0.25rem;
  color: #8c640a;
}
.ex-order.on,
.ex-order:hover {
  background: #000;
  color: #fdb719;
}
.ex-order.on b,
.ex-order:hover b {
  color: #fff;
}
.ex-count {
  margin: 1.6rem 0 1rem;
  font-size: 0.95rem;
}
.ex-count a {
  text-decoration: underline;
}
.ex-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 0.9rem;
}
.ex-card {
  background: #fff;
  border-top: 5px solid #fdb719;
  padding: 0.9rem 1rem;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
}
.ex-card h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
}
.ex-card p {
  margin: 0;
}
.ex-aff {
  margin-top: 0.2rem !important;
  font-size: 0.85rem;
}
.ex-place {
  font-size: 0.78rem;
  color: #6b665c;
}
.ex-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.55rem;
}
.ex-tag {
  padding: 0.05rem 0.45rem;
  background: #1a1a1a;
  color: #fdb719;
  font-size: 0.72rem;
  font-weight: 600;
}
.ex-tag.hit {
  background: #fdb719;
  color: #000;
}
.ex-fam {
  margin-top: 0.35rem !important;
  font-size: 0.82rem;
  font-style: italic;
}
.ex-links {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.5rem !important;
  font-size: 0.8rem;
}
.ex-links a {
  text-decoration: underline;
}
.ex-join {
  margin-top: 2rem;
  padding: 1.2rem 1.3rem;
  max-width: 44rem;
}
.ex-join a:not(.eem-btn) {
  text-decoration: underline;
}
</style>
