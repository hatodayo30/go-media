package dto

import "time"

// CommentResponse はコメントのレスポンス用の構造体です
type CommentResponse struct {
	ID        int64     `json:"id"`
	Body      string    `json:"body"`
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	// 拡張フィールド（オプション）
	User    *UserBrief         `json:"user,omitempty"`
	Replies []*CommentResponse `json:"replies,omitempty"`
}

// UserBrief はコメント表示用の簡略化したユーザー情報です
type UserBrief struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar,omitempty"`
}

// CreateCommentRequest はコメント作成リクエスト用の構造体です
type CreateCommentRequest struct {
	Body      string `json:"body" binding:"required"`
	ContentID int64  `json:"content_id" binding:"required"`
	ParentID  *int64 `json:"parent_id,omitempty"`
}

// UpdateCommentRequest はコメント更新リクエスト用の構造体です
type UpdateCommentRequest struct {
	Body string `json:"body" binding:"required"`
}

// CommentQuery はコメント検索クエリ用の構造体です
type CommentQuery struct {
	ContentID *int64 `json:"content_id"`
	UserID    *int64 `json:"user_id"`
	ParentID  *int64 `json:"parent_id"`
	Limit     int    `json:"limit"`
	Offset    int    `json:"offset"`
}

// CommentListResponse はコメント一覧のレスポンス用の構造体です
type CommentListResponse struct {
	Comments   []*CommentResponse `json:"comments"`
	TotalCount int                `json:"total_count"`
	HasMore    bool               `json:"has_more"`
}
