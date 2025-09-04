package presenter

import (
	"time"

	"media-platform/internal/domain/entity"
	"media-platform/internal/presentation/dto"
)

// ContentPresenter はコンテンツエンティティをDTOに変換します
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
	var responses []*dto.ContentResponse
	for _, content := range contents {
		responses = append(responses, p.ToContentResponse(content))
	}
	return responses
}

// ToContentEntity はCreateContentRequestからContentエンティティを生成します
func (p *ContentPresenter) ToContentEntity(req *dto.CreateContentRequest, authorID int64) *entity.Content {
	// デフォルトステータスの設定
	status := entity.ContentStatusDraft // デフォルトは下書き
	if req.Status != "" {
		// フロントエンドから送信されたstatusを使用
		switch req.Status {
		case "draft":
			status = entity.ContentStatusDraft
		case "published":
			status = entity.ContentStatusPublished
		case "pending":
			status = entity.ContentStatusPending
		default:
			status = entity.ContentStatusDraft // 無効な値の場合はデフォルト
		}
	}

	content := &entity.Content{
		Title:      req.Title,
		Body:       req.Body,
		Type:       entity.ContentType(req.Type),
		AuthorID:   authorID,
		CategoryID: req.CategoryID,
		Status:     status,
		ViewCount:  0,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// 公開ステータスの場合は公開日時を設定
	if status == entity.ContentStatusPublished {
		now := time.Now()
		content.PublishedAt = &now
	}

	return content
}

// ToContentQueryEntity はContentQueryをエンティティ用のクエリに変換します
func (p *ContentPresenter) ToContentQueryEntity(query *dto.ContentQuery) *dto.ContentQuery {
	// 現在はDTOとエンティティで同じ構造のため、そのまま返す
	// 将来的に構造が変わる場合はここで変換処理を追加
	return query
}
