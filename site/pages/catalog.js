// Filters the tool catalog on the device. Without JavaScript every tool shows.

const form = document.querySelector('[data-catalog-filters]');
const cells = [...document.querySelectorAll('[data-catalog] > li')];
const empty = document.querySelector('[data-catalog-empty]');

function apply() {
  const f = Object.fromEntries(new FormData(form).entries());
  let shown = 0;
  for (const c of cells) {
    const ok = (!f.section || c.dataset.section === f.section) && (!f.needs || c.dataset.needs === f.needs) && (!f.stability || c.dataset.stability === f.stability);
    c.hidden = !ok;
    if (ok) shown++;
  }
  empty.hidden = shown > 0;
}
form.addEventListener('change', apply);
apply();
document.documentElement.dataset.ready = '1';
