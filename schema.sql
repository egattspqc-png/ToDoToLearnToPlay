DROP TABLE IF EXISTS items;

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('todo','learn','play')),
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  start_date TEXT,
  due_date TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  link TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_items_category ON items(category);
