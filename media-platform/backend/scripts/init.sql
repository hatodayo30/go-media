-- ===============================================
-- メディアプラットフォーム用データベーススキーマ（修正版）
-- ===============================================

-- 必要な拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===============================================
-- ユーザーテーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ===============================================
-- カテゴリテーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ===============================================
-- コンテンツテーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS contents (
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
    genre VARCHAR(100),
    
    -- 全文検索用カラム
    search_vector tsvector
);

-- 基本インデックス
CREATE INDEX IF NOT EXISTS idx_contents_author_id ON contents(author_id);
CREATE INDEX IF NOT EXISTS idx_contents_category_id ON contents(category_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_published_at ON contents(published_at);

-- 趣味投稿用インデックス
CREATE INDEX IF NOT EXISTS idx_contents_rating ON contents(rating DESC) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contents_tags ON contents USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_contents_recommendation ON contents(recommendation_level) WHERE recommendation_level != '';
CREATE INDEX IF NOT EXISTS idx_contents_release_year ON contents(release_year DESC) WHERE release_year IS NOT NULL;

-- 検索機能用インデックス
CREATE INDEX IF NOT EXISTS idx_contents_search_vector ON contents USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_contents_title_trgm ON contents USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contents_body_trgm ON contents USING gin(body gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contents_search_ranking ON contents (status, published_at DESC, view_count DESC)
    WHERE status = 'published' AND published_at <= NOW();
CREATE INDEX IF NOT EXISTS idx_contents_category_published ON contents (category_id, published_at DESC, status)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_contents_author_published ON contents (author_id, published_at DESC, status)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_contents_author_published_status ON contents (author_id, published_at DESC, status) 
    WHERE status = 'published';

-- ===============================================
-- フォロー機能テーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL,
    following_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_follows_follower 
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follows_following 
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_follow_relationship 
        UNIQUE (follower_id, following_id),
    CONSTRAINT check_no_self_follow 
        CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following_id_created_at ON follows (following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id_created_at ON follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows (follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows (following_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows (created_at DESC);

-- ===============================================
-- フォロー通知設定テーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS follow_notification_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    new_follower_notification BOOLEAN NOT NULL DEFAULT TRUE,
    following_post_notification BOOLEAN NOT NULL DEFAULT TRUE,
    mutual_follow_notification BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_follow_notifications_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===============================================
-- いいね機能テーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS ratings (
    id BIGSERIAL PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 1 CHECK (value = 1),
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_content_id ON ratings(content_id);

-- ===============================================
-- コメントテーブル
-- ===============================================
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    body TEXT NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_content_id ON comments(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- ===============================================
-- ビュー定義
-- ===============================================

-- いいね統計用ビュー
CREATE OR REPLACE VIEW like_stats AS
SELECT 
    content_id,
    COUNT(*) as like_count
FROM ratings 
GROUP BY content_id;

-- フォロー統計用ビュー
CREATE OR REPLACE VIEW user_follow_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(followers.count, 0) as followers_count,
    COALESCE(following.count, 0) as following_count,
    u.created_at as user_created_at
FROM users u
LEFT JOIN (
    SELECT following_id, COUNT(*) as count
    FROM follows 
    GROUP BY following_id
) followers ON u.id = followers.following_id
LEFT JOIN (
    SELECT follower_id, COUNT(*) as count
    FROM follows 
    GROUP BY follower_id
) following ON u.id = following.follower_id;

-- フォロー中ユーザーの最新投稿用ビュー
CREATE OR REPLACE VIEW following_feed_contents AS
SELECT 
    f.follower_id,
    c.id as content_id,
    c.title,
    c.body,
    c.type,
    c.author_id,
    c.category_id,
    c.status,
    c.view_count,
    c.published_at,
    c.created_at,
    c.updated_at,
    u.username as author_name,
    cat.name as category_name
FROM follows f
INNER JOIN contents c ON f.following_id = c.author_id
LEFT JOIN users u ON c.author_id = u.id
LEFT JOIN categories cat ON c.category_id = cat.id
WHERE c.status = 'published' 
    AND c.published_at <= NOW();

-- コンテンツ検索用ビュー
CREATE OR REPLACE VIEW content_search_view AS
SELECT 
    c.id,
    c.title,
    c.body,
    c.type,
    c.author_id,
    c.category_id,
    c.status,
    c.view_count,
    c.published_at,
    c.created_at,
    c.updated_at,
    c.search_vector,
    u.username as author_name,
    cat.name as category_name,
    CASE 
        WHEN c.view_count > 1000 THEN 3
        WHEN c.view_count > 100 THEN 2
        WHEN c.view_count > 10 THEN 1
        ELSE 0
    END as popularity_score,
    CASE 
        WHEN c.published_at > NOW() - INTERVAL '7 days' THEN 3
        WHEN c.published_at > NOW() - INTERVAL '30 days' THEN 2
        WHEN c.published_at > NOW() - INTERVAL '90 days' THEN 1
        ELSE 0
    END as freshness_score
FROM contents c
LEFT JOIN users u ON c.author_id = u.id
LEFT JOIN categories cat ON c.category_id = cat.id
WHERE c.status = 'published' 
    AND c.published_at <= NOW();

-- ===============================================
-- トリガー関数
-- ===============================================

-- 検索ベクター自動更新関数
CREATE OR REPLACE FUNCTION update_contents_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contents_search_vector ON contents;
CREATE TRIGGER trigger_update_contents_search_vector
    BEFORE INSERT OR UPDATE OF title, body ON contents
    FOR EACH ROW
    EXECUTE FUNCTION update_contents_search_vector();

-- フォロー関係バリデーション関数
CREATE OR REPLACE FUNCTION validate_follow_relationship()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.follower_id = NEW.following_id THEN
        RAISE EXCEPTION '自分自身をフォローすることはできません';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.follower_id) THEN
        RAISE EXCEPTION 'フォローするユーザーが存在しません';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.following_id) THEN
        RAISE EXCEPTION 'フォロー対象のユーザーが存在しません';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_follow_relationship ON follows;
CREATE TRIGGER trigger_validate_follow_relationship
    BEFORE INSERT OR UPDATE ON follows
    FOR EACH ROW
    EXECUTE FUNCTION validate_follow_relationship();

-- フォロー通知設定デフォルト値挿入関数
CREATE OR REPLACE FUNCTION create_default_follow_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO follow_notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_follow_settings ON users;
CREATE TRIGGER trigger_create_default_follow_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_follow_settings();

-- ===============================================
-- ストアドプロシージャ・関数
-- ===============================================

-- タグ検索関数
CREATE OR REPLACE FUNCTION search_contents_by_tag(tag_query TEXT)
RETURNS TABLE (
    id BIGINT,
    title VARCHAR(255),
    work_title VARCHAR(255),
    rating DECIMAL(2,1),
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.work_title,
        c.rating,
        c.tags
    FROM contents c
    WHERE c.status = 'published'
        AND c.tags @> ARRAY[tag_query]
    ORDER BY c.published_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 高評価コンテンツ取得関数
CREATE OR REPLACE FUNCTION get_top_rated_contents(
    min_rating DECIMAL DEFAULT 4.0,
    content_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    title VARCHAR(255),
    work_title VARCHAR(255),
    rating DECIMAL(2,1),
    recommendation_level VARCHAR(20),
    view_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.work_title,
        c.rating,
        c.recommendation_level,
        c.view_count
    FROM contents c
    WHERE c.status = 'published'
        AND c.rating >= min_rating
    ORDER BY c.rating DESC, c.view_count DESC
    LIMIT content_limit;
END;
$$ LANGUAGE plpgsql;

-- コンテンツ検索関数（関連性スコア付き）
CREATE OR REPLACE FUNCTION search_contents(
    search_query TEXT,
    search_limit INTEGER DEFAULT 10,
    search_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id BIGINT,
    title VARCHAR(255),
    body TEXT,
    type VARCHAR(20),
    author_id BIGINT,
    category_id BIGINT,
    status VARCHAR(20),
    view_count BIGINT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.body,
        c.type,
        c.author_id,
        c.category_id,
        c.status,
        c.view_count,
        c.published_at,
        c.created_at,
        c.updated_at,
        (
            ts_rank(c.search_vector, plainto_tsquery('simple', search_query)) * 10 +
            CASE WHEN LOWER(c.title) = LOWER(search_query) THEN 50 ELSE 0 END +
            CASE WHEN c.title ILIKE '%' || search_query || '%' THEN 20 ELSE 0 END +
            CASE 
                WHEN c.view_count > 1000 THEN 5
                WHEN c.view_count > 100 THEN 3
                WHEN c.view_count > 10 THEN 1
                ELSE 0
            END +
            CASE 
                WHEN c.published_at > NOW() - INTERVAL '7 days' THEN 3
                WHEN c.published_at > NOW() - INTERVAL '30 days' THEN 2
                ELSE 0
            END
        )::REAL as relevance_score
    FROM contents c
    WHERE c.status = 'published'
        AND c.published_at <= NOW()
        AND (
            c.search_vector @@ plainto_tsquery('simple', search_query)
            OR c.title ILIKE '%' || search_query || '%'
            OR c.body ILIKE '%' || search_query || '%'
        )
    ORDER BY relevance_score DESC, c.view_count DESC, c.published_at DESC
    LIMIT search_limit
    OFFSET search_offset;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- 初期データ投入
-- ===============================================

-- カテゴリデータ（趣味投稿プラットフォーム用）
INSERT INTO categories (name, description) VALUES
    ('音楽', '音楽に関する投稿・おすすめ'),
    ('アニメ', 'アニメに関する投稿・おすすめ'),
    ('漫画', '漫画に関する投稿・おすすめ'),
    ('映画', '映画に関する投稿・おすすめ'),
    ('ゲーム', 'ゲームに関する投稿・おすすめ'),
    ('ニュース', 'ニュースカテゴリ'),
    ('テクノロジー', 'テクノロジーカテゴリ'),
    ('エンターテイメント', 'エンターテイメントカテゴリ'),
    ('ライフスタイル', 'ライフスタイルカテゴリ')
ON CONFLICT (name) DO NOTHING;

-- 管理者ユーザー
INSERT INTO users (username, email, password, role, bio, avatar)
VALUES ('admin', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'システム管理者', '')
ON CONFLICT (email) DO NOTHING;

-- テストユーザー（開発環境用）
INSERT INTO users (username, email, password, role, bio)
VALUES 
    ('testuser1', 'test1@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', 'テストユーザー1'),
    ('testuser2', 'test2@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', 'テストユーザー2'),
    ('testuser3', 'test3@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', 'テストユーザー3')
ON CONFLICT (email) DO NOTHING;

-- テスト用フォロー関係（開発環境用）
INSERT INTO follows (follower_id, following_id)
SELECT 
    (SELECT id FROM users WHERE username = 'testuser1'),
    (SELECT id FROM users WHERE username = 'testuser2')
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'testuser1')
    AND EXISTS (SELECT 1 FROM users WHERE username = 'testuser2')
ON CONFLICT (follower_id, following_id) DO NOTHING;

INSERT INTO follows (follower_id, following_id)
SELECT 
    (SELECT id FROM users WHERE username = 'testuser1'),
    (SELECT id FROM users WHERE username = 'testuser3')
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'testuser1')
    AND EXISTS (SELECT 1 FROM users WHERE username = 'testuser3')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- ===============================================
-- 既存データの検索ベクター初期化
-- ===============================================
UPDATE contents 
SET search_vector = 
    setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(body, '')), 'B')
WHERE search_vector IS NULL;

-- ===============================================
-- 統計情報更新
-- ===============================================
VACUUM ANALYZE users;
VACUUM ANALYZE categories;
VACUUM ANALYZE contents;
VACUUM ANALYZE follows;
VACUUM ANALYZE ratings;
VACUUM ANALYZE comments;

-- ===============================================
-- 完了メッセージ
-- ===============================================
SELECT 
    'メディアプラットフォームデータベーススキーマが正常に作成されました' as status,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM categories) as categories_count,
    (SELECT COUNT(*) FROM follows) as follows_count;