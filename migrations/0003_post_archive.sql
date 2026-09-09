ALTER TABLE cms_posts ADD COLUMN archived_at TEXT;
CREATE INDEX IF NOT EXISTS idx_cms_posts_archive ON cms_posts(archived_at, id DESC);
