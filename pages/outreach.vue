<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Outreach"
      title="Bring insects to your group"
      lede="Schools, classes, clubs and community groups can visit the museum, invite us over, or borrow a box of specimens for teaching. Tell us what you have in mind."
    />

    <section class="container mx-auto box-border px-4 py-14 grid lg:grid-cols-12 gap-10">
      <!-- What we offer -->
      <aside class="lg:col-span-4 space-y-4">
        <p class="eem-kicker">What we offer</p>
        <ul class="space-y-4">
          <li
            v-for="o in offers"
            :key="o.title"
            class="eem-card p-5 eem-accent-l"
          >
            <h2 class="font-bold">{{ o.title }}</h2>
            <p class="text-sm eem-muted mt-1 leading-relaxed">{{ o.text }}</p>
          </li>
        </ul>
        <p class="text-sm eem-muted leading-relaxed">
          Requests are free. Please write at least three weeks ahead — we are a small team and schedule around
          teaching and research.
        </p>
      </aside>

      <!-- Form -->
      <div class="lg:col-span-8">
        <div
          v-if="done"
          class="eem-card p-8 eem-accent-t"
          role="status"
        >
          <p class="eem-kicker">Almost done</p>
          <h2 class="eem-display text-3xl mt-3">Thank you, {{ form.name.split(' ')[0] }}!</h2>
          <p class="mt-3 leading-relaxed">
            Your email app should have opened with the request filled in — just press <b>Send</b>. We will reply
            to <b>{{ form.email }}</b> within a few working days.
          </p>
          <p class="mt-3 text-sm eem-muted">
            Nothing opened?
            <a
              :href="mailtoFallback"
              class="eem-link"
              >Try again</a
            >
            or write to <a
              :href="`mailto:${email}`"
              class="eem-link"
              >{{ email }}</a
            >.
          </p>
          <button
            type="button"
            class="eem-btn eem-btn-line mt-6"
            @click="reset"
          >
            Send another request
          </button>
        </div>

        <form
          v-else
          class="eem-form eem-card"
          novalidate
          @submit.prevent="submit"
        >
          <fieldset>
            <legend>What would you like?</legend>
            <div class="grid sm:grid-cols-2 gap-2">
              <label
                v-for="t in TYPES"
                :key="t"
                class="eem-choice"
                :class="{ on: form.type === t }"
              >
                <input
                  v-model="form.type"
                  type="radio"
                  name="type"
                  :value="t"
                />
                <span>{{ t }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>About your group</legend>
            <div class="grid sm:grid-cols-2 gap-4">
              <label class="sm:col-span-2">
                <span>School, class or group <em>*</em></span>
                <input
                  v-model.trim="form.organization"
                  required
                  autocomplete="organization"
                />
              </label>
              <label>
                <span>City</span>
                <input
                  v-model.trim="form.city"
                  autocomplete="address-level2"
                />
              </label>
              <label>
                <span>Grade or audience</span>
                <select v-model="form.grade">
                  <option
                    v-for="g in GRADES"
                    :key="g"
                    :value="g"
                  >
                    {{ g || 'Choose…' }}
                  </option>
                </select>
              </label>
              <label>
                <span>Group size</span>
                <input
                  v-model.number="form.size"
                  type="number"
                  min="1"
                  max="5000"
                  inputmode="numeric"
                />
              </label>
              <label>
                <span>Preferred dates</span>
                <input
                  v-model.trim="form.dates"
                  placeholder="e.g. any Tuesday in March"
                />
              </label>
              <label class="sm:col-span-2">
                <span>Topics or insects you are interested in</span>
                <input
                  v-model.trim="form.topics"
                  placeholder="e.g. pollinators, aquatic insects, metamorphosis"
                />
              </label>
              <label class="sm:col-span-2">
                <span>Accessibility needs</span>
                <input v-model.trim="form.accessibility" />
              </label>
              <label class="sm:col-span-2">
                <span>Anything else?</span>
                <textarea
                  v-model="form.message"
                  rows="4"
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Your contact</legend>
            <div class="grid sm:grid-cols-2 gap-4">
              <label>
                <span>Name <em>*</em></span>
                <input
                  v-model.trim="form.name"
                  required
                  autocomplete="name"
                />
              </label>
              <label>
                <span>Email <em>*</em></span>
                <input
                  v-model.trim="form.email"
                  type="email"
                  required
                  autocomplete="email"
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  v-model.trim="form.phone"
                  type="tel"
                  autocomplete="tel"
                />
              </label>
            </div>
            <!-- spam trap -->
            <input
              v-model="form.company"
              class="eem-trap"
              tabindex="-1"
              autocomplete="off"
              aria-hidden="true"
            />
          </fieldset>

          <p
            v-if="error"
            class="eem-error"
            role="alert"
          >
            {{ error }}
          </p>

          <div class="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              class="eem-btn eem-btn-gold"
            >
              Send request
            </button>
            <p class="text-xs eem-muted max-w-sm">
              This opens your email app with the request ready to send to the museum.
            </p>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'

useHead({ title: 'Outreach requests — Enns Entomology Museum' })

const email = info.email || info.director.email

const TYPES = [
  'Visit to the museum',
  'Museum visit to a classroom',
  'Specimen box loan for teaching',
  'Museum table at an event',
  'University class using the collection',
  'Something else'
]
const GRADES = ['', 'Pre-K', 'K–2', '3–5', '6–8', '9–12', 'Mixed grades', 'College', 'Adults', 'All ages']

const offers = [
  { title: 'Museum visits', text: 'A guided look behind the scenes: drawers, microscopes and the story of the collection.' },
  { title: 'Classroom visits', text: 'We bring pinned insects, magnifiers and activities to your school.' },
  { title: 'Teaching boxes', text: 'Borrow a curated box of specimens for a unit on insects, pollinators or aquatic life.' },
  { title: 'Events', text: 'A museum table for festivals, open houses, fairs and Extension programs.' }
]

const blank = () => ({
  type: '',
  organization: '',
  city: '',
  grade: '',
  size: null,
  dates: '',
  topics: '',
  accessibility: '',
  message: '',
  name: '',
  email: '',
  phone: '',
  company: ''
})
const form = reactive(blank())
const done = ref(false)
const error = ref('')

const mailtoFallback = computed(() => {
  const lines = [
    `Request: ${form.type}`,
    `Group: ${form.organization}${form.city ? `, ${form.city}` : ''}`,
    form.grade && `Grade / audience: ${form.grade}`,
    form.size && `Group size: ${form.size}`,
    form.dates && `Preferred dates: ${form.dates}`,
    form.topics && `Topics: ${form.topics}`,
    form.accessibility && `Accessibility: ${form.accessibility}`,
    form.message && `\n${form.message}`,
    `\n${form.name} · ${form.email}${form.phone ? ` · ${form.phone}` : ''}`
  ].filter(Boolean)
  return `mailto:${email}?subject=${encodeURIComponent(`Outreach request — ${form.organization}`)}&body=${encodeURIComponent(lines.join('\n'))}`
})

function validate() {
  if (!form.type) return 'Choose what you would like.'
  if (!form.organization) return 'Enter your school, class or group.'
  if (!form.name) return 'Enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.'
  return ''
}

function submit() {
  error.value = validate()
  if (error.value) return
  // Opens the visitor's email app with the request filled in, addressed to the museum
  window.location.href = mailtoFallback.value
  done.value = true
}

function reset() {
  Object.assign(form, blank())
  done.value = false
}
</script>

<style scoped>
.eem-form {
  padding: 1.75rem;
  border-top: 4px solid #000;
}
.eem-form fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.eem-form fieldset + fieldset {
  margin-top: 1.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--eem-rule);
}
.eem-form legend {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  margin-bottom: 0.9rem;
}
.eem-form label > span {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.3rem;
}
.eem-form label > span em {
  color: var(--eem-gold-deep);
  font-style: normal;
}
.eem-form input:not([type='radio']),
.eem-form select,
.eem-form textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
  font: inherit;
}
.eem-form input:focus,
.eem-form select:focus,
.eem-form textarea:focus {
  outline: 2px solid var(--eem-gold);
  outline-offset: 0;
  border-color: var(--eem-ink);
}
.eem-choice {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.8rem;
  border: 1.5px solid var(--eem-rule);
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.92rem;
}
.eem-choice.on {
  border-color: var(--eem-ink);
  background: color-mix(in srgb, var(--eem-gold) 18%, var(--eem-card));
}
.eem-choice input {
  accent-color: #000;
}
.eem-error {
  margin: 1.25rem 0;
  padding: 0.75rem 0.9rem;
  border-left: 4px solid #b42318;
  background: #fdecea;
  color: #7a1c14;
  font-size: 0.9rem;
}
.eem-trap {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
}
.eem-form .eem-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.eem-form > .flex {
  margin-top: 1.5rem;
}
</style>
