package entity

import (
	"time"

	domainErrors "media-platform/internal/domain/errors"
)

// Rating は評価を表すエンティティです
type Rating struct {
	ID        int64     `json:"id"`
	Value     int       `json:"value"` // 1 = いいね（固定値）
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate は評価のドメインルールを検証します
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

// SetUserID はユーザーIDを設定し、バリデーションを行います
func (r *Rating) SetUserID(userID int64) error {
	if userID == 0 {
		return domainErrors.NewValidationError("ユーザーIDは必須です")
	}

	r.UserID = userID
	r.UpdatedAt = time.Now()
	return nil
}

// SetContentID はコンテンツIDを設定し、バリデーションを行います
func (r *Rating) SetContentID(contentID int64) error {
	if contentID == 0 {
		return domainErrors.NewValidationError("コンテンツIDは必須です")
	}

	r.ContentID = contentID
	r.UpdatedAt = time.Now()
	return nil
}

// CanDelete は指定されたユーザーIDがこの評価を削除できるかどうかを返します
func (r *Rating) CanDelete(userID int64, userRole string) bool {
	return r.UserID == userID || userRole == "admin"
}

// RatingStats は評価の統計を表すValue Objectです
type RatingStats struct {
	ContentID int64 `json:"content_id"`
	LikeCount int   `json:"like_count"` // いいね数のみ
	Count     int   `json:"count"`      // 総評価数（like_countと同じ）
}

// NewRatingStats は新しいRatingStatsを作成します
func NewRatingStats(contentID int64, likeCount int) *RatingStats {
	return &RatingStats{
		ContentID: contentID,
		LikeCount: likeCount,
		Count:     likeCount, // いいねのみなので同じ値
	}
}

// HasLikes はいいねが存在するかどうかを返します
func (rs *RatingStats) HasLikes() bool {
	return rs.LikeCount > 0
}

// CreateRatingRequest は評価作成リクエスト用の構造体です
type CreateRatingRequest struct {
	ContentID int64 `json:"content_id" validate:"required"`
	Value     int   `json:"value" validate:"required"` // 1のみ有効
}

// Validate はCreateRatingRequestのバリデーションを行います
func (req *CreateRatingRequest) Validate() error {
	if req.ContentID == 0 {
		return domainErrors.NewValidationError("コンテンツIDは必須です")
	}

	if req.Value != 1 {
		return domainErrors.NewValidationError("評価値は1（グッド）である必要があります")
	}

	return nil
}
