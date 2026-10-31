// A page-side accessibility audit (DESIGN.md "Accessibility and mobile gates";
// foundation task 8.5). Structural checks a machine can make reliably; the
// returned list is empty when the page passes.

const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';
const name = (el) => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) || el.textContent || el.getAttribute('title') || '').trim();

export function audit() {
  const problems = [];
  const where = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${el.className && typeof el.className === 'string' ? `.${el.className.split(' ')[0]}` : ''}`;
  if (!document.documentElement.lang) problems.push('html has no lang');
  if (!document.title.trim()) problems.push('page has no title');
  if (!document.querySelector('main')) problems.push('no main landmark');
  const h1s = [...document.querySelectorAll('h1')].filter(visible);
  if (h1s.length !== 1) problems.push(`${h1s.length} visible h1 elements`);
  let last = 0;
  for (const h of [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((x) => visible(x) && !x.closest('dialog'))) {
    const level = Number(h.tagName[1]);
    if (last && level > last + 1) problems.push(`heading jumps from h${last} to h${level}: "${h.textContent.trim().slice(0, 40)}"`);
    last = level;
  }
  for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (el.closest('[aria-hidden=true]')) continue;
    const labelled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label');
    if (!labelled) problems.push(`${where(el)} has no label`);
  }
  for (const el of document.querySelectorAll('button, a[href], summary, [role=button]')) {
    if (!visible(el) || el.closest('[aria-hidden=true]')) continue;
    if (!name(el)) problems.push(`${where(el)} has no accessible name`);
    // Target size: 24 by 24 at least, except links inside running text (WCAG 2.2, 2.5.8 inline exception).
    const inline = el.tagName === 'A' && el.closest('p, li, td, th, dd, figcaption, blockquote') && !el.classList.contains('button') && !el.classList.contains('handoff');
    const r = el.getBoundingClientRect();
    if (!inline && (r.width < 24 || r.height < 24)) problems.push(`${where(el)} target is ${Math.round(r.width)}×${Math.round(r.height)}, under 24×24`);
  }
  for (const svg of document.querySelectorAll('svg[role=img]')) if (!svg.getAttribute('aria-label')) problems.push('an svg image has no aria-label');
  for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) problems.push(`${where(img)} has no alt`);
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) problems.push(`duplicate id "${id}"`);
  return problems;
}
