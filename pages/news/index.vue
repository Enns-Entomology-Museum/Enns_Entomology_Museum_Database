<template>
  <div class="eem min-h-screen">
    <EemPageHead
      kicker="From the museum"
      title="News"
      lede="Stories from the collection, new donations, publications, events and what we are working on."
    />

    <section class="container mx-auto box-border px-4 py-12">
      <div
        v-if="loading"
        class="grid lg:grid-cols-2 gap-6"
      >
        <div class="eem-skel h-96" />
        <div class="eem-skel h-96" />
      </div>

      <p
        v-else-if="!stories.length"
        class="eem-card p-8 eem-muted"
      >
        No news yet — announcements, new donations and events will appear here.
      </p>

      <template v-else>
        <!-- Type filter -->
        <div
          v-if="types.length > 1"
          class="flex flex-wrap gap-2 mb-8"
          role="group"
          aria-label="Filter by kind of news"
        >
          <button
            v-for="t in ['All', ...types]"
            :key="t"
            type="button"
            :class="['nw-chip', { on: (t === 'All' && !type) || type === t }]"
            :aria-pressed="(t === 'All' && !type) || type === t"
            @click="type = t === 'All' ? '' : t"
          >
            {{ t }}
          </button>
        </div>

        <!-- Lead story -->
        <RouterLink
          :to="`/news/${lead.id}`"
          class="nw-lead eem-card"
        >
          <EemNewsCover
            :story="lead"
            class="nw-lead-cover"
          />
          <div class="nw-lead-text">
            <p class="nw-meta">
              <span class="nw-type">{{ lead.type }}</span>
              <time :datetime="lead.iso">{{ lead.date }}</time>
              <span aria-hidden="true">·</span>
              <span>{{ lead.minutes }} min read</span>
            </p>
            <h2 class="eem-display mt-4 text-3xl sm:text-4xl leading-tight">{{ lead.title }}</h2>
            <p class="mt-4 text-lg eem-muted leading-relaxed">{{ lead.excerpt }}</p>
            <p
              v-if="lead.author"
              class="mt-5 text-sm"
            >
              By <b>{{ lead.author }}</b>
            </p>
            <span class="nw-more mt-auto pt-6">Read the story <span aria-hidden="true">→</span></span>
          </div>
        </RouterLink>

        <!-- The rest -->
        <ul
          v-if="rest.length"
          class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <li
            v-for="n in rest"
            :key="n.id"
          >
            <RouterLink
              :to="`/news/${n.id}`"
              class="nw-card eem-card"
            >
              <EemNewsCover :story="n" />
              <div class="p-5 flex flex-col flex-1">
                <p class="nw-meta">
                  <time :datetime="n.iso">{{ n.shortDate }}</time>
                  <span aria-hidden="true">·</span>
                  <span>{{ n.minutes }} min read</span>
                </p>
                <h3 class="mt-2 font-bold text-lg leading-snug">{{ n.title }}</h3>
                <p class="mt-2 text-sm eem-muted leading-relaxed line-clamp-3">{{ n.excerpt }}</p>
                <span class="nw-more mt-auto pt-4 text-sm">Read more <span aria-hidden="true">→</span></span>
              </div>
            </RouterLink>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useHead } from '@unhead/vue'
import EemPageHead from '../components/EemPageHead.vue'
import EemNewsCover from '../components/EemNewsCover.vue'
import { fetchNews } from '../components/useNews.js'

useHead({ title: 'News — Enns Entomology Museum' })

const loading = ref(true)
const all = ref([])
const type = ref('')

const types = computed(() => [...new Set(all.value.map((n) => n.type))])
const stories = computed(() => all.value.filter((n) => !type.value || n.type === type.value))
const lead = computed(() => stories.value[0])
const rest = computed(() => stories.value.slice(1))

onMounted(async () => {
  try {
    all.value = await fetchNews(100)
  } catch {
    all.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.nw-chip {
  padding: 0.35rem 0.9rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  font-weight: 600;
  font-size: 0.85rem;
}
.nw-chip.on {
  background: #000;
  border-color: #000;
  color: var(--eem-gold);
}
:global(.dark) .nw-chip.on {
  background: var(--eem-gold);
  border-color: var(--eem-gold);
  color: #000;
}
.nw-lead {
  display: grid;
  overflow: hidden;
  color: var(--eem-ink);
  border-top: 4px solid var(--eem-gold);
  transition: box-shadow 0.15s;
}
@media (min-width: 1024px) {
  .nw-lead {
    grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  }
  .nw-lead-cover {
    aspect-ratio: auto;
    height: 100%;
    min-height: 24rem;
  }
}
.nw-lead-text {
  display: flex;
  flex-direction: column;
  padding: 2rem 2.2rem 2.2rem;
}
.nw-lead:hover,
.nw-card:hover {
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.09);
}
.nw-lead:hover :deep(.eem-cover:not(.plain) > img:first-child),
.nw-card:hover :deep(.eem-cover:not(.plain) > img:first-child) {
  transform: scale(1.03);
}
.nw-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  color: var(--eem-ink);
  transition: box-shadow 0.15s, transform 0.15s;
}
.nw-card:hover {
  transform: translateY(-2px);
}
.nw-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--eem-ink-soft);
}
.nw-type {
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.62rem;
  padding: 0.15rem 0.5rem;
  border-radius: 2px;
  background: #000;
  color: var(--eem-gold);
}
.nw-more {
  font-weight: 700;
  color: var(--eem-gold-deep);
}
</style>
