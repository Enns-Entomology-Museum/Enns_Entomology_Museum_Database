<template>
  <!-- Staff only: the page works when the site runs on your own computer (npm run dev) -->
  <div
    v-if="!STAFF"
    class="eem min-h-screen"
  >
    <div class="container mx-auto box-border px-4 py-24 max-w-2xl">
      <p class="eem-kicker">Newsletter</p>
      <h1 class="eem-display mt-3 text-3xl">For museum staff</h1>
      <p class="mt-4 eem-muted leading-relaxed">
        Newsletter issues are prepared by the museum. Read the latest stories on the
        <RouterLink
          to="/news"
          class="eem-link"
          >News</RouterLink
        >
        page.
      </p>
    </div>
  </div>
  <div
    v-else
    class="eem min-h-screen rp-page"
  >
    <!-- Controls (not printed) -->
    <section class="rp-controls print:hidden">
      <div class="container mx-auto box-border px-4 py-6 flex flex-wrap items-end gap-4">
        <div>
          <p class="eem-kicker">Newsletter & report</p>
          <h2 class="eem-display mt-2 text-2xl">Make an issue</h2>
        </div>
        <label class="rp-field">
          <span>Issue</span>
          <select v-model="issueKey">
            <option
              v-for="i in list"
              :key="i.key"
              :value="i.key"
            >
              {{ i.n }} · {{ i.label }}{{ i.current ? ' (in progress)' : '' }}
            </option>
          </select>
        </label>
        <div class="flex flex-wrap gap-2 ml-auto">
          <button
            type="button"
            class="eem-btn eem-btn-gold"
            @click="printIt"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            class="eem-btn eem-btn-line"
            :disabled="!data"
            @click="copyEmail"
          >
            {{ copied ? 'Copied ✓' : 'Copy for e-mail' }}
          </button>
          <button
            type="button"
            class="eem-btn eem-btn-line"
            :disabled="!data"
            @click="downloadEmail"
          >
            Download e-mail HTML
          </button>
        </div>
      </div>
      <div class="container mx-auto box-border px-4 pb-6">
        <label class="rp-note-field">
          <span>Note from the director (optional — printed at the top)</span>
          <textarea
            v-model="note"
            rows="3"
            placeholder="A few lines about this issue: what happened, what's next, a thank-you…"
          />
        </label>
        <label
          v-if="data && data.stories.length > 1"
          class="rp-note-field mt-3"
        >
          <span>Lead story (shown first and big; the others follow, newest first)</span>
          <select v-model="leadId">
            <option value="">Most recent story</option>
            <option
              v-for="s in data.stories"
              :key="s.id"
              :value="String(s.id)"
            >
              {{ s.date }} · {{ s.title }}
            </option>
          </select>
        </label>
        <p class="text-xs eem-muted mt-2">
          Stories are the news posts published in TaxonWorks during the period; numbers are what was added to the
          database in the same months. To change a story, edit it in TaxonWorks and reload. The lead story
          is shown first and big; the others follow, newest first.
        </p>
      </div>
    </section>

    <!-- The issue -->
    <article
      v-if="issue"
      class="rp-sheet"
    >
      <header class="rp-mast">
        <div class="rp-mast-top">
          <img
            :src="logo"
            alt="Enns Entomology Museum, University of Missouri"
            class="rp-mast-logo"
          />
          <div class="rp-mast-name">
            <p class="rp-mast-issue">Issue {{ issue.n }} · {{ issue.label }}</p>
            <h1 class="rp-mast-title">The Enns Report</h1>
          </div>
        </div>
        <div class="rp-mast-bar">
          <p class="rp-mast-kicker">Newsletter of the Enns Entomology Museum</p>
        </div>
      </header>

      <p
        v-if="loading"
        class="rp-pad eem-muted"
      >
        Gathering the issue…
      </p>

      <template v-else-if="data">
        <!-- First page: Insect of the month (in print it fills page 1; the contents open page 2) -->
        <section
          v-if="data.insect"
          id="rp-sec-insect"
          class="rp-insect"
        >
          <div class="rp-insect-media">
            <img
              v-if="data.insect.cover"
              :src="data.insect.cover.src"
              :alt="data.insect.cover.alt || data.insect.name"
            />
          </div>
          <div class="rp-insect-text">
            <!-- left: who it is -->
            <div class="rp-insect-side">
              <p class="rp-insect-kicker">Insect of the month</p>
              <h2 class="rp-insect-name">{{ data.insect.name }}</h2>
              <p
                v-if="data.insect.cover?.alt"
                class="rp-insect-cap"
              >
                {{ data.insect.cover.alt }}
              </p>
              <div
                v-if="data.insect.facts.length"
                class="rp-facts-box"
              >
                <h3 class="rp-facts-head">Fact file</h3>
                <dl>
                  <div
                    v-for="f in data.insect.facts"
                    :key="f.label"
                  >
                    <dt>{{ f.label }}</dt>
                    <dd v-html="f.html" />
                  </div>
                </dl>
              </div>
              <a
                v-if="data.insect.cat"
                :href="`${siteUrl.replace(/\/?$/, '/')}#/specimen?cat=${data.insect.cat}`"
                class="rp-card-link"
              >See it online →</a>
            </div>
            <!-- right: the story -->
            <div class="rp-insect-main">
              <blockquote
                v-if="data.insect.quote"
                class="rp-pull"
              >
                {{ data.insect.quote }}
              </blockquote>
              <div
                class="rp-insect-body"
                v-html="data.insect.body"
              />
            </div>
          </div>
        </section>
        <p
          v-else
          class="rp-pad rp-hint print:hidden"
        >
          <b>No Insect of the month for this issue.</b> In TaxonWorks, write a news post (Project → News, public)
          dated in {{ issue.label }} with a title that starts with <i>Insect of the month:</i> — e.g.
          <i>Insect of the month: The giraffe weevil</i> — and a few lines of text that include the specimen's catalog
          number (e.g. EEM000000447). The specimen's photo is taken from TaxonWorks automatically; add a photo to the
          post only if you want a different one. Reload this page and it appears here, on the front page.
        </p>

        <!-- Opening spread: the director's letter beside the contents -->
        <div
          class="rp-open"
          :class="{ 'has-note': !!note.trim() }"
        >
          <section
            v-if="note.trim()"
            id="rp-sec-note"
            class="rp-letter"
          >
            <p class="rp-letter-k">From the director</p>
            <div class="rp-letter-body">
              <p
                v-for="(p, i) in noteParas"
                :key="i"
              >
                {{ p }}
              </p>
            </div>
            <div class="rp-letter-sign">
              <img
                :src="directorPhoto"
                :alt="info.director.name"
              />
              <div>
                <p class="rp-letter-name">{{ info.director.name }}</p>
                <p class="rp-letter-role">{{ info.director.role }}, {{ info.fullName }}</p>
              </div>
            </div>
          </section>

        <section class="rp-pad rp-contents">
          <h2 class="rp-label">In this issue</h2>
          <ol class="rp-clist">
            <li
              v-for="(c, i) in contents"
              :key="c.id"
            >
              <a
                :href="`#${c.id}`"
                class="rp-citem"
                @click.prevent="goTo(c.id)"
              >
                <span class="rp-cnum">{{ i + 1 }}</span>
                <span class="rp-ctext">
                  <span class="rp-ckicker">{{ c.kicker }}</span>
                  <span class="rp-ctitle">{{ c.title }}</span>
                  <span
                    v-if="c.text"
                    class="rp-cexcerpt"
                  >{{ c.text }}</span>
                </span>
                <img
                  v-if="c.img"
                  :src="c.img"
                  :alt="c.title"
                  class="rp-cthumb"
                />
              </a>
            </li>
          </ol>
        </section>
        </div>

        <!-- Numbers -->
        <section
          id="rp-sec-numbers"
          class="rp-pad rp-numbers"
        >
          <h2 class="rp-label">In {{ issue.label }}</h2>
          <dl class="rp-stats">
            <div>
              <dt>Specimens digitized</dt>
              <dd>{{ fmt(data.numbers.specimens) }}</dd>
            </div>
            <div>
              <dt>Species among them</dt>
              <dd>{{ fmt(data.numbers.species) }}</dd>
            </div>
            <div>
              <dt>Taxa added</dt>
              <dd>{{ fmt(data.numbers.taxa) }}</dd>
            </div>
            <div>
              <dt>Specimens online in total</dt>
              <dd>{{ fmt(data.numbers.toDate) }}</dd>
            </div>
          </dl>
          <p
            v-if="typeof data.numbers.atStart === 'number' && typeof data.numbers.toDate === 'number'"
            class="rp-growth"
          >
            <b>{{ fmt(data.numbers.atStart) }} → {{ fmt(data.numbers.toDate) }}</b> specimens online
            <span>(+{{ fmt(data.numbers.toDate - data.numbers.atStart) }} in {{ issue.label }})</span>
          </p>
          <p class="rp-small">
            <template v-if="data.numbers.types">{{ fmt(data.numbers.types) }} type specimen(s) catalogued · </template>
            <template v-if="data.numbers.images">{{ fmt(data.numbers.images) }} image(s) added · </template>
            <template v-if="data.numbers.counties">specimens from {{ data.numbers.counties }} Missouri count{{ data.numbers.counties === 1 ? 'y' : 'ies' }}</template>
          </p>

          <!-- Specimens digitized per month, last 12 months -->
          <MonthlyBars
            v-if="data.monthly && data.monthly.length"
            :series="data.monthly"
          />

          <!-- Missouri counties of this issue's specimens -->
          <ReportCountyMap
            v-if="data.byCounty && Object.keys(data.byCounty).length"
            :counts="data.byCounty"
          />

          <!-- Digitized by order -->
          <div
            v-if="data.orders.length"
            class="rp-orders"
          >
            <h3 class="rp-sublabel">Digitized this period, by order</h3>
            <ul>
              <li
                v-for="o in data.orders.slice(0, 8)"
                :key="o.name"
              >
                <span class="rp-oname">{{ o.name }}</span>
                <span class="rp-obar"><span :style="{ width: `${(o.n / data.orders[0].n) * 100}%` }" /></span>
                <span class="rp-on">{{ fmt(o.n) }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- Who came to the museum (visit log of the museum network) -->
        <section
          v-if="data.visits"
          id="rp-sec-visits"
          class="rp-pad rp-visits"
        >
          <h2 class="rp-label">Who came to the museum</h2>
          <div
            v-if="data.visits.visits || data.visits.outreach.events"
            class="rp-v-grid"
          >
            <div class="rp-v-big">
              <b>{{ fmt(data.visits.people) }}</b>
              <span>{{ data.visits.people === 1 ? 'person' : 'people' }} came to the collection</span>
              <small>in {{ fmt(data.visits.visits) }} visit{{ data.visits.visits === 1 ? '' : 's' }}<template v-if="data.visits.year"> · {{ fmt(data.visits.year.people) }} so far in {{ data.visits.year.year }}</template></small>
            </div>
            <div class="rp-v-right">
              <!-- one figure per visitor (each figure = several people when there are many) -->
              <div
                class="rp-v-people"
                :aria-label="visitLines(data.visits).join(', ')"
              >
                <svg
                  v-for="(c, k) in visitFigures"
                  :key="k"
                  viewBox="0 0 12 20"
                  class="rp-v-fig"
                  :style="{ color: c }"
                  aria-hidden="true"
                ><circle cx="6" cy="4" r="3.4" fill="currentColor" /><path d="M1 19v-6.5C1 9.5 3 8 6 8s5 1.5 5 4.5V19z" fill="currentColor" /></svg>
              </div>
              <!-- outreach: people we reached elsewhere, in their own colour (rust) on a second row -->
              <div
                v-if="outreachFigures"
                class="rp-v-people rp-v-people-out"
                :aria-label="`${data.visits.outreach.people} people reached through outreach`"
              >
                <svg
                  v-for="k in outreachFigures"
                  :key="'o' + k"
                  viewBox="0 0 12 20"
                  class="rp-v-fig"
                  aria-hidden="true"
                ><circle cx="6" cy="4" r="3.4" fill="#b0562b" /><path d="M1 19v-6.5C1 9.5 3 8 6 8s5 1.5 5 4.5V19z" fill="#b0562b" /></svg>
              </div>
              <p
                v-if="visitPer > 1"
                class="rp-v-scale"
              >each figure = {{ visitPer }} people</p>
              <ul class="rp-v-legend">
                <li
                  v-for="t in data.visits.byType"
                  :key="t.type"
                >
                  <i :style="{ background: t.color }" />
                  <b>{{ t.type }}</b>
                  <span>{{ fmt(t.visits) }} visit{{ t.visits === 1 ? '' : 's' }} · {{ fmt(t.people) }} {{ t.people === 1 ? 'person' : 'people' }}</span>
                </li>
                <li v-if="data.visits.outreach.events">
                  <i class="rp-v-out" />
                  <b>Outreach <small>(we went to them)</small></b>
                  <span>{{ fmt(data.visits.outreach.events) }} {{ data.visits.outreach.events === 1 ? 'event' : 'events' }} · {{ fmt(data.visits.outreach.people) }} people</span>
                </li>
              </ul>
            </div>
          </div>
          <!-- They used the museum: facilities (imaging, microscopes, specimens) -->
          <div
            v-if="data.visits.use"
            class="rp-v-use"
          >
            <p class="rp-v-use-k">Using the museum's facilities</p>
            <div class="rp-v-use-main">
              <p class="rp-v-use-big">
                <b>{{ fmt(data.visits.use.people) }}</b> {{ data.visits.use.people === 1 ? 'researcher used' : 'researchers used' }} our facilities
                <span v-if="data.visits.use.institutions">from {{ fmt(data.visits.use.institutions) }} {{ data.visits.use.institutions === 1 ? 'institution' : 'institutions' }}<template v-if="data.visits.year && data.visits.year.usePeople"> · {{ fmt(data.visits.year.usePeople) }} so far in {{ data.visits.year.year }}</template></span>
              </p>
              <ul class="rp-v-use-res">
                <li
                  v-for="r in data.visits.use.resources"
                  :key="r.name"
                >{{ r.name }}</li>
              </ul>
            </div>
            <p class="rp-v-use-who">{{ data.visits.use.users.map((u) => `${u.name} (${u.n})`).join(' · ') }}</p>
          </div>

          <div
            v-if="data.visits.groups.length"
            class="rp-v-groups"
          >
            <div
              v-for="g in data.visits.groups"
              :key="g.name + g.date"
              class="rp-v-group"
            >
              <p class="rp-v-gk">{{ g.type }} · {{ g.date }}</p>
              <p class="rp-v-gn">
                <b>{{ g.name }}</b><template v-if="g.audience"> — {{ g.audience }}</template>
              </p>
              <p
                v-if="g.activity"
                class="rp-v-ga"
              >{{ g.activity }}</p>
            </div>
          </div>
        </section>

        <!-- Our network grew: who joined the collaboration network in the period -->
        <section
          v-if="data.network"
          id="rp-sec-network"
          class="rp-pad rp-network"
        >
          <h2 class="rp-label">Our network grew</h2>
          <p class="rp-net-lead">
            <b>{{ fmt(data.network.joined.length) }}</b> new {{ data.network.joined.length === 1 ? 'collaborator' : 'collaborators' }}<template v-if="data.network.newInstitutions"> from <b>{{ fmt(data.network.newInstitutions) }}</b> new {{ data.network.newInstitutions === 1 ? 'institution' : 'institutions' }}</template>
            <span>· {{ fmt(data.network.total) }} people in {{ fmt(data.network.countries) }} countries in total</span>
          </p>
          <ul class="rp-net-list">
            <li
              v-for="p in data.network.joined"
              :key="p.name + p.affiliation"
            >
              <b>{{ p.name || p.affiliation }}</b>
              <span v-if="p.name && p.affiliation">{{ p.affiliation }}<template v-if="p.country"> · {{ p.country }}</template></span>
              <i v-if="p.taxa.length || p.families">{{ [p.taxa.join(', '), p.families].filter(Boolean).join(' · ') }}</i>
            </li>
          </ul>
          <p class="rp-small">
            <a
              href="https://enns-museum-community.netlify.app"
              target="_blank"
              rel="noopener"
            >See the collaboration network map →</a>
          </p>
        </section>

        <!-- A closer look at what was digitized -->
        <section
          v-if="cl"
          id="rp-sec-closer"
          class="rp-pad rp-closer"
        >
          <h2 class="rp-label">A closer look at the {{ fmt(cl.total) }} specimens</h2>

          <ul class="rp-facts">
            <li><b>{{ fmt(cl.familyCount) }}</b> families</li>
            <li><b>{{ fmt(cl.collectors) }}</b> collectors</li>
            <li><b>{{ cl.missouriPct }}%</b> from Missouri</li>
            <li><b>{{ fmt(cl.states) }}</b> states · <b>{{ fmt(cl.countries) }}</b> countr{{ cl.countries === 1 ? 'y' : 'ies' }}</li>
          </ul>

          <div class="rp-closer-grid">
            <div>
              <h3 class="rp-sublabel">How complete are the records?</h3>
              <div
                v-for="q in cl.quality"
                :key="q.label"
                class="rp-q"
              >
                <div class="rp-q-top">
                  <span>{{ q.label }}</span><b>{{ q.pct }}%</b>
                </div>
                <div class="rp-q-bar"><span :style="{ width: `${q.pct}%` }" /></div>
              </div>

              <div
                v-if="cl.oldest"
                class="rp-oldest"
              >
                <p class="rp-oldest-k">Oldest specimen this issue</p>
                <p class="rp-oldest-y">{{ cl.oldest.year }}</p>
                <p>
                  <i>{{ cl.oldest.name }}</i><template v-if="cl.oldest.place">, {{ cl.oldest.place }}</template><template v-if="cl.oldest.collector">, leg. {{ cl.oldest.collector }}</template><template v-if="cl.oldest.cat"> · {{ cl.oldest.cat }}</template>
                </p>
              </div>
            </div>

            <div>
              <template v-if="cl.decades.length">
                <h3 class="rp-sublabel">When they were collected</h3>
                <ul class="rp-dec">
                  <li
                    v-for="d in cl.decades"
                    :key="d.label"
                  >
                    <span class="rp-dec-bar"><span :style="{ height: `${d.n ? Math.max(4, (d.n / decMax) * 100) : 0}%` }" /></span>
                    <span class="rp-dec-n">{{ fmt(d.n) }}</span>
                    <span class="rp-dec-l">{{ d.label }}</span>
                  </li>
                </ul>
              </template>
              <template v-if="cl.families.length">
                <p class="rp-sublabel mt-4">Top families</p>
                <ol class="rp-fam">
                  <li
                    v-for="f in cl.families"
                    :key="f.name"
                  >
                    <span>{{ f.name }}</span><b>{{ fmt(f.n) }}</b>
                  </li>
                </ol>
              </template>
            </div>
          </div>
        </section>

        <!-- New in the collection -->
        <section
          v-if="hl && (hl.species.length || hl.types.length || hl.counties.length)"
          id="rp-sec-new"
          class="rp-pad rp-new"
        >
          <h2 class="rp-label">New in the collection</h2>
          <div class="rp-new-grid">
            <div v-if="hl.species.length">
              <h3 class="rp-new-head"><b>{{ hl.species.length }}</b> species new to our database</h3>
              <ul>
                <li
                  v-for="x in hl.species.slice(0, LIMIT)"
                  :key="x.name"
                >
                  <i>{{ x.name }}</i>
                  <span v-if="x.order || x.family">{{ [x.order, x.family].filter(Boolean).join(', ') }}</span>
                </li>
              </ul>
              <p
                v-if="hl.species.length > LIMIT"
                class="rp-more"
              >
                and {{ hl.species.length - LIMIT }} more
              </p>
            </div>
            <div v-if="hl.types.length">
              <h3 class="rp-new-head"><b>{{ hl.types.length }}</b> type specimen{{ hl.types.length === 1 ? '' : 's' }} catalogued</h3>
              <ul>
                <li
                  v-for="x in hl.types.slice(0, LIMIT)"
                  :key="x.cat || x.name"
                >
                  <i>{{ x.name }}</i>
                  <span>{{ x.status }}<template v-if="x.cat"> · {{ x.cat }}</template></span>
                </li>
              </ul>
              <p
                v-if="hl.types.length > LIMIT"
                class="rp-more"
              >
                and {{ hl.types.length - LIMIT }} more
              </p>
            </div>
            <div v-if="hl.counties.length">
              <h3 class="rp-new-head"><b>{{ hl.counties.length }}</b> new Missouri county record{{ hl.counties.length === 1 ? '' : 's' }}</h3>
              <ul>
                <li
                  v-for="x in hl.countyGroups.slice(0, LIMIT)"
                  :key="x.name + x.county"
                >
                  <i>{{ x.name }}</i>
                  <span>{{ x.county }}</span>
                </li>
              </ul>
              <p
                v-if="hl.countyGroups.length > LIMIT"
                class="rp-more"
              >
                and {{ hl.countyGroups.length - LIMIT }} more species
              </p>
            </div>
          </div>
          <p class="rp-small">
            Compared with everything digitized before {{ issue.label }}<template v-if="!hl.complete"> (approximate: the earlier records were too many to compare in full)</template>.
          </p>
        </section>

        <!-- Stories: short versions, each with a link to the full story online -->
        <section
          v-if="stories.length"
          id="rp-sec-news"
          class="rp-pad rp-news"
        >
          <h2 class="rp-label">News from the museum</h2>
          <article
            v-for="(s, i) in stories"
            :id="`rp-story-${s.id}`"
            :key="s.id"
            class="rp-card"
            :class="{ 'rp-card-lead': i === 0 }"
          >
            <a
              v-if="s.cover"
              :href="storyUrl(s)"
              class="rp-card-img"
            ><img
              :src="s.cover.src"
              :alt="s.cover.alt"
            /></a>
            <div class="rp-card-text">
              <p class="rp-meta">{{ s.type }} · {{ s.date }}</p>
              <h3 class="rp-card-title">
                <a :href="storyUrl(s)">{{ s.title }}</a>
              </h3>
              <p class="rp-card-excerpt">{{ shortText(s.body, i === 0 ? 420 : 210) }}</p>
              <a
                :href="storyUrl(s)"
                class="rp-card-link"
              >Read the full story →</a>
              <span class="rp-card-url">{{ siteUrlShort.split('/')[0] }} · News #{{ s.id }}</span>
            </div>
          </article>
        </section>
        <p
          v-if="!stories.length"
          class="rp-pad eem-muted"
        >
          No news posts were published in this period. Write them in TaxonWorks (Project → News) and they will appear
          here.
        </p>

        <!-- Back page -->
        <footer
          id="rp-sec-back"
          class="rp-back"
        >
          <div>
            <h2 class="rp-back-title">Get involved</h2>
            <p>
              Visit, borrow specimens, donate a collection or become a Friend of the Museum:
              <b>{{ siteUrlShort }}</b>
            </p>
          </div>
          <div>
            <p>{{ info.fullName }}</p>
            <p>{{ info.college }}</p>
            <p>{{ info.university }} · {{ info.city }}</p>
            <p v-if="info.email || info.director.email">{{ info.email || info.director.email }}</p>
          </div>
        </footer>
      </template>
    </article>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import info from './components/museumInfo.js'
import { fmt } from './components/useEem.js'
import { emailHtml, issues, listOf, loadIssue, shortText, visitLines } from './components/useReport.js'
import MonthlyBars from './components/MonthlyBars.vue'
import ReportCountyMap from './components/ReportCountyMap.vue'

// Only when the site runs locally (npm run dev): the published site shows a short note instead
const STAFF = import.meta.env.DEV

const { project_url } = __APP_ENV__
const siteUrl = project_url || 'https://enns-entomology-museum.github.io/Enns_Entomology_Museum_Database/'
const siteUrlShort = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
const logo = `${import.meta.env.BASE_URL || '/'}images/eem-logo-rev-horiz.png`
const directorPhoto = `${import.meta.env.BASE_URL || '/'}images/history/2026-dalpos.jpg`

const list = computed(() => issues())
const issueKey = ref('')
const issue = computed(() => list.value.find((i) => i.key === issueKey.value) || list.value[0])
const data = ref(null)
const loading = ref(false)
const copied = ref(false)
const hl = computed(() => data.value?.highlights || null)
const cl = computed(() => data.value?.closer || null)
const decMax = computed(() => Math.max(1, ...(cl.value?.decades || []).map((d) => d.n)))
const storyUrl = (s) => `${siteUrl.replace(/\/?$/, '/')}#/news/${s.id}`
const LIMIT = 8

useHead({
  title: computed(() => `The Enns Report ${issue.value ? `— Issue ${issue.value.n}, ${issue.value.label}` : ''}`),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

// default: the last finished issue (or the current one if none has finished)
watch(
  list,
  (l) => {
    if (!l.find((i) => i.key === issueKey.value)) issueKey.value = (l.find((i) => !i.current) || l[0])?.key || ''
  },
  { immediate: true }
)

watch(
  issue,
  async (i) => {
    if (!i || !STAFF) return
    loading.value = true
    data.value = null
    try {
      data.value = await loadIssue(i)
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)

// Lead story: chosen per issue (remembered in this browser); default = the most recent one
const leadKey = computed(() => `eem-report-lead-${issue.value?.key}`)
const leadId = ref('')
watch(
  leadKey,
  (k) => {
    try {
      leadId.value = localStorage.getItem(k) || ''
    } catch {
      leadId.value = ''
    }
  },
  { immediate: true }
)
watch(leadId, (v) => {
  try {
    if (v) localStorage.setItem(leadKey.value, v)
    else localStorage.removeItem(leadKey.value)
  } catch {}
})
// visitor figures: one per person, at most 60 (then each figure stands for several people)
const visitPer = computed(() => Math.max(1, Math.ceil(((data.value?.visits?.people || 0) + (data.value?.visits?.outreach?.people || 0)) / 60)))
const outreachFigures = computed(() => Math.round((data.value?.visits?.outreach?.people || 0) / visitPer.value))
const visitFigures = computed(() => {
  const v = data.value?.visits
  if (!v) return []
  const out = []
  for (const t of v.byType) for (let k = 0; k < Math.round(t.people / visitPer.value); k++) out.push(t.color)
  return out
})
const stories = computed(() => {
  const all = data.value?.stories || []
  const lead = all.find((s) => String(s.id) === leadId.value)
  return lead ? [lead, ...all.filter((s) => s !== lead)] : all
})

// The director's note is kept in this browser, per issue, until printed
const noteKey = computed(() => `eem-report-note-${issue.value?.key}`)
const note = ref('')
watch(
  noteKey,
  (k) => {
    try {
      note.value = localStorage.getItem(k) || ''
    } catch {
      note.value = ''
    }
  },
  { immediate: true }
)
watch(note, (v) => {
  try {
    localStorage.setItem(noteKey.value, v)
  } catch {
    /* storage blocked */
  }
})
const noteParas = computed(() =>
  note.value
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
)

// First page: the contents of the issue
const contents = computed(() => {
  const d = data.value
  if (!d) return []
  const out = []
  out.push({
    id: 'rp-sec-numbers',
    kicker: 'The numbers',
    title: `${fmt(d.numbers.specimens)} specimens digitized in ${issue.value.label}`,
    text: `${fmt(d.numbers.toDate)} specimens online in total · digitization month by month`
  })
  if (d.network) {
    out.push({
      id: 'rp-sec-network',
      kicker: 'Our network grew',
      title: `${fmt(d.network.joined.length)} new ${d.network.joined.length === 1 ? 'collaborator' : 'collaborators'}`,
      text: `${fmt(d.network.total)} people in ${fmt(d.network.countries)} countries`
    })
  }
  if (d.visits) {
    out.push({
      id: 'rp-sec-visits',
      kicker: 'Who came to the museum',
      title: `${fmt(d.visits.visits)} visit${d.visits.visits === 1 ? '' : 's'}, ${fmt(d.visits.people)} people`,
      text: [visitLines(d.visits).join(' · '), d.visits.use ? `${fmt(d.visits.use.people)} used our facilities` : ''].filter(Boolean).join(' · ')
    })
  }
  const h = d.highlights
  if (h && (h.species.length || h.types.length || h.counties.length)) {
    const bits = [
      h.species.length ? `${h.species.length} new species` : '',
      h.types.length ? `${h.types.length} type specimen${h.types.length === 1 ? '' : 's'}` : '',
      h.counties.length ? `${h.counties.length} new county record${h.counties.length === 1 ? '' : 's'}` : ''
    ].filter(Boolean)
    out.push({ id: 'rp-sec-new', kicker: 'New in the collection', title: listOf(bits), text: '' })
  }

  for (const s of stories.value) out.push({ id: `rp-story-${s.id}`, kicker: s.type, title: s.title, text: s.excerpt, img: s.cover?.src || '' })
  out.push({ id: 'rp-sec-back', kicker: 'Get involved', title: 'Visit, borrow, donate, become a Friend of the Museum', text: '' })
  return out
})
function goTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const printIt = () => window.print()

const html = () => emailHtml({ issue: issue.value, data: { ...data.value, stories: stories.value }, note: note.value.trim(), siteUrl, info })

// Plain-text copy (for mail programs that don't take HTML): tags removed, entities decoded
function plainText(h) {
  const el = document.createElement('div')
  el.innerHTML = h.replace(/<(br|\/p|\/div|\/h[1-6]|\/tr|\/li)[^>]*>/gi, '\n')
  return el.textContent.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim()
}

async function copyEmail() {
  const h = html()
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([h], { type: 'text/html' }),
        'text/plain': new Blob([plainText(h)], { type: 'text/plain' })
      })
    ])
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    downloadEmail()
  }
}

