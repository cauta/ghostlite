ALTER TABLE posts ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_posts_featured ON posts(featured, published_at DESC) WHERE status = 'published';
