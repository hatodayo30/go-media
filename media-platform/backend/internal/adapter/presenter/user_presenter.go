package presenter

import (
	"media-platform/internal/usecase/dto" // UseCase DTOのみに依存
)

type UserPresenter struct{}

func NewUserPresenter() *UserPresenter {
	return &UserPresenter{}
}

// ========== HTTP Response DTO構造体 ==========

type HTTPUserResponse struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email,omitempty"`
	Bio       string `json:"bio,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	Role      string `json:"role,omitempty"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

type HTTPLoginResponse struct {
	Token string           `json:"token"`
	User  HTTPUserResponse `json:"user"`
}

type HTTPPublicUserResponse struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Bio       string `json:"bio,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	CreatedAt string `json:"created_at"`
}

// ========== UseCase DTO → HTTP Response DTO変換のみ ==========

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

func (p *UserPresenter) ToHTTPLoginResponse(appDTO *dto.LoginResponse) *HTTPLoginResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPLoginResponse{
		Token: appDTO.Token,
		User:  *p.ToHTTPUserResponse(&appDTO.User),
	}
}

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
	}
}

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
