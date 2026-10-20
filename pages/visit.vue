<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Use the collection"
      title="Visit & loans"
      lede="The collection is a working research resource. Researchers, students, educators and donors are welcome — here is how to get started."
    />

    <section class="container mx-auto box-border px-4 py-14 grid lg:grid-cols-12 gap-12">
      <div class="lg:col-span-8 space-y-6">
        <article
          v-for="s in sections"
          :id="s.id"
          :key="s.id"
          class="eem-section scroll-mt-6"
        >
          <span class="eem-section-num">{{ s.n }}</span>
          <div>
            <h2 class="eem-display text-2xl sm:text-3xl">{{ s.title }}</h2>
            <p class="mt-3 leading-relaxed eem-muted">{{ s.text }}</p>
            <ul class="mt-4 space-y-2">
              <li
                v-for="(item, i) in s.items"
                :key="i"
                class="flex gap-3"
              >
                <span
                  class="eem-tick"
                  aria-hidden="true"
                />
                <span class="leading-relaxed">{{ item }}</span>
              </li>
            </ul>
          </div>
        </article>
      </div>

      <aside class="lg:col-span-4">
        <div class="eem-contact lg:sticky lg:top-6">
          <p class="eem-kicker !text-[color:var(--eem-gold)]">Contact</p>
          <h2 class="eem-display text-2xl mt-2 text-white">{{ info.fullName }}</h2>
          <dl class="mt-5 space-y-3 text-sm">
            <div>
              <dt class="text-white/60">Institution</dt>
              <dd>{{ info.university }}<br />{{ info.college }}</dd>
            </div>
            <div v-if="info.address">
              <dt class="text-white/60">Address</dt>
              <dd>{{ info.address }}</dd>
            </div>
            <div v-else>
              <dt class="text-white/60">Location</dt>
              <dd>{{ info.city }}</dd>
            </div>
            <div v-if="info.hours">
              <dt class="text-white/60">Hours</dt>
              <dd>{{ info.hours }}</dd>
            </div>
            <div v-if="info.phone">
              <dt class="text-white/60">Phone</dt>
              <dd>{{ info.phone }}</dd>
            </div>
            <div>
              <dt class="text-white/60">{{ info.director.role }}</dt>
              <dd>{{ info.director.name }}</dd>
            </div>
          </dl>
          <a
            v-if="contactEmail"
            :href="`mailto:${contactEmail}?subject=${encodeURIComponent('Enns Entomology Museum — enquiry')}`"
            class="eem-btn eem-btn-gold mt-6 w-full justify-center"
            >Email the museum</a
          >
          <p
            v-else
            class="mt-6 text-xs text-white/50"
          >
            Contact email coming soon.
          </p>
        </div>
        <div
          v-if="info.directions || info.parking"
          class="eem-card mt-5 p-5 text-sm"
        >
          <p class="eem-kicker">Getting here</p>
          <p
            v-if="info.directions"
            class="mt-3 leading-relaxed"
          >
            {{ info.directions }}
          </p>
          <p
            v-if="info.parking"
            class="mt-2 leading-relaxed eem-muted"
          >
            <b>Parking.</b> {{ info.parking }}
          </p>
          <a
            v-if="info.mapUrl"
            :href="info.mapUrl"
            target="_blank"
            rel="noopener"
            class="eem-link mt-3 inline-block font-semibold"
            >Open in a map ↗</a
          >
          <p
            v-if="info.mailing"
            class="mt-4 text-xs eem-muted"
          >
            <b>Mailing address</b> (loans and parcels): {{ info.mailing }}
          </p>
        </div>
        <div class="eem-card mt-5 p-5 text-sm">
          <p class="font-bold">Request a loan</p>
          <p class="mt-1 eem-muted">Opens an email with the details we need, ready to fill in.</p>
          <a
            :href="loanMail"
            class="eem-btn eem-btn-line mt-3 !py-1.5 !px-3 !text-sm"
            >Start a loan request</a
          >
        </div>
        <RouterLink
          to="/outreach"
          class="eem-card mt-5 p-5 block eem-accent-l !text-[color:var(--eem-ink)]"
        >
          <p class="font-bold">Teachers and groups →</p>
          <p class="text-sm eem-muted mt-1">Request a museum visit, a classroom visit or a teaching box.</p>
        </RouterLink>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'

useHead({ title: 'Visit & loans — Enns Entomology Museum' })

const contactEmail = computed(() => info.email || info.director.email)

const loanMail = computed(() => {
  const body = [
    'Name and position:',
    'Institution (receiving the loan):',
    'Supervising researcher (if you are a student):',
    'Taxa requested (and catalog numbers, if known):',
    'Purpose of the study:',
    'Any destructive sampling (e.g. DNA, dissection)?',
    'Requested loan period:',
    'Shipping address:'
  ].join('\n\n')
  return `mailto:${contactEmail.value}?subject=${encodeURIComponent('Loan request — Enns Entomology Museum')}&body=${encodeURIComponent(body)}`
})

const sections = [
  {
    id: 'loans',
    n: '01',
    title: 'Research loans',
    text: 'Specimens are loaned to researchers at institutions for taxonomic, systematic and ecological study.',
    items: [
      'Send a request naming the taxa, the purpose of the study and the receiving institution.',
      'Loans are made to institutions and the supervising researcher is responsible for the material.',
      'Please return specimens with any new determinations, and cite the museum (EEM) in resulting publications.'
    ]
  },
  {
    id: 'visit',
    n: '02',
    title: 'Visiting the collection',
    text: 'Researchers and students are welcome to work with the collection in person.',
    items: [
      'Visits are by appointment — get in touch with your dates and the groups you want to examine.',
      'Workspace and microscopes can be arranged for visiting researchers.',
      'Specimens examined or imaged during a visit can be added to the online database.'
    ]
  },
  {
    id: 'teaching',
    n: '03',
    title: 'Teaching & outreach',
    text: 'The collection supports University of Missouri courses, extension programs and public events.',
    items: [
      'Teaching collections and drawers can be prepared for classes and workshops.',
      'Outreach requests from schools and community groups are welcome.'
    ]
  },
  {
    id: 'donate',
    n: '04',
    title: 'Donating specimens',
    text: 'Private and institutional collections can find a permanent, documented home at the museum.',
    items: [
      'Tell us about the collection: taxa, approximate size, regions, condition and label data.',
      'Donated specimens are curated, catalogued and, over time, digitized and shared online.'
    ]
  }
]
</script>

<style scoped>
.eem-section {
  display: grid;
  grid-template-columns: 4rem 1fr;
  gap: 1rem;
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-top: 4px solid #000;
  padding: 1.6rem 1.6rem 1.8rem;
}
.eem-section-num {
  font-family: 'Archivo', system-ui, sans-serif;
  font-weight: 900;
  font-size: 2.4rem;
  line-height: 1;
  color: var(--eem-gold);
  -webkit-text-stroke: 1px #000;
}
.eem-tick {
  flex-shrink: 0;
  width: 0.55rem;
  height: 0.55rem;
  margin-top: 0.55rem;
  background: var(--eem-gold);
  outline: 1px solid #000;
}
.eem-contact {
  background: #000;
  color: #fff;
  border-top: 4px solid var(--eem-gold);
  padding: 1.75rem;
}
@media (max-width: 640px) {
  .eem-section {
    grid-template-columns: 1fr;
  }
}
</style>
