package dto

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

type CreateCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	ParentID    *int64 `json:"parent_id"`
}

func (req *CreateCategoryRequest) Validate() error {
	if req.Name == "" {
		return domainErrors.NewValidationError("カテゴリ名は必須です")
	}
	return nil
}

type UpdateCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	ParentID    *int64 `json:"parent_id"`
}

type CategoryResponse struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ParentID    *int64    `json:"parent_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
