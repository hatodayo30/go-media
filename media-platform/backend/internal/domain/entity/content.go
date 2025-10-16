package entity

import (
	"errors"
	"time"

	domainErrors "media-platform/internal/domain/errors"
)

// ContentType はコンテンツの種類（趣味カテゴリ）を表す型です
type ContentType string

const (
	ContentTypeMusic ContentType = "音楽"
	ContentTypeAnime ContentType = "アニメ"
	ContentTypeManga ContentType = "漫画"
	ContentTypeMovie ContentType = "映画"
	ContentTypeGame  ContentType = "ゲーム"
)

// ContentStatus はコンテンツの状態を表す型です
type ContentStatus string

const (
	ContentStatusDraft     ContentStatus = "draft"
	ContentStatusPublished ContentStatus = "published"
	ContentStatusArchived  ContentStatus = "archived"
)

// RecommendationLevel はおすすめ度を表す型です
type RecommendationLevel string

const (
	RecommendationMustSee     RecommendationLevel = "必見"
	RecommendationRecommended RecommendationLevel = "おすすめ"
	RecommendationAverage     RecommendationLevel = "普通"
	RecommendationNotGood     RecommendationLevel = "イマイチ"
)

// Content はコンテンツ（趣味投稿）を表すエンティティです
type Content struct {
	ID          int64
	Title       string // 投稿タイトル
	Body        string // 投稿本文（感想・レビュー）
	Type        ContentType
	AuthorID    int64
	CategoryID  int64
	Status      ContentStatus
	ViewCount   int64
	PublishedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time

	// 趣味投稿専用フィールド
	WorkTitle           string              // 作品名（曲名、アニメ名、映画名など）
	Rating              *float64            // 評価（1.0〜5.0の星評価）
	RecommendationLevel RecommendationLevel // おすすめ度
	Tags                []string            // タグ（ジャンル、感情タグなど）
	ImageURL            string              // 作品画像URL
	ExternalURL         string              // 外部リンク（Amazon、公式サイトなど）
	ReleaseYear         *int                // リリース年
	ArtistName          string              // アーティスト名（音楽の場合）
	Genre               string              // ジャンル
}

// NewContent は新しいコンテンツエンティティを作成します
func NewContent(
	title, body string,
	contentType ContentType,
	authorID, categoryID int64,
) (*Content, error) {
	content := &Content{
		Title:      title,
		Body:       body,
		Type:       contentType,
		AuthorID:   authorID,
		CategoryID: categoryID,
		Status:     ContentStatusDraft,
		ViewCount:  0,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		Tags:       []string{},
	}

	if err := content.Validate(); err != nil {
		return nil, err
	}

	return content, nil
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

	if len(c.Body) < 10 {
		return domainErrors.NewValidationError("本文は10文字以上必要です")
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

	// 評価のバリデーション
	if c.Rating != nil {
		if *c.Rating < 0 || *c.Rating > 5 {
			return domainErrors.NewValidationError("評価は0〜5の範囲で入力してください")
		}
	}

	// おすすめ度のバリデーション
	if c.RecommendationLevel != "" && !c.isValidRecommendationLevel(c.RecommendationLevel) {
		return domainErrors.NewValidationError("無効なおすすめ度です")
	}

	return nil
}

// isValidContentType はコンテンツタイプが有効かチェックします
func (c *Content) isValidContentType(contentType ContentType) bool {
	validTypes := map[ContentType]bool{
		ContentTypeMusic: true,
		ContentTypeAnime: true,
		ContentTypeManga: true,
		ContentTypeMovie: true,
		ContentTypeGame:  true,
	}
	return validTypes[contentType]
}

// isValidContentStatus はコンテンツステータスが有効かチェックします
func (c *Content) isValidContentStatus(status ContentStatus) bool {
	validStatuses := map[ContentStatus]bool{
		ContentStatusDraft:     true,
		ContentStatusPublished: true,
		ContentStatusArchived:  true,
	}
	return validStatuses[status]
}

// isValidRecommendationLevel はおすすめ度が有効かチェックします
func (c *Content) isValidRecommendationLevel(level RecommendationLevel) bool {
	validLevels := map[RecommendationLevel]bool{
		RecommendationMustSee:     true,
		RecommendationRecommended: true,
		RecommendationAverage:     true,
		RecommendationNotGood:     true,
	}
	return validLevels[level]
}

// SetTitle はタイトルを設定します
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

// SetBody は本文を設定します
func (c *Content) SetBody(body string) error {
	if body == "" {
		return errors.New("本文は必須です")
	}
	if len(body) < 10 {
		return errors.New("本文は10文字以上必要です")
	}
	c.Body = body
	c.UpdatedAt = time.Now()
	return nil
}

// SetType はコンテンツタイプを設定します
func (c *Content) SetType(contentType ContentType) error {
	if !c.isValidContentType(contentType) {
		return errors.New("無効なコンテンツタイプです")
	}
	c.Type = contentType
	c.UpdatedAt = time.Now()
	return nil
}

// SetCategoryID はカテゴリIDを設定します
func (c *Content) SetCategoryID(categoryID int64) error {
	if categoryID == 0 {
		return errors.New("カテゴリIDは必須です")
	}
	c.CategoryID = categoryID
	c.UpdatedAt = time.Now()
	return nil
}

// SetRating は評価を設定します
func (c *Content) SetRating(rating float64) error {
	if rating < 0 || rating > 5 {
		return errors.New("評価は0〜5の範囲で入力してください")
	}
	c.Rating = &rating
	c.UpdatedAt = time.Now()
	return nil
}

// SetRecommendationLevel はおすすめ度を設定します
func (c *Content) SetRecommendationLevel(level RecommendationLevel) error {
	if !c.isValidRecommendationLevel(level) {
		return errors.New("無効なおすすめ度です")
	}
	c.RecommendationLevel = level
	c.UpdatedAt = time.Now()
	return nil
}

// AddTag はタグを追加します
func (c *Content) AddTag(tag string) {
	if tag != "" {
		c.Tags = append(c.Tags, tag)
		c.UpdatedAt = time.Now()
	}
}

// SetTags はタグを設定します
func (c *Content) SetTags(tags []string) {
	c.Tags = tags
	c.UpdatedAt = time.Now()
}

// SetStatus はコンテンツステータスを設定します
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
