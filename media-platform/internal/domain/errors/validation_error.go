package errors

// ValidationError はバリデーションエラーを表す構造体です
type ValidationError struct {
	Message string
}

// NewValidationError は新しいValidationErrorを作成します
func NewValidationError(message string) *ValidationError {
	return &ValidationError{
		Message: message,
	}
}

// Error はエラーインターフェースを満たすためのメソッドです
func (e *ValidationError) Error() string {
	return e.Message
}
