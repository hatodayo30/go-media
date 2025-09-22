package dto

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

type RatingResponse struct {
	ID        int64     `json:"id"`
	Value     int       `json:"value"`
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateRatingRequest struct {
	ContentID int64 `json:"content_id"`
	Value     int   `json:"value"`
}

func (req *CreateRatingRequest) Validate() error {
	if req.ContentID == 0 {
		return domainErrors.NewValidationError("コンテンツIDは必須です")
	}
	if req.Value != 1 {
		return domainErrors.NewValidationError("評価値は1（グッド）である必要があります")
	}
	return nil
}

type RatingStatsResponse struct {
	ContentID int64 `json:"content_id"`
	LikeCount int   `json:"like_count"`
	Count     int   `json:"count"`
}

type UserRatingStatusResponse struct {
	ContentID int64  `json:"content_id"`
	HasRated  bool   `json:"has_rated"`
	RatingID  *int64 `json:"rating_id,omitempty"`
}

type RatingQuery struct {
	UserID    *int64 `json:"user_id,omitempty"`
	ContentID *int64 `json:"content_id,omitempty"`
	Limit     int    `json:"limit"`
	Offset    int    `json:"offset"`
}
