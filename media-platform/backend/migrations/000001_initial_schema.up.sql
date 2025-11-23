-- ===============================================
-- 初期スキーマ: ユーザー、カテゴリ、コンテンツ
-- ===============================================

-- ユーザーテーブル
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar VARCHAR(255) NOT NULL DEFAULT '',
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- カテゴリテーブル
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- コンテンツテーブル
CREATE TABLE contents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    view_count BIGINT NOT NULL DEFAULT 0,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 趣味投稿プラットフォーム用フィールド
    work_title VARCHAR(255),
    rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
    recommendation_level VARCHAR(20) CHECK (recommendation_level IN ('必見', 'おすすめ', '普通', 'イマイチ', '')),
    tags TEXT[],
    image_url VARCHAR(500),
    external_url VARCHAR(500),
    release_year INTEGER,
    artist_name VARCHAR(255),
    genre VARCHAR(100)
);

-- コンテンツのインデックス
CREATE INDEX idx_contents_author_id ON contents(author_id);
CREATE INDEX idx_contents_category_id ON contents(category_id);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_contents_published_at ON contents(published_at);
CREATE INDEX idx_contents_type ON contents(type);

-- 初期カテゴリデータ
INSERT INTO categories (name, description) VALUES
    ('音楽', '音楽に関する投稿・おすすめ'),
    ('ゲーム', 'ゲームに関する投稿・おすすめ'),
    ('映画', '映画に関する投稿・おすすめ'),
    ('アニメ', 'アニメに関する投稿・おすすめ'),
    ('漫画', '漫画に関する投稿・おすすめ');

-- 管理者ユーザー (パスワード: admin123)
INSERT INTO users (username, email, password, role, bio)
VALUES (
    'admin',
    'admin@example.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'admin',
    'システム管理者'
);