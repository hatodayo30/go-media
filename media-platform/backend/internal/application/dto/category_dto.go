package dto

import "time"

// CreateCategoryRequest はカテゴリ作成のリクエストを表す構造体です
type CreateCategoryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	ParentID    *int64 `json:"parent_id"`
}

// UpdateCategoryRequest はカテゴリ更新のリクエストを表す構造体です
type UpdateCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	ParentID    *int64 `json:"parent_id"`
}

// CategoryResponse はカテゴリレスポンスを表す構造体です
type CategoryResponse struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ParentID    *int64    `json:"parent_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
