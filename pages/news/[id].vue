<template>
  <div class="eem min-h-screen">
    <!-- Header -->
    <header class="ns-head">
      <div class="container mx-auto box-border px-4 pt-10 pb-14 sm:pt-14">
        <RouterLink
          to="/news"
          class="ns-back"
          >← All news</RouterLink
        >
        <template v-if="story">
          <p class="ns-meta mt-6">
            <span class="ns-type">{{ story.type }}</span>
            <time :datetime="story.iso">{{ story.date }}</time>
            <span aria-hidden="true">·</span>
            <span>{{ story.minutes }} min read</span>
          </p>
          <h1 class="eem-display mt-4 text-white leading-[1.02] text-4xl sm:text-5xl lg:text-6xl max-w-4xl">
            {{ story.title }}
          </h1>
          <p
            v-if="story.author"
            class="mt-5 text-white/70"
          >
            By <span class="text-white font-semibold">{{ story.author }}</span>
          </p>
        </template>
        <div
          v-else-if="loading"
          class="mt-8 space-y-3"
        >
          <div class="eem-skel h-12 w-3/4" />
          <div class="eem-skel h-12 w-1/2" />
        </div>
      </div>
    </header>

    <p
      v-if="!loading && !story"
      class="container mx-auto box-border px-4 py-16 eem-muted"
    >
      This story could not be found.
      <RouterLink
        to="/news"
        class="eem-link"
        >See all news</RouterLink
      >.
    </p>

    <template v-if="story">
      <!-- Cover -->
      <figure
        v-if="story.cover"
        class="container mx-auto box-border px-4 ns-figure"
      >
        <img
          :src="story.cover.src"
          :alt="story.cover.alt"
        />
        <figcaption v-if="story.cover.alt || story.cover.title">
          {{ story.cover.title || story.cover.alt }}
        </figcaption>
      </figure>

      <!-- Text -->
      <div class="container mx-auto box-border px-4 py-12 grid lg:grid-cols-12 gap-10">
        <article
          class="ns-body lg:col-span-8"
          v-html="story.body"
        />

        <aside class="lg:col-span-4 space-y-5">
          <div class="eem-card p-6 eem-accent-t lg:sticky lg:top-6">
            <p class="eem-kicker !text-[0.68rem]">Share this story</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                class="ns-share"
                @click="copyLink"
              >
                {{ copied ? 'Link copied ✓' : 'Copy link' }}
              </button>
              <a
                class="ns-share"
                :href="`mailto:?subject=${encodeURIComponent(story.title)}&body=${encodeURIComponent(pageUrl)}`"
                >E-mail</a
              >
            </div>
            <p class="mt-6 text-sm eem-muted leading-relaxed">
              Have news for the museum — a donation, a paper using our specimens, an event?
              <a
                v-if="info.director.email"
                :href="`mailto:${info.director.email}`"
                class="eem-link"
                >Tell us</a
              >.
            </p>
          </div>
        </aside>
      </div>

      <!-- More stories -->
      <section
        v-if="more.length"
        class="border-t eem-rule bg-[color:var(--eem-paper-2)]"
      >
        <div class="container mx-auto box-border px-4 py-12">
          <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
            <h2 class="eem-display text-2xl sm:text-3xl">More from the museum</h2>
            <RouterLink
              to="/news"
              class="eem-link font-semibold"
              >All news →</RouterLink
            >
          </div>
          <ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <li
              v-for="n in more"
              :key="n.id"
            >
              <RouterLink
                :to="`/news/${n.id}`"
                class="ns-card eem-card"
              >
                <EemNewsCover :story="n" />
                <div class="p-5">
                  <p class="text-xs eem-muted">{{ n.shortDate }}</p>
                  <h3 class="mt-1.5 font-bold leading-snug">{{ n.title }}</h3>
                </div>
              </RouterLink>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import EemNewsCover from '../components/EemNewsCover.vue'
import info from '../components/museumInfo.js'
import { fetchNews, fetchStory } from '../components/useNews.js'

const route = useRoute()
const story = ref(null)
const others = ref([])
const loading = ref(true)
const copied = ref(false)

useHead({ title: computed(() => (story.value ? `${story.value.title} — Enns Entomology Museum` : 'News — Enns Entomology Museum')) })

