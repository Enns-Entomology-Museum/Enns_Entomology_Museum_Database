// Makes web addresses and DOIs inside a citation clickable.
//   "… https://example.org/paper.pdf"  → link
//   "… doi: 10.1234/abcd" or "10.1234/abcd" → link to https://doi.org/10.1234/abcd
// Text already inside a link is left alone; HTML tags (italics etc.) are kept.
const PATTERN =
  /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:)\]])|((?:doi:\s*)?)(10\.\d{4,9}\/[^\s<>"']+[^\s<>"'.,;:)\]])/gi

function linkText(text) {
  return text.replace(PATTERN, (whole, url, prefix, doi, offset, all) => {
    if (url) return `<a href="${url}" target="_blank" rel="noopener" class="eem-link">${url}</a>`
    // a DOI already written as part of a doi.org address was handled as a URL above
    if (/doi\.org\/$/i.test(all.slice(0, offset))) return whole
    return `${prefix}<a href="https://doi.org/${doi}" target="_blank" rel="noopener" class="eem-link">${doi}</a>`
  })
}

export function linkify(html = '') {
  let insideLink = 0
  return String(html)
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<a\b/i.test(part)) insideLink++
        else if (/^<\/a>/i.test(part)) insideLink = Math.max(0, insideLink - 1)
        return part
      }
      return insideLink ? part : linkText(part)
    })
    .join('')
}
