package dto

import "time"

// ========== Request DTOs ==========

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

// ========== Response DTOs ==========

// UserResponse はユーザー情報のレスポンス用構造体です
type UserResponse struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email,omitempty"`
	Bio       string    `json:"bio,omitempty"`
	Avatar    string    `json:"avatar,omitempty"`
	Role      string    `json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at,omitempty"`
}

// LoginResponse はログイン成功時のレスポンスです
type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// ========== List Response DTOs ==========

// UserListResponse はユーザー一覧取得時のレスポンスです
type UserListResponse struct {
	Users      []*UserResponse `json:"users"`
	Pagination PaginationInfo  `json:"pagination"`
}

// PaginationInfo はページネーション情報です
type PaginationInfo struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
	Total  int `json:"total,omitempty"`
}

// ========== Error Response DTOs ==========

// ErrorResponse はエラーレスポンス用の構造体です
type ErrorResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

// SuccessResponse は成功レスポンス用の構造体です
type SuccessResponse struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data"`
}
