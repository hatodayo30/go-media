package model

import (
	"time"
)

// Rating は評価情報を表す構造体です
type Rating struct {
	ID        int64     `json:"id"`
	Value     int       `json:"value" binding:"required,min=1,max=5"` // 評価値（1〜5）
	UserID    int64     `json:"user_id"`
	ContentID int64     `json:"content_id" binding:"required"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// RatingAverage はコンテンツの平均評価情報を表す構造体です
type RatingAverage struct {
	ContentID int64   `json:"content_id"`
	Average   float64 `json:"average"`
	Count     int     `json:"count"`
}
