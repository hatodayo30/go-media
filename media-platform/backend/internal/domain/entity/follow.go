package entity

import (
	"time"

	domainErrors "media-platform/internal/domain/errors"
)

// Follow はフォロー関係を表すエンティティです
type Follow struct {
	ID          int64
	FollowerID  int64 // フォローする人
	FollowingID int64 // フォローされる人
	CreatedAt   time.Time
}

// NewFollow は新しいフォロー関係を作成します
func NewFollow(followerID, followingID int64) (*Follow, error) {
	follow := &Follow{
		FollowerID:  followerID,
		FollowingID: followingID,
		CreatedAt:   time.Now(),
	}

	if err := follow.Validate(); err != nil {
		return nil, err
	}

	return follow, nil
}

// Validate はフォロー関係のドメインルールを検証します
func (f *Follow) Validate() error {
	if f.FollowerID == 0 {
		return domainErrors.NewValidationError("フォローするユーザーIDは必須です")
	}

	if f.FollowingID == 0 {
		return domainErrors.NewValidationError("フォロー対象のユーザーIDは必須です")
	}

	// 自己フォローの禁止
	if f.FollowerID == f.FollowingID {
		return domainErrors.NewValidationError("自分自身をフォローすることはできません")
	}

	return nil
}

// IsSelfFollow は自己フォローかどうかを返します
func (f *Follow) IsSelfFollow() bool {
	return f.FollowerID == f.FollowingID
}

// FollowStats はフォロー統計を表す構造体です
type FollowStats struct {
	FollowersCount int64 // フォロワー数
	FollowingCount int64 // フォロー中の数
	IsFollowing    bool  // 現在のユーザーがフォロー中か
	IsFollowedBy   bool  // 現在のユーザーにフォローされているか
}

// NewFollowStats はフォロー統計を作成します
func NewFollowStats(followersCount, followingCount int64, isFollowing, isFollowedBy bool) *FollowStats {
	return &FollowStats{
		FollowersCount: followersCount,
		FollowingCount: followingCount,
		IsFollowing:    isFollowing,
		IsFollowedBy:   isFollowedBy,
	}
}

// IsMutualFollow は相互フォローかどうかを返します
func (fs *FollowStats) IsMutualFollow() bool {
	return fs.IsFollowing && fs.IsFollowedBy
}
