// Learn explainers resolved at build (add-learn-and-data-guides: guides): each
// {placeholder} in an explainer's text is filled from the figure its module
// generates from a registered dataset, and every figure carries its source.

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * @param {any} explainer a record from data/curated/explainers
 * @param {any} ctx the build's data: peaks, balancing, utilities, ledger
 * @returns {{summary: string, sections: Array<{heading: string, paragraphs: string[]}>, tryIt: {href: string, label: string}, sources: Array<{figure: string, display: string, source: string}>}}
 */
export function resolveExplainer(explainer, ctx) {
  const figures = explainer.figures ? explainer.figures(ctx) : {};
  const used = new Set();
  const fill = (text) => text.replace(PLACEHOLDER, (_, name) => {
    if (!figures[name]) throw new Error(`explainer ${explainer.id}: {${name}} has no generated figure`);
    used.add(name);
    return figures[name].display;
  });
  return {
    summary: fill(explainer.summary),
    sections: explainer.sections.map((s) => ({ heading: s.heading, paragraphs: s.paragraphs.map(fill) })),
    tryIt: { href: fill(explainer.tryIt.href), label: explainer.tryIt.label },
    sources: [...used].filter((n) => n !== 'tryIt').map((n) => ({ figure: n, display: figures[n].display, source: figures[n].source })),
  };
}
