<template>
  <div class="eem min-h-screen rp-page">
    <!-- Controls (not printed) -->
    <section class="rp-controls print:hidden">
      <div class="container mx-auto box-border px-4 py-6 flex flex-wrap items-end gap-4">
        <div>
          <p class="eem-kicker">Newsletter & report</p>
          <h1 class="eem-display mt-2 text-2xl">Make an issue</h1>
        </div>
        <label class="rp-field">
          <span>Every</span>
          <select v-model.number="months">
            <option :value="2">two months</option>
            <option :value="1">month</option>
          </select>
        </label>
        <label class="rp-field">
          <span>Issue</span>
          <select v-model="issueKey">
            <option
              v-for="i in list"
              :key="i.key"
              :value="i.key"
            >
              {{ i.n }} · {{ i.label }}{{ i.current ? ' (in progress)' : '' }}
            </option>
          </select>
        </label>
        <div class="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            class="eem-btn eem-btn-gold"
            @click="printIt"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            class="eem-btn eem-btn-line"
            :disabled="!data"
            @click="copyEmail"
          >
            {{ copied ? 'Copied ✓' : 'Copy for e-mail' }}
          </button>
          <button
            type="button"
            class="eem-btn eem-btn-line"
            :disabled="!data"
            @click="downloadEmail"
          >
            Download e-mail HTML
          </button>
        </div>
      </div>
      <div class="container mx-auto box-border px-4 pb-6">
        <label class="rp-note-field">
          <span>Note from the director (optional — printed at the top)</span>
          <textarea
            v-model="note"
            rows="3"
            placeholder="A few lines about these months: what happened, what's next, a thank-you…"
          />
        </label>
        <p class="text-xs eem-muted mt-2">
          Stories are the news posts published in TaxonWorks during the period; numbers are what was added to the
          database in the same months. To change a story, edit it in TaxonWorks and reload.
        </p>
      </div>
    </section>

    <!-- The issue -->
    <article
      v-if="issue"
      class="rp-sheet"
    >
      <header class="rp-mast">
        <div>
          <p class="rp-mast-kicker">Newsletter · Issue {{ issue.n }}</p>
          <p class="rp-mast-title">Enns Entomology Museum</p>
          <p class="rp-mast-sub">{{ info.university }} · {{ info.city }}</p>
        </div>
        <div class="rp-mast-period">
          <img
            :src="mark"
            alt=""
          />
          <span>{{ issue.label }}</span>
        </div>
      </header>

      <p
        v-if="loading"
        class="rp-pad eem-muted"
      >
        Gathering the issue…
      </p>

      <template v-else-if="data">
        <!-- Director's note -->
        <section
          v-if="note.trim()"
          class="rp-note"
        >
          <p class="rp-label">From the director</p>
          <p
            v-for="(p, i) in noteParas"
            :key="i"
          >
            {{ p }}
          </p>
          <p class="rp-sign">— {{ info.director.name }}, {{ info.director.role }}</p>
        </section>

        <!-- Numbers -->
        <section class="rp-pad">
          <p class="rp-label">In {{ issue.label }}</p>
          <dl class="rp-stats">
            <div>
              <dt>Specimens digitized</dt>
              <dd>{{ fmt(data.numbers.specimens) }}</dd>
            </div>
            <div>
              <dt>Species among them</dt>
              <dd>{{ fmt(data.numbers.species) }}</dd>
            </div>
            <div>
              <dt>Taxa added</dt>
              <dd>{{ fmt(data.numbers.taxa) }}</dd>
            </div>
            <div>
              <dt>Specimens online in total</dt>
              <dd>{{ fmt(data.numbers.toDate) }}</dd>
            </div>
          </dl>
          <p class="rp-small">
            <template v-if="data.numbers.types">{{ fmt(data.numbers.types) }} type specimen(s) catalogued · </template>
            <template v-if="data.numbers.images">{{ fmt(data.numbers.images) }} image(s) added · </template>
            <template v-if="data.numbers.counties">specimens from {{ data.numbers.counties }} Missouri count{{ data.numbers.counties === 1 ? 'y' : 'ies' }}</template>
          </p>

          <!-- Digitized by order -->
          <div
            v-if="data.orders.length"
            class="rp-orders"
          >
            <p class="rp-sublabel">Digitized this period, by order</p>
            <ul>
              <li
                v-for="o in data.orders.slice(0, 8)"
                :key="o.name"
              >
                <span class="rp-oname">{{ o.name }}</span>
                <span class="rp-obar"><span :style="{ width: `${(o.n / data.orders[0].n) * 100}%` }" /></span>
                <span class="rp-on">{{ fmt(o.n) }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- In this issue -->
        <section
          v-if="data.stories.length > 1"
          class="rp-pad rp-toc"
        >
          <p class="rp-label">In this issue</p>
          <ol>
            <li
              v-for="s in data.stories"
              :key="s.id"
            >
              {{ s.title }}
            </li>
          </ol>
        </section>

        <!-- Stories -->
        <section
          v-for="s in data.stories"
          :key="s.id"
          class="rp-story"
        >
          <div class="rp-head">
            <img
              v-if="s.cover"
              :src="s.cover.src"
              :alt="s.cover.alt"
              class="rp-cover"
            />
            <p class="rp-meta">{{ s.type }} · {{ s.date }}<template v-if="s.author"> · {{ s.author }}</template></p>
            <h2 class="rp-title">{{ s.title }}</h2>
          </div>
          <div
            class="rp-body"
            v-html="s.body"
          />
        </section>
        <p
          v-if="!data.stories.length"
          class="rp-pad eem-muted"
        >
          No news posts were published in this period. Write them in TaxonWorks (Project → News) and they will appear
          here.
        </p>

        <!-- Back page -->
        <footer class="rp-back">
          <div>
            <p class="rp-back-title">Get involved</p>
            <p>
              Visit, borrow specimens, donate a collection or become a Friend of the Museum:
              <b>{{ siteUrlShort }}</b>
            </p>
          </div>
          <div>
            <p>{{ info.fullName }}</p>
            <p>{{ info.college }}</p>
            <p>{{ info.university }} · {{ info.city }}</p>
            <p v-if="info.email || info.director.email">{{ info.email || info.director.email }}</p>
          </div>
        </footer>
      </template>
    </article>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import info from './components/museumInfo.js'
import { fmt } from './components/useEem.js'
import { emailHtml, issues, loadIssue } from './components/useReport.js'

const { project_url } = __APP_ENV__
const siteUrl = project_url || 'https://enns-entomology-museum.github.io/Enns_Entomology_Museum_Database/'
const siteUrlShort = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
const mark = `${import.meta.env.BASE_URL || '/'}images/eem-mark.svg`

const months = ref(2)
const list = computed(() => issues(months.value))
const issueKey = ref('')
const issue = computed(() => list.value.find((i) => i.key === issueKey.value) || list.value[0])
const data = ref(null)
const loading = ref(false)
const copied = ref(false)

useHead({ title: computed(() => `EEM Newsletter ${issue.value ? `— Issue ${issue.value.n}, ${issue.value.label}` : ''}`) })

// default: the last finished issue (or the current one if none has finished)
watch(
  list,
  (l) => {
    if (!l.find((i) => i.key === issueKey.value)) issueKey.value = (l.find((i) => !i.current) || l[0])?.key || ''
  },
  { immediate: true }
)

watch(
  issue,
  async (i) => {
    if (!i) return
    loading.value = true
    data.value = null
    try {
      data.value = await loadIssue(i)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

// The director's note is kept in this browser, per issue, until printed
const noteKey = computed(() => `eem-report-note-${issue.value?.key}`)
const note = ref('')
watch(
  noteKey,
  (k) => {
    try {
      note.value = localStorage.getItem(k) || ''
    } catch {
      note.value = ''
    }
  },
  { immediate: true }
)
watch(note, (v) => {
  try {
    localStorage.setItem(noteKey.value, v)
  } catch {
    /* storage blocked */
  }
})
const noteParas = computed(() =>
  note.value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
)

const printIt = () => window.print()

const html = () => emailHtml({ issue: issue.value, data: data.value, note: note.value.trim(), siteUrl, info })

async function copyEmail() {
  const h = html()
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([h], { type: 'text/html' }),
        'text/plain': new Blob([h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')], { type: 'text/plain' })
      })
    ])
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    downloadEmail()
  }
}

function downloadEmail() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([html()], { type: 'text/html;charset=utf-8' }))
  a.download = `EEM_newsletter_issue_${issue.value.n}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.rp-controls {
  background: var(--eem-paper-2);
  border-bottom: 1px solid var(--eem-rule);
}
.rp-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.rp-field select {
  min-width: 10rem;
  padding: 0.5rem 0.6rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
.rp-note-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--eem-ink-soft);
}
.rp-note-field textarea {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 2px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
  font-weight: 400;
  font-size: 0.95rem;
}

/* The sheet: looks like a printed newsletter on screen, prints as one */
.rp-sheet {
  max-width: 52rem;
  margin: 2.5rem auto 4rem;
  background: #fff;
  color: #111;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
}
.rp-mast {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  padding: 2rem 2.4rem 1.6rem;
  background: #000;
  border-bottom: 8px solid #f1b82d;
  color: #fff;
}
.rp-mast-kicker {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #f1b82d;
}
.rp-mast-title {
  margin-top: 0.4rem;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 2.3rem;
  line-height: 1;
  text-transform: uppercase;
}
.rp-mast-sub {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}
.rp-mast-period {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  text-align: right;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: #f1b82d;
}
.rp-mast-period img {
  width: 3.2rem;
}
.rp-pad {
  padding: 1.6rem 2.4rem;
}
.rp-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8c640a;
  margin-bottom: 0.7rem;
}
.rp-note {
  padding: 1.6rem 2.4rem;
  background: #fdf6e0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.05rem;
  line-height: 1.6;
}
.rp-note p + p {
  margin-top: 0.7rem;
}
.rp-sign {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.85rem;
  color: #555;
}
.rp-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid #e5e0d4;
}
.rp-stats > div {
  padding: 0.9rem 1rem;
  border-right: 1px solid #e5e0d4;
  border-bottom: 1px solid #e5e0d4;
}
.rp-stats dt {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b665c;
}
.rp-stats dd {
  margin-top: 0.3rem;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.9rem;
  font-variant-numeric: tabular-nums;
}
.rp-small {
  margin-top: 0.6rem;
  font-size: 0.8rem;
  color: #6b665c;
}
.rp-orders {
  margin-top: 1.2rem;
}
.rp-sublabel {
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.rp-orders li {
  display: grid;
  grid-template-columns: 8rem 1fr 3rem;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.82rem;
  padding: 0.12rem 0;
}
.rp-obar {
  height: 0.65rem;
  background: #f2efe8;
}
.rp-obar span {
  display: block;
  height: 100%;
  min-width: 2px;
  background: #f1b82d;
  border-radius: 0 3px 3px 0;
}
.rp-on {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.rp-toc ol {
  list-style: decimal;
  padding-left: 1.3rem;
  font-weight: 600;
}
.rp-toc li {
  margin: 0.2rem 0;
}
.rp-story {
  padding: 1.8rem 2.4rem;
  border-top: 1px solid #e5e0d4;
}
.rp-cover {
  width: 100%;
  max-height: 22rem;
  object-fit: cover;
  margin-bottom: 1rem;
}
.rp-meta {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8c640a;
}
.rp-title {
  margin: 0.4rem 0 0.9rem;
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.7rem;
  line-height: 1.15;
}
.rp-body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.02rem;
  line-height: 1.65;
}
.rp-body :deep(p) {
  margin: 0 0 0.9em;
}
.rp-body :deep(a) {
  color: #8c640a;
  text-decoration: underline;
  word-break: break-word;
}
.rp-body :deep(ul) {
  list-style: disc;
  padding-left: 1.3em;
  margin: 0 0 0.9em;
}
.rp-body :deep(blockquote) {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid #f1b82d;
  font-style: italic;
}
.rp-body :deep(h2),
.rp-body :deep(h3) {
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  margin: 1.2em 0 0.4em;
}
.rp-body :deep(img) {
  width: 100%;
  margin: 0.8em 0;
}
.rp-body :deep(.ns-links) {
  display: grid;
  gap: 0.5rem;
  margin: 1em 0;
}
.rp-body :deep(.ns-linkcard) {
  display: block;
  padding: 0.5rem 0.8rem;
  border-left: 4px solid #f1b82d;
  background: #faf8f3;
  text-decoration: none;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: #111;
}
.rp-body :deep(.ns-linkcard-u) {
  display: block;
  font-weight: 500;
  color: #8c640a;
  font-size: 0.75rem;
}
.rp-back {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1.6rem 2.4rem;
  background: #000;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.82rem;
  line-height: 1.55;
}
.rp-back-title {
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: #f1b82d;
}
.rp-back b {
  color: #fff;
}

@media (max-width: 640px) {
  .rp-sheet {
    margin: 1rem 0 2rem;
  }
  .rp-mast,
  .rp-pad,
  .rp-note,
  .rp-story,
  .rp-back {
    padding-left: 1.1rem;
    padding-right: 1.1rem;
  }
  .rp-mast-title {
    font-size: 1.6rem;
  }
  .rp-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Printing / Save as PDF */
@media print {
  @page {
    size: letter;
    margin: 0.5in;
  }
  :global(.tp-header),
  :global(header.tp-header),
  :global(.eem-footer) {
    display: none !important;
  }
  .rp-page,
  :global(html),
  :global(body),
  :global(#main-content) {
    background: #fff !important;
  }
  .rp-sheet {
    max-width: none;
    margin: 0;
    box-shadow: none;
  }
  .rp-mast,
  .rp-back,
  .rp-note,
  .rp-stats,
  .rp-obar span {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .rp-story {
    break-inside: auto;
  }
  .rp-head,
  .rp-stats,
  .rp-orders,
  .rp-back {
    break-inside: avoid;
  }
  .rp-head {
    break-after: avoid;
  }
}
</style>
