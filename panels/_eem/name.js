// Plain scientific name for external services: "Belostoma flumineum"
// (drops subgenus in parentheses, authorship and HTML).
export function canonicalName(taxon = {}, otu = {}) {
  const raw =
    taxon.expanded_name ||
    taxon.name ||
    String(taxon.full_name_tag || otu.object_tag || '').replace(/<[^>]*>/g, '')
  return String(raw)
    .replace(/<[^>]*>/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+[A-Z][^\s]*,?\s*\d{4}.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—')