const pageUrl = computed(() => (typeof window === 'undefined' ? '' : window.location.href))
const more = computed(() => others.value.filter((n) => n.id !== story.value?.id).slice(0, 3))

async function load(id) {
  loading.value = true
  story.value = null
  try {
    story.value = await fetchStory(id)
  } catch {
    story.value = null
  } finally {
    loading.value = false
  }
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
}

watch(() => route.params.id, (id) => id && load(id), { immediate: true })
fetchNews(10)
  .then((list) => (others.value = list))
  .catch(() => {})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* clipboard blocked */
  }
}
</script>

<style scoped>
.ns-head {
  background:
    radial-gradient(circle at 90% 0%, rgba(241, 184, 45, 0.16), transparent 45%),
    #000;
  border-bottom: 6px solid var(--eem-gold);
}
.ns-back {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--eem-gold) !important;
}
.ns-back:hover {
  text-decoration: underline;
}
.ns-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}
.ns-type {
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.65rem;
  padding: 0.15rem 0.55rem;
  border-radius: 2px;
  background: var(--eem-gold);
  color: #000;
}
.ns-figure {
  margin-top: -2.5rem;
}
.ns-figure img {
  width: 100%;
  max-height: 34rem;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}
.ns-figure figcaption {
  margin-top: 0.6rem;
  font-size: 0.8rem;
  color: var(--eem-ink-soft);
}

/* Story text */
.ns-body {
  font-size: 1.12rem;
  line-height: 1.75;
  color: var(--eem-ink);
  max-width: 44rem;
}
.ns-body :deep(p) {
  margin: 0 0 1.2em;
}
.ns-body :deep(p:first-child) {
  font-size: 1.3rem;
  line-height: 1.6;
}
.ns-body :deep(h2),
.ns-body :deep(h3) {
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin: 1.8em 0 0.6em;
}
.ns-body :deep(h2) {
  font-size: 1.6rem;
}
.ns-body :deep(h3) {
  font-size: 1.3rem;
}
.ns-body :deep(a) {
  color: var(--eem-gold-deep);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-decoration-color: var(--eem-gold);
  text-underline-offset: 3px;
  word-break: break-word;
}
.ns-body :deep(ul),
.ns-body :deep(ol) {
  margin: 0 0 1.2em;
  padding-left: 1.3em;
}
.ns-body :deep(ul) {
  list-style: none;
}
.ns-body :deep(ul > li) {
  position: relative;
  margin: 0.4em 0;
}
.ns-body :deep(ul > li)::before {
  content: '';
  position: absolute;
  left: -1.1em;
  top: 0.7em;
  width: 0.5em;
  height: 0.5em;
  background: var(--eem-gold);
}
.ns-body :deep(ol) {
  list-style: decimal;
}
.ns-body :deep(blockquote) {
  margin: 1.6em 0;
  padding: 0.2em 0 0.2em 1.2em;
  border-left: 4px solid var(--eem-gold);
  font-size: 1.25rem;
  font-style: italic;
}
.ns-body :deep(img) {
  width: 100%;
  border-radius: 4px;
  margin: 1.4em 0 0.4em;
}
.ns-body :deep(strong) {
  font-weight: 700;
}
.ns-body :deep(.ns-links) {
  display: grid;
  gap: 0.75rem;
  margin: 1.6em 0;
}
@media (min-width: 640px) {
  .ns-body :deep(.ns-links) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.ns-body :deep(.ns-linkcard) {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 1rem 1.15rem;
  background: var(--eem-card);
  border: 1px solid var(--eem-rule);
  border-left: 4px solid var(--eem-gold);
  border-radius: 4px;
  text-decoration: none;
  color: var(--eem-ink);
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.35;
  transition: transform 0.15s, box-shadow 0.15s;
}
.ns-body :deep(.ns-linkcard:hover) {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.08);
}
.ns-body :deep(.ns-linkcard-u) {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--eem-gold-deep);
}
.ns-share {
  padding: 0.45rem 0.9rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--eem-ink);
}
.ns-share:hover {
  background: var(--eem-gold);
  border-color: var(--eem-gold);
  color: #000;
}
.ns-card {
  display: block;
  overflow: hidden;
  height: 100%;
  color: var(--eem-ink);
  transition: transform 0.15s, box-shadow 0.15s;
}
.ns-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.09);
}
</style>
