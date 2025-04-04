// pkg/validator/validator.go
package validator

import (
	"errors"
	"regexp"
	"strings"

	validator "github.com/go-playground/validator/v10"
)

// Validator はアプリケーション全体で使用するバリデーションロジックを提供します
type Validator struct {
	validate *validator.Validate
}

// NewValidator は新しいValidatorインスタンスを作成します
func NewValidator() *Validator {
	v := validator.New()

	// カスタムバリデーションの登録
	v.RegisterValidation("username", validateUsername)
	v.RegisterValidation("password", validatePassword)

	return &Validator{
		validate: v,
	}
}

// Validate は構造体のバリデーションを行います
func (v *Validator) Validate(s interface{}) error {
	err := v.validate.Struct(s)
	if err != nil {
		if _, ok := err.(*validator.InvalidValidationError); ok {
			return errors.New("バリデーションエラー: 無効なオブジェクト")
		}

		var errorMessages []string
		for _, err := range err.(validator.ValidationErrors) {
			fieldName := err.Field()
			switch err.Tag() {
			case "required":
				errorMessages = append(errorMessages, fieldName+"は必須です")
			case "email":
				errorMessages = append(errorMessages, fieldName+"は有効なメールアドレスではありません")
			case "min":
				errorMessages = append(errorMessages, fieldName+"は"+err.Param()+"文字以上必要です")
			case "max":
				errorMessages = append(errorMessages, fieldName+"は"+err.Param()+"文字以内である必要があります")
			case "username":
				errorMessages = append(errorMessages, fieldName+"は英数字とアンダースコアのみ使用できます")
			case "password":
				errorMessages = append(errorMessages, fieldName+"は少なくとも1つの数字、大文字、小文字を含む必要があります")
			default:
				errorMessages = append(errorMessages, fieldName+"の値が無効です")
			}
		}
		return errors.New(strings.Join(errorMessages, "、"))
	}

	return nil
}

// ValidateEmail はメールアドレスの形式を検証します
func (v *Validator) ValidateEmail(email string) bool {
	return v.validate.Var(email, "required,email") == nil
}

// ValidatePassword はパスワードの強度を検証します
func (v *Validator) ValidatePassword(password string) bool {
	return v.validate.Var(password, "required,min=8,password") == nil
}

// カスタムバリデーション関数

// validateUsername はユーザー名が有効か検証します
func validateUsername(fl validator.FieldLevel) bool {
	username := fl.Field().String()
	// ユーザー名は英数字とアンダースコアのみ許可
	re := regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	return re.MatchString(username)
}

// validatePassword はパスワードが十分な強度か検証します
func validatePassword(fl validator.FieldLevel) bool {
	password := fl.Field().String()
	// 少なくとも1つの数字を含む
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	// 少なくとも1つの大文字を含む
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	// 少なくとも1つの小文字を含む
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)

	return hasNumber && hasUpper && hasLower
}
