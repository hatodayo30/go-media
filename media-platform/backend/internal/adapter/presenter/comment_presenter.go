package presenter

import (
	"media-platform/internal/usecase/dto" // DTOのみに依存
)

type CommentPresenter struct{}

func NewCommentPresenter() *CommentPresenter {
	return &CommentPresenter{}
}

// HTTP Response DTO構造体
type HTTPCommentResponse struct {
	ID        int64          `json:"id"`
	Body      string         `json:"body"`
	UserID    int64          `json:"user_id"`
	ContentID int64          `json:"content_id"`
	ParentID  *int64         `json:"parent_id,omitempty"`
	User      *HTTPUserBrief `json:"user,omitempty"`
	CreatedAt string         `json:"created_at"`
	UpdatedAt string         `json:"updated_at,omitempty"`
}

type HTTPUserBrief struct {
	ID       int64  `json:"id"`
	Username string `json:"username"`
	Avatar   string `json:"avatar,omitempty"`
}

type HTTPCommentListResponse struct {
	Comments   []*HTTPCommentResponse `json:"comments"`
	TotalCount int64                  `json:"total_count"`
	HasMore    bool                   `json:"has_more"`
}

// UseCase DTO → HTTP Response DTO変換
func (p *CommentPresenter) ToHTTPCommentResponse(commentDTO *dto.CommentResponse) *HTTPCommentResponse {
	if commentDTO == nil {
		return nil
	}

	response := &HTTPCommentResponse{
		ID:        commentDTO.ID,
		Body:      commentDTO.Body,
		UserID:    commentDTO.UserID,
		ContentID: commentDTO.ContentID,
		ParentID:  commentDTO.ParentID,
		CreatedAt: commentDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: commentDTO.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	// UserBriefが存在する場合
	if commentDTO.User != nil {
		response.User = &HTTPUserBrief{
			ID:       commentDTO.User.ID,
			Username: commentDTO.User.Username,
			Avatar:   commentDTO.User.Avatar,
		}
	}

	return response
}

func (p *CommentPresenter) ToHTTPCommentResponseList(commentDTOs []*dto.CommentResponse) []*HTTPCommentResponse {
	if commentDTOs == nil {
		return []*HTTPCommentResponse{}
	}

	responses := make([]*HTTPCommentResponse, 0, len(commentDTOs))
	for _, commentDTO := range commentDTOs {
		if commentDTO != nil {
			responses = append(responses, p.ToHTTPCommentResponse(commentDTO))
		}
	}
	return responses
}

func (p *CommentPresenter) ToHTTPCommentListResponse(commentDTOs []*dto.CommentResponse, totalCount int64, hasMore bool) *HTTPCommentListResponse {
	return &HTTPCommentListResponse{
		Comments:   p.ToHTTPCommentResponseList(commentDTOs),
		TotalCount: totalCount,
		HasMore:    hasMore,
	}
}
