package entity

import (
	"errors"
	"time"
)

// Comment はコメントを表すエンティティです
type Comment struct {
	ID        int64     `json:"id"`
	Body      string    `json:"body"`
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate はコメントのドメインルールを検証します
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

// SetBody はコメント本文を設定し、バリデーションを行います
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

// IsReply はこのコメントが返信かどうかを判定します
func (c *Comment) IsReply() bool {
	return c.ParentID != nil
}

// IsRootComment はこのコメントがルートコメント（親コメント）かどうかを判定します
func (c *Comment) IsRootComment() bool {
	return c.ParentID == nil
}
