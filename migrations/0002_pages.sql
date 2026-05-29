ALTER TABLE posts ADD COLUMN type TEXT NOT NULL DEFAULT 'post' CHECK(type IN ('post', 'page'));
