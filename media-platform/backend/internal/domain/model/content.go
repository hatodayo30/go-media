package model

import (
	"errors"
	"time"

	domainErrors "media-platform/internal/domain/errors"
)

// ContentType はコンテンツの種類を表す型です
type ContentType string

const (
	ContentTypeArticle  ContentType = "article"
	ContentTypeTutorial ContentType = "tutorial" // フロントエンドで使用
	ContentTypeNews     ContentType = "news"     // フロントエンドで使用
	ContentTypeReview   ContentType = "review"   // フロントエンドで使用
	ContentTypeVideo    ContentType = "video"
	ContentTypeImage    ContentType = "image"
	ContentTypeAudio    ContentType = "audio"
)

// ContentStatus はコンテンツの状態を表す型です
type ContentStatus string

// コンテンツステータスの定数
const (
	ContentStatusDraft     ContentStatus = "draft"
	ContentStatusPending   ContentStatus = "pending"
	ContentStatusPublished ContentStatus = "published"
	ContentStatusArchived  ContentStatus = "archived"
)

// Content はコンテンツを表す構造体です
type Content struct {
	ID          int64         `json:"id"`
	Title       string        `json:"title"`
	Body        string        `json:"body"`
	Type        ContentType   `json:"type"`
	AuthorID    int64         `json:"author_id"`
	CategoryID  int64         `json:"category_id"`
	Status      ContentStatus `json:"status"`
	ViewCount   int64         `json:"view_count"`
	PublishedAt *time.Time    `json:"published_at"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// Validate はコンテンツのバリデーションを行います
func (c *Content) Validate() error {
	if c.Title == "" {
		return domainErrors.NewValidationError("タイトルは必須です")
	}

	if len(c.Title) > 255 {
		return domainErrors.NewValidationError("タイトルは255文字以内である必要があります")
	}

	if c.Body == "" {
		return domainErrors.NewValidationError("本文は必須です")
	}

	if !isValidContentType(c.Type) {
		return domainErrors.NewValidationError("無効なコンテンツタイプです")
	}

	if !isValidContentStatus(c.Status) {
		return domainErrors.NewValidationError("無効なコンテンツステータスです")
	}

	if c.AuthorID == 0 {
		return domainErrors.NewValidationError("著者IDは必須です")
	}

	if c.CategoryID == 0 {
		return domainErrors.NewValidationError("カテゴリIDは必須です")
	}

	return nil
}

// isValidContentType はコンテンツタイプが有効かチェックします
func isValidContentType(contentType ContentType) bool {
	validTypes := map[ContentType]bool{
		ContentTypeArticle:  true,
		ContentTypeTutorial: true, // 追加
		ContentTypeNews:     true, // 追加
		ContentTypeReview:   true, // 追加
		ContentTypeVideo:    true,
		ContentTypeImage:    true,
		ContentTypeAudio:    true,
	}
	return validTypes[contentType]
}

// isValidContentStatus はコンテンツステータスが有効かチェックします
func isValidContentStatus(status ContentStatus) bool {
	validStatuses := map[ContentStatus]bool{
		ContentStatusDraft:     true,
		ContentStatusPending:   true,
		ContentStatusPublished: true,
		ContentStatusArchived:  true,
	}
	return validStatuses[status]
}

// SetTitle はタイトルを設定し、バリデーションを行います
func (c *Content) SetTitle(title string) error {
	if title == "" {
		return errors.New("タイトルは必須です")
	}

	if len(title) > 255 {
		return errors.New("タイトルは255文字以内である必要があります")
	}

	c.Title = title
	c.UpdatedAt = time.Now()
	return nil
}

// SetBody は本文を設定し、バリデーションを行います
func (c *Content) SetBody(body string) error {
	if body == "" {
		return errors.New("本文は必須です")
	}

	c.Body = body
	c.UpdatedAt = time.Now()
	return nil
}

// SetType はコンテンツタイプを設定し、バリデーションを行います
func (c *Content) SetType(contentType ContentType) error {
	if !isValidContentType(contentType) {
		return errors.New("無効なコンテンツタイプです")
	}

	c.Type = contentType
	c.UpdatedAt = time.Now()
	return nil
}

// SetStatus はコンテンツステータスを設定し、バリデーションを行います
func (c *Content) SetStatus(status ContentStatus) error {
	if !isValidContentStatus(status) {
		return errors.New("無効なコンテンツステータスです")
	}

	previousStatus := c.Status
	c.Status = status
	c.UpdatedAt = time.Now()

	// コンテンツが公開される場合は公開日時を設定
	if status == ContentStatusPublished && previousStatus != ContentStatusPublished {
		now := time.Now()
		c.PublishedAt = &now
	}

	return nil
}

// SetCategoryID はカテゴリIDを設定し、バリデーションを行います
func (c *Content) SetCategoryID(categoryID int64) error {
	if categoryID == 0 {
		return errors.New("カテゴリIDは必須です")
	}

	c.CategoryID = categoryID
	c.UpdatedAt = time.Now()
	return nil
}

// IncrementViewCount は閲覧数をインクリメントします
func (c *Content) IncrementViewCount() {
	c.ViewCount++
	c.UpdatedAt = time.Now()
}

// IsPublished はコンテンツが公開済みかどうかを返します
func (c *Content) IsPublished() bool {
	return c.Status == ContentStatusPublished && c.PublishedAt != nil && c.PublishedAt.Before(time.Now())
}

// CanEdit は指定されたユーザーIDがこのコンテンツを編集できるかどうかを返します
func (c *Content) CanEdit(userID int64, userRole string) bool {
	return c.AuthorID == userID || userRole == "admin"
}

// ToResponse はエンティティをレスポンス用の構造体に変換します
func (c *Content) ToResponse() *ContentResponse {
	return &ContentResponse{
		ID:          c.ID,
		Title:       c.Title,
		Body:        c.Body,
		Type:        string(c.Type),
		AuthorID:    c.AuthorID,
		CategoryID:  c.CategoryID,
		Status:      string(c.Status),
		ViewCount:   c.ViewCount,
		PublishedAt: c.PublishedAt,
		CreatedAt:   c.CreatedAt,
		UpdatedAt:   c.UpdatedAt,
	}
}

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
	Status     string `json:"status"` // フロントエンドから送信されるstatusフィールド
}

// UpdateContentRequest はコンテンツ更新リクエスト用の構造体です
type UpdateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"` // status更新も可能に
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
