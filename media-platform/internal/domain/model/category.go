package model

import (
	"errors"
	"time"
)

// Category はカテゴリを表す構造体です
type Category struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ParentID    *int64    `json:"parent_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Validate はカテゴリのバリデーションを行います
func (c *Category) Validate() error {
	if c.Name == "" {
		return errors.New("カテゴリ名は必須です")
	}

	if len(c.Name) > 100 {
		return errors.New("カテゴリ名は100文字以内である必要があります")
	}

	// 自分自身を親にすることはできない
	if c.ParentID != nil && *c.ParentID == c.ID && c.ID != 0 {
		return errors.New("自分自身を親カテゴリにすることはできません")
	}

	return nil
}

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

// ToResponse はモデルからレスポンス形式に変換します
func (c *Category) ToResponse() *CategoryResponse {
	return &CategoryResponse{
		ID:          c.ID,
		Name:        c.Name,
		Description: c.Description,
		ParentID:    c.ParentID,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}
}
