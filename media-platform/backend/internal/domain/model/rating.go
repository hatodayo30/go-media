package model

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

// Rating は評価を表す構造体です
type Rating struct {
	ID        int64     `json:"id"`
	Value     int       `json:"value"` // 1 = いいね（固定値）
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate は評価のバリデーションを行います
func (r *Rating) Validate() error {
	if r.UserID == 0 {
		return domainErrors.NewValidationError("ユーザーIDは必須です")
	}

	if r.ContentID == 0 {
		return domainErrors.NewValidationError("コンテンツIDは必須です")
	}

	// グッド(1)のみ許可
	if r.Value != 1 {
		return domainErrors.NewValidationError("評価値は1（グッド）である必要があります")
	}

	return nil
}

// IsLike は評価がいいねかどうかを判定します（常にtrue）
func (r *Rating) IsLike() bool {
	return true
}

// SetValue は評価値を設定し、バリデーションを行います
func (r *Rating) SetValue(value int) error {
	// グッド(1)のみ許可
	if value != 1 {
		return domainErrors.NewValidationError("評価値は1（グッド）である必要があります")
	}

	r.Value = 1 // 常に1に固定
	r.UpdatedAt = time.Now()
	return nil
}

// RatingStats は評価の統計を表す構造体です（DislikeCount削除）
type RatingStats struct {
	ContentID int64 `json:"content_id"`
	LikeCount int   `json:"like_count"` // いいね数のみ
	Count     int   `json:"count"`      // 総評価数（like_countと同じ）
}

// CreateRatingRequest は評価作成リクエスト用の構造体です
type CreateRatingRequest struct {
	ContentID int64 `json:"content_id" binding:"required"`
	Value     int   `json:"value" binding:"required"` // 1のみ有効
}
