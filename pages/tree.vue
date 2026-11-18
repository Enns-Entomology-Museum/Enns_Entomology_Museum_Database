<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="Browse"
      title="Taxonomic tree"
      lede="Walk the classification from order down to species. Numbers show how many digitized specimens sit under each group; click a name to open its page."
    />

    <section class="container mx-auto box-border px-4 py-12">
      <div class="flex flex-wrap items-center gap-3 mb-6">
        <input
          v-model="filter"
          type="search"
          class="eem-tree-filter"
          placeholder="Filter the tree, e.g. Perlidae or Belostoma"
          aria-label="Filter the taxonomic tree"
        />
        <button
          type="button"
          class="eem-btn eem-btn-line !py-2"
          @click="setAll(true)"
        >
          Expand all
        </button>
        <button
          type="button"
          class="eem-btn eem-btn-line !py-2"
          @click="setAll(false)"
        >
          Collapse
        </button>
        <span class="text-sm eem-muted ml-auto">{{ summary }}</span>
      </div>

      <p
        v-if="loading"
        class="eem-muted"
      >
        Loading the classification…
      </p>
      <p
        v-else-if="!roots.length"
        class="eem-card p-6 eem-muted"
      >
        No taxa in the database yet.
      </p>

      <div
        v-else
      >
        <ul
          class="eem-tree"
          role="tree"
          aria-label="Taxonomic tree"
        >
          <TreeNode
            v-for="n in roots"
            :key="n.id"
            :node="n"
            :depth="0"
            :max="rootMax"
          />
        </ul>
      </div>

      <p class="mt-4 text-xs eem-muted">
        Only names used in the museum database are shown — this is the collection’s tree, not a complete classification.
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, reactive, ref, shallowRef } from 'vue'
import { RouterLink } from 'vue-router'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import EemPageHead from './components/EemPageHead.vue'
import { ORDER_NAMES, fmt, useEem } from './components/useEem.js'

useHead({ title: 'Taxonomic tree — Enns Entomology Museum' })

const eem = useEem()
const loading = ref(true)
const filter = ref('')
// plain (non-reactive) tree: it never changes after loading
const nodes = shallowRef(new Map())
const openSet = reactive(new Set())
const otuByTaxon = ref(new Map())

const HIDE = new Set(['Root', 'Animalia', 'Arthropoda', 'Hexapoda'])
const MAJOR = ['Order', 'Family', 'Genus', 'Species']

function rankOf(t) {
  return String(t.rank_string || '').split('::').pop().replace('ClassRank', 'Class')
}

onMounted(async () => {
  try {
    const [{ data: names }, { data: otus }] = await Promise.all([
      makeAPIRequest.get('/taxon_names', { params: { per: 5000, validity: true } }),
      makeAPIRequest.get('/otus', { params: { per: 5000 } })
    ])
    otuByTaxon.value = new Map((otus || []).map((o) => [o.taxon_name_id, o.id]))
    const map = new Map()
    ;(names || []).forEach((t) => {
      map.set(t.id, {
        id: t.id,
        parent: t.parent_id,
        rank: rankOf(t),
        name: t.name,
        full: (t.cached || t.name || '').trim(),
        html: rankOf(t) === 'Species' || rankOf(t) === 'Subspecies' ? t.cached_html || `<i>${t.name}</i>` : ['Genus', 'Subgenus'].includes(rankOf(t)) ? `<i>${t.name}</i>` : t.name,
        children: []
      })
    })
    map.forEach((n) => {
      const p = map.get(n.parent)
      if (p) p.children.push(n)
    })
    map.forEach((n) => n.children.sort((a, b) => a.name.localeCompare(b.name)))
    nodes.value = map
    // start with only the orders showing, all closed: open one to see its families
    map.forEach((n) => {
      if (n.rank === 'Class' || HIDE.has(n.name)) openSet.add(n.id)
    })
  } finally {
    loading.value = false
  }
})

// Specimen counts: attach each DwC record to the deepest matching name.
// Returns a new Map (id -> number of specimens in the group) and never writes to the tree:
// writing counts onto reactive nodes inside a computed made Vue recompute it forever and froze the page.
const counted = computed(() => {
  const map = nodes.value
  const totals = new Map()
  if (!map.size) return totals
  const byFull = new Map()
  map.forEach((n) => {
    if (!byFull.has(n.full)) byFull.set(n.full, n)
    // "Ambrysus (Ambrysus) brunneus" also as "Ambrysus brunneus", as in the DwC records
    const plain = n.full.replace(/\s*\([^)]*\)/g, '').trim()
    if (plain !== n.full && !byFull.has(plain)) byFull.set(plain, n)
  })
  const own = new Map()
  eem.records.forEach((r) => {
    const keys = [
      [r.genus, r.specificEpithet].filter(Boolean).join(' '),
      r.genus,
      r.family,
      r.order
    ].filter(Boolean)
    const hit = keys.map((k) => byFull.get(k)).find(Boolean)
    if (hit) own.set(hit.id, (own.get(hit.id) || 0) + 1)
  })
  function sum(n, seen) {
    if (seen.has(n.id)) return 0 // guard against a loop in the classification
    seen.add(n.id)
    const t = (own.get(n.id) || 0) + n.children.reduce((a, c) => a + sum(c, seen), 0)
    totals.set(n.id, t)
    return t
  }
  const seen = new Set()
  map.forEach((n) => {
    if (!map.get(n.parent)) sum(n, seen)
  })
  return totals
})

