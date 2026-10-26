<template>
  <div
    class="eem-usearch"
    @keydown.down.prevent="move(1)"
    @keydown.up.prevent="move(-1)"
    @keydown.esc="open = false"
  >
    <form
      class="eem-usearch-box"
      role="search"
      @submit.prevent="submit"
    >
      <svg
        class="eem-usearch-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          cx="11"
          cy="11"
          r="7"
        />
        <path d="m20 20-4-4" />
      </svg>
      <input
        :id="id"
        v-model="q"
        type="search"
        role="combobox"
        autocomplete="off"
        :aria-expanded="open && items.length > 0"
        :aria-controls="`${id}-list`"
        :aria-activedescendant="active >= 0 ? `${id}-opt-${active}` : undefined"
        :placeholder="placeholder"
        aria-label="Search a species, genus or specimen catalog number"
        @input="onInput"
        @focus="open = true"
        @blur="close"
      />
      <button
        type="submit"
        class="eem-btn eem-btn-gold"
      >
        Search
      </button>
    </form>

    <ul
      v-if="open && (items.length || busy || (q.trim().length > 1 && !busy))"
      :id="`${id}-list`"
      class="eem-usearch-list"
      role="listbox"
    >
      <li
        v-if="busy && !items.length"
        class="eem-usearch-note"
      >
        Searching…
      </li>
      <li
        v-else-if="!items.length"
        class="eem-usearch-note"
      >
        No taxa or specimens match “{{ q }}”.
      </li>
      <li
        v-for="(it, i) in items"
        :id="`${id}-opt-${i}`"
        :key="it.key"
        role="option"
        :aria-selected="i === active"
        class="eem-usearch-item"
        :class="{ on: i === active }"
        @mousedown.prevent="choose(it)"
        @mouseenter="active = i"
      >
        <span
          class="eem-usearch-kind"
          :class="it.kind"
          >{{ it.kind === 'specimen' ? 'Specimen' : 'Taxon' }}</span
        >
        <span
          class="min-w-0 truncate"
          v-html="it.html"
        />
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { makeAPIRequest } from '@/utils/request'
import { findByCatalog } from './useEem.js'

defineProps({
  id: { type: String, default: 'eem-usearch' },
  placeholder: { type: String, default: 'Species, genus or catalog number (e.g. EEM000000108)' }
})

const router = useRouter()
const q = ref('')
const items = ref([])
const open = ref(false)
const busy = ref(false)
const active = ref(-1)
let timer = null
let seq = 0

const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// "108", "EEM108", "eem 000000108" → "EEM000000108"
function catalogFrom(text) {
  const t = text.trim()
  if (!/^(eem)?[\s.-]*\d{1,9}$/i.test(t)) return null
  return `EEM${t.replace(/\D/g, '').padStart(9, '0')}`
}

function onInput() {
  open.value = true
  active.value = -1
  clearTimeout(timer)
  timer = setTimeout(search, 220)
}

async function search() {
  const text = q.value.trim()
  const mine = ++seq
  if (text.length < 2) {
    items.value = []
    return
  }
  busy.value = true
  const cat = catalogFrom(text)

  const [specimen, taxa] = await Promise.all([
    cat ? findByCatalog(text) : Promise.resolve(null),
    /^\d+$/.test(text)
      ? Promise.resolve([])
      : makeAPIRequest
          .get('/otus/autocomplete', { params: { term: text, having_taxon_name_only: true } })
          .then(({ data }) => (Array.isArray(data) ? data : []))
          .catch(() => [])
  ])

  if (mine !== seq) return
  const out = []
  if (specimen) {
    out.push({
      key: `s-${specimen.catalogNumber}`,
      kind: 'specimen',
      cat: specimen.catalogNumber,
      html: `<b>${esc(specimen.catalogNumber)}</b> · <i>${esc(specimen.scientificName || specimen.family || '')}</i>`
    })
  }
  const seen = new Set()
  taxa.forEach((t) => {
    const id = t.otu_valid_id || t.id
    if (seen.has(id)) return
    seen.add(id)
    out.push({ key: `t-${id}`, kind: 'taxon', otuId: id, html: t.label_html || esc(t.label) })
  })
  items.value = out.slice(0, 8)
  busy.value = false
}

function choose(it) {
  open.value = false
  if (it.kind === 'specimen') router.push({ path: '/specimen', query: { cat: it.cat } })
  else router.push({ name: 'otus-id-overview', params: { id: it.otuId } })
}

function submit() {
  if (active.value >= 0 && items.value[active.value]) return choose(items.value[active.value])
  const cat = catalogFrom(q.value)
  if (cat) return router.push({ path: '/specimen', query: { cat } })
  if (items.value[0]) return choose(items.value[0])
  if (q.value.trim()) router.push({ path: '/specimen', query: { cat: q.value.trim() } })
}

function move(d) {
  if (!items.value.length) return
  open.value = true
  active.value = (active.value + d + items.value.length) % items.value.length
}

function close() {
  setTimeout(() => (open.value = false), 120)
}
</script>

<style scoped>
.eem-usearch {
  position: relative;
}
.eem-usearch-box {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 2px;
  padding: 4px 4px 4px 0.8rem;
  gap: 0.5rem;
}
.eem-usearch-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  fill: none;
  stroke: #666;
  stroke-width: 2;
  stroke-linecap: round;
}
.eem-usearch-box input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #111;
  font-size: 1rem;
  padding: 0.6rem 0.2rem;
}
.eem-usearch-box .eem-btn {
  white-space: nowrap;
}
.eem-usearch-list {
  position: absolute;
  z-index: 60;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  background: #fff;
  color: #111;
  border: 1px solid #ddd;
  border-top: 3px solid var(--eem-gold);
  box-shadow: 0 16px 32px -12px rgba(0, 0, 0, 0.35);
  max-height: 22rem;
  overflow-y: auto;
}
.eem-usearch-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.9rem;
  cursor: pointer;
  border-bottom: 1px solid #eee;
  font-size: 0.95rem;
}
.eem-usearch-item.on {
  background: #ffedcf;
}
.eem-usearch-kind {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  background: #eee;
  color: #444;
}
.eem-usearch-kind.specimen {
  background: var(--eem-gold);
  color: #000;
}
.eem-usearch-note {
  padding: 0.75rem 0.9rem;
  color: #666;
  font-size: 0.9rem;
}
</style>
