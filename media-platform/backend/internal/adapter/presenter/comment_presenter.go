package presenter

import (
	"time"

	"media-platform/internal/domain/entity"
	"media-platform/internal/presentation/dto"
)

// CommentPresenter はコメントエンティティをDTOに変換します
type CommentPresenter struct{}

// NewCommentPresenter は新しいCommentPresenterのインスタンスを生成します
func NewCommentPresenter() *CommentPresenter {
	return &CommentPresenter{}
}

// ToCommentResponse はCommentエンティティをCommentResponseに変換します
func (p *CommentPresenter) ToCommentResponse(comment *entity.Comment) *dto.CommentResponse {
	return &dto.CommentResponse{
		ID:        comment.ID,
		Body:      comment.Body,
		UserID:    comment.UserID,
		ContentID: comment.ContentID,
		ParentID:  comment.ParentID,
		CreatedAt: comment.CreatedAt,
		UpdatedAt: comment.UpdatedAt,
	}
}

// ToCommentResponseWithUser はユーザー情報付きのCommentResponseを作成します
func (p *CommentPresenter) ToCommentResponseWithUser(comment *entity.Comment, user *entity.User) *dto.CommentResponse {
	response := p.ToCommentResponse(comment)

	if user != nil {
		response.User = &dto.UserBrief{
			ID:       user.ID,
			Username: user.Username,
			Avatar:   user.Avatar,
		}
	}

	return response
}

// ToCommentResponseList はCommentエンティティのスライスをCommentResponseのスライスに変換します
func (p *CommentPresenter) ToCommentResponseList(comments []*entity.Comment) []*dto.CommentResponse {
	var responses []*dto.CommentResponse
	for _, comment := range comments {
		responses = append(responses, p.ToCommentResponse(comment))
	}
	return responses
}

// ToCommentEntity はCreateCommentRequestからCommentエンティティを生成します
func (p *CommentPresenter) ToCommentEntity(req *dto.CreateCommentRequest, userID int64) *entity.Comment {
	now := time.Now()
	return &entity.Comment{
		Body:      req.Body,
		UserID:    userID,
		ContentID: req.ContentID,
		ParentID:  req.ParentID,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// ToCommentListResponse はコメント一覧レスポンスを作成します
func (p *CommentPresenter) ToCommentListResponse(comments []*dto.CommentResponse, totalCount int, limit int) *dto.CommentListResponse {
	hasMore := len(comments) == limit && totalCount > len(comments)

	return &dto.CommentListResponse{
		Comments:   comments,
		TotalCount: totalCount,
		HasMore:    hasMore,
	}
}

// ToCommentQueryEntity はCommentQueryをエンティティ用のクエリに変換します
func (p *CommentPresenter) ToCommentQueryEntity(query *dto.CommentQuery) *dto.CommentQuery {
	// 現在はDTOとエンティティで同じ構造のため、そのまま返す
	// 将来的に構造が変わる場合はここで変換処理を追加
	return query
}
