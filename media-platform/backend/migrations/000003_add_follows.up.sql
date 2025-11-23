-- ===============================================
-- フォロー機能の追加
-- ===============================================

-- フォローテーブル
CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_follow_relationship UNIQUE (follower_id, following_id),
    CONSTRAINT check_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at DESC);

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