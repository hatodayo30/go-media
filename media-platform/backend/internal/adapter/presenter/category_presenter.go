package presenter

import (
	"time"

	"media-platform/internal/domain/entity"
	"media-platform/internal/presentation/dto"
)

// CategoryPresenter はカテゴリエンティティをDTOに変換します
type CategoryPresenter struct{}

// NewCategoryPresenter は新しいCategoryPresenterのインスタンスを生成します
func NewCategoryPresenter() *CategoryPresenter {
	return &CategoryPresenter{}
}

// ToCategoryResponse はCategoryエンティティをCategoryResponseに変換します
func (p *CategoryPresenter) ToCategoryResponse(category *entity.Category) *dto.CategoryResponse {
	return &dto.CategoryResponse{
		ID:          category.ID,
		Name:        category.Name,
		Description: category.Description,
		ParentID:    category.ParentID,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}
}

// ToCategoryResponseList はCategoryエンティティのスライスをCategoryResponseのスライスに変換します
func (p *CategoryPresenter) ToCategoryResponseList(categories []*entity.Category) []*dto.CategoryResponse {
	var responses []*dto.CategoryResponse
	for _, category := range categories {
		responses = append(responses, p.ToCategoryResponse(category))
	}
	return responses
}

// ToCategoryEntity はCreateCategoryRequestからCategoryエンティティを生成します
func (p *CategoryPresenter) ToCategoryEntity(req *dto.CreateCategoryRequest) *entity.Category {
	return &entity.Category{
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
}
