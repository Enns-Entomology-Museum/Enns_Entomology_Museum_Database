<template>
  <section class="container mx-auto box-border px-4 py-16 sm:py-20">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eem-kicker">From the museum</p>
        <h2 class="eem-display mt-3 text-3xl sm:text-4xl">News</h2>
      </div>
      <RouterLink
        to="/news"
        class="eem-link font-semibold"
        >All news →</RouterLink
      >
    </div>

    <div
      v-if="loading"
      class="mt-8 grid lg:grid-cols-12 gap-5"
    >
      <div class="eem-skel h-80 lg:col-span-7" />
      <div class="eem-skel h-80 lg:col-span-5" />
    </div>

    <p
      v-else-if="!items.length"
      class="mt-8 eem-card p-6 eem-muted"
    >
      No news yet — announcements, new donations and events will appear here.
    </p>

    <div
      v-else
      :class="['mt-8 grid gap-5', rest.length ? 'lg:grid-cols-12' : '']"
    >
      <!-- Lead story -->
      <RouterLink
        :to="`/news/${lead.id}`"
        :class="['eem-lead eem-card', rest.length ? 'lg:col-span-7' : 'solo']"
      >
        <EemNewsCover
          :story="lead"
          class="eem-lead-cover"
        />
        <div class="eem-lead-text">
          <p class="eem-news-meta">
            <span class="eem-news-new">Latest</span>
            <time :datetime="lead.iso">{{ lead.shortDate }}</time>
            <span aria-hidden="true">·</span>
            <span>{{ lead.minutes }} min read</span>
          </p>
          <h3 class="eem-display mt-3 text-2xl sm:text-3xl leading-tight">{{ lead.title }}</h3>
          <p class="mt-3 eem-muted leading-relaxed">{{ lead.excerpt }}</p>
          <span class="eem-news-more mt-auto pt-5">Read the story <span aria-hidden="true">→</span></span>
        </div>
      </RouterLink>

      <!-- More stories -->
      <ul
        v-if="rest.length"
        class="lg:col-span-5 flex flex-col gap-3"
      >
        <li
          v-for="n in rest"
          :key="n.id"
        >
          <RouterLink
            :to="`/news/${n.id}`"
            class="eem-mini eem-card"
          >
            <EemNewsCover
              :story="n"
              class="eem-mini-cover"
            />
            <span class="min-w-0">
              <span class="eem-news-meta">
                <span class="eem-news-type">{{ n.type }}</span>
                <time :datetime="n.iso">{{ n.shortDate }}</time>
              </span>
              <span class="block mt-1.5 font-bold leading-snug">{{ n.title }}</span>
              <span class="block mt-1 text-sm eem-muted line-clamp-2">{{ n.excerpt }}</span>
            </span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import EemNewsCover from './EemNewsCover.vue'
import { fetchNews } from './useNews.js'

const props = defineProps({ count: { type: Number, default: 4 } })

const loading = ref(true)
const items = ref([])
const lead = computed(() => items.value[0])
const rest = computed(() => items.value.slice(1, props.count))

onMounted(async () => {
  try {
    items.value = await fetchNews(props.count)
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.eem-lead {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--eem-ink);
  border-top: 4px solid var(--eem-gold);
  transition: transform 0.15s, box-shadow 0.15s;
}
.eem-lead.solo {
  display: grid;
}
@media (min-width: 768px) {
  .eem-lead.solo {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  }
  .eem-lead.solo .eem-lead-cover {
    aspect-ratio: auto;
    height: 100%;
    min-height: 18rem;
  }
}
.eem-lead:hover,
.eem-mini:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
}
.eem-lead:hover :deep(.eem-cover:not(.plain) > img:first-child) {
  transform: scale(1.03);
}
.eem-lead-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 1.5rem 1.6rem 1.6rem;
}
.eem-news-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--eem-ink-soft);
}
.eem-news-new,
.eem-news-type {
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.6rem;
  padding: 0.1rem 0.45rem;
  border-radius: 2px;
  background: #000;
  color: var(--eem-gold);
}
.eem-news-new {
  background: var(--eem-gold);
  color: #000;
}
.eem-news-more {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--eem-gold-deep);
}
.eem-mini {
  display: grid;
  grid-template-columns: 7.5rem minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
  padding: 0.75rem;
  color: var(--eem-ink);
  transition: transform 0.15s, box-shadow 0.15s;
}
.eem-mini-cover {
  border-radius: 2px;
}
.eem-mini-cover :deep(.eem-cover-word) {
  font-size: 1rem;
}
.eem-mini-cover :deep(.eem-cover-type) {
  display: none;
}
</style>
