package presenter

import (
	"media-platform/internal/domain/entity"
	"media-platform/internal/usecase/dto" // ✅ 修正: presentation/dto → usecase/dto
)

// CommentPresenter はコメントエンティティをHTTPレスポンスDTOに変換します
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
	responses := make([]*dto.CommentResponse, 0, len(comments))
	for _, comment := range comments {
		responses = append(responses, p.ToCommentResponse(comment))
	}
	return responses
}

// ToCommentListResponse はコメント一覧レスポンスを作成します
func (p *CommentPresenter) ToCommentListResponse(comments []*dto.CommentResponse, totalCount int64, limit int) *dto.CommentListResponse {
	return &dto.CommentListResponse{
		Comments:   comments,
		TotalCount: totalCount,
		HasMore:    len(comments) == limit,
	}
}

// ⚠️ 削除されたメソッド
// - ToCommentEntity: Service層のtoCommentEntityメソッドで実装済み
// - ToCommentQueryEntity: 不要なパススルーメソッド
