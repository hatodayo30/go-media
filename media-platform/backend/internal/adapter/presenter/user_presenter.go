package presenter

import (
	"media-platform/internal/domain/entity"
	"media-platform/internal/usecase/dto"
)

// UserPresenter はEntity/Use Case DTOからHTTPレスポンス用のDTOに変換します
type UserPresenter struct{}

// NewUserPresenter は新しいUserPresenterのインスタンスを生成します
func NewUserPresenter() *UserPresenter {
	return &UserPresenter{}
}

// ========== HTTP Response DTO構造体（Presenter内で定義） ==========

// HTTPUserResponse はHTTPレスポンス用のユーザー情報です
type HTTPUserResponse struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email,omitempty"`
	Bio       string `json:"bio,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	Role      string `json:"role,omitempty"`
	CreatedAt string `json:"created_at"` // RFC3339形式の文字列
	UpdatedAt string `json:"updated_at,omitempty"`
}

// HTTPLoginResponse はHTTPレスポンス用のログイン情報です
type HTTPLoginResponse struct {
	Token string           `json:"token"`
	User  HTTPUserResponse `json:"user"`
}

// HTTPPublicUserResponse は公開用のHTTPレスポンス用ユーザー情報です
type HTTPPublicUserResponse struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Bio       string `json:"bio,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	CreatedAt string `json:"created_at"`
}

// ========== Application DTO → HTTP Response DTO変換 ==========

// ToHTTPUserResponse はApplication DTOをHTTPレスポンス用DTOに変換します
func (p *UserPresenter) ToHTTPUserResponse(appDTO *dto.UserResponse) *HTTPUserResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPUserResponse{
		ID:        appDTO.ID,
		Username:  appDTO.Username,
		Email:     appDTO.Email,
		Bio:       appDTO.Bio,
		Avatar:    appDTO.Avatar,
		Role:      appDTO.Role,
		CreatedAt: appDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: appDTO.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ToHTTPUserResponseList はApplication DTOリストをHTTPレスポンス用DTOリストに変換します
func (p *UserPresenter) ToHTTPUserResponseList(appDTOs []*dto.UserResponse) []*HTTPUserResponse {
	if appDTOs == nil {
		return []*HTTPUserResponse{}
	}

	responses := make([]*HTTPUserResponse, len(appDTOs))
	for i, appDTO := range appDTOs {
		responses[i] = p.ToHTTPUserResponse(appDTO)
	}
	return responses
}

// ToHTTPLoginResponse はApplication LoginDTOをHTTPレスポンス用DTOに変換します
func (p *UserPresenter) ToHTTPLoginResponse(appDTO *dto.LoginResponse) *HTTPLoginResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPLoginResponse{
		Token: appDTO.Token,
		User:  *p.ToHTTPUserResponse(&appDTO.User),
	}
}

// ToHTTPPublicUserResponse は公開用のHTTPレスポンス用DTOに変換します
func (p *UserPresenter) ToHTTPPublicUserResponse(appDTO *dto.UserResponse) *HTTPPublicUserResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPPublicUserResponse{
		ID:        appDTO.ID,
		Username:  appDTO.Username,
		Bio:       appDTO.Bio,
		Avatar:    appDTO.Avatar,
		CreatedAt: appDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		// Email, Role, UpdatedAtは公開しない
	}
}

// ToHTTPPublicUserResponseList は公開用のHTTPレスポンス用DTOリストに変換します
func (p *UserPresenter) ToHTTPPublicUserResponseList(appDTOs []*dto.UserResponse) []*HTTPPublicUserResponse {
	if appDTOs == nil {
		return []*HTTPPublicUserResponse{}
	}

	responses := make([]*HTTPPublicUserResponse, len(appDTOs))
	for i, appDTO := range appDTOs {
		responses[i] = p.ToHTTPPublicUserResponse(appDTO)
	}
	return responses
}

// ========== Entity → HTTP Response DTO変換（直接変換用） ==========

// EntityToHTTPUserResponse はEntityを直接HTTPレスポンス用DTOに変換します
func (p *UserPresenter) EntityToHTTPUserResponse(user *entity.User) *HTTPUserResponse {
	if user == nil {
		return nil
	}

	return &HTTPUserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Bio:       user.Bio,
		Avatar:    user.Avatar,
		Role:      user.Role,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// EntityToHTTPUserResponseList はEntityリストを直接HTTPレスポンス用DTOリストに変換します
func (p *UserPresenter) EntityToHTTPUserResponseList(users []*entity.User) []*HTTPUserResponse {
	if users == nil {
		return []*HTTPUserResponse{}
	}

	responses := make([]*HTTPUserResponse, len(users))
	for i, user := range users {
		responses[i] = p.EntityToHTTPUserResponse(user)
	}
	return responses
}

// ========== 下位互換性のためのメソッド（既存DTOとの互換性） ==========

// ToUserResponse は後方互換性のためのメソッドです（既存のPresentation DTOを使用）
func (p *UserPresenter) ToUserResponse(user *entity.User) *dto.UserResponse {
	if user == nil {
		return nil
	}

	return &dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Bio:       user.Bio,
		Avatar:    user.Avatar,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}

// ToUserResponseList は後方互換性のためのメソッドです
func (p *UserPresenter) ToUserResponseList(users []*entity.User) []*dto.UserResponse {
	if users == nil {
		return []*dto.UserResponse{}
	}

	responses := make([]*dto.UserResponse, len(users))
	for i, user := range users {
		responses[i] = p.ToUserResponse(user)
	}
	return responses
}
