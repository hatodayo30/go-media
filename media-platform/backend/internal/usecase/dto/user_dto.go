package dto

import (
	domainErrors "media-platform/internal/domain/errors"
	"regexp"
	"time"
)

type CreateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
}

func (req *CreateUserRequest) Validate() error {
	if req.Username == "" {
		return domainErrors.NewValidationError("ユーザー名は必須です")
	}
	if req.Email == "" {
		return domainErrors.NewValidationError("メールアドレスは必須です")
	}
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.Email) {
		return domainErrors.NewValidationError("有効なメールアドレス形式ではありません")
	}
	if req.Password == "" {
		return domainErrors.NewValidationError("パスワードは必須です")
	}
	if len(req.Password) < 4 {
		return domainErrors.NewValidationError("パスワードは最低4文字必要です")
	}
	return nil
}

type UpdateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Bio      string `json:"bio"`
	Avatar   string `json:"avatar"`
}

func (req *UpdateUserRequest) Validate() error {
	if req.Email != "" {
		emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
		if !emailRegex.MatchString(req.Email) {
			return domainErrors.NewValidationError("有効なメールアドレス形式ではありません")
		}
	}
	if req.Password != "" && len(req.Password) < 4 {
		return domainErrors.NewValidationError("パスワードは最低4文字必要です")
	}
	return nil
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (req *LoginRequest) Validate() error {
	if req.Email == "" {
		return domainErrors.NewValidationError("メールアドレスは必須です")
	}
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(req.Email) {
		return domainErrors.NewValidationError("有効なメールアドレス形式ではありません")
	}
	if req.Password == "" {
		return domainErrors.NewValidationError("パスワードは必須です")
	}
	return nil
}

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

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type UserListResponse struct {
	Users      []*UserResponse `json:"users"`
	Pagination PaginationInfo  `json:"pagination"`
}

type PaginationInfo struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
	Total  int `json:"total,omitempty"`
}

type ErrorResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

type SuccessResponse struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data"`
}