// Start below the generic upper ranks (Root → Hexapoda)
const roots = computed(() => {
  const map = nodes.value
  let level = [...map.values()].filter((n) => !map.get(n.parent))
  while (level.length === 1 && HIDE.has(level[0].name)) level = level[0].children
  return level
})

const matches = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return null
  const keep = new Set()
  nodes.value.forEach((n) => {
    if (n.full.toLowerCase().includes(q)) {
      let p = n
      while (p && !keep.has(p.id)) {
        keep.add(p.id)
        p = nodes.value.get(p.parent)
      }
    }
  })
  return keep
})

const summary = computed(() => {
  // only groups with digitized specimens, so the numbers match the home page
  const totals = counted.value
  const count = (r) => [...nodes.value.values()].filter((n) => n.rank === r && totals.get(n.id) > 0).length
  return `With specimens: ${count('Order')} orders · ${count('Family')} families · ${count('Genus')} genera · ${count('Species')} species`
})

const rootMax = computed(() => Math.max(1, ...roots.value.map((n) => counted.value.get(n.id) || 0)))

function setAll(v) {
  nodes.value.forEach((n) => (v ? openSet.add(n.id) : !HIDE.has(n.name) && n.rank !== 'Class' && openSet.delete(n.id)))
}

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: { node: Object, depth: Number, max: { type: Number, default: 1 } },
  setup(props) {
    return () => {
      const n = props.node
      const total = counted.value.get(n.id) || 0
      const m = matches.value
      if (m && !m.has(n.id)) return null
      const kids = n.children.filter((c) => !m || m.has(c.id))
      const isOpen = m ? true : openSet.has(n.id)
      const otu = otuByTaxon.value.get(n.id)
      const major = MAJOR.includes(n.rank)
      const hit = m && filter.value && n.full.toLowerCase().includes(filter.value.trim().toLowerCase())
      const kidsMax = Math.max(1, ...kids.map((c) => counted.value.get(c.id) || 0))

      return h('li', { role: 'treeitem', 'aria-expanded': kids.length ? String(isOpen) : undefined, class: ['eem-tn', { top: props.depth === 0, open: isOpen && kids.length }] }, [
        h('div', { class: ['eem-tn-row', { major, hit }] }, [
          kids.length
            ? h(
                'button',
                {
                  type: 'button',
                  class: ['eem-tn-toggle', { open: isOpen }],
                  'aria-label': `${isOpen ? 'Collapse' : 'Expand'} ${n.full}`,
                  onClick: () => (openSet.has(n.id) ? openSet.delete(n.id) : openSet.add(n.id))
                },
                [h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, [h('path', { d: 'M6 3.5 10.5 8 6 12.5' })])]
              )
            : h('span', { class: 'eem-tn-leaf', 'aria-hidden': 'true' }),
          h('span', { class: 'eem-tn-label' }, [
            otu
              ? h(RouterLink, { to: { name: 'otus-id-overview', params: { id: otu } }, class: 'eem-tn-name', innerHTML: n.html })
              : h('span', { class: 'eem-tn-name', innerHTML: n.html }),
            h('span', { class: 'eem-tn-rank' }, n.rank),
            n.rank === 'Order' && ORDER_NAMES[n.name] ? h('span', { class: 'eem-tn-common' }, ORDER_NAMES[n.name]) : null
          ]),
          total
            ? h('span', { class: 'eem-tn-bar', 'aria-hidden': 'true' }, [
                h('span', { style: { width: Math.max(2, (100 * total) / props.max) + '%' } })
              ])
            : h('span', { class: 'eem-tn-bar empty', 'aria-hidden': 'true' }),
          h('span', { class: 'eem-tn-count', title: `${total} digitized specimens` }, total ? fmt(total) : '—')
        ]),
        kids.length && isOpen
          ? h(
              'ul',
              { role: 'group', class: 'eem-tn-kids' },
              kids.map((c) => h(TreeNode, { key: c.id, node: c, depth: props.depth + 1, max: kidsMax }))
            )
          : null
      ])
    }
  }
})
</script>

