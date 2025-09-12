package dto

import "time"

// RatingResponse は評価のレスポンス用の構造体です
type RatingResponse struct {
	ID        int64     `json:"id"`
	Value     int       `json:"value"`
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateRatingRequest は評価作成リクエスト用の構造体です
type CreateRatingRequest struct {
	ContentID int64 `json:"content_id" binding:"required"`
	Value     int   `json:"value" binding:"required"` // 1のみ有効
}

// RatingStatsResponse は評価統計のレスポンス用の構造体です
type RatingStatsResponse struct {
	ContentID int64 `json:"content_id"`
	LikeCount int   `json:"like_count"`
	Count     int   `json:"count"`
}

// UserRatingStatusResponse はユーザーの評価状態のレスポンス用の構造体です
type UserRatingStatusResponse struct {
	ContentID int64  `json:"content_id"`
	HasRated  bool   `json:"has_rated"` // HasLikedをHasRatedに統一
	RatingID  *int64 `json:"rating_id,omitempty"`
}

// RatingQuery は評価検索クエリ用の構造体です
type RatingQuery struct {
	UserID    *int64 `json:"user_id,omitempty"`
	ContentID *int64 `json:"content_id,omitempty"`
	Limit     int    `json:"limit"`
	Offset    int    `json:"offset"`
}
