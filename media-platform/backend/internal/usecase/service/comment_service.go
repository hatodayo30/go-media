package service

import (
	"context"
	"fmt"
	"time"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
	"media-platform/internal/usecase/dto"
)

// CommentService はコメントに関するアプリケーションサービスを提供します
type CommentService struct {
	commentRepo repository.CommentRepository
	contentRepo repository.ContentRepository
	userRepo    repository.UserRepository
}

// NewCommentService は新しいCommentServiceのインスタンスを生成します
func NewCommentService(
	commentRepo repository.CommentRepository,
	contentRepo repository.ContentRepository,
	userRepo repository.UserRepository,
) *CommentService {
	return &CommentService{
		commentRepo: commentRepo,
		contentRepo: contentRepo,
		userRepo:    userRepo,
	}
}

// ========== Entity to DTO変換メソッド（Service内で実装） ==========

// toCommentResponse はEntityをCommentResponseに変換します
func (s *CommentService) toCommentResponse(comment *entity.Comment) *dto.CommentResponse {
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

// toCommentResponseWithUser はEntityとUserをCommentResponseに変換します
func (s *CommentService) toCommentResponseWithUser(comment *entity.Comment, user *entity.User) *dto.CommentResponse {
	response := s.toCommentResponse(comment)
	if user != nil {
		response.User = &dto.UserBrief{
			ID:       user.ID,
			Username: user.Username,
			Avatar:   user.Avatar,
		}
	}
	return response
}

// toCommentResponseList はEntityスライスをCommentResponseスライスに変換します
func (s *CommentService) toCommentResponseList(comments []*entity.Comment) []*dto.CommentResponse {
	responses := make([]*dto.CommentResponse, len(comments))
	for i, comment := range comments {
		responses[i] = s.toCommentResponse(comment)
	}
	return responses
}

// toCommentListResponse はCommentResponseリストをCommentListResponseに変換します
func (s *CommentService) toCommentListResponse(responses []*dto.CommentResponse, totalCount int64, limit int) *dto.CommentListResponse {
	return &dto.CommentListResponse{
		Comments:   responses,
		TotalCount: totalCount,
		HasMore:    len(responses) == limit,
	}
}

// toCommentEntity はCreateCommentRequestからEntityを作成します
func (s *CommentService) toCommentEntity(req *dto.CreateCommentRequest, userID int64) *entity.Comment {
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

// ========== Use Cases ==========

// GetCommentByID は指定したIDのコメントを取得します
func (s *CommentService) GetCommentByID(ctx context.Context, id int64) (*dto.CommentResponse, error) {
	comment, err := s.commentRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("comment lookup failed: %w", err)
	}
	if comment == nil {
		return nil, domainErrors.NewNotFoundError("Comment", id)
	}

	// ユーザー情報の取得
	user, err := s.userRepo.Find(ctx, comment.UserID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}

	return s.toCommentResponseWithUser(comment, user), nil
}

// GetCommentsByContent はコンテンツに対するコメント一覧を取得します
func (s *CommentService) GetCommentsByContent(ctx context.Context, contentID int64, limit, offset int) (*dto.CommentListResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", contentID)
	}

	// デフォルト値の設定
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	// 親コメントのみを取得（ParentID=null）
	query := &dto.CommentQuery{
		ContentID: &contentID,
		ParentID:  nil, // 親コメントのみ
		Limit:     limit,
		Offset:    offset,
	}

	comments, err := s.commentRepo.FindAll(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("comments lookup failed: %w", err)
	}

	// 総コメント数の取得
	totalCount, err := s.commentRepo.CountByContent(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("comments count failed: %w", err)
	}

	// レスポンスの作成
	var responses []*dto.CommentResponse
	for _, comment := range comments {
		// ユーザー情報の取得
		user, err := s.userRepo.Find(ctx, comment.UserID)
		if err != nil {
			// ユーザー情報取得エラーは無視してコメントは表示
			user = nil
		}

		response := s.toCommentResponseWithUser(comment, user)

		// 返信の取得（最初の数件のみ）
		replies, err := s.commentRepo.FindReplies(ctx, comment.ID, 5, 0)
		if err == nil && len(replies) > 0 {
			response.Replies = make([]*dto.CommentResponse, 0, len(replies))
			for _, reply := range replies {
				// 返信のユーザー情報も取得
				replyUser, err := s.userRepo.Find(ctx, reply.UserID)
				if err != nil {
					replyUser = nil
				}

				replyResponse := s.toCommentResponseWithUser(reply, replyUser)
				response.Replies = append(response.Replies, replyResponse)
			}
		}

		responses = append(responses, response)
	}

	return s.toCommentListResponse(responses, totalCount, limit), nil
}

