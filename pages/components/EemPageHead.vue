<template>
  <header class="eem-page-head">
    <div class="container mx-auto box-border px-4 pt-12 pb-12 sm:pt-16 grid lg:grid-cols-12 gap-6 lg:gap-12 items-end">
      <div class="lg:col-span-7">
        <p class="eem-kicker !text-[color:var(--eem-gold)]">{{ kicker }}</p>
        <h1 class="eem-display mt-4 text-white uppercase leading-[0.95] text-4xl sm:text-6xl">{{ title }}</h1>
      </div>
      <p
        v-if="lede || $slots.default"
        class="lg:col-span-5 text-lg leading-relaxed text-white/75"
      >
        <slot>{{ lede }}</slot>
      </p>
    </div>
  </header>
</template>

<script setup>
defineProps({
  kicker: { type: String, default: '' },
  title: { type: String, required: true },
  lede: { type: String, default: '' }
})
</script>

<style scoped>
.eem-page-head {
  background:
    radial-gradient(circle at 90% 0%, rgba(253, 183, 25, 0.16), transparent 45%),
    #000;
  border-bottom: 6px solid var(--eem-gold);
}
</style>
