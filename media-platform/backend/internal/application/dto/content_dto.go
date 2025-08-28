package dto

import "time"

// ContentResponse はコンテンツのレスポンス用の構造体です
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

// CreateContentRequest はコンテンツ作成リクエスト用の構造体です
type CreateContentRequest struct {
	Title      string `json:"title" binding:"required"`
	Body       string `json:"body" binding:"required"`
	Type       string `json:"type" binding:"required"`
	CategoryID int64  `json:"category_id" binding:"required"`
	Status     string `json:"status"`
}

// UpdateContentRequest はコンテンツ更新リクエスト用の構造体です
type UpdateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"`
}

// UpdateContentStatusRequest はコンテンツステータス更新リクエスト用の構造体です
type UpdateContentStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// ContentQuery はコンテンツ検索クエリ用の構造体です
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
