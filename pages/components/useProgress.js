// Digitization progress: specimens added to TaxonWorks per month, and the year's goal.
// Counts use the date each specimen record was created in TaxonWorks.
import { makeAPIRequest } from '@/utils/request'
import { reactive } from 'vue'
import info from './museumInfo.js'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')

const state = reactive({
  loaded: false,
  months: [], // { key: '2026-10', label: 'Oct 2026', short: 'Oct', year, n, total }
  total: null
})
let started = false

async function count(from, to) {
  try {
    const { headers } = await makeAPIRequest.get('/collection_objects', {
      params: { per: 1, user_target: 'created', user_date_start: from, user_date_end: to }
    })
    return Number(headers['pagination-total']) || 0
  } catch {
    return 0
  }
}

export function useProgress() {
  if (started || import.meta.env.SSR) return state
  started = true
  load().finally(() => (state.loaded = true))
  return state
}

async function load() {
  const [sy, sm] = String(info.digitization?.since || '2026-09').split('-').map(Number)
  const now = new Date()
  const list = []
  for (let y = sy, m = sm; y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1); ) {
    const last = new Date(y, m, 0).getDate()
    list.push({ key: `${y}-${pad(m)}`, from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(last)}`, year: y, short: MONTHS[m - 1], label: `${MONTHS[m - 1]} ${y}` })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  // a few at a time
  const counts = []
  for (let i = 0; i < list.length; i += 4) {
    counts.push(...(await Promise.all(list.slice(i, i + 4).map((x) => count(x.from, x.to)))))
  }
  let running = 0
  state.months = list.map((x, i) => {
    running += counts[i]
    return { ...x, n: counts[i], total: running }
  })
  state.total = running
}

// This year's goal from museumInfo.js (digitization.goals), or null
export function goalFor(year = new Date().getFullYear()) {
  const g = Number(info.digitization?.goals?.[year])
  return g > 0 ? g : null
}

export function doneIn(year) {
  return state.months.filter((m) => m.year === year).reduce((a, m) => a + m.n, 0)
}
