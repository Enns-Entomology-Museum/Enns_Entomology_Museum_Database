<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Research"
      title="Tell us about your paper"
      lede="Published work that used Enns Museum specimens? Send us the reference — we list it on the Research page, add it to the museum library and use it to show what the collection makes possible."
    />

    <section class="container mx-auto box-border px-4 py-12 grid lg:grid-cols-12 gap-10">
      <div class="lg:col-span-8">
        <!-- Sent -->
        <div
          v-if="isSent"
          class="eem-card eem-accent-t p-8"
        >
          <p class="eem-kicker">Received</p>
          <h2 class="eem-display text-3xl mt-3">Thank you, {{ contact.name.split(' ')[0] }}!</h2>
          <p class="mt-3 eem-muted leading-relaxed max-w-xl">
            We will check the publication and add it to the list of research using the collection. We may write to
            you if we have a question, or to ask for a PDF for the museum library.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              class="eem-btn eem-btn-line"
              @click="startOver"
            >
              Send another paper
            </button>
            <RouterLink
              to="/research"
              class="eem-btn eem-btn-gold"
              >Back to Research</RouterLink
            >
          </div>
        </div>

        <!-- No inbox yet: e-mail -->
        <div
          v-else-if="!enabled"
          class="eem-card p-8"
        >
          <p class="leading-relaxed">
            Please send the reference (and the DOI, if it has one) by e-mail to
            <a
              :href="`mailto:${to}?subject=${encodeURIComponent('Publication using Enns Museum specimens')}`"
              class="eem-link"
              >{{ to }}</a
            >.
          </p>
        </div>

        <!-- Form -->
        <form
          v-else
          class="eem-card p-6 sm:p-8 grid gap-5"
          novalidate
          @submit.prevent="submit"
        >
          <!-- DOI first: fills in the rest -->
          <div>
            <label
              class="sf-label"
              for="sf-doi"
              >DOI <span class="sf-opt">— paste it and we fill in the reference</span></label
            >
            <div class="flex gap-2">
              <input
                id="sf-doi"
                v-model="ref_.doi"
                type="text"
                class="sf-input"
                placeholder="10.11646/zootaxa.5792.1.3 or https://doi.org/…"
                @blur="lookup"
                @keydown.enter.prevent="lookup"
              />
              <button
                type="button"
                class="eem-btn eem-btn-line !py-2 whitespace-nowrap"
                :disabled="!parseDoi(ref_.doi) || looking"
                @click="lookup"
              >
                {{ looking ? 'Looking up…' : 'Fill in' }}
              </button>
            </div>
            <p
              v-if="lookupNote"
              class="mt-1.5 text-xs eem-muted"
            >
              {{ lookupNote }}
            </p>
          </div>

          <div class="grid sm:grid-cols-[1fr_7rem] gap-4">
            <label class="block min-w-0">
              <span class="sf-label">Authors</span>
              <input
                v-model="ref_.authors"
                type="text"
                class="sf-input"
                placeholder="Sites, R.W. & Reynoso-Velasco, D."
              />
            </label>
            <label class="block min-w-0">
              <span class="sf-label">Year</span>
              <input
                v-model="ref_.year"
                type="text"
                inputmode="numeric"
                maxlength="4"
                class="sf-input"
              />
            </label>
          </div>
          <label class="block min-w-0">
            <span class="sf-label">Title</span>
            <input
              v-model="ref_.title"
              type="text"
              class="sf-input"
            />
          </label>
          <div class="grid sm:grid-cols-[1fr_8rem_8rem] gap-4">
            <label class="block min-w-0">
              <span class="sf-label">Journal or book</span>
              <input
                v-model="ref_.journal"
                type="text"
                class="sf-input"
              />
            </label>
            <label class="block min-w-0">
              <span class="sf-label">Volume</span>
              <input
                v-model="ref_.volume"
                type="text"
                class="sf-input"
              />
            </label>
            <label class="block min-w-0">
              <span class="sf-label">Pages</span>
              <input
                v-model="ref_.pages"
                type="text"
                class="sf-input"
              />
            </label>
          </div>

          <label class="block min-w-0">
            <span class="sf-label">Which of our specimens did you use? <span class="sf-opt">(optional)</span></span>
            <textarea
              v-model="specimens"
              rows="3"
              maxlength="2000"
              class="sf-input"
              placeholder="Taxa, number of specimens, catalog numbers (EEM…), type material…"
            />
          </label>

          <label class="block min-w-0">
            <span class="sf-label">Link to the PDF <span class="sf-opt">(optional)</span></span>
            <input
              v-model="pdfUrl"
              type="url"
              maxlength="500"
              class="sf-input"
              placeholder="https://…"
            />
          </label>

          <label class="flex items-center gap-2 text-sm">
            <input
              v-model="isAuthor"
              type="checkbox"
              class="sf-check"
            />
            I am an author of this work
          </label>

          <div class="grid sm:grid-cols-2 gap-4 pt-2 border-t eem-rule">
            <label class="block min-w-0">
              <span class="sf-label">Your name</span>
              <input
                v-model="contact.name"
                type="text"
                maxlength="200"
                autocomplete="name"
                class="sf-input"
              />
            </label>
            <label class="block min-w-0">
              <span class="sf-label">E-mail</span>
              <input
                v-model="contact.email"
                type="email"
                maxlength="200"
                autocomplete="email"
                class="sf-input"
              />
            </label>
          </div>
          <label class="block min-w-0">
            <span class="sf-label">Institution <span class="sf-opt">(optional)</span></span>
            <input
              v-model="contact.institution"
              type="text"
              maxlength="300"
              autocomplete="organization"
              class="sf-input"
            />
          </label>
          <label class="block min-w-0">
            <span class="sf-label">Note <span class="sf-opt">(optional)</span></span>
            <textarea
              v-model="note"
              rows="2"
              maxlength="2000"
              class="sf-input"
            />
          </label>

          <!-- Honeypot: hidden from people, filled in by bots -->
          <input
            v-model="honeypot"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            class="hidden"
          />

          <div
            v-if="TURNSTILE_SITE_KEY"
            ref="turnstileEl"
            class="min-h-[65px]"
          />

          <p
            v-if="error || turnstileFailed"
            class="sf-error"
            role="alert"
          >
            {{ error || 'The spam check could not load. Please check your connection or disable content blockers for this site.' }}
          </p>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs eem-muted max-w-sm">Your details are seen only by museum staff and used only to answer you.</p>
            <button
              type="submit"
              class="eem-btn eem-btn-gold"
              :disabled="sending || (!!TURNSTILE_SITE_KEY && !turnstileToken)"
            >
              {{ sending ? 'Sending…' : 'Send the paper' }}
            </button>
          </div>
        </form>
      </div>

      <aside class="lg:col-span-4">
        <div class="eem-card p-6 eem-accent-t">
          <p class="eem-kicker">Why it matters</p>
          <p class="mt-3 text-sm leading-relaxed">
            Every paper built on our specimens helps the museum show its value — to the University, to funding
            agencies, and to the next researcher looking for material. Thank you for telling us.
          </p>
          <p class="mt-4 text-sm leading-relaxed">
            See how to cite the collection on the
            <RouterLink
              to="/research"
              class="eem-link"
              >Research</RouterLink
            >
            page.
          </p>
        </div>
      </aside>
    </section>
  </div>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import EemPageHead from './components/EemPageHead.vue'
