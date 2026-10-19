<template>
  <section
    v-if="current"
    id="rp-sec-specimen"
    class="sm"
  >
    <p class="sm-label">Specimen of the month</p>
    <div class="sm-grid">
      <img
        :src="current.medium"
        alt=""
        class="sm-img"
      />
      <div>
        <p
          v-if="rec"
          class="sm-name"
        >
          <i>{{ name }}</i> <span v-if="rec.scientificNameAuthorship">{{ rec.scientificNameAuthorship }}</span>
        </p>
        <p
          v-if="rec?.order || rec?.family"
          class="sm-higher"
        >
          {{ [rec.order, rec.family].filter(Boolean).join(' · ') }}
        </p>
        <dl
          v-if="rec"
          class="sm-facts"
        >
          <div v-if="where"><dt>Collected</dt><dd>{{ where }}</dd></div>
          <div v-if="when"><dt>Date</dt><dd>{{ when }}</dd></div>
          <div v-if="rec.recordedBy"><dt>Collector</dt><dd>{{ rec.recordedBy.replace(/\s*\|\s*/g, ', ') }}</dd></div>
          <div v-if="rec.typeStatus"><dt>Type</dt><dd>{{ rec.typeStatus }}</dd></div>
          <div><dt>Catalog</dt><dd>{{ current.cat }}</dd></div>
        </dl>
        <p
          v-else
          class="sm-muted"
        >
          {{ current.cat }}
        </p>
        <p class="sm-link">
          See it online: <b>{{ siteShort }}#/specimen?cat={{ current.cat }}</b>
        </p>
      </div>
    </div>
    <!-- choosing (screen only) -->
    <div class="sm-tools print:hidden">
      <span>{{ index + 1 }} of {{ candidates.length }} photographed this issue</span>
      <button
        type="button"
        class="eem-btn eem-btn-line"
        @click="move(-1)"
      >
        ← Previous
      </button>
      <button
        type="button"
        class="eem-btn eem-btn-line"
        @click="move(1)"
      >
        Next →
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { specimenRecord } from './useReport.js'

// "Specimen of the month": one of the specimens photographed in the period (images whose
// depiction names an EEM catalog number). Previous / Next to choose; the choice is kept
// in this browser per issue. Emits the chosen specimen (for the e-mail version).
const props = defineProps({
  candidates: { type: Array, default: () => [] },
  issueKey: { type: String, default: '' },
  siteUrl: { type: String, default: '' }
})
const emit = defineEmits(['change'])

const storeKey = computed(() => `eem-report-specimen-${props.issueKey}`)
const index = ref(0)
watch(
  () => [props.candidates, storeKey.value],
  () => {
    let saved = ''
    try { saved = localStorage.getItem(storeKey.value) || '' } catch { /* blocked */ }
    const i = props.candidates.findIndex((c) => c.cat === saved)
    index.value = i >= 0 ? i : 0
  },
  { immediate: true }
)
const current = computed(() => props.candidates[index.value] || null)
function move(d) {
  const n = props.candidates.length
  index.value = (index.value + d + n) % n
  try { localStorage.setItem(storeKey.value, current.value.cat) } catch { /* blocked */ }
}

const rec = ref(null)
watch(
  current,
  async (c) => {
    rec.value = null
    if (c) rec.value = await specimenRecord(c.cat)
  },
  { immediate: true }
)

const name = computed(() => {
  const r = rec.value
  if (!r) return ''
  const n = r.scientificName || ''
  const a = r.scientificNameAuthorship || ''
  return a && n.endsWith(a) ? n.slice(0, -a.length).trim() : n
})
const where = computed(() => {
  const r = rec.value
  if (!r) return ''
  const county = r.county ? `${r.county}${/county|city/i.test(r.county) ? '' : ' Co.'}` : ''
  return [r.verbatimLocality || r.locality, county, r.stateProvince, r.country].filter(Boolean).join(', ')
})
const when = computed(() => rec.value?.eventDate || rec.value?.verbatimEventDate || '')
const siteShort = computed(() => props.siteUrl.replace(/^https?:\/\//, '').replace(/\/?$/, '/'))

watch(
  [current, rec, name, where, when],
  () => {
    if (!current.value) return emit('change', null)
    emit('change', {
      cat: current.value.cat,
      img: current.value.medium,
      name: name.value || current.value.cat,
      caption: [where.value, when.value, rec.value?.recordedBy ? `leg. ${rec.value.recordedBy.replace(/\s*\|\s*/g, ', ')}` : '', current.value.cat].filter(Boolean).join(' · ')
    })
  },
  { immediate: true }
)
</script>

<style scoped>
.sm {
  padding: 1.8rem 2.4rem;
  border-top: 1px solid #e5e0d4;
  break-inside: avoid;
}
.sm-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8c640a;
  margin-bottom: 0.8rem;
}
.sm-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 1.4rem;
  align-items: start;
}
.sm-img {
  width: 100%;
  max-height: 22rem;
  object-fit: contain;
  background: #f6f4ef;
}
.sm-name {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.35rem;
  line-height: 1.25;
}
.sm-higher {
  margin-top: 0.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6b665c;
}
.sm-facts {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.35rem;
  font-size: 0.86rem;
}
.sm-facts div {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.5rem;
}
.sm-facts dt {
  color: #6b665c;
}
.sm-link {
  margin-top: 0.9rem;
  font-size: 0.78rem;
  color: #6b665c;
  word-break: break-all;
}
.sm-muted {
  color: #6b665c;
}
.sm-tools {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: #6b665c;
}
@media (max-width: 640px) {
  .sm {
    padding-left: 1.1rem;
    padding-right: 1.1rem;
  }
  .sm-grid {
    grid-template-columns: 1fr;
  }
}
</style>
