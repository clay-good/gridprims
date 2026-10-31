// Request checks shared by the privacy and workbench browser tests.

/** Requests that leave our origin. @param {string[]} requests @param {string} origin */
export const foreign = (requests, origin) => requests.filter((u) => !u.startsWith(origin) && !/^(data|blob|about):/.test(u));

/** Logged requests whose URL, headers, or body carry a sentinel (with or without its decimal point). */
export const leaks = (log, sentinel) => log.filter((r) => [r.url, JSON.stringify(r.headers), r.body].some((x) => String(x).includes(sentinel) || String(x).includes(sentinel.replace('.', ''))));
