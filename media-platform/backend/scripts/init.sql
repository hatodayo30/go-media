-- ユーザーテーブル
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

-- カテゴリテーブル
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- コンテンツテーブル
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
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contents_author_id ON contents(author_id);
CREATE INDEX IF NOT EXISTS idx_contents_category_id ON contents(category_id);
CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status);
CREATE INDEX IF NOT EXISTS idx_contents_published_at ON contents(published_at);

-- ===============================================
-- 検索機能強化のための追加・修正
-- ===============================================

-- 1. 全文検索用のカラムを追加
ALTER TABLE contents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. 全文検索用のGINインデックス作成（日本語対応）
CREATE INDEX IF NOT EXISTS idx_contents_search_vector 
    ON contents USING gin(search_vector);

-- 3. title と body の部分一致検索用のトライグラムインデックス（日本語に強い）
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_contents_title_trgm 
    ON contents USING gin(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_contents_body_trgm 
    ON contents USING gin(body gin_trgm_ops);

-- 4. 複合検索用のインデックス（ステータス + 日付 + 閲覧数）
CREATE INDEX IF NOT EXISTS idx_contents_search_ranking 
    ON contents (status, published_at DESC, view_count DESC)
    WHERE status = 'published' AND published_at <= NOW();

-- 5. カテゴリ別検索の最適化
CREATE INDEX IF NOT EXISTS idx_contents_category_published 
    ON contents (category_id, published_at DESC, status)
    WHERE status = 'published';

-- 6. 著者別検索の最適化
CREATE INDEX IF NOT EXISTS idx_contents_author_published 
    ON contents (author_id, published_at DESC, status)
    WHERE status = 'published';

-- ===============================================
-- 検索ベクター自動更新のトリガー
-- ===============================================

-- 検索ベクター更新関数（日本語対応版）
CREATE OR REPLACE FUNCTION update_contents_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- title の重み: A (最高), body の重み: B (次点)
    NEW.search_vector = 
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーを削除して再作成
DROP TRIGGER IF EXISTS trigger_update_contents_search_vector ON contents;

CREATE TRIGGER trigger_update_contents_search_vector
    BEFORE INSERT OR UPDATE OF title, body ON contents
    FOR EACH ROW
    EXECUTE FUNCTION update_contents_search_vector();

-- ===============================================
-- 既存データの検索ベクター初期化
-- ===============================================

-- 既存の全コンテンツの検索ベクターを更新
UPDATE contents 
SET search_vector = 
    setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(body, '')), 'B')
WHERE search_vector IS NULL;

-- ===============================================
-- 検索用のビューとヘルパー関数
-- ===============================================

-- コンテンツの検索スコア付きビュー
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
    -- 人気度スコア計算
    CASE 
        WHEN c.view_count > 1000 THEN 3
        WHEN c.view_count > 100 THEN 2
        WHEN c.view_count > 10 THEN 1
        ELSE 0
    END as popularity_score,
    -- 新鮮度スコア計算（最近の投稿ほど高スコア）
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

-- 検索関数（関連性スコア付き）
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
        -- 関連性スコア計算
        (
            -- 全文検索スコア（最重要）
            ts_rank(c.search_vector, plainto_tsquery('simple', search_query)) * 10 +
            -- タイトル完全一致ボーナス
            CASE WHEN LOWER(c.title) = LOWER(search_query) THEN 50 ELSE 0 END +
            -- タイトル部分一致ボーナス
            CASE WHEN c.title ILIKE '%' || search_query || '%' THEN 20 ELSE 0 END +
            -- 人気度ボーナス
            CASE 
                WHEN c.view_count > 1000 THEN 5
                WHEN c.view_count > 100 THEN 3
                WHEN c.view_count > 10 THEN 1
                ELSE 0
            END +
            -- 新鮮度ボーナス
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
-- 検索パフォーマンス最適化
-- ===============================================

-- VACUUMとANALYZEで統計情報を更新
VACUUM ANALYZE contents;

-- インデックスの再構築（断片化解消）
REINDEX TABLE contents;

-- ===============================================
-- 検索機能のテストクエリ
-- ===============================================

-- テスト1: 基本的な検索
-- SELECT * FROM search_contents('テクノロジー', 10, 0);

-- テスト2: 部分一致検索
-- SELECT id, title, view_count FROM contents 
-- WHERE title ILIKE '%ニュース%' OR body ILIKE '%ニュース%'
-- ORDER BY view_count DESC LIMIT 10;

-- テスト3: 全文検索（トライグラム）
-- SELECT id, title, similarity(title, 'テクノロジー') as sim
-- FROM contents
-- WHERE title % 'テクノロジー'
-- ORDER BY sim DESC LIMIT 10;

-- 完了メッセージ
SELECT 
    '検索機能強化が完了しました' as status,
    (SELECT COUNT(*) FROM contents WHERE search_vector IS NOT NULL) as indexed_contents_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'contents') as index_count;
    
-- ===============================================
-- フォロー機能テーブル
-- ===============================================

