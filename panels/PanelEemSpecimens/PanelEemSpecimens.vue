<template>
  <VCard>
    <VCardHeader class="flex items-center justify-between gap-3">
      <h2 class="text-md">Specimens in the Enns Museum</h2>
      <span
        v-if="!loading"
        class="eem-count"
        >{{ records.length.toLocaleString('en-US') }}</span
      >
    </VCardHeader>
    <VCardContent class="text-sm">
      <VSpinner
        v-if="loading"
        logo-class="w-8 h-8"
        legend=""
      />
      <p
        v-else-if="!records.length"
        class="text-base-soft"
      >
        No digitized specimens of this taxon yet. More drawers are being catalogued every week.
      </p>

      <template v-else>
        <dl class="grid grid-cols-3 gap-3 mb-4">
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">Localities</dt>
            <dd class="text-xl font-bold">{{ localities }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">Years</dt>
            <dd class="text-xl font-bold">{{ years || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-base-soft">Collectors</dt>
            <dd class="text-xl font-bold">{{ collectors }}</dd>
          </div>
        </dl>

        <div
          v-if="season.total"
          class="mb-5"
        >
          <p class="text-xs uppercase tracking-wider text-base-soft">
            When collected <span class="normal-case tracking-normal">· {{ season.total }} dated specimens</span>
          </p>
          <div
            class="eem-season mt-2"
            role="img"
            :aria-label="season.bars.map((b) => `${b.long}: ${b.n}`).join(', ')"
          >
            <div
              v-for="b in season.bars"
              :key="b.m"
              class="eem-season-col"
              :title="`${b.long}: ${b.n} specimen${b.n === 1 ? '' : 's'}`"
            >
              <span
                class="eem-season-bar"
                :class="{ peak: b.peak }"
                :style="{ height: b.h + '%' }"
              />
              <span class="eem-season-lab">{{ b.short }}</span>
            </div>
          </div>
        </div>

        <ul class="divide-y divide-base-border border-y border-base-border">
          <li
            v-for="r in shown"
            :key="r.id"
            class="py-2"
          >
            <RouterLink
              :to="{ path: '/specimen', query: { cat: r.catalogNumber } }"
              class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 !text-base-content hover:underline"
            >
              <span class="eem-cat">{{ r.catalogNumber || '—' }}</span>
              <span
                v-if="r.associatedMedia"
                class="eem-photo-tag"
                title="This specimen has photos"
                >Photo</span
              >
              <span>{{ place(r) }}</span>
              <span class="text-base-soft">{{ r.eventDate || '' }}</span>
              <span
                v-if="r.recordedBy"
                class="text-base-soft"
                >· {{ r.recordedBy }}</span
              >
            </RouterLink>
          </li>
        </ul>
        <button
          v-if="records.length > shown.length"
          type="button"
          class="mt-3 text-sm font-semibold underline"
          @click="limit += 20"
        >
          Show more ({{ records.length - shown.length }} left)
        </button>
      </template>
    </VCardContent>
  </VCard>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { makeAPIRequest } from '@/utils/request'

const props = defineProps({
  otuId: { type: [Number, String], required: true }
})

const records = ref([])
const loading = ref(true)
const limit = ref(10)

const shown = computed(() => records.value.slice(0, limit.value))
const localities = computed(
  () => new Set(records.value.map((r) => [r.stateProvince, r.county, r.verbatimLocality].join('|'))).size
)
const collectors = computed(() => new Set(records.value.map((r) => r.recordedBy).filter(Boolean)).size)
const years = computed(() => {
  const ys = records.value.map((r) => Number(String(r.eventDate || '').slice(0, 4))).filter((y) => y > 1800)
  if (!ys.length) return ''
  const a = Math.min(...ys)
  const b = Math.max(...ys)
  return a === b ? `${a}` : `${a}–${b}`
})

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const season = computed(() => {
  const n = Array(12).fill(0)
  records.value.forEach((r) => {
    const m = Number(r.month) || Number(String(r.eventDate || '').slice(5, 7))
    if (m >= 1 && m <= 12) n[m - 1]++
  })
  const max = Math.max(...n)
  return {
    total: n.reduce((a, b) => a + b, 0),
    bars: n.map((v, i) => ({
      m: i + 1,
      n: v,
      long: MONTHS[i],
      short: MONTHS[i][0],
      h: v ? Math.max(6, (v / max) * 100) : 0,
      peak: v && v === max
    }))
  }
})

function place(r) {
  return [r.county ? `${r.county} Co.` : '', r.stateProvince, r.country === 'United States' ? '' : r.country]
    .filter(Boolean)
    .join(', ') || r.verbatimLocality || 'Locality not given'
}

onMounted(async () => {
  try {
    const { data } = await makeAPIRequest.get(`/otus/${props.otuId}/inventory/dwc.json`)
    records.value = (Array.isArray(data) ? data : [])
      .filter((r) => !r.basisOfRecord || r.basisOfRecord === 'PreservedSpecimen')
      .sort((a, b) => String(a.catalogNumber || '').localeCompare(String(b.catalogNumber || '')))
  } catch {
    records.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.eem-photo-tag {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 0.35rem;
  background: #000;
  color: #f1b82d;
  align-self: center;
}
.eem-season {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 3px;
  height: 4.5rem;
  align-items: end;
}
.eem-season-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-end;
  height: 100%;
}
.eem-season-bar {
  display: block;
  background: #d9c58f;
  border-radius: 1px 1px 0 0;
  min-height: 2px;
}
.eem-season-bar.peak {
  background: #f1b82d;
}
.eem-season-col:has(.eem-season-bar[style*='height: 0%']) .eem-season-bar {
  background: var(--color-base-border, #ddd);
}
.eem-season-lab {
  margin-top: 3px;
  text-align: center;
  font-size: 0.62rem;
  color: var(--color-base-soft, #777);
}
.eem-count {
  font-weight: 800;
  background: #f1b82d;
  color: #000;
  padding: 0.05rem 0.55rem;
  border-radius: 2px;
}
.eem-cat {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.78rem;
  font-weight: 700;
  background: #f1b82d;
  color: #000;
  padding: 0.05rem 0.4rem;
}
</style>
