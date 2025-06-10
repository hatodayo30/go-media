package model

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

// Bookmark はブックマークを表す構造体です
type Bookmark struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate はブックマークのバリデーションを行います
func (b *Bookmark) Validate() error {
	if b.UserID == 0 {
		return domainErrors.NewValidationError("ユーザーIDは必須です")
	}

	if b.ContentID == 0 {
		return domainErrors.NewValidationError("コンテンツIDは必須です")
	}

	return nil
}

// CreateBookmarkRequest はブックマーク作成リクエスト用の構造体です
type CreateBookmarkRequest struct {
	ContentID int64 `json:"content_id" binding:"required"`
}