// GetReplies はコメントに対する返信を取得します
func (s *CommentService) GetReplies(ctx context.Context, parentID int64, limit, offset int) ([]*dto.CommentResponse, error) {
	// 親コメントの存在確認
	parentComment, err := s.commentRepo.Find(ctx, parentID)
	if err != nil {
		return nil, fmt.Errorf("parent comment lookup failed: %w", err)
	}
	if parentComment == nil {
		return nil, domainErrors.NewNotFoundError("Comment", parentID)
	}

	// デフォルト値の設定
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	// 返信の取得
	replies, err := s.commentRepo.FindReplies(ctx, parentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("replies lookup failed: %w", err)
	}

	// レスポンスの作成
	var responses []*dto.CommentResponse
	for _, reply := range replies {
		// ユーザー情報の取得
		user, err := s.userRepo.Find(ctx, reply.UserID)
		if err != nil {
			user = nil
		}

		response := s.toCommentResponseWithUser(reply, user)
		responses = append(responses, response)
	}

	return responses, nil
}

// GetCommentsByUser はユーザーが投稿したコメント一覧を取得します
func (s *CommentService) GetCommentsByUser(ctx context.Context, userID int64, limit, offset int) (*dto.CommentListResponse, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", userID)
	}

	// デフォルト値の設定
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	// コメントの取得
	comments, err := s.commentRepo.FindByUser(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("user comments lookup failed: %w", err)
	}

	// 総コメント数の取得
	totalCount, err := s.commentRepo.CountByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user comments count failed: %w", err)
	}

	// レスポンスの作成
	var responses []*dto.CommentResponse
	for _, comment := range comments {
		response := s.toCommentResponseWithUser(comment, user)
		responses = append(responses, response)
	}

	return s.toCommentListResponse(responses, totalCount, limit), nil
}

// CreateComment は新しいコメントを作成します
func (s *CommentService) CreateComment(ctx context.Context, userID int64, req *dto.CreateCommentRequest) (*dto.CommentResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, req.ContentID)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", req.ContentID)
	}

	// 親コメントの存在確認（指定されている場合）
	if req.ParentID != nil {
		parentComment, err := s.commentRepo.Find(ctx, *req.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent comment lookup failed: %w", err)
		}
		if parentComment == nil {
			return nil, domainErrors.NewNotFoundError("Comment", *req.ParentID)
		}

		// 親コメントが同じコンテンツに属していることを確認
		if parentComment.ContentID != req.ContentID {
			return nil, domainErrors.NewValidationError("親コメントは同じコンテンツに属している必要があります")
		}

		// ネストレベルのチェック（返信の返信は許可しない）
		if parentComment.ParentID != nil {
			return nil, domainErrors.NewValidationError("コメントの入れ子は1レベルまでです")
		}
	}

	// コメントエンティティの作成
	comment := s.toCommentEntity(req, userID)

	// ドメインルールのバリデーション
	if err := comment.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コメントの保存
	if err := s.commentRepo.Create(ctx, comment); err != nil {
		return nil, fmt.Errorf("comment creation failed: %w", err)
	}

	// ユーザー情報の取得
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}

	return s.toCommentResponseWithUser(comment, user), nil
}

// UpdateComment はコメントを更新します
func (s *CommentService) UpdateComment(ctx context.Context, id int64, userID int64, userRole string, req *dto.UpdateCommentRequest) (*dto.CommentResponse, error) {
	// コメントの取得
	comment, err := s.commentRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("comment lookup failed: %w", err)
	}
	if comment == nil {
		return nil, domainErrors.NewNotFoundError("Comment", id)
	}

	// 編集権限のチェック
	if !comment.CanEdit(userID, userRole) {
		return nil, domainErrors.NewValidationError("このコメントを編集する権限がありません")
	}

	// 本文の更新
	if err := comment.SetBody(req.Body); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// ドメインルールのバリデーション
	if err := comment.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コメントの更新
	if err := s.commentRepo.Update(ctx, comment); err != nil {
		return nil, fmt.Errorf("comment update failed: %w", err)
	}

	// ユーザー情報の取得
	user, err := s.userRepo.Find(ctx, comment.UserID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}

	return s.toCommentResponseWithUser(comment, user), nil
}

// DeleteComment はコメントを削除します
func (s *CommentService) DeleteComment(ctx context.Context, id int64, userID int64, userRole string) error {
	// コメントの取得
	comment, err := s.commentRepo.Find(ctx, id)
	if err != nil {
		return fmt.Errorf("comment lookup failed: %w", err)
	}
	if comment == nil {
		return domainErrors.NewNotFoundError("Comment", id)
	}

	// 削除権限のチェック
	if !comment.CanDelete(userID, userRole) {
		return domainErrors.NewValidationError("このコメントを削除する権限がありません")
	}

	// コメントの削除
	if err := s.commentRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("comment deletion failed: %w", err)
	}

	return nil
}
