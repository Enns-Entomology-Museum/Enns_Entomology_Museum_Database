<template>
  <footer class="eem-footer print:hidden">
    <div class="eem-footer-band" />
    <div class="eem-friends">
      <div class="container mx-auto box-border px-4 py-7 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <div class="flex-1">
          <p class="eem-display text-xl text-[color:var(--eem-gold)]">Become a Friend of the Museum</p>
          <p class="text-sm text-white/70 mt-1 max-w-2xl">
            Your gift buys drawers and cabinets, digitizes specimens, pays student positions and brings insects to
            schools across Missouri.
          </p>
        </div>
        <a
          v-if="info.givingUrl"
          :href="info.givingUrl"
          target="_blank"
          rel="noopener"
          class="eem-friends-btn"
          >Donate ↗</a
        >
        <RouterLink
          v-else
          :to="{ path: '/donate', query: { give: 1 } }"
          class="eem-friends-btn"
          >Donate</RouterLink
        >
      </div>
    </div>
    <div class="container mx-auto box-border px-4 pt-12 pb-8">
      <div class="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-12">
        <div class="col-span-2 md:col-span-5">
          <RouterLink
            to="/"
            class="inline-flex items-center gap-3 !text-white"
          >
            <img
              :src="mark"
              alt=""
              class="h-12 w-auto"
            />
            <span class="eem-display text-xl uppercase leading-tight">
              Enns Entomology<br />Museum
            </span>
          </RouterLink>
          <p class="mt-4 text-sm leading-relaxed eem-footer-muted max-w-sm">
            The insect collection of the University of Missouri, College of Agriculture, Food and
            Natural Resources.
          </p>
          <p class="mt-4 text-sm eem-footer-muted">Columbia, Missouri</p>
        </div>

        <nav
          class="md:col-span-2"
          aria-label="Collection"
        >
          <p class="eem-footer-label">Collection</p>
          <ul class="mt-3 space-y-2 text-sm">
            <li><RouterLink to="/collection" class="eem-footer-link">Holdings</RouterLink></li>
            <li><RouterLink to="/tree" class="eem-footer-link">Taxonomic tree</RouterLink></li>
            <li><RouterLink to="/highlights" class="eem-footer-link">Highlights</RouterLink></li>
            <li><RouterLink to="/missouri" class="eem-footer-link">Insects of Missouri</RouterLink></li>
            <li><RouterLink to="/collectors" class="eem-footer-link">Collectors</RouterLink></li>
            <li><RouterLink to="/resources/tw/filter/dwc_otus" class="eem-footer-link">Search specimens</RouterLink></li>
            <li><RouterLink to="/resources/tw/filter/bibliography" class="eem-footer-link">Publications</RouterLink></li>
          </ul>
        </nav>

        <nav
          class="md:col-span-2"
          aria-label="Museum"
        >
          <p class="eem-footer-label">Museum</p>
          <ul class="mt-3 space-y-2 text-sm">
            <li><RouterLink to="/visit" class="eem-footer-link">Visit &amp; loans</RouterLink></li>
            <li><RouterLink to="/news" class="eem-footer-link">News</RouterLink></li>
            <li><RouterLink to="/people" class="eem-footer-link">Students &amp; collaborators</RouterLink></li>
            <li><RouterLink to="/outreach" class="eem-footer-link">Outreach requests</RouterLink></li>
            <li><RouterLink to="/donate" class="eem-footer-link">Donate</RouterLink></li>
            <li><RouterLink to="/library" class="eem-footer-link">Library</RouterLink></li>
            <li><RouterLink to="/about" class="eem-footer-link">About</RouterLink></li>
          </ul>
        </nav>

        <div class="col-span-2 md:col-span-3">
          <p class="eem-footer-label">Data</p>
          <ul class="mt-3 space-y-2 text-sm">
            <li>
              <a
                href="https://taxonworks.org"
                target="_blank"
                rel="noopener"
                class="eem-footer-link"
                >Curated in TaxonWorks</a
              >
            </li>
            <li>
              <a
                :href="`https://www.gbif.org/grscicoll/collection/${info.gbif.grscicollKey}`"
                target="_blank"
                rel="noopener"
                class="eem-footer-link"
                >GBIF Registry of Scientific Collections</a
              >
            </li>
            <li v-if="info.gbif.datasetKey">
              <a
                :href="`https://www.gbif.org/dataset/${info.gbif.datasetKey}`"
                target="_blank"
                rel="noopener"
                class="eem-footer-link eem-gbif-badge"
                >Published through GBIF</a
              >
            </li>
            <li>
              <TrackerReport
                icon
                label="Report a problem"
                button-class="eem-footer-link inline-flex gap-2 items-center !p-0"
              />
            </li>
          </ul>
        </div>
      </div>

      <div class="eem-footer-bottom mt-10 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <p class="eem-footer-muted">
          Data in
          <a
            href="https://taxonworks.org/"
            target="_blank"
            rel="noopener"
            class="eem-footer-link"
            >TaxonWorks</a
          >
          · built with
          <a
            href="https://github.com/SpeciesFileGroup/taxonpages"
            target="_blank"
            rel="noopener"
            class="eem-footer-link"
            >TaxonPages</a
          >
          · supported by
          <a
            href="https://speciesfilegroup.org"
            target="_blank"
            rel="noopener"
            class="eem-footer-link"
            >Species File Group</a
          >
        </p>
        <p class="eem-footer-muted">© {{ year }} Enns Entomology Museum · University of Missouri</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
import info from './museumInfo.js'
const { base_url } = __APP_ENV__
const mark = `${base_url || '/'}images/mu-mark.png`.replace('//', '/')
const year = new Date().getFullYear()
</script>

<style scoped>
.eem-footer {
  background: #000;
  color: #fff;
}
.eem-footer-band {
  height: 6px;
  background: var(--eem-gold);
}
.eem-footer-label {
  font-family: 'Archivo', 'Inter', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--eem-gold);
}
.eem-footer-muted {
  color: #b8b3a8;
}
.eem-footer :deep(.eem-footer-link),
.eem-footer .eem-footer-link {
  color: #fff !important;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.eem-footer :deep(.eem-footer-link:hover),
.eem-footer .eem-footer-link:hover {
  color: var(--eem-gold) !important;
  border-bottom-color: currentColor;
}
.eem-footer-bottom {
  border-top: 1px solid #2d2d2d;
}
.eem-gbif-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border: 1px solid var(--eem-gold);
  color: var(--eem-gold) !important;
  font-weight: 700;
}
.eem-friends {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.eem-friends-btn {
  display: inline-block;
  align-self: flex-start;
  padding: 0.75rem 1.6rem;
  background: var(--eem-gold);
  color: #000 !important;
  font-weight: 800;
  border: 2px solid var(--eem-gold);
  white-space: nowrap;
}
.eem-friends-btn:hover {
  background: transparent;
  color: var(--eem-gold) !important;
}
@media (min-width: 768px) {
  .eem-friends-btn {
    align-self: center;
  }
}
</style>
