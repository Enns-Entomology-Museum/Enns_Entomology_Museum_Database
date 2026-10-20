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
        class="eem-card p-3 sm:p-5"
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
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useHead } from '@unhead/vue'
import { makeAPIRequest } from '@/utils/request'
import EemPageHead from './components/EemPageHead.vue'
import { ORDER_NAMES, fmt, useEem } from './components/useEem.js'

useHead({ title: 'Taxonomic tree — Enns Entomology Museum' })

const eem = useEem()
const loading = ref(true)
const filter = ref('')
const nodes = ref(new Map())
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
        children: [],
        own: 0,
        total: 0
      })
    })
    map.forEach((n) => {
      const p = map.get(n.parent)
      if (p) p.children.push(n)
    })
    map.forEach((n) => n.children.sort((a, b) => a.name.localeCompare(b.name)))
    nodes.value = map
    // open orders by default
    map.forEach((n) => {
      if (['Class', 'Order'].includes(n.rank) || HIDE.has(n.name)) openSet.add(n.id)
    })
  } finally {
    loading.value = false
  }
})

// Specimen counts: attach each DwC record to the deepest matching name
const counted = computed(() => {
  const map = nodes.value
  if (!map.size) return map
  const byFull = new Map()
  map.forEach((n) => {
    if (!byFull.has(n.full)) byFull.set(n.full, n)
    // "Ambrysus (Ambrysus) brunneus" also as "Ambrysus brunneus", as in the DwC records
    const plain = n.full.replace(/\s*\([^)]*\)/g, '').trim()
    if (plain !== n.full && !byFull.has(plain)) byFull.set(plain, n)
  })
  map.forEach((n) => {
    n.own = 0
    n.total = 0
  })
  eem.records.forEach((r) => {
    const keys = [
      [r.genus, r.specificEpithet].filter(Boolean).join(' '),
      r.genus,
      r.family,
      r.order
    ].filter(Boolean)
    const hit = keys.map((k) => byFull.get(k)).find(Boolean)
    if (hit) hit.own++
  })
  function sum(n) {
    n.total = n.own + n.children.reduce((a, c) => a + sum(c), 0)
    return n.total
  }
  map.forEach((n) => {
    if (!map.get(n.parent)) sum(n)
  })
  return map
})

// Start below the generic upper ranks (Root → Hexapoda)
const roots = computed(() => {
  const map = counted.value
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
      while (p) {
        keep.add(p.id)
        p = nodes.value.get(p.parent)
      }
    }
  })
  return keep
})

const summary = computed(() => {
  // only groups with digitized specimens, so the numbers match the home page
  const map = counted.value
  const count = (r) => [...map.values()].filter((n) => n.rank === r && n.total > 0).length
  return `With specimens: ${count('Order')} orders · ${count('Family')} families · ${count('Genus')} genera · ${count('Species')} species`
})

function setAll(v) {
  nodes.value.forEach((n) => (v ? openSet.add(n.id) : !HIDE.has(n.name) && n.rank !== 'Class' && openSet.delete(n.id)))
}

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: { node: Object, depth: Number },
  setup(props) {
    return () => {
      const n = props.node
      const m = matches.value
      if (m && !m.has(n.id)) return null
      const kids = n.children.filter((c) => !m || m.has(c.id))
      const isOpen = m ? true : openSet.has(n.id)
      const otu = otuByTaxon.value.get(n.id)
      const major = MAJOR.includes(n.rank)
      const hit = m && filter.value && n.full.toLowerCase().includes(filter.value.trim().toLowerCase())

      return h('li', { role: 'treeitem', 'aria-expanded': kids.length ? String(isOpen) : undefined, class: 'eem-tn' }, [
        h('div', { class: ['eem-tn-row', { major, hit }] }, [
          kids.length
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'eem-tn-toggle',
                  'aria-label': `${isOpen ? 'Collapse' : 'Expand'} ${n.full}`,
                  onClick: () => (openSet.has(n.id) ? openSet.delete(n.id) : openSet.add(n.id))
                },
                isOpen ? '−' : '+'
              )
            : h('span', { class: 'eem-tn-leaf', 'aria-hidden': 'true' }),
          h('span', { class: 'eem-tn-rank' }, n.rank),
          otu
            ? h(RouterLink, { to: { name: 'otus-id-overview', params: { id: otu } }, class: 'eem-tn-name', innerHTML: n.html })
            : h('span', { class: 'eem-tn-name', innerHTML: n.html }),
          n.rank === 'Order' && ORDER_NAMES[n.name] ? h('span', { class: 'eem-tn-common' }, ORDER_NAMES[n.name]) : null,
          n.total ? h('span', { class: 'eem-tn-count', title: `${n.total} digitized specimens` }, fmt(n.total)) : null
        ]),
        kids.length && isOpen
          ? h(
              'ul',
              { role: 'group', class: 'eem-tn-kids' },
              kids.map((c) => h(TreeNode, { key: c.id, node: c, depth: props.depth + 1 }))
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
  border: 2px solid #000;
  border-radius: 2px;
  padding: 0.55rem 0.9rem;
  background: var(--eem-card);
  color: var(--eem-ink);
  outline: none;
}
.eem-tree-filter:focus {
  border-color: var(--eem-gold);
}
.eem-tree :deep(ul),
.eem-tree {
  list-style: none;
  margin: 0;
  padding: 0;
}
.eem-tree :deep(.eem-tn-kids) {
  margin-left: 1.05rem;
  padding-left: 0.9rem;
  border-left: 1px dashed var(--eem-rule);
}
.eem-tree :deep(.eem-tn-row) {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.3rem 0.35rem;
  border-radius: 2px;
}
.eem-tree :deep(.eem-tn-row:hover) {
  background: var(--eem-paper-2);
}
.eem-tree :deep(.eem-tn-row.hit) {
  background: color-mix(in srgb, var(--eem-gold) 25%, transparent);
}
.eem-tree :deep(.eem-tn-toggle) {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--eem-ink);
  border-radius: 2px;
  font-weight: 800;
  line-height: 1;
  font-size: 0.95rem;
}
.eem-tree :deep(.eem-tn-toggle:hover) {
  background: var(--eem-gold);
  border-color: var(--eem-gold);
  color: #000;
}
.eem-tree :deep(.eem-tn-leaf) {
  width: 1.35rem;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.eem-tree :deep(.eem-tn-leaf)::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--eem-rule);
}
.eem-tree :deep(.eem-tn-rank) {
  width: 6.2rem;
  flex-shrink: 0;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.eem-tree :deep(.eem-tn-name) {
  min-width: 0;
  color: var(--eem-ink) !important;
}
.eem-tree :deep(a.eem-tn-name:hover) {
  text-decoration: underline;
  text-decoration-color: var(--eem-gold);
  text-decoration-thickness: 2px;
}
.eem-tree :deep(.major .eem-tn-name) {
  font-weight: 700;
}
.eem-tree :deep(.eem-tn-common) {
  font-size: 0.85rem;
  color: var(--eem-ink-soft);
}
.eem-tree :deep(.eem-tn-count) {
  margin-left: auto;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.05rem 0.45rem;
  background: var(--eem-gold);
  color: #000;
  border-radius: 2px;
}
@media (max-width: 640px) {
  .eem-tree :deep(.eem-tn-rank) {
    display: none;
  }
}
</style>
