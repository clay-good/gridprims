// Changes to curated figures already published (add-trust-and-continuity
// task 2.3, "Changes publish at once, and stay open to comment"). A record's
// published values are snapshotted; a value that differs from the snapshot is
// a change. The change publishes on the build that carries it, and is logged
// with its date, its old and new values, and the sources behind the new one.
// The terms page keeps the old value visible, and the corrections page and
// feed announce it, with comments open for at least 30 days. Nothing waits on
// a person: the log is written by a script, and a gate fails a build whose
// published values moved without one.

export const COMMENT_DAYS = 30;
const DAY = 86_400_000;

/** Every published value of every record, by "record.field". */
export function publishedValues(entries) {
  const out = {};
  for (const e of entries) for (const [k, f] of Object.entries(e.fields)) if (f.value !== null && f.value !== undefined) out[`${e.id}.${k}`] = f.value;
  return out;
}

/**
 * What moved since the snapshot: a published value that changed (a correction), or that is no longer
 * published (a withdrawal). A value published for the first time is not a correction.
 * @param {Record<string, string>} snapshot @param {Record<string, string>} now
 */
export function diffPublished(snapshot, now) {
  const changes = [];
  for (const [key, old] of Object.entries(snapshot)) {
    if (!(key in now)) changes.push({ key, kind: 'withdrawal', old, new: null });
    else if (now[key] !== old) changes.push({ key, kind: 'correction', old, new: now[key] });
  }
  return changes.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * The log entries a set of changes adds, dated today, each with the sources the new value rests on.
 * @param {ReturnType<typeof diffPublished>} changes @param {any[]} entries the records as the terms page reads them
 * @param {string} today YYYY-MM-DD @param {Record<string, string>} [causes] a stated cause by key, for a withdrawal
 */
export function logEntries(changes, entries, today, causes = {}) {
  return changes.map((c) => {
    const [record, field] = c.key.split('.');
    const e = entries.find((x) => x.id === record);
    const sources = c.kind === 'correction' ? (e?.fields[field]?.citations ?? []).map((s) => ({ publisher: s.publisher, url: s.url, archive: s.archive })) : [];
    return { date: today, record, field, name: e?.name ?? record, kind: c.kind, old: c.old, new: c.new, sources, ...(causes[c.key] ? { cause: causes[c.key] } : {}) };
  });
}

/** The day comments on a change close: at least 30 days after it published. */
export const commentsUntil = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + COMMENT_DAYS * DAY).toISOString().slice(0, 10);

/** The latest logged change to one field, for the page that shows the old value beside the new. */
export const lastChange = (log, record, field) => log.filter((c) => c.record === record && c.field === field).sort((a, b) => a.date.localeCompare(b.date)).at(-1) ?? null;

/** The corrections page's entries for the log, newest first, each with both values, its sources, and when comments close. */
export function correctionEntries(log) {
  return log.map((c) => ({
    date: c.date, tier: c.kind, subject: `${c.name}, ${c.field}`, sample: { input: c.field, old: c.old, new: c.new ?? '(removed)' },
    cause: c.kind === 'correction' ? `changed on ${c.sources.length} archived primary ${c.sources.length === 1 ? 'source' : 'sources'} from ${[...new Set(c.sources.map((x) => x.publisher))].join(' and ')}.` : `${c.cause ?? 'removed from publication'}.`,
    sources: c.sources.map((x) => x.url), comments: commentsUntil(c.date),
  }));
}

/** Keep each corrected field's previous value beside the new one, for the terms page. */
export function attachPrevious(entries, log) {
  for (const e of entries) for (const [k, f] of Object.entries(e.fields)) { const c = lastChange(log, e.id, k); if (c && c.kind === 'correction') f.was = { date: c.date, old: c.old }; }
  return entries;
}
