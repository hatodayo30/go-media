package errors

import "fmt"

// DomainErrorType はドメインエラーの種類を表す型です
type DomainErrorType string

const (
	ValidationErrorType    DomainErrorType = "VALIDATION_ERROR"
	NotFoundErrorType      DomainErrorType = "NOT_FOUND_ERROR"
	ConflictErrorType      DomainErrorType = "CONFLICT_ERROR"
	PermissionErrorType    DomainErrorType = "PERMISSION_ERROR"
	BusinessLogicErrorType DomainErrorType = "BUSINESS_LOGIC_ERROR"
)

// DomainError はドメイン層のエラーを表すインターフェースです
type DomainError interface {
	error
	Type() DomainErrorType
	Code() string
	Details() map[string]interface{}
}

// ValidationError はバリデーションエラーを表す構造体です
type ValidationError struct {
	Message   string
	Field     string                 // どのフィールドでエラーが発生したか
	Value     interface{}            // エラーが発生した値
	ErrorCode string                 // エラーコード（i18n対応等で使用）
	Meta      map[string]interface{} // 追加情報
}

// NewValidationError は新しいValidationErrorを作成します
func NewValidationError(message string) *ValidationError {
	return &ValidationError{
		Message:   message,
		ErrorCode: "VALIDATION_FAILED",
		Meta:      make(map[string]interface{}),
	}
}

// NewValidationErrorWithField はフィールド指定付きのValidationErrorを作成します
func NewValidationErrorWithField(message, field string, value interface{}) *ValidationError {
	return &ValidationError{
		Message:   message,
		Field:     field,
		Value:     value,
		ErrorCode: "FIELD_VALIDATION_FAILED",
		Meta:      make(map[string]interface{}),
	}
}

// NewValidationErrorWithCode はコード指定付きのValidationErrorを作成します
func NewValidationErrorWithCode(message, code string) *ValidationError {
	return &ValidationError{
		Message:   message,
		ErrorCode: code,
		Meta:      make(map[string]interface{}),
	}
}

// Error はエラーインターフェースを満たすためのメソッドです
func (e *ValidationError) Error() string {
	if e.Field != "" {
		return fmt.Sprintf("%s (field: %s)", e.Message, e.Field)
	}
	return e.Message
}

// Type はDomainErrorインターフェースを満たすためのメソッドです
func (e *ValidationError) Type() DomainErrorType {
	return ValidationErrorType
}

// Code はエラーコードを返します
func (e *ValidationError) Code() string {
	return e.ErrorCode
}

// Details はエラーの詳細情報を返します
func (e *ValidationError) Details() map[string]interface{} {
	details := make(map[string]interface{})

	details["message"] = e.Message
	details["code"] = e.Code

	if e.Field != "" {
		details["field"] = e.Field
	}

	if e.Value != nil {
		details["value"] = e.Value
	}

	// メタデータを追加
	for k, v := range e.Meta {
		details[k] = v
	}

	return details
}

// WithField はフィールド情報を追加します
func (e *ValidationError) WithField(field string, value interface{}) *ValidationError {
	e.Field = field
	e.Value = value
	return e
}

// WithCode はエラーコードを設定します
func (e *ValidationError) WithCode(code string) *ValidationError {
	e.ErrorCode = code
	return e
}

// WithMeta はメタデータを追加します
func (e *ValidationError) WithMeta(key string, value interface{}) *ValidationError {
	e.Meta[key] = value
	return e
}

// NotFoundError はリソースが見つからないエラーを表す構造体です
type NotFoundError struct {
	Resource string
	ID       interface{}
	Message  string
}

// NewNotFoundError は新しいNotFoundErrorを作成します
func NewNotFoundError(resource string, id interface{}) *NotFoundError {
	return &NotFoundError{
		Resource: resource,
		ID:       id,
		Message:  fmt.Sprintf("%s with ID %v not found", resource, id),
	}
}

// Error はエラーインターフェースを満たすためのメソッドです
func (e *NotFoundError) Error() string {
	return e.Message
}

// Type はDomainErrorインターフェースを満たすためのメソッドです
func (e *NotFoundError) Type() DomainErrorType {
	return NotFoundErrorType
}

// Code はエラーコードを返します
func (e *NotFoundError) Code() string {
	return "RESOURCE_NOT_FOUND"
}

// Details はエラーの詳細情報を返します
func (e *NotFoundError) Details() map[string]interface{} {
	return map[string]interface{}{
		"resource": e.Resource,
		"id":       e.ID,
		"message":  e.Message,
	}
}

// ConflictError はリソースの競合エラーを表す構造体です
type ConflictError struct {
	Resource string
	Message  string
	Reason   string
}

// NewConflictError は新しいConflictErrorを作成します
func NewConflictError(resource, reason string) *ConflictError {
	return &ConflictError{
		Resource: resource,
		Reason:   reason,
		Message:  fmt.Sprintf("conflict in %s: %s", resource, reason),
	}
}

// Error はエラーインターフェースを満たすためのメソッドです
func (e *ConflictError) Error() string {
	return e.Message
}

// Type はDomainErrorインターフェースを満たすためのメソッドです
func (e *ConflictError) Type() DomainErrorType {
	return ConflictErrorType
}

// Code はエラーコードを返します
func (e *ConflictError) Code() string {
	return "RESOURCE_CONFLICT"
}

// Details はエラーの詳細情報を返します
func (e *ConflictError) Details() map[string]interface{} {
	return map[string]interface{}{
		"resource": e.Resource,
		"reason":   e.Reason,
		"message":  e.Message,
	}
}

// PermissionError は権限エラーを表す構造体です
type PermissionError struct {
	Action   string
	Resource string
	UserID   int64
	Message  string
}

// NewPermissionError は新しいPermissionErrorを作成します
func NewPermissionError(message string) *PermissionError {
	return &PermissionError{
		Message: message,
	}
}

// NewPermissionErrorWithDetails は詳細付きのPermissionErrorを作成します
func NewPermissionErrorWithDetails(action, resource string, userID int64) *PermissionError {
	return &PermissionError{
		Action:   action,
		Resource: resource,
		UserID:   userID,
		Message:  fmt.Sprintf("permission denied: cannot %s %s", action, resource),
	}
}

// Error はエラーインターフェースを満たすためのメソッドです
func (e *PermissionError) Error() string {
	return e.Message
}

// Type はDomainErrorインターフェースを満たすためのメソッドです
func (e *PermissionError) Type() DomainErrorType {
	return PermissionErrorType
}

// Code はエラーコードを返します
func (e *PermissionError) Code() string {
	return "PERMISSION_DENIED"
}

// Details はエラーの詳細情報を返します
func (e *PermissionError) Details() map[string]interface{} {
	return map[string]interface{}{
		"action":   e.Action,
		"resource": e.Resource,
		"user_id":  e.UserID,
		"message":  e.Message,
	}
}

// ヘルパー関数: エラータイプの判定
func IsValidationError(err error) bool {
	_, ok := err.(*ValidationError)
	return ok
}

func IsNotFoundError(err error) bool {
	_, ok := err.(*NotFoundError)
	return ok
}

func IsConflictError(err error) bool {
	_, ok := err.(*ConflictError)
	return ok
}

func IsPermissionError(err error) bool {
	_, ok := err.(*PermissionError)
	return ok
}

func IsDomainError(err error) bool {
	_, ok := err.(DomainError)
	return ok
}