<style scoped>
.eem-tree-filter {
  flex: 1 1 18rem;
  max-width: 28rem;
  border: 1.5px solid var(--eem-rule);
  border-radius: 999px;
  padding: 0.6rem 1.1rem;
  background: var(--eem-card);
  color: var(--eem-ink);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.eem-tree-filter:focus {
  border-color: var(--eem-gold);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--eem-gold) 25%, transparent);
}
.eem-tree :deep(ul),
.eem-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* each order is its own rounded block */
.eem-tree {
  display: grid;
  gap: 0.6rem;
}
.eem-tree :deep(.eem-tn.top) {
  border-radius: 14px;
  background: var(--eem-card);
  box-shadow: 0 0 0 1px var(--eem-rule);
  overflow: hidden;
  transition: box-shadow 0.25s ease;
}
.eem-tree :deep(.eem-tn.top.open) {
  box-shadow: 0 0 0 1px var(--eem-rule), 0 16px 34px -26px rgb(0 0 0 / 0.45);
}
.eem-tree :deep(.eem-tn.top > .eem-tn-row) {
  padding: 0.8rem 1rem;
}
.eem-tree :deep(.eem-tn.top.open > .eem-tn-row) {
  background: color-mix(in srgb, var(--eem-gold) 12%, transparent);
}
.eem-tree :deep(.eem-tn.top > .eem-tn-row .eem-tn-name) {
  font-size: 1.08rem;
}
.eem-tree :deep(.eem-tn.top > .eem-tn-kids) {
  margin: 0.4rem 0.75rem 0.75rem 1.65rem;
}

.eem-tree :deep(.eem-tn-kids) {
  margin-left: 0.95rem;
  padding-left: 0.85rem;
  border-left: 1px solid var(--eem-rule);
}
.eem-tree :deep(.eem-tn-kids > li) {
  animation: eem-tn-in 0.25s ease both;
}
@keyframes eem-tn-in {
  from {
    opacity: 0;
    transform: translateY(-3px);
  }
}
.eem-tree :deep(.eem-tn-row) {
  display: grid;
  grid-template-columns: 1.6rem minmax(0, 1fr) minmax(4rem, 9rem) 4.5rem;
  align-items: center;
  gap: 0.7rem;
  padding: 0.38rem 0.6rem;
  border-radius: 10px;
  transition: background 0.2s ease;
}
.eem-tree :deep(.eem-tn-row:hover) {
  background: var(--eem-paper-2);
}
.eem-tree :deep(.eem-tn-row.hit) {
  background: color-mix(in srgb, var(--eem-gold) 25%, transparent);
}
.eem-tree :deep(.eem-tn-toggle) {
  width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--eem-rule);
  background: var(--eem-card);
  color: var(--eem-ink);
  transition: background 0.25s ease, border-color 0.25s ease;
}
.eem-tree :deep(.eem-tn-toggle svg) {
  width: 0.85rem;
  height: 0.85rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 0.25s ease;
}
.eem-tree :deep(.eem-tn-toggle:hover) {
  border-color: var(--eem-gold);
}
.eem-tree :deep(.eem-tn-toggle.open) {
  background: var(--eem-gold);
  border-color: var(--eem-gold);
  color: #000;
}
.eem-tree :deep(.eem-tn-toggle.open svg) {
  transform: rotate(90deg);
}
.eem-tree :deep(.eem-tn-leaf) {
  width: 1.6rem;
  display: grid;
  place-items: center;
}
.eem-tree :deep(.eem-tn-leaf)::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--eem-gold);
}
.eem-tree :deep(.eem-tn-label) {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 0.55rem;
  min-width: 0;
}
.eem-tree :deep(.eem-tn-name) {
  min-width: 0;
  color: var(--eem-ink) !important;
  background-image: linear-gradient(var(--eem-gold), var(--eem-gold));
  background-size: 0 2px;
  background-position: 0 100%;
  background-repeat: no-repeat;
  transition: background-size 0.25s ease;
}
.eem-tree :deep(a.eem-tn-name:hover) {
  background-size: 100% 2px;
}
.eem-tree :deep(.major .eem-tn-name) {
  font-weight: 700;
}
.eem-tree :deep(.eem-tn-rank) {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.eem-tree :deep(.eem-tn-common) {
  font-size: 0.85rem;
  color: var(--eem-ink-soft);
}
.eem-tree :deep(.eem-tn-bar) {
  height: 6px;
  border-radius: 999px;
  background: var(--eem-paper-2);
  overflow: hidden;
}
.eem-tree :deep(.eem-tn-bar.empty) {
  background: transparent;
}
.eem-tree :deep(.eem-tn-bar span) {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--eem-gold);
  transition: width 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.eem-tree :deep(.eem-tn-count) {
  text-align: right;
  font-size: 0.82rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--eem-ink);
}
@media (max-width: 640px) {
  .eem-tree :deep(.eem-tn-row) {
    grid-template-columns: 1.6rem minmax(0, 1fr) 3.5rem;
  }
  .eem-tree :deep(.eem-tn-rank),
  .eem-tree :deep(.eem-tn-bar) {
    display: none;
  }
}
</style>
