package dto

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

// ContentResponse はコンテンツのレスポンスです
type ContentResponse struct {
	ID           int64      `json:"id"`
	Title        string     `json:"title"`
	Body         string     `json:"body"`
	Type         string     `json:"type"`
	AuthorID     int64      `json:"author_id"`
	AuthorName   string     `json:"author_name,omitempty"`
	CategoryID   int64      `json:"category_id"`
	CategoryName string     `json:"category_name,omitempty"`
	Status       string     `json:"status"`
	ViewCount    int64      `json:"view_count"`
	PublishedAt  *time.Time `json:"published_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// 趣味投稿専用フィールド
	WorkTitle           string   `json:"work_title,omitempty"`           // 作品名
	Rating              *float64 `json:"rating,omitempty"`               // 評価
	RecommendationLevel string   `json:"recommendation_level,omitempty"` // おすすめ度
	Tags                []string `json:"tags,omitempty"`                 // タグ
	ImageURL            string   `json:"image_url,omitempty"`            // 画像URL
	ExternalURL         string   `json:"external_url,omitempty"`         // 外部リンク
	ReleaseYear         *int     `json:"release_year,omitempty"`         // リリース年
	ArtistName          string   `json:"artist_name,omitempty"`          // アーティスト名
	Genre               string   `json:"genre,omitempty"`                // ジャンル

	// いいね・コメント数
	LikeCount    int64 `json:"like_count"`
	CommentCount int64 `json:"comment_count"`
}

// CreateContentRequest はコンテンツ作成のリクエストです
type CreateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"`

	// 趣味投稿専用フィールド
	WorkTitle           string   `json:"work_title"`
	Rating              *float64 `json:"rating"`
	RecommendationLevel string   `json:"recommendation_level"`
	Tags                []string `json:"tags"`
	ImageURL            string   `json:"image_url"`
	ExternalURL         string   `json:"external_url"`
	ReleaseYear         *int     `json:"release_year"`
	ArtistName          string   `json:"artist_name"`
	Genre               string   `json:"genre"`
}

// Validate はリクエストのバリデーションを行います
func (req *CreateContentRequest) Validate() error {
	if req.Title == "" {
		return domainErrors.NewValidationError("タイトルは必須です")
	}

	if len(req.Title) > 255 {
		return domainErrors.NewValidationError("タイトルは255文字以内である必要があります")
	}

	if req.Body == "" {
		return domainErrors.NewValidationError("本文は必須です")
	}

	if len(req.Body) < 10 {
		return domainErrors.NewValidationError("本文は10文字以上必要です")
	}

	if req.Type == "" {
		return domainErrors.NewValidationError("コンテンツタイプは必須です")
	}

	// タイプのバリデーション
	validTypes := map[string]bool{
		"音楽": true, "アニメ": true, "漫画": true, "映画": true, "ゲーム": true,
	}
	if !validTypes[req.Type] {
		return domainErrors.NewValidationError("無効なコンテンツタイプです")
	}

	if req.CategoryID == 0 {
		return domainErrors.NewValidationError("カテゴリIDは必須です")
	}

	// 評価のバリデーション
	if req.Rating != nil {
		if *req.Rating < 0 || *req.Rating > 5 {
			return domainErrors.NewValidationError("評価は0〜5の範囲で入力してください")
		}
	}

	// おすすめ度のバリデーション
	if req.RecommendationLevel != "" {
		validLevels := map[string]bool{
			"必見": true, "おすすめ": true, "普通": true, "イマイチ": true,
		}
		if !validLevels[req.RecommendationLevel] {
			return domainErrors.NewValidationError("無効なおすすめ度です")
		}
	}

	return nil
}

// UpdateContentRequest はコンテンツ更新のリクエストです
type UpdateContentRequest struct {
	Title      string `json:"title"`
	Body       string `json:"body"`
	Type       string `json:"type"`
	CategoryID int64  `json:"category_id"`
	Status     string `json:"status"`

	// 趣味投稿専用フィールド
	WorkTitle           string   `json:"work_title"`
	Rating              *float64 `json:"rating"`
	RecommendationLevel string   `json:"recommendation_level"`
	Tags                []string `json:"tags"`
	ImageURL            string   `json:"image_url"`
	ExternalURL         string   `json:"external_url"`
	ReleaseYear         *int     `json:"release_year"`
	ArtistName          string   `json:"artist_name"`
	Genre               string   `json:"genre"`
}

// UpdateContentStatusRequest はステータス更新のリクエストです
type UpdateContentStatusRequest struct {
	Status string `json:"status"`
}

// Validate はリクエストのバリデーションを行います
func (req *UpdateContentStatusRequest) Validate() error {
	if req.Status == "" {
		return domainErrors.NewValidationError("ステータスは必須です")
	}
	return nil
}

// ContentQuery はコンテンツ検索のクエリです
type ContentQuery struct {
	AuthorID    *int64   `json:"author_id"`
	CategoryID  *int64   `json:"category_id"`
	Status      *string  `json:"status"`
	SearchQuery *string  `json:"search_query"`
	Tags        []string `json:"tags"`
	MinRating   *float64 `json:"min_rating"`
	Type        *string  `json:"type"`
	SortBy      *string  `json:"sort_by"`
	SortOrder   *string  `json:"sort_order"`
	Limit       int      `json:"limit"`
	Offset      int      `json:"offset"`
}
