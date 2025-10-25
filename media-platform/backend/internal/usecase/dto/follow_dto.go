package dto

import (
	"time"
)

// ========== Response DTOs ==========

// FollowResponse はフォローレスポンスです
type FollowResponse struct {
	ID          int64     `json:"id"`
	FollowerID  int64     `json:"follower_id"`
	FollowingID int64     `json:"following_id"`
	CreatedAt   time.Time `json:"created_at"`
}

// FollowStatsResponse はフォロー統計のレスポンスです
type FollowStatsResponse struct {
	FollowersCount int64 `json:"followers_count"`
	FollowingCount int64 `json:"following_count"`
	IsFollowing    bool  `json:"is_following"`
	IsFollowedBy   bool  `json:"is_followed_by"`
	IsMutualFollow bool  `json:"is_mutual_follow"`
}

// FollowUserResponse はフォロワー/フォロー中のユーザー情報を含むレスポンスです
type FollowUserResponse struct {
	User      UserResponse `json:"user"`
	CreatedAt time.Time    `json:"followed_at"` // フォローした日時
}

// FollowersResponse はフォロワー一覧のレスポンスです
type FollowersResponse struct {
	Followers []FollowUserResponse `json:"followers"`
	Total     int                  `json:"total"`
}

// FollowingResponse はフォロー中一覧のレスポンスです
type FollowingResponse struct {
	Following []FollowUserResponse `json:"following"`
	Total     int                  `json:"total"`
}

// FollowingFeedResponse はフォロー中のユーザーのフィードレスポンスです
type FollowingFeedResponse struct {
	Feed       []ContentResponse `json:"feed"`
	Pagination PaginationInfo    `json:"pagination"`
}
