package model

import "time"

type User struct {
	ID        uint      `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // JSONレスポンスには含めない
	Bio       string    `json:"bio"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"` // admin, editor, user など
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
