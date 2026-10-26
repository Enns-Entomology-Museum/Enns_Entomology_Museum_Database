<template>
  <div :class="['eem-cover', { plain: !story.cover }]">
    <img
      v-if="story.cover"
      :src="story.cover.src"
      :alt="story.cover.alt || ''"
      loading="lazy"
    />
    <template v-else>
      <img
        :src="mark"
        alt=""
        class="eem-cover-mark"
        aria-hidden="true"
      />
      <span class="eem-cover-word">{{ story.type }}</span>
    </template>
    <span class="eem-cover-type">{{ story.type }}</span>
  </div>
</template>

<script setup>
// Cover of a news story: its first image, or a black-and-gold tile when it has none
defineProps({ story: { type: Object, required: true } })
const mark = `${import.meta.env.BASE_URL || '/'}images/eem-mark.svg`
</script>

<style scoped>
.eem-cover {
  position: relative;
  overflow: hidden;
  background: var(--eem-paper-2);
  aspect-ratio: 16 / 9;
}
.eem-cover:not(.plain) > img:first-child {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s;
}
.eem-cover.plain {
  display: grid;
  place-items: center;
  background:
    repeating-linear-gradient(135deg, rgba(253, 183, 25, 0.09) 0 2px, transparent 2px 14px),
    radial-gradient(circle at 85% 15%, rgba(253, 183, 25, 0.28), transparent 55%),
    #000;
}
.eem-cover-mark {
  position: absolute;
  right: 1.25rem;
  bottom: 1rem;
  width: 22%;
  max-width: 7rem;
  opacity: 0.35;
}
.eem-cover-word {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  font-size: clamp(1.6rem, 5vw, 3.2rem);
  color: var(--eem-gold);
}
.eem-cover-type {
  position: absolute;
  left: 0.75rem;
  top: 0.75rem;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 2px;
  background: var(--eem-gold);
  color: #000;
}
.plain .eem-cover-type {
  display: none;
}
</style>
