CREATE VIRTUAL TABLE posts_fts USING fts5(
  post_id UNINDEXED,
  title,
  excerpt
);

-- Backfill existing published posts
INSERT INTO posts_fts(post_id, title, excerpt)
SELECT id, title, COALESCE(excerpt, '') FROM posts WHERE status = 'published';

-- Keep FTS in sync with posts table
CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(post_id, title, excerpt)
  VALUES (new.id, new.title, COALESCE(new.excerpt, ''));
END;

CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  DELETE FROM posts_fts WHERE post_id = old.id;
  INSERT INTO posts_fts(post_id, title, excerpt)
  VALUES (new.id, new.title, COALESCE(new.excerpt, ''));
END;

CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  DELETE FROM posts_fts WHERE post_id = old.id;
END;
