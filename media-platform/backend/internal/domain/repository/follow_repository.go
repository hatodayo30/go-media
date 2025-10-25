package repository

import (
	"context"
	"media-platform/internal/domain/entity"
)

// FollowRepository はフォロー関係のリポジトリインターフェースです
type FollowRepository interface {
	// Find は特定のフォロー関係をIDで取得します
	Find(ctx context.Context, id int64) (*entity.Follow, error)

	// FindByFollowerAndFollowing は特定のフォロー関係を取得します
	FindByFollowerAndFollowing(ctx context.Context, followerID, followingID int64) (*entity.Follow, error)

	// Exists はフォロー関係が存在するかチェックします
	Exists(ctx context.Context, followerID, followingID int64) (bool, error)

	// Create はフォロー関係を作成します
	Create(ctx context.Context, follow *entity.Follow) error

	// Delete はフォロー関係を削除します
	Delete(ctx context.Context, followerID, followingID int64) error

	// GetFollowers はフォロワー一覧を取得します
	GetFollowers(ctx context.Context, userID int64) ([]*entity.User, error)

	// GetFollowing はフォロー中のユーザー一覧を取得します
	GetFollowing(ctx context.Context, userID int64) ([]*entity.User, error)

	// GetFollowersCount はフォロワー数を取得します
	GetFollowersCount(ctx context.Context, userID int64) (int64, error)

	// GetFollowingCount はフォロー中の数を取得します
	GetFollowingCount(ctx context.Context, userID int64) (int64, error)

	// GetFollowStats はフォロー統計を取得します
	GetFollowStats(ctx context.Context, userID int64, currentUserID int64) (*entity.FollowStats, error)

	// GetFollowingFeed はフォロー中のユーザーのコンテンツを取得します
	GetFollowingFeed(ctx context.Context, userID int64, limit, offset int) ([]*entity.Content, error)
}
