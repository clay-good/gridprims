-- D1 schema for problem reports (docs/decisions-day-one.md §7). Rate-limit
-- counters live in the host's rate-limiting binding, never in this table.
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  received_at TEXT NOT NULL,
  closed_at TEXT,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS reports_received ON reports (received_at);
