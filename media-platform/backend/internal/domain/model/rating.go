package model

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

// Rating は評価を表す構造体です
type Rating struct {
	ID        int64     `json:"id"`
	Value     int       `json:"value"` // 0 = バッド, 1 = いいね
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

	if r.Value != 0 && r.Value != 1 {
		return domainErrors.NewValidationError("評価値は0（バッド）または1（いいね）である必要があります")
	}

	return nil
}

// IsLike は評価がいいねかどうかを判定します
func (r *Rating) IsLike() bool {
	return r.Value == 1
}

// IsBad は評価がバッドかどうかを判定します
func (r *Rating) IsBad() bool {
	return r.Value == 0
}

// SetValue は評価値を設定し、バリデーションを行います
func (r *Rating) SetValue(value int) error {
	if value != 0 && value != 1 {
		return domainErrors.NewValidationError("評価値は0（バッド）または1（いいね）である必要があります")
	}

	r.Value = value
	r.UpdatedAt = time.Now()
	return nil
}

// RatingAverage は評価の平均と統計を表す構造体です
type RatingAverage struct {
	ContentID    int64   `json:"content_id"`
	Average      float64 `json:"average"`       // いいね率 (0.0 - 1.0)
	Count        int     `json:"count"`         // 総評価数
	LikeCount    int     `json:"like_count"`    // いいね数
	DislikeCount int     `json:"dislike_count"` // バッド数
}

// CreateRatingRequest は評価作成リクエスト用の構造体です
type CreateRatingRequest struct {
	ContentID int64 `json:"content_id" binding:"required"`
	Value     int   `json:"value" binding:"required"`
}
