<template>
  <VCard>
    <VCardHeader class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-md flex items-center gap-2">
        <img
          v-if="logoOk"
          :src="logoSrc"
          alt=""
          class="col-logo"
          @error="logoOk = false"
        />
        <span
          v-else
          class="col-mark"
          aria-hidden="true"
          >COL</span
        >
        Catalogue of Life
      </h2>
      <a
        v-if="usage"
        :href="colUrl(usage.id)"
        target="_blank"
        rel="noopener"
        class="col-badge"
        :title="`Open ${usage.name} in the Catalogue of Life`"
        ><span class="k">COL</span><span class="v">{{ usage.id }}</span><span class="go">↗</span></a
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
          <span :class="['col-status ml-2', usage.status === 'accepted' ? 'ok' : 'syn']">{{ usage.status }}</span>
        </p>
        <p
          v-if="accepted"
          class="mt-1 text-base-soft"
        >
          Accepted name:
          <a
            v-if="acceptedId"
            :href="colUrl(acceptedId)"
            target="_blank"
            rel="noopener"
            class="underline"
            ><span v-html="accepted"
          /></a>
          <span
            v-else
            v-html="accepted"
          />
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
            <a
              :href="colUrl(c.id)"
              target="_blank"
              rel="noopener"
              class="col-rank"
              :title="`${c.rank} — open in the Catalogue of Life`"
              >{{ c.name }}</a
            >
          </li>
        </ol>
        <p class="mt-3 text-xs text-base-soft flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Classification from the Catalogue of Life{{ release?.version ? `, version ${release.version}` : '' }}.</span>
          <a
            v-if="release?.doi"
            :href="`https://doi.org/${release.doi}`"
            target="_blank"
            rel="noopener"
            class="col-badge small"
            ><span class="k">DOI</span><span class="v">{{ release.doi }}</span></a
          >
        </p>
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
const release = ref(null) // { version, doi } of the Catalogue of Life release used
const colUrl = (id) => `https://www.catalogueoflife.org/data/taxon/${encodeURIComponent(id)}`

// Official COL logo: save it as public/images/col-logo.png (or .svg and change the name here);
// until then a small "COL" mark is shown.
const logoSrc = `${import.meta.env.BASE_URL || '/'}images/col-logo.png`
const logoOk = ref(true)
const usage = ref(null)
const info = ref(null)

const lineage = computed(() => [...(usage.value?.classification || [])].reverse())
const acceptedId = computed(() => (usage.value && usage.value.status !== 'accepted' ? info.value?.taxon?.id || usage.value.parentId : null))
const accepted = computed(() => {
  const u = usage.value
  if (!u || u.status === 'accepted') return ''
  return info.value?.taxon?.labelHtml || ''
})
const common = computed(() =>
  [...new Set((info.value?.vernacularNames || []).filter((v) => ['eng', 'en'].includes(v.language)).map((v) => v.name))].slice(0, 4)
)

onMounted(async () => {
  // Release version and DOI (for the citation line); not essential
  fetch(API)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d && (release.value = { version: d.version || d.issued || '', doi: d.doi || '' }))
    .catch(() => {})
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
.col-logo {
  height: 1.6rem;
  width: auto;
}
.col-mark {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 900;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  padding: 0.15rem 0.35rem;
  border: 2px solid currentColor;
  border-radius: 3px;
}
.col-badge {
  display: inline-flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid #000;
  text-decoration: none !important;
}
.col-badge .k {
  background: #000;
  color: #fdb719;
  padding: 0.2rem 0.5rem 0.2rem 0.65rem;
  letter-spacing: 0.06em;
}
.col-badge .v {
  padding: 0.2rem 0.5rem;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
}
.col-badge .go {
  padding: 0.2rem 0.6rem 0.2rem 0;
}
.col-badge:hover .v,
.col-badge:hover .go {
  background: #fdb719;
  color: #000;
}
.col-badge.small {
  font-size: 0.68rem;
}
.col-status {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.05rem 0.5rem;
  border-radius: 2px;
  vertical-align: 2px;
}
.col-status.ok {
  background: #1b7f5a;
  color: #fff;
}
.col-status.syn {
  background: #fdb719;
  color: #000;
}
.col-rank {
  text-decoration: none;
}
.col-rank:hover {
  text-decoration: underline;
}
.eem-pill {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.05rem 0.5rem;
  border-radius: 2px;
  background: #000;
  color: #fdb719;
  vertical-align: 2px;
}
</style>
