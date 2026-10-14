<template>
  <section
    v-if="!imgs.loaded || items.length"
    class="eem-photos"
    aria-labelledby="eem-photos-title"
  >
    <div class="container mx-auto box-border px-4 py-16">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eem-kicker !text-[color:var(--eem-gold)]">Under the camera</p>
          <h2
            id="eem-photos-title"
            class="eem-display mt-3 text-3xl sm:text-4xl text-white"
          >
            From the drawers
          </h2>
          <p class="mt-2 text-white/70 max-w-xl">
            Specimens photographed as they are digitized. Click one to see its label data.
          </p>
        </div>
        <div
          v-if="items.length > 3"
          class="flex gap-2"
        >
          <button
            type="button"
            class="eem-arrow"
            aria-label="Scroll photos left"
            @click="scroll(-1)"
          >
            ←
          </button>
          <button
            type="button"
            class="eem-arrow"
            aria-label="Scroll photos right"
            @click="scroll(1)"
          >
            →
          </button>
        </div>
      </div>

      <ul
        ref="track"
        class="eem-track mt-8"
      >
        <template v-if="!imgs.loaded">
          <li
            v-for="i in 4"
            :key="i"
            class="eem-shot eem-skel !bg-white/10"
          />
        </template>
        <li
          v-for="p in items"
          v-else
          :key="p.id"
          class="eem-shot"
        >
          <component
            :is="p.cat ? 'RouterLink' : 'div'"
            :to="p.cat ? { path: '/specimen', query: { cat: p.cat } } : undefined"
            class="eem-shot-link"
          >
            <img
              :src="p.medium"
              :alt="p.name ? `Specimen of ${p.name}` : 'Specimen photograph'"
              loading="lazy"
            />
            <span class="eem-shot-cap">
              <i v-if="p.name">{{ p.name }}</i>
              <span
                v-if="p.cat"
                class="eem-shot-cat"
                >{{ p.cat }}</span
              >
            </span>
          </component>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { normCat, useEem, useSpecimenImages } from './useEem.js'

const eem = useEem()
const imgs = useSpecimenImages()
const track = ref(null)

const byCat = computed(() => {
  const m = new Map()
  eem.records.forEach((r) => m.set(normCat(r.catalogNumber), r))
  return m
})

const items = computed(() =>
  imgs.items.map((i) => {
    const r = byCat.value.get(i.cat)
    return {
      ...i,
      cat: r?.catalogNumber || i.cat,
      name: r ? [r.genus, r.specificEpithet].filter(Boolean).join(' ') || r.family || r.order : ''
    }
  })
)

function scroll(dir) {
  const el = track.value
  if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
}
</script>

<style scoped>
.eem-photos {
  background: #000;
  color: #fff;
  border-top: 4px solid var(--eem-gold);
}
.eem-track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(15rem, 22rem);
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 0.75rem;
  list-style: none;
  margin-left: 0;
  margin-right: 0;
  scrollbar-color: var(--eem-gold) #1a1a1a;
}
.eem-shot {
  scroll-snap-align: start;
  aspect-ratio: 4 / 3;
}
.eem-shot-link {
  position: relative;
  display: block;
  height: 100%;
  overflow: hidden;
  background: #111;
  color: #fff;
}
.eem-shot-link img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s;
}
.eem-shot-link:hover img {
  transform: scale(1.04);
}
.eem-shot-cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 1.5rem 0.8rem 0.6rem;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
  font-size: 0.85rem;
}
.eem-shot-cat {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.05rem 0.35rem;
  background: var(--eem-gold);
  color: #000;
}
.eem-arrow {
  width: 2.5rem;
  height: 2.5rem;
  border: 2px solid var(--eem-gold);
  color: var(--eem-gold);
  font-weight: 800;
}
.eem-arrow:hover {
  background: var(--eem-gold);
  color: #000;
}
</style>