import info from './components/museumInfo.js'
import { emptyReference, formatReference, lookupDoi, parseDoi } from './components/inbox/doiLookup.js'
import { TURNSTILE_SITE_KEY, isInboxEnabled, loadContact, saveContact, sendToInbox, useTurnstile } from './components/inbox/useInbox.js'

useHead({ title: 'Tell us about your paper — Enns Entomology Museum' })

const route = useRoute()
const enabled = isInboxEnabled()
const to = info.email || info.director.email

const ref_ = reactive({ ...emptyReference(), doi: String(route.query.doi || '') })
const specimens = ref('')
const pdfUrl = ref('')
const isAuthor = ref(false)
const note = ref('')
const contact = reactive({ name: '', email: '', institution: '' })
const honeypot = ref('')
const sending = ref(false)
const isSent = ref(false)
const error = ref('')
const looking = ref(false)
const lookupNote = ref('')
let lastLooked = ''

const turnstileEl = ref(null)
const { token: turnstileToken, failed: turnstileFailed, render, reset } = useTurnstile(turnstileEl)

async function lookup() {
  const doi = parseDoi(ref_.doi)
  if (!doi || doi === lastLooked) return
  lastLooked = doi
  looking.value = true
  lookupNote.value = ''
  try {
    const found = await lookupDoi(doi)
    if (found) {
      for (const k of ['authors', 'year', 'title', 'journal', 'volume', 'pages']) if (found[k]) ref_[k] = found[k]
      lookupNote.value = 'Filled in from the DOI — please check.'
    } else {
      lookupNote.value = 'We could not find this DOI; please type the reference.'
    }
  } finally {
    looking.value = false
  }
}

async function submit() {
  const doi = parseDoi(ref_.doi)
  error.value = ''
  if (!ref_.title.trim() && !doi) error.value = 'Please give the title of the work, or its DOI.'
  else if (!contact.name.trim()) error.value = 'Please enter your name.'
  else if (!/^\S+@\S+\.\S{2,}$/.test(contact.email.trim())) error.value = 'Please enter a valid e-mail address.'
  if (error.value) return

  sending.value = true
  try {
    await sendToInbox({
      type: 'paper',
      citation: formatReference(ref_) || `DOI ${doi}`,
      doi,
      specimens: specimens.value,
      pdfUrl: pdfUrl.value,
      isAuthor: isAuthor.value ? 'yes' : '',
      note: note.value,
      ...contact,
      website: honeypot.value,
      turnstileToken: turnstileToken.value
    })
    saveContact(contact)
    isSent.value = true
  } catch (e) {
    error.value = e.message
    reset()
  } finally {
    sending.value = false
  }
}

async function startOver() {
  Object.assign(ref_, emptyReference())
  specimens.value = pdfUrl.value = note.value = ''
  isAuthor.value = false
  lastLooked = ''
  lookupNote.value = ''
  isSent.value = false
  await nextTick()
  render()
}

onMounted(async () => {
  Object.assign(contact, loadContact())
  if (ref_.doi) lookup()
  await nextTick()
  render()
})
</script>

<style scoped>
.sf-label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.sf-opt {
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
.sf-input {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0.6rem 0.75rem;
  border: 1.5px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-paper);
  color: var(--eem-ink);
  font-size: 0.92rem;
}
.sf-input:focus {
  outline: none;
  border-color: var(--eem-gold);
  box-shadow: 0 0 0 2px rgba(253, 183, 25, 0.35);
}
.sf-check {
  width: 1rem;
  height: 1rem;
  accent-color: #fdb719;
}
.sf-error {
  padding: 0.6rem 0.8rem;
  border-left: 4px solid #be2828;
  background: rgba(190, 40, 40, 0.08);
  color: #9b1f1f;
  font-size: 0.88rem;
}
:global(.dark) .sf-error {
  color: #f3a3a3;
}
</style>
