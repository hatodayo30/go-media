-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- カテゴリテーブル
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- コンテンツテーブル
CREATE TABLE IF NOT EXISTS contents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    view_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contents_author_id ON contents(author_id);
CREATE INDEX idx_contents_category_id ON contents(category_id);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_published_at ON contents(published_at);

-- コメントテーブル
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    body TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_content_id ON comments(content_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- 評価テーブル
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id INTEGER NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_ratings_content_id ON ratings(content_id);

-- 初期データ投入（オプション）
-- 管理者ユーザーの作成
INSERT INTO users (username, email, password, role)
VALUES ('admin', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON CONFLICT (email) DO NOTHING;

-- サンプルカテゴリの作成
INSERT INTO categories (name, description)
VALUES 
    ('ニュース', 'ニュースカテゴリ'),
    ('テクノロジー', 'テクノロジーカテゴリ'),
    ('エンターテイメント', 'エンターテイメントカテゴリ'),
    ('ライフスタイル', 'ライフスタイルカテゴリ')
ON CONFLICT (name) DO NOTHING;