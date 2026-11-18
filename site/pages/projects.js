// Narrows the project list already on the page (projects/pipeline-pages). Every
// row is in the served HTML, so filtering sends nothing over the network and the
// full list stays readable with JavaScript off.

const root = document.querySelector('[data-projects]');
const form = root?.querySelector('[data-project-filters]');
if (root && form) {
  const rows = [...root.querySelectorAll('tbody tr')];
  const count = root.querySelector('[data-project-count]');
  const clear = root.querySelector('[data-project-clear]');
  const table = root.querySelector('[data-project-table]');

  const matches = (tr, f) => (!f.stage || tr.dataset.stage === f.stage)
    && (!f.tech || tr.dataset.tech.split('|').includes(f.tech))
    && (!f.county || tr.dataset.county === f.county)
    && (!f.ba || tr.dataset.ba === f.ba)
    && (!f.size || Number(tr.dataset.mw) >= Number(f.size));

  function apply() {
    const f = Object.fromEntries(new FormData(form));
    let shown = 0;
    let mw = 0;
    for (const tr of rows) {
      const on = matches(tr, f);
      tr.hidden = !on;
      if (on) { shown += 1; mw += Number(tr.dataset.mw); }
    }
    table.hidden = shown === 0;
    clear.hidden = !Object.values(f).some(Boolean);
    const line = shown === 0 ? count.dataset.none : shown === 1 ? count.dataset.one : count.dataset.other;
    count.textContent = line.replace('{shown}', shown.toLocaleString('en-US')).replace('{mw}', Math.round(mw).toLocaleString('en-US'));
  }

  form.addEventListener('change', apply);
  form.addEventListener('submit', (e) => e.preventDefault());
  clear.addEventListener('click', () => {
    form.reset();
    apply();
    form.querySelector('select').focus();
  });
  form.hidden = false;
  root.dataset.ready = 'true';
}
