package dto

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

// ContentResponse はコンテンツのレスポンスです
type ContentResponse struct {
	ID           int64      `json:"id"`
	Title        string     `json:"title"`
	Body         string     `json:"body"`
	Type         string     `json:"type"`
	Genre        string     `json:"genre"`
	AuthorID     int64      `json:"author_id"`
	AuthorName   string     `json:"author_name,omitempty"`
	CategoryID   int64      `json:"category_id"`
	CategoryName string     `json:"category_name,omitempty"`
	Status       string     `json:"status"`
	ViewCount    int64      `json:"view_count"`
	PublishedAt  *time.Time `json:"published_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// いいね・コメント数
	LikeCount    int64 `json:"like_count"`
	CommentCount int64 `json:"comment_count"`
}

// CreateContentRequest はコンテンツ作成のリクエストです
type CreateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	Genre      string `json:"genre"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"`
}

// Validate はリクエストのバリデーションを行います
func (req *CreateContentRequest) Validate() error {
	if req.Title == "" {
		return domainErrors.NewValidationError("タイトルは必須です")
	}

	if len(req.Title) > 255 {
		return domainErrors.NewValidationError("タイトルは255文字以内である必要があります")
	}

	if req.Body == "" {
		return domainErrors.NewValidationError("本文は必須です")
	}

	if len(req.Body) < 10 {
		return domainErrors.NewValidationError("本文は10文字以上必要です")
	}

	if req.Type == "" {
		return domainErrors.NewValidationError("コンテンツタイプは必須です")
	}

	// タイプのバリデーション
	validTypes := map[string]bool{
		"音楽": true, "アニメ": true, "漫画": true, "映画": true, "ゲーム": true,
	}
	if !validTypes[req.Type] {
		return domainErrors.NewValidationError("無効なコンテンツタイプです")
	}

	if req.CategoryID == 0 {
		return domainErrors.NewValidationError("カテゴリIDは必須です")
	}

	return nil
}

// UpdateContentRequest はコンテンツ更新のリクエストです
type UpdateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	Genre      string `json:"genre"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"`
}

// UpdateContentStatusRequest はステータス更新のリクエストです
type UpdateContentStatusRequest struct {
	Status string `json:"status"`
}

// Validate はリクエストのバリデーションを行います
func (req *UpdateContentStatusRequest) Validate() error {
	if req.Status == "" {
		return domainErrors.NewValidationError("ステータスは必須です")
	}
	return nil
}

// ContentQuery はコンテンツ検索のクエリです
type ContentQuery struct {
	AuthorID    *int64  `json:"author_id"`
	CategoryID  *int64  `json:"category_id"`
	Status      *string `json:"status"`
	SearchQuery *string `json:"search_query"`
	Type        *string `json:"type"`
	Genre       *string `json:"genre"`
	SortBy      *string `json:"sort_by"`
	SortOrder   *string `json:"sort_order"`
	Limit       int     `json:"limit"`
	Offset      int     `json:"offset"`
}
