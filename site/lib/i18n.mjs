// Message lookup and formatting (site/translation-ready). Every user-facing
// string comes from a per-locale string file keyed by message id; numbers and
// dates are formatted with Intl for the page locale.

/**
 * @param {Record<string, string | Record<string, string>>} messages
 * @param {string} locale
 */
export function createI18n(messages, locale) {
  const plural = new Intl.PluralRules(locale);
  /**
   * Look up a message and fill {name} placeholders. A message given as an
   * object of plural forms ({one, other}) is chosen by params.count.
   * @param {string} id
   * @param {Record<string, unknown>} [params]
   */
  function t(id, params = {}) {
    let m = messages[id];
    if (m === undefined) throw new Error(`missing message id "${id}" for ${locale}`);
    if (typeof m === 'object') m = m[plural.select(Number(params.count))] ?? m.other;
    return m.replace(/\{(\w+)\}/g, (_, k) => {
      if (!(k in params)) throw new Error(`message "${id}" needs a value for {${k}}`);
      return String(params[k]);
    });
  }
  const dates = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  /** @param {string} iso a YYYY-MM-DD date */
  const date = (iso) => dates.format(new Date(`${iso}T00:00:00Z`));
  return { t, date, locale, has: (id) => id in messages };
}
