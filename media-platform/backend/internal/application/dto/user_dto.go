package dto

import "time"

// UserResponse はユーザー情報のレスポンス用構造体です
type UserResponse struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Bio       string    `json:"bio,omitempty"`
	Avatar    string    `json:"avatar,omitempty"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateUserRequest はユーザー作成リクエスト用の構造体です
type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
}

// UpdateUserRequest はユーザー更新リクエスト用の構造体です
type UpdateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
}

// LoginRequest はログインリクエスト用の構造体です
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
