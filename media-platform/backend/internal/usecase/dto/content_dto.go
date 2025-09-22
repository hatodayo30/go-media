package dto

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

type ContentResponse struct {
	ID          int64      `json:"id"`
	Title       string     `json:"title"`
	Body        string     `json:"body"`
	Type        string     `json:"type"`
	AuthorID    int64      `json:"author_id"`
	CategoryID  int64      `json:"category_id"`
	Status      string     `json:"status"`
	ViewCount   int64      `json:"view_count"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"`
}

func (req *CreateContentRequest) Validate() error {
	if req.Title == "" {
		return domainErrors.NewValidationError("タイトルは必須です")
	}
	if req.Body == "" {
		return domainErrors.NewValidationError("本文は必須です")
	}
	if req.Type == "" {
		return domainErrors.NewValidationError("コンテンツタイプは必須です")
	}
	if req.CategoryID == 0 {
		return domainErrors.NewValidationError("カテゴリIDは必須です")
	}
	return nil
}

type UpdateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"`
}

type UpdateContentStatusRequest struct {
	Status string `json:"status"`
}

func (req *UpdateContentStatusRequest) Validate() error {
	if req.Status == "" {
		return domainErrors.NewValidationError("ステータスは必須です")
	}
	return nil
}

type ContentQuery struct {
	AuthorID    *int64  `json:"author_id"`
	CategoryID  *int64  `json:"category_id"`
	Status      *string `json:"status"`
	SearchQuery *string `json:"search_query"`
	SortBy      *string `json:"sort_by"`
	SortOrder   *string `json:"sort_order"`
	Limit       int     `json:"limit"`
	Offset      int     `json:"offset"`
}
