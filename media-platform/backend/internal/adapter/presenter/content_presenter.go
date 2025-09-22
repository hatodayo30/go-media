package presenter

import (
	"media-platform/internal/usecase/dto" // UseCase DTOのみに依存
)

// ContentPresenter はコンテンツをHTTPレスポンスDTOに変換します
type ContentPresenter struct{}

// NewContentPresenter は新しいContentPresenterのインスタンスを生成します
func NewContentPresenter() *ContentPresenter {
	return &ContentPresenter{}
}

// ========== HTTP Response DTO構造体 ==========

// HTTPContentResponse はHTTPレスポンス用のコンテンツ情報です
type HTTPContentResponse struct {
	ID          int64  `json:"id"`
	Title       string `json:"title"`
	Body        string `json:"body"`
	Type        string `json:"type"`
	AuthorID    int64  `json:"author_id"`
	CategoryID  int64  `json:"category_id,omitempty"`
	Status      string `json:"status"`
	ViewCount   int64  `json:"view_count"`
	PublishedAt string `json:"published_at,omitempty"` // RFC3339形式
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at,omitempty"`
}

// ========== UseCase DTO → HTTP Response DTO変換 ==========

// ToHTTPContentResponse はUseCase DTOをHTTPレスポンス用DTOに変換します
func (p *ContentPresenter) ToHTTPContentResponse(contentDTO *dto.ContentResponse) *HTTPContentResponse {
	if contentDTO == nil {
		return nil
	}

	response := &HTTPContentResponse{
		ID:         contentDTO.ID,
		Title:      contentDTO.Title,
		Body:       contentDTO.Body,
		Type:       contentDTO.Type,
		AuthorID:   contentDTO.AuthorID,
		CategoryID: contentDTO.CategoryID,
		Status:     contentDTO.Status,
		ViewCount:  contentDTO.ViewCount,
		CreatedAt:  contentDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:  contentDTO.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// PublishedAtはnilの可能性があるため条件付き
	if contentDTO.PublishedAt != nil {
		response.PublishedAt = contentDTO.PublishedAt.Format("2006-01-02T15:04:05Z07:00")
	}

	return response
}

// ToHTTPContentResponseList はUseCase DTOリストをHTTPレスポンス用DTOリストに変換します
func (p *ContentPresenter) ToHTTPContentResponseList(contentDTOs []*dto.ContentResponse) []*HTTPContentResponse {
	if contentDTOs == nil {
		return []*HTTPContentResponse{}
	}

	responses := make([]*HTTPContentResponse, 0, len(contentDTOs))
	for _, contentDTO := range contentDTOs {
		if contentDTO != nil {
			responses = append(responses, p.ToHTTPContentResponse(contentDTO))
		}
	}
	return responses
}
