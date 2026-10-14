<template>
  <VCard>
    <VCardHeader class="flex items-center justify-between gap-3">
      <h2 class="text-md">Catalogue of Life</h2>
      <a
        v-if="usage"
        :href="`https://www.catalogueoflife.org/data/taxon/${usage.id}`"
        target="_blank"
        rel="noopener"
        class="text-sm font-semibold underline"
        >Open in COL ↗</a
      >
    </VCardHeader>
    <VCardContent class="text-sm">
      <VSpinner
        v-if="loading"
        logo-class="w-8 h-8"
        legend=""
      />
      <p
        v-else-if="!usage"
        class="text-base-soft"
      >
        <i>{{ name }}</i> was not matched in the Catalogue of Life.
      </p>

      <template v-else>
        <p class="text-base">
          <span v-html="usage.labelHtml || usage.name" />
          <span class="eem-pill ml-2">{{ usage.status }}</span>
        </p>
        <p
          v-if="accepted"
          class="mt-1 text-base-soft"
        >
          Accepted name: <span v-html="accepted" />
        </p>
        <p
          v-if="common.length"
          class="mt-2"
        >
          <span class="text-base-soft">Common names:</span> {{ common.join(', ') }}
        </p>

        <ol class="mt-4 flex flex-wrap gap-x-1 gap-y-1 text-xs">
          <li
            v-for="(c, i) in lineage"
            :key="c.id"
            class="inline-flex items-center gap-1"
          >
            <span
              v-if="i"
              class="text-base-soft"
              aria-hidden="true"
              >›</span
            >
            <span :title="c.rank">{{ c.name }}</span>
          </li>
        </ol>
        <p class="mt-3 text-xs text-base-soft">Classification from the latest Catalogue of Life release.</p>
      </template>
    </VCardContent>
  </VCard>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { canonicalName } from '../_eem/name.js'

const props = defineProps({
  taxon: { type: Object, default: () => ({}) },
  otu: { type: Object, default: () => ({}) }
})

const API = 'https://api.checklistbank.org/dataset/3LR'
const name = canonicalName(props.taxon, props.otu)
const loading = ref(true)
const usage = ref(null)
const info = ref(null)

const lineage = computed(() => [...(usage.value?.classification || [])].reverse())
const accepted = computed(() => {
  const u = usage.value
  if (!u || u.status === 'accepted') return ''
  return info.value?.taxon?.labelHtml || ''
})
const common = computed(() =>
  [...new Set((info.value?.vernacularNames || []).filter((v) => ['eng', 'en'].includes(v.language)).map((v) => v.name))].slice(0, 4)
)

onMounted(async () => {
  try {
    if (!name) return
    const r = await fetch(`${API}/match/nameusage?q=${encodeURIComponent(name)}`)
    const m = await r.json()
    if (!m?.usage?.id) return
    usage.value = m.usage
    const id = m.usage.status === 'accepted' ? m.usage.id : m.usage.parentId || m.usage.id
    const ri = await fetch(`${API}/taxon/${id}/info`)
    if (ri.ok) info.value = await ri.json()
  } catch {
    usage.value = usage.value || null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.eem-pill {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.05rem 0.5rem;
  border-radius: 2px;
  background: #000;
  color: #f1b82d;
  vertical-align: 2px;
}
</style>
