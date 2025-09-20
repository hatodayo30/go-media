package presenter

import (
	"media-platform/internal/domain/entity"
	"media-platform/internal/usecase/dto" // ✅ 修正: presentation/dto → usecase/dto
)

// CategoryPresenter はカテゴリエンティティをHTTPレスポンスDTOに変換します
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
	responses := make([]*dto.CategoryResponse, 0, len(categories))
	for _, category := range categories {
		responses = append(responses, p.ToCategoryResponse(category))
	}
	return responses
}

// ⚠️ 注意: ToCategoryEntityメソッドは削除
// Request → Entity変換はService層の責務です
// CategoryServiceのtoCategoryEntityメソッドで実装済み
