package entity

import (
	"errors"
	domainErrors "media-platform/backend/internal/domain/errors"
	"regexp"
	"strings"
	"time"
)

// User はユーザーエンティティを表す構造体です
type User struct {
	ID        int64     `json:"id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	Password  string    `json:"-"` // レスポンスにはパスワードを含めない
	Bio       string    `json:"bio"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate はユーザーエンティティのドメインルールを検証します
func (u *User) Validate() error {
	var errorMessages []string

	// ユーザー名のバリデーション
	if err := u.validateUsername(); err != nil {
		errorMessages = append(errorMessages, err.Error())
	}

	// メールアドレスのバリデーション
	if err := u.validateEmail(); err != nil {
		errorMessages = append(errorMessages, err.Error())
	}

	// ロールのバリデーション
	if err := u.validateRole(); err != nil {
		errorMessages = append(errorMessages, err.Error())
	}

	// パスワードは新規作成時や変更時のみ検証（空の場合はスキップ）
	if u.Password != "" {
		if err := u.validatePassword(); err != nil {
			errorMessages = append(errorMessages, err.Error())
		}
	}

	if len(errorMessages) > 0 {
		return domainErrors.NewValidationError(strings.Join(errorMessages, ", "))
	}

	return nil
}

// validateUsername はユーザー名のバリデーションを行います
func (u *User) validateUsername() error {
	if u.Username == "" {
		return errors.New("ユーザー名は必須です")
	}

	if len(u.Username) < 3 || len(u.Username) > 100 {
		return errors.New("ユーザー名は3〜100文字である必要があります")
	}

	// ユーザー名は英数字とアンダースコアのみ許可
	re := regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	if !re.MatchString(u.Username) {
		return errors.New("ユーザー名は英数字とアンダースコアのみ使用できます")
	}

	return nil
}

// validateEmail はメールアドレスのバリデーションを行います
func (u *User) validateEmail() error {
	if u.Email == "" {
		return errors.New("メールアドレスは必須です")
	}

	// シンプルなメールアドレス形式チェック
	re := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !re.MatchString(u.Email) {
		return errors.New("有効なメールアドレス形式ではありません")
	}

	return nil
}

// validatePassword はパスワードのバリデーションを行います（開発環境向けに緩和版）
func (u *User) validatePassword() error {
	if u.Password == "" {
		return errors.New("パスワードは必須です")
	}

	// 最低文字数を8文字から4文字に緩和（開発環境用）
	if len(u.Password) < 4 {
		return errors.New("パスワードは最低4文字必要です")
	}

	// 複雑な要件を簡素化 - 英数字のみチェック
	hasAlphaNum := regexp.MustCompile(`[a-zA-Z0-9]`).MatchString(u.Password)

	if !hasAlphaNum {
		return errors.New("パスワードには英数字を含む必要があります")
	}

	return nil
}

// validateRole はユーザーロールのバリデーションを行います
func (u *User) validateRole() error {
	validRoles := map[string]bool{
		"admin": true,
		"user":  true,
	}

	if u.Role == "" {
		u.Role = "user" // デフォルト値
		return nil
	}

	if !validRoles[u.Role] {
		return errors.New("ロールは 'admin' または 'user' である必要があります")
	}

	return nil
}

// SetUsername はユーザー名を設定し、バリデーションを行います
func (u *User) SetUsername(username string) error {
	u.Username = username
	u.UpdatedAt = time.Now()
	return u.validateUsername()
}

// SetEmail はメールアドレスを設定し、バリデーションを行います
func (u *User) SetEmail(email string) error {
	u.Email = email
	u.UpdatedAt = time.Now()
	return u.validateEmail()
}

// SetPassword はパスワードを設定し、バリデーションを行います
func (u *User) SetPassword(password string) error {
	u.Password = password
	u.UpdatedAt = time.Now()
	return u.validatePassword()
}

// SetRole はロールを設定し、バリデーションを行います
func (u *User) SetRole(role string) error {
	u.Role = role
	u.UpdatedAt = time.Now()
	return u.validateRole()
}

// SetBio はプロフィール文を設定します
func (u *User) SetBio(bio string) {
	u.Bio = bio
	u.UpdatedAt = time.Now()
}

// SetAvatar はアバター画像のURLを設定します
func (u *User) SetAvatar(avatar string) {
	u.Avatar = avatar
	u.UpdatedAt = time.Now()
}
