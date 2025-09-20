package presenter

import (
	"media-platform/internal/domain/entity"
	"media-platform/internal/usecase/dto" // ✅ 修正: presentation/dto → usecase/dto
)

// ContentPresenter はコンテンツエンティティをHTTPレスポンスDTOに変換します
type ContentPresenter struct{}

// NewContentPresenter は新しいContentPresenterのインスタンスを生成します
func NewContentPresenter() *ContentPresenter {
	return &ContentPresenter{}
}

// ToContentResponse はContentエンティティをContentResponseに変換します
func (p *ContentPresenter) ToContentResponse(content *entity.Content) *dto.ContentResponse {
	return &dto.ContentResponse{
		ID:          content.ID,
		Title:       content.Title,
		Body:        content.Body,
		Type:        string(content.Type),
		AuthorID:    content.AuthorID,
		CategoryID:  content.CategoryID,
		Status:      string(content.Status),
		ViewCount:   content.ViewCount,
		PublishedAt: content.PublishedAt,
		CreatedAt:   content.CreatedAt,
		UpdatedAt:   content.UpdatedAt,
	}
}

// ToContentResponseList はContentエンティティのスライスをContentResponseのスライスに変換します
func (p *ContentPresenter) ToContentResponseList(contents []*entity.Content) []*dto.ContentResponse {
	responses := make([]*dto.ContentResponse, 0, len(contents))
	for _, content := range contents {
		responses = append(responses, p.ToContentResponse(content))
	}
	return responses
}

// ⚠️ 削除されたメソッド
// - ToContentEntity: Service層のtoContentEntityメソッドで実装済み
// - ToContentQueryEntity: 不要なパススルーメソッド
