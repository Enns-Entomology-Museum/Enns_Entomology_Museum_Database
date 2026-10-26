<template>
  <footer class="eem-footer print:hidden">
    <div class="eem-footer-band" />
    <div class="eem-friends">
      <div class="container mx-auto box-border px-4 py-7 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <div class="flex-1">
          <p class="eem-display text-xl text-[color:var(--eem-gold)]">Become a Friend of the Museum</p>
          <p class="text-sm text-white mt-1 max-w-2xl">
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
              alt="Enns Entomology Museum, University of Missouri"
              class="h-20 w-auto"
            />
          </RouterLink>
          <p class="mt-4 text-sm leading-relaxed eem-footer-muted max-w-sm">
            The insect collection of the University of Missouri, College of Agriculture, Food and
            Natural Resources.
          </p>
          <!-- Contact block required by the Mizzou web guidelines: responsible unit,
               physical address, email and phone (all from museumInfo.js) -->
          <address class="eem-footer-contact mt-5 not-italic text-sm leading-relaxed">
            <p class="font-bold text-white">{{ info.fullName }}</p>
            <p>
              <a
                v-if="info.unitUrl"
                :href="info.unitUrl"
                target="_blank"
                rel="noopener"
                class="eem-footer-ul"
                >{{ info.unit }}</a
              ><template v-else>{{ info.unit }}</template>
            </p>
            <p>{{ info.address }}</p>
            <p v-if="contactEmail">
              Email: <a :href="`mailto:${contactEmail}`" class="eem-footer-ul">{{ contactEmail }}</a>
            </p>
            <p v-if="info.phone">
              Phone: <a :href="`tel:${info.phone.replace(/[^0-9+]/g, '')}`" class="eem-footer-ul">{{ info.phone }}</a>
            </p>
          </address>
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
            <li><RouterLink to="/research" class="eem-footer-link">Research using the collection</RouterLink></li>
            <li><RouterLink to="/collectors" class="eem-footer-link">Collectors</RouterLink></li>
            <li><RouterLink to="/specimens" class="eem-footer-link">Search specimens</RouterLink></li>
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
            <li><RouterLink to="/people" class="eem-footer-link">People &amp; community</RouterLink></li>
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
            <li v-if="info.gbif.publisherKey">
              <a
                :href="`https://www.gbif.org/publisher/${info.gbif.publisherKey}`"
                target="_blank"
                rel="noopener"
                class="eem-footer-link"
                >GBIF data publisher</a
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
            <li class="pt-2">
              <p class="eem-footer-label">Data partners</p>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <a
                  :href="info.gbif.datasetKey ? `https://www.gbif.org/dataset/${info.gbif.datasetKey}` : 'https://www.gbif.org'"
                  target="_blank"
                  rel="noopener"
                  class="eem-partner"
                  title="Our specimen data are published through GBIF"
                  ><img
                    :src="gbifLogo"
                    alt="GBIF"
                    class="eem-partner-gbif"
                /></a>
                <a
                  href="https://www.catalogueoflife.org"
                  target="_blank"
                  rel="noopener"
                  class="eem-partner"
                  title="Species names are checked against the Catalogue of Life"
                  ><img
                    :src="colLogo"
                    alt="Catalogue of Life"
                    class="eem-partner-col"
                  /><span>Catalogue<br />of Life</span></a
                >
              </div>
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

      <!-- Legal text required on every page by the Mizzou web guidelines
           (brand.missouri.edu/apply-the-brand/web-digital/websites/content-guidelines) -->
      <div class="eem-footer-legal mt-10 pt-6 text-xs leading-relaxed space-y-2">
        <p>
          <a
            href="https://www.umsystem.edu/ums/hr/eeo"
            target="_blank"
            rel="noopener"
            class="eem-footer-ul"
            >Mizzou is an equal opportunity employer.</a
          >
        </p>
        <p>
          © Copyright {{ year }} by
          <a
            href="https://umsystem.edu/"
            target="_blank"
            rel="noopener"
            class="eem-footer-ul"
            >The Curators of the University of Missouri</a
          >, a public corporation.
        </p>
        <ul class="flex flex-wrap gap-x-5 gap-y-1">
          <li>
            <a
              href="https://missouri.edu/copyright/"
              target="_blank"
              rel="noopener"
              class="eem-footer-ul"
              >DMCA and other copyright information</a
            >
          </li>
          <li>
            <a
              href="https://missouri.edu/privacy/"
              target="_blank"
              rel="noopener"
              class="eem-footer-ul"
              >Privacy policy</a
            >
          </li>
          <li>
            <a
              href="https://missouri.edu/digital-accessibility"
              target="_blank"
              rel="noopener"
              class="eem-footer-ul"
              >Accessibility</a
            >
          </li>
        </ul>
      </div>

      <div class="eem-footer-bottom mt-5 pt-4 text-xs">
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
      </div>
    </div>
  </footer>
</template>

<script setup>
import info from './museumInfo.js'
const { base_url } = __APP_ENV__
const mark = `${base_url || '/'}images/eem-logo-rev-vert.png`.replace('//', '/')
const year = new Date().getFullYear()
const gbifLogo = `${base_url || '/'}${info.gbif.logo || 'images/GBIF.png'}`.replace('//', '/')
const colLogo = `${base_url || '/'}images/col-logo.png`.replace('//', '/')
// Footer contact: the museum address, else the director's
const contactEmail = info.email || info.director?.email || ''
</script>

<style scoped>
.eem-footer {
  background: #000;
  color: #fff;
}
/* GBIF and COL logos sit on white so they read on the black footer */
.eem-partner {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 2.6rem;
  padding: 0.3rem 0.55rem;
  background: #fff;
  border-radius: 4px;
  border: 2px solid transparent;
  transition: border-color 0.15s;
  text-decoration: none;
}
.eem-partner:hover {
  border-color: var(--eem-gold);
}
.eem-partner-gbif {
  height: 1.7rem;
  width: auto;
}
.eem-partner-col {
  height: 1.9rem;
  width: 1.9rem;
}
.eem-partner span {
  color: #111;
  font-size: 0.66rem;
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: 0.02em;
}
.eem-footer-band {
  height: 6px;
  background: var(--eem-gold);
}
.eem-footer-label {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--eem-gold);
}
/* Only white or gold text on black is an approved Mizzou combination */
.eem-footer-muted,
.eem-footer-contact {
  color: #fff;
}
.eem-footer-legal {
  border-top: 1px solid #333;
  color: #fff;
}
/* Links in running text are underlined (Mizzou Digital Access guidelines) */
.eem-footer .eem-footer-ul {
  color: #fff !important;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.eem-footer .eem-footer-ul:hover,
.eem-footer .eem-footer-ul:focus-visible {
  color: var(--eem-gold) !important;
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
  border-top: 1px solid #333;
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