-- フォロー関係テーブル
CREATE TABLE IF NOT EXISTS follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL,     -- フォローする人のユーザーID
    following_id BIGINT NOT NULL,    -- フォローされる人のユーザーID
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    CONSTRAINT fk_follows_follower 
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follows_following 
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 重複フォロー防止のユニーク制約
    CONSTRAINT unique_follow_relationship 
        UNIQUE (follower_id, following_id),
    
    -- 自己フォロー防止のチェック制約
    CONSTRAINT check_no_self_follow 
        CHECK (follower_id != following_id)
);

-- フォロー機能専用インデックス
-- フォロワー検索用（誰が特定のユーザーをフォローしているか）
CREATE INDEX IF NOT EXISTS idx_follows_following_id_created_at 
    ON follows (following_id, created_at DESC);

-- フォロー中検索用（特定のユーザーが誰をフォローしているか）
CREATE INDEX IF NOT EXISTS idx_follows_follower_id_created_at 
    ON follows (follower_id, created_at DESC);

-- フォロー関係の高速検索用
CREATE INDEX IF NOT EXISTS idx_follows_follower_following 
    ON follows (follower_id, following_id);

-- フォロー統計計算用
CREATE INDEX IF NOT EXISTS idx_follows_follower_id 
    ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id 
    ON follows (following_id);

-- フォロー通知設定テーブル（将来拡張用）
CREATE TABLE IF NOT EXISTS follow_notification_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    new_follower_notification BOOLEAN NOT NULL DEFAULT TRUE,
    following_post_notification BOOLEAN NOT NULL DEFAULT TRUE,
    mutual_follow_notification BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 外部キー制約
    CONSTRAINT fk_follow_notifications_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===============================================
-- いいね機能テーブル（修正版）
-- ===============================================

-- 既存のratingsテーブルとビューを完全削除
DROP VIEW IF EXISTS rating_stats CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;

-- 新しいいいね専用テーブル
CREATE TABLE ratings (
    id BIGSERIAL PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 1 CHECK (value = 1), -- いいね(1)のみ許可
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id BIGINT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, content_id)
);

-- インデックス作成（いいね専用最適化）
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_content_id ON ratings(content_id);

-- コメントテーブル
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
-- ビューとトリガー関数
-- ===============================================

-- いいね統計用ビュー（シンプル版）
CREATE OR REPLACE VIEW like_stats AS
SELECT 
    content_id,
    COUNT(*) as like_count
FROM ratings 
GROUP BY content_id;

-- フォロー統計用ビュー（パフォーマンス向上のため）
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

-- フォロー中ユーザーの最新投稿用ビュー（フィード生成用）
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

-- フォロー関係の制約確認用関数
CREATE OR REPLACE FUNCTION validate_follow_relationship()
RETURNS TRIGGER AS $$
BEGIN
    -- 自己フォローのチェック
    IF NEW.follower_id = NEW.following_id THEN
        RAISE EXCEPTION '自分自身をフォローすることはできません';
    END IF;
    
    -- ユーザーの存在チェック
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.follower_id) THEN
        RAISE EXCEPTION 'フォローするユーザーが存在しません';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.following_id) THEN
        RAISE EXCEPTION 'フォロー対象のユーザーが存在しません';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- フォロー関係バリデーショントリガー
DROP TRIGGER IF EXISTS trigger_validate_follow_relationship ON follows;
CREATE TRIGGER trigger_validate_follow_relationship
    BEFORE INSERT OR UPDATE ON follows
    FOR EACH ROW
    EXECUTE FUNCTION validate_follow_relationship();

-- フォロー通知設定のデフォルト値を挿入するトリガー
CREATE OR REPLACE FUNCTION create_default_follow_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO follow_notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_follow_settings ON users;
CREATE TRIGGER trigger_create_default_follow_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_follow_settings();

-- ===============================================
-- パフォーマンス最適化インデックス
-- ===============================================

-- フォロー中ユーザーのコンテンツを効率的に取得するための複合インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contents_author_published_status 
    ON contents (author_id, published_at DESC, status) 
    WHERE status = 'published';

-- フォロー作成日時でのソート用
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_follows_created_at 
    ON follows (created_at DESC);

-- ===============================================
-- 初期データ投入
-- ===============================================

-- 管理者ユーザー
INSERT INTO users (username, email, password, role, bio, avatar)
VALUES ('admin', 'admin@example.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'システム管理者', '')
ON CONFLICT (email) DO NOTHING;

-- カテゴリデータ
INSERT INTO categories (name, description)
VALUES 
    ('ニュース', 'ニュースカテゴリ'),
    ('テクノロジー', 'テクノロジーカテゴリ'),
    ('エンターテイメント', 'エンターテイメントカテゴリ'),
    ('ライフスタイル', 'ライフスタイルカテゴリ')
ON CONFLICT (name) DO NOTHING;

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
-- 統計情報更新とクリーンアップ
-- ===============================================

-- データベースの統計情報更新
ANALYZE users;
ANALYZE categories;
ANALYZE contents;
ANALYZE follows;
ANALYZE ratings;
ANALYZE comments;

-- 完了メッセージ
SELECT 
    'メディアプラットフォームデータベーススキーマ（int64統一版）が正常に作成されました' as status,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM categories) as categories_count,
    (SELECT COUNT(*) FROM follows) as follows_count;