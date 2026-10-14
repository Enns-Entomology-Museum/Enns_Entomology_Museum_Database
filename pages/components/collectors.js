// Museum curators and directors, so their name variants on labels
// ("R. W. Sites", "Robert W. Sites") are recognised and given a short bio.
const base = import.meta.env.BASE_URL || '/'
const img = (f) => `${base}images/history/${f}`

export const DIRECTORS = [
  {
    key: 'riley',
    match: /\b(c\.?\s*v\.?|charles(\s+v\.?)?)\s*riley\b/i,
    role: 'First curator, 1874',
    img: img('1874-riley.jpg'),
    bio: 'Charles V. Riley, Missouri’s first State Entomologist, was the museum’s first curator.'
  },
  {
    key: 'enns',
    match: /\bw(ilbur|\.)?\s*(r\.?\s*)?enns\b/i,
    role: 'Director, 1953–1978',
    img: img('1953-enns.jpg'),
    bio: 'Wilbur R. Enns directed the museum for 25 years; it has carried his name since 1980.'
  },
  {
    key: 'yonke',
    match: /\bt(homas|\.)?\s*(r\.?\s*)?yonke\b/i,
    role: 'Director, 1978–1991',
    img: img('1978-yonke.jpg'),
    bio: 'Thomas R. Yonke directed the museum for 13 years.'
  },
  {
    key: 'sites',
    match: /\br(obert|\.)?\s*(w\.?\s*)?sites\b/i,
    role: 'Director, 1991–2026',
    img: img('1991-sites.jpg'),
    bio: 'Robert W. Sites directed the museum for 35 years and built its aquatic insect holdings.'
  },
  {
    key: 'dalpos',
    match: /\bdal\s?pos\b/i,
    role: 'Director, since 2026',
    img: img('2026-dalpos.jpg'),
    bio: 'Davide Dal Pos became director in 2026.'
  }
]

export const directorOf = (name = '') => DIRECTORS.find((d) => d.match.test(name)) || null