function downloadEmail() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([html()], { type: 'text/html;charset=utf-8' }))
  a.download = `The_Enns_Report_issue_${issue.value.n}.html`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.rp-controls {
  background: var(--eem-paper-2);
  border-bottom: 1px solid var(--eem-rule);
}
.rp-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--eem-ink-soft);
}
.rp-field select {
  min-width: 10rem;
  padding: 0.5rem 0.6rem;
  border: 2px solid var(--eem-ink);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
.rp-note-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--eem-ink-soft);
}
.rp-note-field textarea,
.rp-note-field select {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 2px solid var(--eem-rule);
  border-radius: 2px;
  background: var(--eem-card);
  color: var(--eem-ink);
  font-weight: 400;
  font-size: 0.95rem;
}

/* The sheet: looks like a printed newsletter on screen, prints as one */
.rp-sheet {
  max-width: 52rem;
  margin: 2.5rem auto 4rem;
  background: #fff;
  color: #111;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
}
.rp-mast {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.8rem 2.4rem 0;
  background: #000;
  color: #fff;
}
/* the logo gives way to the newsletter name, so the name never runs off the edge */
.rp-mast-logo {
  flex: 0 1 26rem;
  min-width: 0;
  width: 100%;
  max-width: 26rem;
  height: auto;
}
.rp-mast-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
}
.rp-mast-name {
  flex-shrink: 0;
  text-align: right;
}
.rp-mast-issue {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
  font-variant-numeric: tabular-nums;
}
.rp-mast-title {
  margin-top: 0.15rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.4rem;
  font-weight: 400;
  font-style: italic;
  line-height: 1.1;
  color: #fdb719;
}
.rp-mast-bar {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin: 0 -2.4rem;
  padding: 0.55rem 2.4rem;
  background: #fdb719;
  color: #000;
}
.rp-mast-kicker {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

/* Insect of the month: the front-page feature */
.rp-insect {
  border-bottom: 1px solid #e5e0d4;
}
.rp-insect-media {
  background: #f6f4ef;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rp-insect-media img {
  display: block;
  width: 100%;
  max-height: 26rem;
  object-fit: contain;
}
.rp-insect-text {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 1.8rem;
  padding: 1.4rem 2.4rem 1.6rem;
  border-top: 6px solid #fdb719;
}
.rp-insect-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.rp-facts-box {
  align-self: stretch;
  margin-top: 1rem;
  border: 2px solid #000;
}
.rp-facts-head {
  padding: 0.35rem 0.7rem;
  background: #000;
  color: #fdb719;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.rp-facts-box dl > div {
  padding: 0.45rem 0.7rem;
  border-top: 1px solid #e5e0d4;
  font-size: 0.8rem;
  line-height: 1.35;
}
.rp-facts-box dl > div:first-child {
  border-top: 0;
}
.rp-facts-box dt {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6b665c;
}
.rp-facts-box dd :deep(a) {
  color: #000;
  text-decoration: underline;
}
.rp-pull {
  position: relative;
  margin: 0 0 1rem;
  padding: 0.2rem 0 0.2rem 1.1rem;
  border-left: 5px solid #fdb719;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.3rem;
  font-style: italic;
  line-height: 1.38;
  color: #000;
}
.rp-insect-body :deep(h2),
.rp-insect-body :deep(h3) {
  margin: 1rem 0 0.35rem;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #000;
}
.rp-insect-body :deep(h2)::after,
.rp-insect-body :deep(h3)::after {
  content: '';
  display: block;
  width: 2rem;
  height: 3px;
  margin-top: 0.3rem;
  background: #fdb719;
}
.rp-insect-body :deep(ul) {
  list-style: disc;
  padding-left: 1.2em;
  margin: 0 0 0.7em;
}
.rp-insect-body :deep(a) {
  color: #000;
  text-decoration: underline;
}
.rp-insect-kicker {
  justify-self: start;
  display: inline-block;
  padding: 0.2rem 0.55rem;
  background: #000;
  color: #fdb719;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.rp-insect-name {
  margin-top: 0.7rem;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.75rem;
  line-height: 1.12;
}
.rp-insect-cap {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: #6b665c;
}
.rp-insect-body {
  margin-top: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.98rem;
  line-height: 1.55;
}
.rp-insect-body :deep(p) {
  margin: 0 0 0.7em;
}
.rp-insect-body :deep(img) {
  display: none; /* only the first photo is used */
}
.rp-insect-link {
  margin-top: 0.6rem;
  font-size: 0.75rem;
  color: #6b665c;
  word-break: break-all;
}
.rp-new {
  border-top: 1px solid #e5e0d4;
}
.rp-new-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1.2rem 1.8rem;
}
.rp-new-head {
  padding-bottom: 0.35rem;
  margin-bottom: 0.45rem;
  border-bottom: 3px solid #fdb719;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
}
.rp-new-head b {
  font-size: 1.35rem;
  font-weight: 800;
  margin-right: 0.15rem;
}
.rp-new li {
  padding: 0.22rem 0;
  font-size: 0.86rem;
  line-height: 1.3;
  border-bottom: 1px dotted #e5e0d4;
}
.rp-new li i {
  font-family: Georgia, 'Times New Roman', serif;
}
.rp-new li span {
  display: block;
  font-size: 0.72rem;
  color: #6b665c;
}
.rp-more {
  margin-top: 0.3rem;
  font-size: 0.75rem;
  color: #6b665c;
}
.rp-news {
  border-top: 1px solid #e5e0d4;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  background: #f6f4ef;
}
.rp-news > .rp-label {
  grid-column: 1 / -1;
  margin-bottom: -0.2rem;
}
/* every story is its own box: gold top edge, white card, clear title */
.rp-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #ddd8cc;
  border-top: 5px solid #fdb719;
  break-inside: avoid;
}
.rp-card-img img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: #f6f4ef;
}
.rp-card-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0.9rem 1rem 1rem;
}
.rp-card-lead {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.rp-card-lead .rp-card-img {
  display: block;
  height: 100%;
  min-height: 14rem;
}
.rp-card-lead .rp-card-img img {
  height: 100%;
  max-height: 22rem;
  aspect-ratio: auto;
}
.rp-card-lead .rp-card-text {
  padding: 1.2rem 1.3rem;
}
.rp-card .rp-meta {
  color: #6b665c;
}
.rp-card-title {
  margin: 0.3rem 0 0.55rem;
  padding-bottom: 0.55rem;
  border-bottom: 2px solid #000;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.2rem;
  line-height: 1.2;
}
.rp-card-lead .rp-card-title {
  font-size: 1.55rem;
}
.rp-card-title a {
  color: #000;
  text-decoration: none;
}
.rp-card-excerpt {
  flex: 1;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.93rem;
  line-height: 1.55;
  color: #222;
}
.rp-card-link {
  align-self: flex-start;
  margin-top: 0.8rem;
  padding: 0.35rem 0.75rem;
  background: #000;
  color: #fdb719;
  font-size: 0.78rem;
  font-weight: 800;
  text-decoration: none;
}
.rp-card-url {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.68rem;
  color: #6b665c;
}

/* A closer look */
.rp-closer {
  border-top: 1px solid #e5e0d4;
}
.rp-facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 4px solid #000;
  margin-bottom: 1.2rem;
}
.rp-facts li {
  padding: 0.7rem 0.8rem;
  border-bottom: 1px solid #e5e0d4;
  border-right: 1px solid #e5e0d4;
  font-size: 0.8rem;
  color: #444;
}
.rp-facts li:first-child {
  border-left: 1px solid #e5e0d4;
}
.rp-facts b {
  display: inline-block;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  color: #000;
  margin-right: 0.15rem;
}
.rp-closer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.8rem;
}
.rp-q {
  margin-bottom: 0.65rem;
}
.rp-q-top {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
}
.rp-q-top b {
  font-variant-numeric: tabular-nums;
}
.rp-q-bar {
  margin-top: 0.25rem;
  height: 0.6rem;
  background: #f2efe8;
}
.rp-q-bar span {
  display: block;
  height: 100%;
  background: #000;
}
.rp-oldest {
  margin-top: 1.1rem;
  padding: 0.8rem 1rem;
  background: #ffedcf;
  font-size: 0.85rem;
  line-height: 1.45;
}
.rp-oldest-k {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.rp-oldest-y {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 2rem;
  line-height: 1.1;
}
.rp-oldest i {
  font-family: Georgia, 'Times New Roman', serif;
}
.rp-dec {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 7.5rem;
}
.rp-dec li {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
}
.rp-dec-bar {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
}
.rp-dec-bar span {
  display: block;
  width: 100%;
  background: #fdb719;
}
.rp-dec-n {
  font-size: 0.62rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.rp-dec-l {
  font-size: 0.62rem;
  color: #6b665c;
}
.rp-fam li {
  display: flex;
  justify-content: space-between;
  padding: 0.18rem 0;
  border-bottom: 1px dotted #e5e0d4;
  font-size: 0.82rem;
}
.rp-fam b {
  font-variant-numeric: tabular-nums;
}
.rp-open.has-note {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  border-bottom: 1px solid #e5e0d4;
}
.rp-open.has-note .rp-clist {
  grid-template-columns: 1fr;
}
.rp-open.has-note .rp-cthumb,
.rp-open.has-note .rp-cexcerpt {
  display: none;
}
.rp-open.has-note .rp-contents {
  padding-left: 1.6rem;
}
.rp-letter {
  position: relative;
  padding: 1.8rem 2rem 1.6rem 2.4rem;
  background: #ffedcf;
}
.rp-letter::before {
  content: '\201C';
  position: absolute;
  top: 0.6rem;
  right: 1.2rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 6rem;
  line-height: 1;
  color: #fdb719;
}
.rp-letter-k {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding-bottom: 0.5rem;
  margin-bottom: 0.9rem;
  border-bottom: 3px solid #000;
  display: inline-block;
}
.rp-letter-body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.02rem;
  line-height: 1.6;
  color: #111;
}
.rp-letter-body p + p {
  margin-top: 0.75rem;
}
.rp-letter-body p:first-child::first-letter {
  float: left;
  margin: 0.08em 0.1em 0 0;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 3.1em;
  font-weight: 800;
  line-height: 0.85;
  color: #000;
}
.rp-letter-sign {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1.2rem;
}
.rp-letter-sign img {
  width: 3.4rem;
  height: 3.4rem;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px #fdb719;
}
.rp-letter-name {
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 1.15rem;
}
.rp-letter-role {
  font-size: 0.72rem;
  color: #6b665c;
}
.rp-hint {
  background: #ffedcf;
  font-size: 0.85rem;
  line-height: 1.5;
}
.rp-pad {
  padding: 1.6rem 2.4rem;
}
.rp-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #000000;
  margin-bottom: 0.7rem;
}
.rp-note {
  padding: 1.6rem 2.4rem;
  background: #ffedcf;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.05rem;
  line-height: 1.6;
}
.rp-note p + p {
  margin-top: 0.7rem;
}
.rp-sign {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 0.85rem;
  color: #555;
}
.rp-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 4px solid #000;
  border-left: 1px solid #e5e0d4;
}
.rp-stats > div {
  padding: 0.9rem 1rem;
  border-right: 1px solid #e5e0d4;
  border-bottom: 1px solid #e5e0d4;
}
.rp-stats dt {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b665c;
}
.rp-stats dd {
  margin-top: 0.3rem;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.9rem;
  font-variant-numeric: tabular-nums;
}
.rp-growth {
  margin-top: 0.9rem;
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 1.05rem;
}
.rp-growth b {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.rp-growth span {
  color: #6b665c;
  font-size: 0.85rem;
  font-family: 'Open Sans', system-ui, sans-serif;
}
.rp-small {
  margin-top: 0.6rem;
  font-size: 0.8rem;
  color: #6b665c;
}
.rp-orders {
  margin-top: 1.2rem;
}
.rp-sublabel {
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.rp-orders li {
  display: grid;
  grid-template-columns: 8rem 1fr 3rem;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.82rem;
  padding: 0.12rem 0;
}
.rp-obar {
  height: 0.65rem;
  background: #f2efe8;
}
.rp-obar span {
  display: block;
  height: 100%;
  min-width: 2px;
  background: #fdb719;
  border-radius: 0 3px 3px 0;
}
.rp-on {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
.rp-clist {
  display: grid;
  gap: 0.2rem;
}
.rp-citem {
  display: grid;
  grid-template-columns: 2.2rem 1fr auto;
  gap: 0.9rem;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e0d4;
  color: inherit;
  text-decoration: none;
}
.rp-citem:hover .rp-ctitle {
  text-decoration: underline;
}
.rp-cnum {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.6rem;
  color: #fdb719;
  font-variant-numeric: tabular-nums;
}
.rp-ctext {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}
.rp-ckicker {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #000000;
}
.rp-ctitle {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  line-height: 1.25;
}
.rp-cexcerpt {
  font-size: 0.82rem;
  color: #6b665c;
  line-height: 1.4;
}
.rp-cthumb {
  width: 5.5rem;
  height: 4rem;
  object-fit: cover;
}
.rp-meta {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #000000;
}
.rp-back {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1.6rem 2.4rem;
  background: #000;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.82rem;
  line-height: 1.55;
}
.rp-back-title {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-weight: 800;
  font-size: 1.1rem;
  color: #fdb719;
}
.rp-back b {
  color: #fff;
}

@media (max-width: 640px) {
  .rp-sheet {
    margin: 1rem 0 2rem;
  }
  /* phones: the logo full width, the newsletter name under it */
  .rp-mast-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
  }
  .rp-mast-logo {
    flex: none;
  }
  .rp-mast-name {
    text-align: left;
  }
  .rp-mast,
  .rp-pad,
  .rp-note,
  .rp-back {
    padding-left: 1.1rem;
    padding-right: 1.1rem;
  }
  .rp-mast-bar {
    margin: 0 -1.1rem;
    padding-left: 1.1rem;
    padding-right: 1.1rem;
  }
  .rp-insect-text {
    grid-template-columns: 1fr;
    padding: 1.2rem 1.1rem;
  }
  .rp-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rp-news,
  .rp-card-lead,
  .rp-closer-grid,
  .rp-open.has-note {
    grid-template-columns: 1fr;
  }
  .rp-letter {
    padding: 1.4rem 1.1rem;
  }
  .rp-open.has-note .rp-contents {
    padding-left: 1.1rem;
  }
  .rp-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Printing / Save as PDF */
@media print {
  @page {
    size: letter;
    margin: 0.5in;
  }
  :global(.tp-header),
  :global(header.tp-header),
  :global(.eem-footer) {
    display: none !important;
  }
  .rp-page,
  :global(html),
  :global(body),
  :global(#main-content) {
    background: #fff !important;
  }
  .rp-sheet {
    max-width: none;
    margin: 0;
    box-shadow: none;
  }
  .rp-mast,
  .rp-mast-bar,
  .rp-letter,
  .rp-letter-sign img,
  .rp-card-link,
  .rp-facts-head,
  .rp-pull,
  .rp-news,
  .rp-card,
  .rp-q-bar span,
  .rp-dec-bar span,
  .rp-oldest,
  .rp-new-head,
  .rp-insect-kicker,
  .rp-insect-text,
  .rp-insect-media,
  .rp-back,
  .rp-note,
  .rp-stats,
  .rp-obar span {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .rp-new-grid > div,
  .rp-card,
  .rp-closer,
  .rp-stats,
  .rp-orders,
  .rp-back {
    break-inside: avoid;
  }
  /* a section title never sits alone at the bottom of a page */
  .rp-label,
  .rp-new-head,
  .rp-sublabel {
    break-after: avoid;
  }
  /* the news always starts on a fresh page */
  .rp-news {
    break-before: page;
  }
  /* the contents fill the first page; the rest starts on page 2 */
  .rp-insect {
    break-after: page;
  }
  .rp-insect-media img {
    max-height: 2.8in;
  }
  .rp-insect-body,
  .rp-pull {
    font-size: 0.92em;
  }
  /* news cards: smaller photos so 4-6 stories fit on a page */
  .rp-card-img img {
    aspect-ratio: 16 / 9;
  }
  .rp-card-lead .rp-card-img img {
    max-height: 2.6in;
    min-height: 0;
  }
  .rp-card-lead .rp-card-img {
    min-height: 0;
  }
  .rp-card-excerpt {
    font-size: 0.85rem;
  }
  .rp-card-text {
    padding: 0.7rem 0.8rem 0.8rem;
  }
  .rp-insect-text {
    padding-top: 1rem;
    padding-bottom: 1rem;
  }
  .rp-contents {
    padding-top: 1rem;
    padding-bottom: 0;
  }
  .rp-clist {
    grid-template-columns: 1fr 1fr 1fr;
    column-gap: 1.2rem;
  }
  .rp-open.has-note .rp-clist {
    grid-template-columns: 1fr;
  }
  /* the letter and its signature stay on page 2 */
  .rp-letter {
    padding: 1.3rem 1.4rem 1.2rem 1.8rem;
  }
  .rp-letter-body {
    font-size: 0.86rem;
    line-height: 1.5;
  }
  .rp-letter-body p + p {
    margin-top: 0.55rem;
  }
  .rp-letter-sign {
    break-inside: avoid;
    margin-top: 0.9rem;
  }
  .rp-open.has-note .rp-citem {
    padding: 0.35rem 0;
  }
  /* news in print: floated cards, two per row (grids and flex split badly across pages) */
  .rp-news {
    display: block;
  }
  .rp-news::after {
    content: '';
    display: block;
    clear: both;
  }
  .rp-news > .rp-label {
    margin-bottom: 0.8rem;
  }
  .rp-news .rp-card,
  .rp-news .rp-card-lead {
    display: block;
    float: left;
    width: calc(50% - 0.6rem);
    margin: 0 1.2rem 1.2rem 0;
  }
  .rp-news .rp-card:nth-of-type(odd) {
    clear: left;
  }
  .rp-news .rp-card:nth-of-type(even) {
    margin-right: 0;
  }
  .rp-news .rp-card-text {
    display: block;
    padding: 0.7rem 0.8rem 0.8rem;
  }
  /* in print every story gets the same card */
  .rp-news .rp-card-lead .rp-card-img img {
    aspect-ratio: 16 / 9;
    height: auto;
    max-height: none;
  }
  .rp-news .rp-card-lead .rp-card-title {
    font-size: 1.2rem;
  }
  .rp-citem {
    grid-template-columns: 1.4rem 1fr;
    gap: 0.5rem;
  }
  .rp-ctitle {
    font-size: 0.82rem;
  }
  .rp-cnum {
    font-size: 1.25rem;
  }
  .rp-contents .rp-cthumb {
    display: none;
  }
  .rp-contents .rp-cexcerpt {
    display: none;
  }
  .rp-citem {
    padding: 0.45rem 0;
  }
  .rp-cnum {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* Who came to the museum */
.rp-v-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
  gap: 1.5rem;
  align-items: start;
  margin-top: 1rem;
}
.rp-v-big b {
  display: block;
  font-size: 4.2rem;
  line-height: 0.95;
  font-weight: 900;
  color: #000;
}
.rp-v-big span {
  display: block;
  margin-top: 0.3rem;
  font-size: 1.05rem;
  font-weight: 700;
}
.rp-v-big small {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: #6b665c;
}
.rp-v-right {
  border-left: 5px solid #fdb719;
  padding-left: 1.1rem;
}
.rp-v-people {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 4px;
}
.rp-v-fig {
  width: 20px;
  height: 33px;
}
.rp-v-scale {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  color: #6b665c;
}
.rp-v-legend {
  list-style: none;
  margin: 0.8rem 0 0;
  padding: 0;
}
.rp-v-legend li {
  display: grid;
  grid-template-columns: 0.8rem auto 1fr;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
  border-top: 1px solid #e5e0d4;
  font-size: 0.88rem;
}
.rp-v-legend li:first-child {
  border-top: 0;
}
.rp-v-legend i {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 2px;
}
.rp-v-legend .rp-v-out {
  background: #b0562b;
}
.rp-v-people-out {
  margin-top: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px dashed #cbbd8f;
}
.rp-v-legend span {
  justify-self: end;
  color: #6b665c;
  font-size: 0.8rem;
}
.rp-v-groups {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.6rem;
  margin-top: 1.1rem;
}
.rp-v-group {
  background: #f6f4ef;
  border-left: 4px solid #000;
  padding: 0.55rem 0.8rem;
}
.rp-v-group p {
  margin: 0;
}
.rp-v-gk {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b665c;
}
.rp-v-gn {
  font-size: 0.9rem;
  margin-top: 0.15rem !important;
}
.rp-v-ga {
  font-size: 0.8rem;
  color: #555;
}
@media (max-width: 640px) {
  .rp-v-grid {
    grid-template-columns: 1fr;
  }
}
@media print {
  .rp-visits {
    break-inside: avoid;
  }
  .rp-v-big b {
    font-size: 3rem;
  }
}

.rp-v-use {
  margin-top: 1.2rem;
  background: #000;
  color: #fff;
  padding: 0.9rem 1.1rem;
}
.rp-v-use p {
  margin: 0;
}
.rp-v-use-k {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #fdb719;
}
.rp-v-use-main {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem 1.2rem;
  margin-top: 0.35rem;
}
.rp-v-use-big {
  font-size: 1.05rem;
}
.rp-v-use-big b {
  font-size: 2.2rem;
  font-weight: 900;
  color: #fdb719;
}
.rp-v-use-big span {
  display: block;
  color: #ccc;
  font-size: 0.85rem;
}
.rp-v-use-res {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.rp-v-use-res li {
  border: 1px solid #fdb719;
  padding: 0.15rem 0.5rem;
  font-size: 0.78rem;
}
.rp-v-use-res b {
  color: #fdb719;
  margin-left: 0.2rem;
}
.rp-v-use-who {
  margin-top: 0.4rem !important;
  font-size: 0.78rem;
  color: #aaa;
}
@media print {
  .rp-v-use {
    background: #fff;
    color: #000;
    border: 2px solid #000;
  }
  .rp-v-use-big span,
  .rp-v-use-who {
    color: #333;
  }
}

/* Our network grew */
.rp-net-lead {
  margin: 0.8rem 0 0;
  font-size: 1.05rem;
}
.rp-net-lead b {
  font-size: 1.6rem;
  font-weight: 900;
}
.rp-net-lead span {
  color: #6b665c;
  font-size: 0.9rem;
}
.rp-net-list {
  list-style: none;
  margin: 0.8rem 0 0.6rem;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 0.5rem;
}
.rp-net-list li {
  border-left: 4px solid #fdb719;
  padding: 0.35rem 0.7rem;
  background: #f6f4ef;
}
.rp-net-list b,
.rp-net-list span,
.rp-net-list i {
  display: block;
}
.rp-net-list span {
  font-size: 0.8rem;
  color: #444;
}
.rp-net-list i {
  font-size: 0.78rem;
  color: #8c640a;
}
@media print {
  .rp-network {
    break-inside: avoid;
  }
}
</style>
