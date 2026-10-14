<template>
  <div
    v-if="loading || images.length"
    class="eem-card eem-simg"
  >
    <div
      v-if="loading"
      class="eem-skel eem-simg-main"
    />

    <template v-else>
      <button
        type="button"
        class="eem-simg-main"
        :aria-label="`Enlarge photo ${active + 1} of ${images.length}`"
        @click="zoom = true"
      >
        <img
          :src="current.medium"
          :alt="`${title}, photo ${active + 1} of ${images.length}`"
        />
        <span
          class="eem-simg-zoom"
          aria-hidden="true"
          >⤢</span
        >
      </button>

      <ul
        v-if="images.length > 1"
        class="eem-simg-thumbs"
      >
        <li
          v-for="(im, i) in images"
          :key="im.id"
        >
          <button
            type="button"
            :class="{ on: i === active }"
            :aria-label="`Show photo ${i + 1}`"
            :aria-current="i === active"
            @click="active = i"
          >
            <img
              :src="im.thumb"
              alt=""
              loading="lazy"
            />
          </button>
        </li>
      </ul>

      <div class="eem-simg-bar">
        <p class="text-xs eem-muted">
          Photo {{ active + 1 }} of {{ images.length }}
          <template v-if="current.width"> · {{ current.width }} × {{ current.height }} px</template>
          <template v-if="current.size"> · {{ mb(current.size) }}</template>
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="eem-btn eem-btn-gold !py-1.5 !px-3 !text-sm"
            :disabled="busy"
            @click="download(current, active)"
          >
            {{ busy ? 'Preparing…' : 'Download' }}
          </button>
          <button
            v-if="images.length > 1"
            type="button"
            class="eem-btn eem-btn-line !py-1.5 !px-3 !text-sm"
            :disabled="busy"
            @click="downloadAll"
          >
            Download all ({{ images.length }})
          </button>
          <a
            :href="current.original"
            target="_blank"
            rel="noopener"
            class="eem-btn eem-btn-line !py-1.5 !px-3 !text-sm"
            >Open original ↗</a
          >
        </div>
      </div>
      <p class="px-4 pb-4 text-xs eem-muted">
        Photos © Enns Entomology Museum, University of Missouri. Free to use for research and education — please
        credit the museum and cite catalog number <b>{{ catalogNumber }}</b>.
      </p>
    </template>

    <!-- Full-screen view -->
    <div
      v-if="zoom"
      class="eem-simg-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="`${title}, photo ${active + 1}`"
      @click.self="zoom = false"
      @keydown.esc="zoom = false"
      @keydown.left="step(-1)"
      @keydown.right="step(1)"
    >
      <img
        :src="current.original"
        :alt="`${title}, photo ${active + 1}`"
      />
      <button
        ref="closeBtn"
        type="button"
        class="eem-simg-close"
        aria-label="Close"
        @click="zoom = false"
      >
        ×
      </button>
      <template v-if="images.length > 1">
        <button
          type="button"
          class="eem-simg-nav prev"
          aria-label="Previous photo"
          @click="step(-1)"
        >
          ‹
        </button>
        <button
          type="button"
          class="eem-simg-nav next"
          aria-label="Next photo"
          @click="step(1)"
        >
          ›
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { makeAPIRequest } from '@/utils/request'

const props = defineProps({
  // TaxonWorks collection object id (dwc_occurrence_object_id)
  collectionObjectId: { type: [Number, String], default: null },
  catalogNumber: { type: String, default: '' },
  title: { type: String, default: 'Specimen' }
})

const images = ref([])
const loading = ref(false)
const active = ref(0)
const zoom = ref(false)
const busy = ref(false)
const closeBtn = ref(null)

const current = computed(() => images.value[active.value] || {})
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`

watch(
  () => props.collectionObjectId,
  async (id) => {
    images.value = []
    active.value = 0
    if (!id) return
    loading.value = true
    try {
      const { data } = await makeAPIRequest.get('/images', { params: { 'collection_object_id[]': id, per: 50 } })
      images.value = (Array.isArray(data) ? data : []).map((im) => ({
        id: im.id,
        thumb: im.thumb,
        medium: im.medium,
        original: im.original,
        width: im.width,
        height: im.height,
        size: im.image_file_file_size,
        name: im.image_file_file_name || `${im.id}.jpg`,
        type: im.content_type || 'image/jpeg'
      }))
    } catch {
      images.value = []
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

watch(zoom, async (z) => {
  if (z) {
    await nextTick()
    closeBtn.value?.focus()
  }
})

function step(d) {
  const n = images.value.length
  active.value = (active.value + d + n) % n
}

function fileName(im, i) {
  const ext = (im.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0]
  const base = props.catalogNumber || 'EEM-specimen'
  return images.value.length > 1 ? `${base}_${i + 1}${ext}` : `${base}${ext}`
}

// The full-size image is fetched through the TaxonWorks API (which allows
// cross-site requests) so the browser saves it with a sensible file name.
async function fetchFull(im) {
  const w = im.width
  const h = im.height
  const r = await makeAPIRequest.get(`/images/${im.id}/scale_to_box/0/0/${w}/${h}/${w}/${h}`, {
    responseType: 'blob'
  })
  return r.data
}

function save(blob, name) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

async function download(im, i) {
  busy.value = true
  try {
    save(await fetchFull(im), fileName(im, i))
  } catch {
    window.open(im.original, '_blank', 'noopener')
  } finally {
    busy.value = false
  }
}

async function downloadAll() {
  busy.value = true
  try {
    for (let i = 0; i < images.value.length; i++) {
      const im = images.value[i]
      try {
        save(await fetchFull(im), fileName(im, i))
      } catch {
        window.open(im.original, '_blank', 'noopener')
      }
      await new Promise((r) => setTimeout(r, 400))
    }
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.eem-simg {
  overflow: hidden;
  border-top: 4px solid var(--eem-gold);
}
.eem-simg-main {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #111;
  cursor: zoom-in;
}
.eem-simg-main img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.eem-simg-zoom {
  position: absolute;
  right: 0.6rem;
  top: 0.6rem;
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 1rem;
}
.eem-simg-thumbs {
  display: flex;
  gap: 0.4rem;
  padding: 0.6rem 0.75rem 0;
  overflow-x: auto;
  list-style: none;
  margin: 0;
}
.eem-simg-thumbs button {
  display: block;
  width: 4.2rem;
  height: 3.2rem;
  padding: 0;
  border: 2px solid transparent;
  background: #111;
  flex-shrink: 0;
}
.eem-simg-thumbs button.on {
  border-color: var(--eem-gold);
}
.eem-simg-thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.eem-simg-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
}
.eem-simg-bar .eem-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.eem-simg-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.92);
}
.eem-simg-lightbox img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.eem-simg-close,
.eem-simg-nav {
  position: absolute;
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid var(--eem-gold);
  font-size: 1.6rem;
  line-height: 1;
}
.eem-simg-close {
  top: 1rem;
  right: 1rem;
}
.eem-simg-nav {
  top: 50%;
  transform: translateY(-50%);
}
.eem-simg-nav.prev {
  left: 1rem;
}
.eem-simg-nav.next {
  right: 1rem;
}
</style>
