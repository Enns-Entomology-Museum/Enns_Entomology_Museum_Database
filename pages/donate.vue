<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Support the museum"
      title="Donate"
      lede="Nearly five million of the museum's specimens arrived as gifts. A donated collection becomes a permanent, documented and shared record of biodiversity — cared for and available to researchers for generations."
    />

    <!-- Two ways -->
    <section class="container mx-auto box-border px-4 py-14 grid lg:grid-cols-2 gap-6">
      <article class="eem-card eem-way">
        <p class="eem-kicker">Specimens</p>
        <h2 class="eem-display text-3xl mt-3">Donate a collection</h2>
        <p class="mt-3 leading-relaxed">
          We welcome well-labelled insect and arthropod collections, especially from Missouri and the Ozark Plateau:
          life-long private collections, student and class collections, and research material from finished projects.
        </p>
        <a
          :href="mailto('Donating a collection to the Enns Museum')"
          class="eem-btn eem-btn-gold mt-6 self-start"
          >Talk to us about a donation</a
        >
      </article>

      <article
        id="friends"
        class="eem-card eem-way eem-way-dark"
        :class="{ glow: focusGive }"
      >
        <p class="eem-kicker !text-[color:var(--eem-gold)]">Friends of the Museum</p>
        <h2 class="eem-display text-3xl mt-3 text-white">Become a Friend of the Museum</h2>
        <p class="mt-3 leading-relaxed text-white/80">
          Gifts of any size support the Enns Endowment: cabinets and drawers, digitization, student positions and
          outreach — the things that keep a collection alive and open. Friends hear first about new acquisitions,
          events and behind-the-scenes visits.
        </p>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <a
            v-if="info.givingUrl"
            :href="info.givingUrl"
            target="_blank"
            rel="noopener"
            class="eem-btn eem-btn-gold"
            >Donate online ↗</a
          >
          <template v-else>
            <span
              class="eem-btn eem-btn-gold opacity-60 cursor-not-allowed"
              aria-disabled="true"
              >Donate online</span
            >
            <span class="eem-soon">Coming soon</span>
          </template>
          <a
            :href="mailto('Becoming a Friend of the Enns Museum')"
            class="eem-btn eem-btn-line !border-white !text-white"
            >Contact the director</a
          >
        </div>
        <p
          v-if="!info.givingUrl"
          class="mt-4 text-sm text-white/60"
        >
          Online giving opens soon. To give now, please write to the director.
        </p>
      </article>
    </section>

    <!-- What makes a good donation -->
    <section class="border-y eem-rule bg-[color:var(--eem-paper-2)]">
      <div class="container mx-auto box-border px-4 py-16 grid lg:grid-cols-12 gap-10">
        <div class="lg:col-span-4">
          <p class="eem-kicker">Before you donate</p>
          <h2 class="eem-display text-3xl sm:text-4xl mt-3">What makes a collection valuable</h2>
          <p class="mt-3 eem-muted leading-relaxed">
            The data matter as much as the insects. A specimen without a label can't tell us where or when it lived.
          </p>
        </div>
        <ol class="lg:col-span-8 grid sm:grid-cols-2 gap-4">
          <li
            v-for="(t, i) in tips"
            :key="t.title"
            class="eem-card p-5 flex gap-4"
          >
            <span class="eem-display text-3xl text-[color:var(--eem-gold-deep)] leading-none">{{ i + 1 }}</span>
            <span>
              <b class="block">{{ t.title }}</b>
              <span class="text-sm eem-muted leading-relaxed block mt-1">{{ t.text }}</span>
            </span>
          </li>
        </ol>
      </div>
    </section>

    <!-- Process -->
    <section class="container mx-auto box-border px-4 py-16">
      <p class="eem-kicker">How it works</p>
      <h2 class="eem-display text-3xl sm:text-4xl mt-3">From your cabinet to ours</h2>
      <ol class="eem-steps mt-8">
        <li
          v-for="(s, i) in steps"
          :key="s.title"
        >
          <span class="eem-step-n">{{ i + 1 }}</span>
          <h3 class="font-bold mt-3">{{ s.title }}</h3>
          <p class="text-sm eem-muted mt-1 leading-relaxed">{{ s.text }}</p>
        </li>
      </ol>

      <div class="mt-12 eem-card p-6 sm:p-8 eem-accent-l flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 class="eem-display text-2xl">Recent gifts</h2>
          <p class="mt-1 eem-muted">
            Ken McCarty's 2,500 Ozark bees (2025), Rae Letsinger's 22,000 Lepidoptera (2022) and Glen Smart's 5,880
            Lepidoptera (2012) are among the collections that joined the museum.
          </p>
        </div>
        <RouterLink
          to="/highlights"
          class="eem-btn eem-btn-line shrink-0"
          >See the collections</RouterLink
        >
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'

useHead({ title: 'Donate — Enns Entomology Museum' })

const route = useRoute()
const focusGive = computed(() => !!route.query.give)
async function showFriends() {
  if (!focusGive.value) return
  await nextTick()
  document.getElementById('friends')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
onMounted(showFriends)
watch(() => route.query.give, showFriends)

const email = info.email || info.director.email
const mailto = (subject) => `mailto:${email}?subject=${encodeURIComponent(subject)}`

const tips = [
  { title: 'Labels with every specimen', text: 'Where (as precisely as possible), when, and who collected it.' },
  { title: 'Keep things together', text: 'Don’t separate specimens from their labels, notes or field books.' },
  { title: 'Field notebooks and lists', text: 'Notebooks, catalogues and spreadsheets add context we can digitize.' },
  { title: 'Pests out, please', text: 'Freeze the boxes if you can and let us know about any damage or mould.' }
]

const steps = [
  { title: 'Get in touch', text: 'Tell us roughly what you have: groups, number of drawers or boxes, places and years.' },
  { title: 'We take a look', text: 'We visit or ask for photos, and agree on what the museum can accept.' },
  { title: 'Deed of gift', text: 'A simple agreement transfers the collection to the University of Missouri.' },
  { title: 'Into the museum', text: 'Specimens are frozen, curated, catalogued and, over time, put online with your name.' }
]
</script>

<style scoped>
.eem-way {
  display: flex;
  flex-direction: column;
  padding: 2rem;
  border-top: 4px solid #000;
}
.eem-soon {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--eem-gold);
  color: var(--eem-gold);
}
.eem-way.glow {
  box-shadow: 0 0 0 4px var(--eem-gold);
}
.eem-way-dark {
  background: #000;
  border-color: #000;
  border-top-color: var(--eem-gold);
}
.eem-steps {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;
  counter-reset: s;
}
@media (min-width: 768px) {
  .eem-steps {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.eem-steps li {
  border-top: 2px solid var(--eem-ink);
  padding-top: 1rem;
}
.eem-step-n {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  background: var(--eem-gold);
  color: #000;
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 900;
}
</style>
