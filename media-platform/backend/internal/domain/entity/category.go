package entity

import (
	"errors"
	"time"
)

// Category はカテゴリを表すエンティティです
type Category struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ParentID    *int64    `json:"parent_id"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Validate はカテゴリのドメインルールを検証します
func (c *Category) Validate() error {
	if c.Name == "" {
		return errors.New("カテゴリ名は必須です")
	}

	if len(c.Name) > 100 {
		return errors.New("カテゴリ名は100文字以内である必要があります")
	}

	// 自分自身を親にすることはできない
	if c.ParentID != nil && *c.ParentID == c.ID && c.ID != 0 {
		return errors.New("自分自身を親カテゴリにすることはできません")
	}

	return nil
}

// SetName はカテゴリ名を設定します
func (c *Category) SetName(name string) error {
	if name == "" {
		return errors.New("カテゴリ名は必須です")
	}
	if len(name) > 100 {
		return errors.New("カテゴリ名は100文字以内である必要があります")
	}
	c.Name = name
	c.UpdatedAt = time.Now()
	return nil
}

// SetDescription は説明を設定します
func (c *Category) SetDescription(description string) {
	c.Description = description
	c.UpdatedAt = time.Now()
}

// SetParentID は親カテゴリIDを設定します
func (c *Category) SetParentID(parentID *int64) error {
	// 自分自身を親にすることはできない
	if parentID != nil && *parentID == c.ID && c.ID != 0 {
		return errors.New("自分自身を親カテゴリにすることはできません")
	}
	c.ParentID = parentID
	c.UpdatedAt = time.Now()
	return nil
}
