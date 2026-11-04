<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Library"
      title="The museum library"
      lede="Taxonomic literature kept alongside the specimens: printed reprints, books and journals on the shelves, and a growing collection of PDFs — catalogued in TaxonWorks and tagged by insect group."
    />

    <!-- Headline numbers -->
    <section class="border-b eem-rule">
      <dl class="container mx-auto box-border px-4 py-8 grid grid-cols-2 md:grid-cols-5 gap-6">
        <div
          v-for="s in stats"
          :key="s.label"
        >
          <dt class="eem-kicker !text-[0.68rem]">{{ s.label }}</dt>
          <dd class="eem-display text-4xl mt-2">{{ loaded ? s.value : '—' }}</dd>
          <dd
            v-if="s.note"
            class="text-xs eem-muted mt-1"
          >
            {{ s.note }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="container mx-auto box-border px-4 py-14 grid lg:grid-cols-12 gap-8">
      <!-- By group -->
      <div class="lg:col-span-7 eem-card p-6">
        <p class="eem-kicker">By group</p>
        <h2 class="eem-display text-2xl mt-2">Titles per taxonomic group</h2>
        <p class="text-sm eem-muted mt-1">
          Nested by classification — a group's number includes the titles of the groups inside it. Click a group to
          list its titles.
        </p>
        <ul
          v-if="tree.length"
          class="eem-lib-tree mt-5"
        >
          <li
            v-for="g in flatTree"
            :key="g.name"
            :style="{ '--depth': g.depth }"
            :class="{ child: g.depth > 0 }"
          >
            <button
              type="button"
              class="eem-lib-row"
              :class="{ on: group === g.name }"
              :aria-pressed="group === g.name"
              @click="group = group === g.name ? '' : g.name"
            >
              <span class="eem-lib-name">{{ g.name }}</span>
              <span class="eem-lib-bar"><span :style="{ width: (g.n / groupMax) * 100 + '%' }" /></span>
              <span class="eem-lib-n">{{ g.n }}</span>
            </button>
          </li>
        </ul>
        <p
          v-else-if="loaded"
          class="mt-4 eem-muted text-sm"
        >
          No group tags yet.
        </p>
      </div>

      <div class="lg:col-span-5 space-y-6">
        <!-- Format -->
        <div class="eem-card p-6">
          <p class="eem-kicker">Format</p>
          <h2 class="eem-display text-2xl mt-2">On the shelf or digital</h2>
          <div
            v-if="total"
            class="eem-lib-split mt-5"
          >
            <button
              v-for="f in formats"
              v-show="f.n"
              :key="f.key"
              type="button"
              :class="[f.key, { dim: fmt && fmt !== f.key }]"
              :style="{ flex: f.n }"
              :title="`${f.label}: ${f.n} (${pct(f.n)})`"
              :aria-label="`${f.label}: ${f.n} titles. Show them`"
              @click="pick('fmt', f.key)"
            />
          </div>
          <ul class="mt-4 space-y-1 text-sm">
            <li
              v-for="f in formats"
              v-show="f.n || f.key !== 'unk'"
              :key="f.key"
            >
              <button
                type="button"
                class="eem-lib-row"
                :class="{ on: fmt === f.key }"
                :aria-pressed="fmt === f.key"
                :disabled="!f.n || f.key === 'unk'"
                @click="pick('fmt', f.key)"
              >
                <i
                  class="eem-lib-dot"
                  :class="f.key"
                />{{ f.label }}
                <span class="ml-auto eem-muted text-xs">{{ pct(f.n) }}</span>
                <b class="w-10 text-right">{{ f.n }}</b>
              </button>
            </li>
          </ul>
          <p class="text-xs eem-muted mt-3">Click a format to list its titles.</p>
        </div>

        <!-- Type -->
        <div class="eem-card p-6">
          <p class="eem-kicker">Type</p>
          <ul class="mt-3 space-y-1 text-sm">
            <li
              v-for="t in types"
              :key="t.name"
            >
              <button
                type="button"
                class="eem-lib-row eem-lib-typerow"
                :class="{ on: typ === t.name }"
                :aria-pressed="typ === t.name"
                @click="pick('typ', t.name)"
              >
                <span
                  class="eem-lib-typebar"
                  :style="{ width: (t.n / typeMax) * 100 + '%' }"
                />
                <span class="relative">{{ t.name }}</span>
                <b class="relative ml-auto">{{ t.n }}</b>
              </button>
            </li>
          </ul>
        </div>

        <!-- Decades -->
        <div
          v-if="decades.length"
          class="eem-card p-6"
        >
          <p class="eem-kicker">Publication date</p>
          <div
            class="eem-lib-decades mt-4"
            role="group"
            aria-label="Titles per decade of publication"
          >
            <button
              v-for="d in decades"
              :key="d.name"
              type="button"
              class="eem-lib-dec"
              :class="{ on: dec === d.d, dim: dec !== null && dec !== d.d }"
              :disabled="!d.n"
              :title="`${d.name}: ${d.n} title${d.n === 1 ? '' : 's'}`"
              :aria-label="`${d.name}: ${d.n} titles`"
              :aria-pressed="dec === d.d"
              @click="pick('dec', d.d)"
            >
              <span
                v-if="d.n"
                class="eem-lib-dec-n"
                >{{ d.n }}</span
              >
              <span
                class="eem-lib-dec-bar"
                :style="{ height: d.h + '%' }"
              />
              <span class="eem-lib-dec-lab">{{ d.short }}</span>
            </button>
          </div>
          <p class="text-xs eem-muted mt-3">
            Oldest title: {{ oldest || '—' }} · Busiest decade: {{ busiest || '—' }} · Click a bar to list its titles.
          </p>
        </div>
      </div>
    </section>

    <!-- Titles -->
    <section
      ref="titlesEl"
      class="border-t eem-rule bg-[color:var(--eem-paper-2)]"
    >
      <div class="container mx-auto box-border px-4 py-14">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eem-kicker">Catalogue</p>
            <h2 class="eem-display text-3xl mt-2">
              Titles <span class="eem-muted text-xl">{{ shown.length }}</span>
            </h2>
            <p
              v-if="activeFilters.length"
              class="text-sm mt-2 flex flex-wrap items-center gap-1.5"
            >
              Showing
              <button
                v-for="f in activeFilters"
                :key="f.key"
                type="button"
                class="eem-lib-chip"
                :aria-label="`Remove filter ${f.label}`"
                @click="clearFilter(f.key)"
              >
                {{ f.label }} <span aria-hidden="true">×</span>
              </button>
              <button
                type="button"
                class="eem-link ml-1"
                @click="clearAll"
              >
                show all
              </button>
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <input
              v-model="q"
              type="search"
              class="eem-lib-search"
              placeholder="Author, title, journal…"
              aria-label="Search the library"
            />
            <select
              v-model="fmt"
              class="eem-lib-search !min-w-0"
              aria-label="Format"
            >
              <option value="">All formats</option>
              <option value="phys">Physical copy only</option>
              <option value="both">Physical copy and PDF</option>
              <option value="pdf">PDF only</option>
            </select>
          </div>
        </div>

        <ol class="mt-6 space-y-2">
          <li
            v-for="s in shown"
            :key="s.id"
            class="eem-card eem-lib-item"
          >
            <span
              class="eem-lib-fmt"
              :class="s.format"
              >{{ s.format === 'phys' ? 'Shelf' : s.format === 'pdf' ? 'PDF' : s.format === 'both' ? 'Shelf + PDF' : '—' }}</span
            >
            <div class="min-w-0 flex-1">
              <p
                class="leading-snug"
                v-html="s.citation"
              />
              <p class="mt-1.5 flex flex-wrap gap-1.5 items-center">
                <span
                  v-if="s.libId"
                  class="eem-lib-id"
                  >{{ s.libId }}</span
                >
                <span
                  v-for="t in s.groups"
                  :key="t"
                  class="eem-lib-tag"
                  >{{ t }}</span
                >
                <a
                  v-if="s.doi"
                  :href="`https://doi.org/${s.doi}`"
                  target="_blank"
                  rel="noopener"
                  class="text-xs eem-link"
                  >DOI ↗</a
                >
              </p>
            </div>
          </li>
        </ol>
        <p
          v-if="loaded && !shown.length"
          class="mt-6 eem-muted"
        >
          No titles match.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import EemPageHead from './components/EemPageHead.vue'
import { parentsOf } from './components/libraryGroups.js'
import { linkify } from './components/linkify.js'
import { fmt as num } from './components/useEem.js'

useHead({ title: 'Library — Enns Entomology Museum' })

// Tags and identifiers used in TaxonWorks for the library
// Format tags, matched loosely: "Physical copy", "PDF", "Only PDF", "PDF and physical copy"...
const IS_PHYS_TAG = /physical|\bshelf\b|\bprint(ed)?\b/i
const IS_PDF_TAG = /\bpdf\b/i
const IS_PDF_ONLY_TAG = /\bpdf\b.*\bonly\b|\bonly\b.*\bpdf\b/i
const isFormatTag = (t) => IS_PHYS_TAG.test(t) || IS_PDF_TAG.test(t)
// Tags that are not taxonomic groups: library format, and the Research page's
// "Uses EEM specimens" (see pages/research.vue)
const NOT_GROUPS = ['uses eem specimens']
const LIB_PREFIX = /^EEM\.LIB/i

const sources = shallowRef([])
const tagsBySource = shallowRef(new Map())
const tagDefinitions = shallowRef({}) // keyword name → its definition in TaxonWorks
const loaded = ref(false)
const group = ref('')
const q = ref('')
const fmt = ref('')
const typ = ref('') // publication type (Journal articles, Books, …)
const dec = ref(null) // decade, e.g. 1950
const titlesEl = ref(null)

// Clicking a stat filters the list below (click again to undo) and brings the list into view
function pick(which, value) {
  const r = { fmt, typ, dec }[which]
  r.value = r.value === value ? (which === 'dec' ? null : '') : value
  if (r.value !== '' && r.value !== null) titlesEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function getAll(path, params) {
  const out = []
  for (let page = 1; page < 50; page++) {
    const { data, headers } = await makeAPIRequest.get(path, { params: { ...params, per: 500, page } })
    const rows = Array.isArray(data) ? data : []
    out.push(...rows)
    const total = Number(headers['pagination-total'])
    if (!rows.length || !total || out.length >= total) break
  }
  return out
}

onMounted(async () => {
  try {
    const [srcs, tags, terms] = await Promise.all([
      getAll('/sources', { in_project: true, 'extend[]': ['identifiers'] }),
      getAll('/tags', { tag_object_type: 'Source' }),
      getAll('/controlled_vocabulary_terms').catch(() => [])
    ])
    const m = new Map()
    // keyword definitions, e.g. "… the subfamily Cryptinae (Hymenoptera: Ichneumonidae)"
    const defs = {}
    terms.forEach((k) => {
      if (k.type === 'Keyword' && k.name && k.definition) defs[k.name] = k.definition
    })
    tags.forEach((t) => {
      if (t.tag_object_type !== 'Source' || !t.keyword?.name) return
      if (!m.has(t.tag_object_id)) m.set(t.tag_object_id, [])
      m.get(t.tag_object_id).push(t.keyword.name)
    })
    tagsBySource.value = m
    tagDefinitions.value = defs
    sources.value = srcs
  } catch {
    sources.value = []
  } finally {
    loaded.value = true
  }
})

const items = computed(() =>
  sources.value.map((s) => {
    const tags = tagsBySource.value.get(s.id) || []
    const lower = tags.map((t) => t.toLowerCase())
    const libId = (s.identifiers || []).map((i) => i.value || i.cached || '').find((v) => LIB_PREFIX.test(v)) || ''
    const pdfOnlyTag = tags.some((t) => IS_PDF_ONLY_TAG.test(t))
    const isPdf = tags.some((t) => IS_PDF_TAG.test(t))
    // A library number (EEM.LIB…) means a copy on the shelf, unless tagged "PDF only"
    const isPhys = !pdfOnlyTag && (tags.some((t) => IS_PHYS_TAG.test(t)) || !!libId)
    return {
      id: s.id,
      citation: linkify(s.cached || s.object_tag || s.title || ''),
      year: s.year || null,
      type: s.bibtex_type || 'other',
      doi: (s.doi || '').trim(),
      libId,
      format: isPhys && isPdf ? 'both' : isPhys ? 'phys' : isPdf ? 'pdf' : '',
      groups: tags.filter((t) => !isFormatTag(t) && !NOT_GROUPS.includes(t.toLowerCase())).sort((a, b) => a.localeCompare(b))
    }
  })
    // Only library holdings: references added just for nomenclature carry no format tag
    .filter((i) => i.format)
)

const total = computed(() => items.value.length)
const physical = computed(() => items.value.filter((i) => i.format === 'phys').length)
const pdfOnly = computed(() => items.value.filter((i) => i.format === 'pdf').length)
const both = computed(() => items.value.filter((i) => i.format === 'both').length)
const unknown = computed(() => total.value - physical.value - pdfOnly.value - both.value)

const groups = computed(() => {
  const m = new Map()
  items.value.forEach((i) => i.groups.forEach((g) => m.set(g, (m.get(g) || 0) + 1)))
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => a.name.localeCompare(b.name))
})
// Tree of group tags (parent found via Catalogue of Life)
const parents = shallowRef(new Map())
watch(
  () => groups.value.map((g) => g.name).join('|'),
  async () => {
    const names = groups.value.map((g) => g.name)
    if (names.length) parents.value = await parentsOf(names, tagDefinitions.value)
  }
)

// all titles under a group, including its sub-groups
function titlesUnder(name, kids) {
  const ids = new Set()
  const walk = (n) => {
    items.value.forEach((i) => i.groups.includes(n) && ids.add(i.id))
    ;(kids.get(n) || []).forEach(walk)
  }
  walk(name)
  return ids
}

const tree = computed(() => {
  const names = groups.value.map((g) => g.name)
  const kids = new Map()
  names.forEach((n) => {
    const p = parents.value.get(n) || null
    if (!kids.has(p)) kids.set(p, [])
    kids.get(p).push(n)
  })
  const build = (n) => ({
    name: n,
    n: titlesUnder(n, kids).size,
    children: (kids.get(n) || []).map(build).sort((a, b) => a.name.localeCompare(b.name))
  })
  return (kids.get(null) || []).map(build).sort((a, b) => a.name.localeCompare(b.name))
})

const flatTree = computed(() => {
  const out = []
  const walk = (node, depth) => {
    out.push({ name: node.name, n: node.n, depth })
    node.children.forEach((c) => walk(c, depth + 1))
  }
  tree.value.forEach((r) => walk(r, 0))
  return out
})

const groupMax = computed(() => Math.max(1, ...flatTree.value.map((g) => g.n)))
const groupIds = computed(() => {
  if (!group.value) return null
  const kids = new Map()
  groups.value.forEach((g) => {
    const p = parents.value.get(g.name) || null
    if (!kids.has(p)) kids.set(p, [])
    kids.get(p).push(g.name)
  })
  return titlesUnder(group.value, kids)
})

const TYPE_NAMES = { article: 'Journal articles', book: 'Books', inbook: 'Book chapters', incollection: 'Book chapters', misc: 'Other', phdthesis: 'Theses', mastersthesis: 'Theses', techreport: 'Reports', booklet: 'Booklets', unpublished: 'Unpublished' }
const types = computed(() => {
  const m = new Map()
  items.value.forEach((i) => {
    const k = TYPE_NAMES[i.type] || 'Other'
    m.set(k, (m.get(k) || 0) + 1)
  })
  return [...m.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
})
const typeMax = computed(() => Math.max(1, ...types.value.map((t) => t.n)))
const typeOf = (i) => TYPE_NAMES[i.type] || 'Other'
const FORMAT_LABELS = { phys: 'Physical copy only', both: 'Physical copy and PDF', pdf: 'PDF only', unk: 'Not yet marked' }
const formats = computed(() => [
  { key: 'phys', label: FORMAT_LABELS.phys, n: physical.value },
  { key: 'both', label: FORMAT_LABELS.both, n: both.value },
  { key: 'pdf', label: FORMAT_LABELS.pdf, n: pdfOnly.value },
  { key: 'unk', label: FORMAT_LABELS.unk, n: unknown.value }
])
const pct = (n) => (total.value ? `${Math.round((n / total.value) * 100)}%` : '')

const decades = computed(() => {
  const ys = items.value.map((i) => i.year).filter((y) => y > 1500)
  if (!ys.length) return []
  const m = new Map()
  ys.forEach((y) => {
    const d = Math.floor(y / 10) * 10
    m.set(d, (m.get(d) || 0) + 1)
  })
  const keys = [...m.keys()].sort()
  const out = []
  for (let d = keys[0]; d <= keys[keys.length - 1]; d += 10) out.push({ d, n: m.get(d) || 0 })
  const max = Math.max(...out.map((x) => x.n))
  // Over a century, label every 50 years with the full year so decades don't repeat
  const long = out.length > 10
  const first = out[0].d
  return out.map(({ d, n }) => ({
    d,
    name: `${d}s`,
    short: !long ? `’${String(d).slice(2)}` : d % 50 === 0 || d === first ? String(d) : '',
    n,
    h: n ? Math.max(5, (n / max) * 100) : 0
  }))
})
const busiest = computed(() => {
  const top = [...decades.value].sort((a, b) => b.n - a.n)[0]
  return top && top.n ? top.name : ''
})
const oldest = computed(() => {
  const ys = items.value.map((i) => i.year).filter((y) => y > 1500)
  return ys.length ? Math.min(...ys) : null
})

const stats = computed(() => [
  { label: 'Titles', value: num(total.value), note: 'catalogued so far' },
  { label: 'Physical copies', value: num(physical.value + both.value), note: `on the shelves, ${num(both.value)} also as PDF` },
  { label: 'PDF only', value: num(pdfOnly.value), note: 'digital copies' },
  { label: 'Groups covered', value: num(groups.value.length), note: 'taxonomic tags' },
  { label: 'Years spanned', value: oldest.value ? `${oldest.value}–${Math.max(...items.value.map((i) => i.year || 0))}` : '—', note: 'publication dates' }
])

const activeFilters = computed(() =>
  [
    group.value && { key: 'group', label: group.value },
    fmt.value && { key: 'fmt', label: FORMAT_LABELS[fmt.value] },
    typ.value && { key: 'typ', label: typ.value },
    dec.value !== null && { key: 'dec', label: `${dec.value}s` }
  ].filter(Boolean)
)
function clearFilter(key) {
  if (key === 'dec') dec.value = null
  else ({ group, fmt, typ })[key].value = ''
}
function clearAll() {
  group.value = ''
  fmt.value = ''
  typ.value = ''
  dec.value = null
}

const shown = computed(() => {
  const term = q.value.trim().toLowerCase()
  return items.value
    .filter((i) => !groupIds.value || groupIds.value.has(i.id))
    .filter((i) => !fmt.value || i.format === fmt.value)
    .filter((i) => !typ.value || typeOf(i) === typ.value)
    .filter((i) => dec.value === null || (i.year && Math.floor(i.year / 10) * 10 === dec.value))
    .filter((i) => !term || i.citation.replace(/<[^>]+>/g, '').toLowerCase().includes(term))
    .sort((a, b) => a.citation.replace(/<[^>]+>/g, '').localeCompare(b.citation.replace(/<[^>]+>/g, '')))
})
</script>

<style scoped>
.eem-lib-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.eem-lib-tree li {
  position: relative;
  padding-left: calc(var(--depth, 0) * 1.4rem);
  margin-top: 0.25rem;
}
.eem-lib-tree li.child::before {
  content: '';
  position: absolute;
  left: calc(var(--depth) * 1.4rem - 0.85rem);
  top: -0.35rem;
  width: 0.7rem;
  height: 1.15rem;
  border-left: 1.5px solid var(--eem-rule);
  border-bottom: 1.5px solid var(--eem-rule);
}
.eem-lib-tree li:not(.child) {
  margin-top: 0.6rem;
}
.eem-lib-tree li:not(.child) .eem-lib-name {
  font-weight: 800;
}
.eem-lib-row {
  display: grid;
  grid-template-columns: minmax(7rem, 11rem) 1fr 2.5rem;
  grid-template-columns: minmax(6rem, calc(11rem - var(--depth, 0) * 1.4rem)) 1fr 2.5rem;
  align-items: center;
  gap: 0.8rem;
  width: 100%;
  padding: 0.3rem 0.4rem;
  text-align: left;
  border-radius: 2px;
  color: var(--eem-ink);
}
.eem-lib-row:hover {
  background: var(--eem-paper-2);
}
.eem-lib-row.on {
  background: #ffedcf;
  outline: 2px solid var(--eem-gold);
}
.eem-lib-name {
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.eem-lib-bar {
  height: 10px;
  background: var(--eem-paper-2);
}
.eem-lib-bar span {
  display: block;
  height: 100%;
  background: var(--eem-gold);
}
.eem-lib-n {
  text-align: right;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.eem-lib-split {
  display: flex;
  height: 1.1rem;
  gap: 2px;
}
.eem-lib-split button {
  border: 0;
  padding: 0;
  cursor: pointer;
  transition: opacity 0.15s;
}
.eem-lib-split button:hover,
.eem-lib-split button:focus-visible {
  outline: 2px solid var(--eem-ink);
  outline-offset: 1px;
}
.eem-lib-split .dim {
  opacity: 0.3;
}
.eem-lib-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.3rem 0.45rem;
  border-radius: 4px;
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.eem-lib-row:hover:not(:disabled) {
  background: var(--eem-paper-2);
}
.eem-lib-row.on {
  background: var(--eem-ink);
  color: var(--eem-paper);
}
.eem-lib-row.on .eem-muted {
  color: inherit;
  opacity: 0.75;
}
.eem-lib-row:disabled {
  cursor: default;
}
.eem-lib-typebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--eem-gold);
  opacity: 0.25;
}
.eem-lib-row.on .eem-lib-typebar {
  opacity: 0.45;
}
.eem-lib-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  background: var(--eem-ink);
  color: var(--eem-gold);
  font-size: 0.75rem;
  font-weight: 700;
}
.eem-lib-chip:hover {
  opacity: 0.85;
}
.eem-lib-split span,
.eem-lib-dot {
  display: inline-block;
}
.eem-lib-dot {
  width: 0.8rem;
  height: 0.8rem;
}
.phys {
  background: #000;
}
.pdf {
  background: var(--eem-gold);
}
.both {
  background: linear-gradient(90deg, #000 50%, var(--eem-gold) 50%);
}
.unk {
  background: var(--eem-rule);
}
.eem-lib-decades {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 3px;
  height: 7rem;
  padding-top: 1.1rem; /* room for the count shown above a bar */
  align-items: end;
}
.eem-lib-dec {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  position: relative;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.eem-lib-dec:disabled {
  cursor: default;
}
.eem-lib-dec.dim {
  opacity: 0.35;
}
.eem-lib-dec:hover .eem-lib-dec-bar,
.eem-lib-dec.on .eem-lib-dec-bar {
  background: var(--eem-ink);
}
.eem-lib-dec:focus-visible {
  outline: 2px solid var(--eem-ink);
  outline-offset: 2px;
}
/* the count appears above the bar on hover (and stays on the selected decade) */
.eem-lib-dec-n {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 2px);
  transform: translateX(-50%);
  padding: 0 0.3rem;
  border-radius: 3px;
  background: var(--eem-ink);
  color: var(--eem-gold);
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.1s;
  z-index: 1;
}
.eem-lib-dec:hover .eem-lib-dec-n,
.eem-lib-dec:focus-visible .eem-lib-dec-n,
.eem-lib-dec.on .eem-lib-dec-n {
  opacity: 1;
}
.eem-lib-dec-bar {
  display: block;
  background: var(--eem-gold);
  min-height: 2px;
}
.eem-lib-dec-lab {
  white-space: nowrap;
  margin-top: 3px;
  font-size: 0.6rem;
  text-align: center;
  color: var(--eem-ink-soft);
}
.eem-lib-search {
  min-width: 14rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  padding: 0.5rem 0.75rem;
  background: var(--eem-card);
  color: var(--eem-ink);
}
.eem-lib-item {
  display: flex;
  gap: 0.9rem;
  padding: 0.9rem 1rem;
  font-size: 0.9rem;
}
.eem-lib-fmt {
  flex-shrink: 0;
  width: 3rem;
  text-align: center;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0;
  align-self: flex-start;
  background: var(--eem-rule);
}
.eem-lib-fmt.phys {
  background: #000;
  color: var(--eem-gold);
}
.eem-lib-fmt.pdf {
  background: var(--eem-gold);
  color: #000;
}
.eem-lib-fmt.both {
  background: #000;
  color: var(--eem-gold);
  box-shadow: inset 0 -3px 0 var(--eem-gold);
}
.eem-lib-item :deep(a) {
  word-break: break-all;
}
.eem-lib-id {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0 0.35rem;
  border: 1px solid var(--eem-ink);
}
.eem-lib-tag {
  font-size: 0.7rem;
  padding: 0 0.4rem;
  background: var(--eem-paper-2);
  border: 1px solid var(--eem-rule);
}
</style>
