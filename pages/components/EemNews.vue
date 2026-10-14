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
      class="mt-8 grid md:grid-cols-3 gap-5"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="eem-skel h-44"
      />
    </div>

    <p
      v-else-if="!items.length"
      class="mt-8 eem-card p-6 eem-muted"
    >
      No news yet — announcements, new donations and events will appear here.
    </p>

    <ul
      v-else
      class="mt-8 grid md:grid-cols-3 gap-5"
    >
      <li
        v-for="(n, i) in items"
        :key="n.id"
      >
        <RouterLink
          :to="{ name: 'news-id', params: { id: n.id } }"
          class="eem-news eem-card"
          :class="{ first: i === 0 }"
        >
          <p class="flex items-center gap-3 text-xs">
            <span class="eem-news-type">{{ n.type }}</span>
            <time
              :datetime="n.iso"
              class="eem-muted"
              >{{ n.date }}</time
            >
          </p>
          <h3 class="mt-3 font-bold text-lg leading-snug">{{ n.title }}</h3>
          <p class="mt-2 text-sm eem-muted leading-relaxed">{{ n.excerpt }}</p>
          <span class="mt-auto pt-4 text-sm font-semibold">Read more →</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { makeAPIRequest } from '@/utils/request'

const props = defineProps({ count: { type: Number, default: 3 } })

const loading = ref(true)
const items = ref([])

function excerpt(html = '', max = 170) {
  const text = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text
}

onMounted(async () => {
  try {
    const { data } = await makeAPIRequest.get('/news', { params: { per: props.count } })
    items.value = (Array.isArray(data) ? data : []).slice(0, props.count).map((n) => {
      const d = new Date(n.created_at)
      return {
        id: n.id,
        title: n.title,
        type: String(n.type || 'News').split('::').pop(),
        iso: n.created_at,
        date: isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        excerpt: excerpt(n.body_html || n.body)
      }
    })
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.eem-news {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1.5rem;
  border-top: 4px solid #000;
  color: var(--eem-ink);
  transition: transform 0.15s, border-color 0.15s;
}
.eem-news.first {
  border-top-color: var(--eem-gold);
}
.eem-news:hover {
  transform: translateY(-2px);
  border-top-color: var(--eem-gold);
}
.eem-news-type {
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.62rem;
  padding: 0.1rem 0.45rem;
  border-radius: 2px;
  background: #000;
  color: var(--eem-gold);
}
</style>
