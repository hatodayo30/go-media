package presenter

import (
	"media-platform/internal/usecase/dto" // DTOのみに依存
)

type CategoryPresenter struct{}

func NewCategoryPresenter() *CategoryPresenter {
	return &CategoryPresenter{}
}

// HTTP Response DTO構造体
type HTTPCategoryResponse struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ParentID    *int64 `json:"parent_id,omitempty"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at,omitempty"`
}

// UseCase DTO → HTTP Response DTO変換
func (p *CategoryPresenter) ToHTTPCategoryResponse(categoryDTO *dto.CategoryResponse) *HTTPCategoryResponse {
	if categoryDTO == nil {
		return nil
	}

	return &HTTPCategoryResponse{
		ID:          categoryDTO.ID,
		Name:        categoryDTO.Name,
		Description: categoryDTO.Description,
		ParentID:    categoryDTO.ParentID,
		CreatedAt:   categoryDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:   categoryDTO.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func (p *CategoryPresenter) ToHTTPCategoryResponseList(categoryDTOs []*dto.CategoryResponse) []*HTTPCategoryResponse {
	if categoryDTOs == nil {
		return []*HTTPCategoryResponse{}
	}

	responses := make([]*HTTPCategoryResponse, 0, len(categoryDTOs))
	for _, categoryDTO := range categoryDTOs {
		if categoryDTO != nil {
			responses = append(responses, p.ToHTTPCategoryResponse(categoryDTO))
		}
	}
	return responses
}
