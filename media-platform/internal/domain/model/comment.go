package model

import (
	"errors"
	"time"
)

// Comment はコメントを表す構造体です
type Comment struct {
	ID        int64     `json:"id"`
	Body      string    `json:"body"`
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate はコメントのバリデーションを行います
func (c *Comment) Validate() error {
	if c.Body == "" {
		return errors.New("コメント本文は必須です")
	}

	if len(c.Body) > 1000 {
		return errors.New("コメント本文は1000文字以内である必要があります")
	}

	if c.UserID == 0 {
		return errors.New("ユーザーIDは必須です")
	}

	if c.ContentID == 0 {
		return errors.New("コンテンツIDは必須です")
	}

	// ParentIDが指定されている場合、自己参照できないことをチェック
	if c.ParentID != nil && *c.ParentID == c.ID && c.ID != 0 {
		return errors.New("コメントは自分自身を親にできません")
	}

	return nil
}

// SetBody はコメント本文を設定します
func (c *Comment) SetBody(body string) error {
	if body == "" {
		return errors.New("コメント本文は必須です")
	}

	if len(body) > 1000 {
		return errors.New("コメント本文は1000文字以内である必要があります")
	}

	c.Body = body
	c.UpdatedAt = time.Now()
	return nil
}

// CanEdit はユーザーがこのコメントを編集できるか判定します
func (c *Comment) CanEdit(userID int64, userRole string) bool {
	return c.UserID == userID || userRole == "admin"
}

// CanDelete はユーザーがこのコメントを削除できるか判定します
func (c *Comment) CanDelete(userID int64, userRole string) bool {
	return c.UserID == userID || userRole == "admin"
}

// ToResponse はエンティティをレスポンス用の構造体に変換します
func (c *Comment) ToResponse() *CommentResponse {
	return &CommentResponse{
		ID:        c.ID,
		Body:      c.Body,
		UserID:    c.UserID,
		ContentID: c.ContentID,
		ParentID:  c.ParentID,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}

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
