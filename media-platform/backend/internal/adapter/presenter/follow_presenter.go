package presenter

import (
	"media-platform/internal/usecase/dto"
)

type FollowPresenter struct{}

func NewFollowPresenter() *FollowPresenter {
	return &FollowPresenter{}
}

// ========== HTTP Response DTO構造体 ==========

type HTTPFollowResponse struct {
	ID          int64  `json:"id"`
	FollowerID  int64  `json:"follower_id"`
	FollowingID int64  `json:"following_id"`
	CreatedAt   string `json:"created_at"`
}

type HTTPFollowStatsResponse struct {
	FollowersCount int64 `json:"followers_count"`
	FollowingCount int64 `json:"following_count"`
	IsFollowing    bool  `json:"is_following"`
	IsFollowedBy   bool  `json:"is_followed_by"`
	IsMutualFollow bool  `json:"is_mutual_follow"`
}

type HTTPFollowUserResponse struct {
	User      HTTPUserResponse `json:"user"`
	CreatedAt string           `json:"followed_at"`
}

type HTTPFollowersResponse struct {
	Followers []HTTPFollowUserResponse `json:"followers"`
	Total     int                      `json:"total"`
}

type HTTPFollowingResponse struct {
	Following []HTTPFollowUserResponse `json:"following"`
	Total     int                      `json:"total"`
}

type HTTPFollowingFeedResponse struct {
	Feed       []HTTPContentResponse  `json:"feed"`
	Pagination HTTPPaginationResponse `json:"pagination"`
}

type HTTPPaginationResponse struct {
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
	Total  int `json:"total"`
}

type HTTPUserDetailResponse struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email,omitempty"`
	Bio       string `json:"bio,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
	Role      string `json:"role,omitempty"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

type HTTPFollowContentResponse struct {
	ID                  int64    `json:"id"`
	Title               string   `json:"title"`
	Body                string   `json:"body"`
	Type                string   `json:"type"`
	AuthorID            int64    `json:"author_id"`
	CategoryID          *int64   `json:"category_id,omitempty"`
	Status              string   `json:"status"`
	ViewCount           int      `json:"view_count"`
	PublishedAt         *string  `json:"published_at,omitempty"`
	CreatedAt           string   `json:"created_at"`
	UpdatedAt           string   `json:"updated_at"`
	WorkTitle           string   `json:"work_title,omitempty"`
	Rating              *float64 `json:"rating,omitempty"`
	RecommendationLevel string   `json:"recommendation_level,omitempty"`
	Tags                []string `json:"tags,omitempty"`
	ImageURL            string   `json:"image_url,omitempty"`
	ExternalURL         string   `json:"external_url,omitempty"`
	ReleaseYear         *int     `json:"release_year,omitempty"`
	ArtistName          string   `json:"artist_name,omitempty"`
	Genre               string   `json:"genre,omitempty"`
}

// ========== UseCase DTO → HTTP Response DTO変換 ==========

func (p *FollowPresenter) ToHTTPFollowResponse(appDTO *dto.FollowResponse) *HTTPFollowResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPFollowResponse{
		ID:          appDTO.ID,
		FollowerID:  appDTO.FollowerID,
		FollowingID: appDTO.FollowingID,
		CreatedAt:   appDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func (p *FollowPresenter) ToHTTPFollowStatsResponse(appDTO *dto.FollowStatsResponse) *HTTPFollowStatsResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPFollowStatsResponse{
		FollowersCount: appDTO.FollowersCount,
		FollowingCount: appDTO.FollowingCount,
		IsFollowing:    appDTO.IsFollowing,
		IsFollowedBy:   appDTO.IsFollowedBy,
		IsMutualFollow: appDTO.IsMutualFollow,
	}
}

func (p *FollowPresenter) ToHTTPFollowUserResponse(appDTO *dto.FollowUserResponse) *HTTPFollowUserResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPFollowUserResponse{
		User: HTTPUserResponse{
			ID:        appDTO.User.ID,
			Username:  appDTO.User.Username,
			Email:     appDTO.User.Email,
			Bio:       appDTO.User.Bio,
			Avatar:    appDTO.User.Avatar,
			Role:      appDTO.User.Role,
			CreatedAt: appDTO.User.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: appDTO.User.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		},
		CreatedAt: appDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

func (p *FollowPresenter) ToHTTPFollowUserResponseList(appDTOs []dto.FollowUserResponse) []HTTPFollowUserResponse {
	if appDTOs == nil {
		return []HTTPFollowUserResponse{}
	}

	responses := make([]HTTPFollowUserResponse, len(appDTOs))
	for i, appDTO := range appDTOs {
		response := p.ToHTTPFollowUserResponse(&appDTO)
		if response != nil {
			responses[i] = *response
		}
	}
	return responses
}

func (p *FollowPresenter) ToHTTPFollowersResponse(appDTO *dto.FollowersResponse) *HTTPFollowersResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPFollowersResponse{
		Followers: p.ToHTTPFollowUserResponseList(appDTO.Followers),
		Total:     appDTO.Total,
	}
}

func (p *FollowPresenter) ToHTTPFollowingResponse(appDTO *dto.FollowingResponse) *HTTPFollowingResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPFollowingResponse{
		Following: p.ToHTTPFollowUserResponseList(appDTO.Following),
		Total:     appDTO.Total,
	}
}

func (p *FollowPresenter) ToHTTPContentResponse(appDTO *dto.ContentResponse) *HTTPContentResponse {
	if appDTO == nil {
		return nil
	}

	response := &HTTPContentResponse{
		ID:         appDTO.ID,
		Title:      appDTO.Title,
		Body:       appDTO.Body,
		Type:       appDTO.Type,
		AuthorID:   appDTO.AuthorID,
		CategoryID: appDTO.CategoryID,
		Status:     appDTO.Status,
		ViewCount:  appDTO.ViewCount,
		CreatedAt:  appDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:  appDTO.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if appDTO.PublishedAt != nil {
		publishedAt := appDTO.PublishedAt.Format("2006-01-02T15:04:05Z07:00")
		response.PublishedAt = publishedAt
	}

	// Optional fields

	if appDTO.Genre != "" {
		response.Genre = appDTO.Genre
	}

	return response
}

func (p *FollowPresenter) ToHTTPContentResponseList(appDTOs []dto.ContentResponse) []HTTPContentResponse {
	if appDTOs == nil {
		return []HTTPContentResponse{}
	}

	responses := make([]HTTPContentResponse, len(appDTOs))
	for i, appDTO := range appDTOs {
		response := p.ToHTTPContentResponse(&appDTO)
		if response != nil {
			responses[i] = *response
		}
	}
	return responses
}

func (p *FollowPresenter) ToHTTPFollowingFeedResponse(appDTO *dto.FollowingFeedResponse) *HTTPFollowingFeedResponse {
	if appDTO == nil {
		return nil
	}

	return &HTTPFollowingFeedResponse{
		Feed: p.ToHTTPContentResponseList(appDTO.Feed),
		Pagination: HTTPPaginationResponse{
			Limit:  appDTO.Pagination.Limit,
			Offset: appDTO.Pagination.Offset,
			Total:  appDTO.Pagination.Total,
		},
	}
}
