package entity

import (
	"errors"
	"time"

	domainErrors "media-platform/internal/domain/errors"
)

// ContentType はコンテンツの種類を表す型です
type ContentType string

const (
	ContentTypeArticle  ContentType = "article"
	ContentTypeTutorial ContentType = "tutorial"
	ContentTypeNews     ContentType = "news"
	ContentTypeReview   ContentType = "review"
	ContentTypeVideo    ContentType = "video"
	ContentTypeImage    ContentType = "image"
	ContentTypeAudio    ContentType = "audio"
)

// ContentStatus はコンテンツの状態を表す型です
type ContentStatus string

const (
	ContentStatusDraft     ContentStatus = "draft"
	ContentStatusPending   ContentStatus = "pending"
	ContentStatusPublished ContentStatus = "published"
	ContentStatusArchived  ContentStatus = "archived"
)

// Content はコンテンツを表すエンティティです
type Content struct {
	ID          int64 // JSONタグ削除
	Title       string
	Body        string
	Type        ContentType
	AuthorID    int64
	CategoryID  int64
	Status      ContentStatus
	ViewCount   int64 // int64のまま
	PublishedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// Validate はコンテンツのドメインルールを検証します
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

	if !c.isValidContentType(c.Type) {
		return domainErrors.NewValidationError("無効なコンテンツタイプです")
	}

	if !c.isValidContentStatus(c.Status) {
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
func (c *Content) isValidContentType(contentType ContentType) bool {
	validTypes := map[ContentType]bool{
		ContentTypeArticle:  true,
		ContentTypeTutorial: true,
		ContentTypeNews:     true,
		ContentTypeReview:   true,
		ContentTypeVideo:    true,
		ContentTypeImage:    true,
		ContentTypeAudio:    true,
	}
	return validTypes[contentType]
}

// isValidContentStatus はコンテンツステータスが有効かチェックします
func (c *Content) isValidContentStatus(status ContentStatus) bool {
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
	if !c.isValidContentType(contentType) {
		return errors.New("無効なコンテンツタイプです")
	}

	c.Type = contentType
	c.UpdatedAt = time.Now()
	return nil
}

// SetStatus はコンテンツステータスを設定し、バリデーションを行います
func (c *Content) SetStatus(status ContentStatus) error {
	if !c.isValidContentStatus(status) {
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
