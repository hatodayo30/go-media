package dto

import (
	domainErrors "media-platform/internal/domain/errors"
	"time"
)

type CommentResponse struct {
	ID        int64              `json:"id"`
	Body      string             `json:"body"`
	UserID    int64              `json:"user_id"`
	ContentID int64              `json:"content_id"`
	ParentID  *int64             `json:"parent_id,omitempty"`
	CreatedAt time.Time          `json:"created_at"`
	UpdatedAt time.Time          `json:"updated_at"`
	User      *UserBrief         `json:"user,omitempty"`
	Replies   []*CommentResponse `json:"replies,omitempty"`
}

type UserBrief struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar,omitempty"`
}

type CreateCommentRequest struct {
	Body      string `json:"body"`
	ContentID int64  `json:"content_id"`
	ParentID  *int64 `json:"parent_id,omitempty"`
}

func (req *CreateCommentRequest) Validate() error {
	if req.Body == "" {
		return domainErrors.NewValidationError("コメント本文は必須です")
	}
	if req.ContentID == 0 {
		return domainErrors.NewValidationError("コンテンツIDは必須です")
	}
	return nil
}

type UpdateCommentRequest struct {
	Body string `json:"body"`
}

func (req *UpdateCommentRequest) Validate() error {
	if req.Body == "" {
		return domainErrors.NewValidationError("コメント本文は必須です")
	}
	return nil
}

type CommentQuery struct {
	ContentID *int64 `json:"content_id"`
	UserID    *int64 `json:"user_id"`
	ParentID  *int64 `json:"parent_id"`
	Limit     int    `json:"limit"`
	Offset    int    `json:"offset"`
}

type CommentListResponse struct {
	Comments   []*CommentResponse `json:"comments"`
	TotalCount int64              `json:"total_count"`
	HasMore    bool               `json:"has_more"`
}
