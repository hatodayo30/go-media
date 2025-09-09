package service

import (
	"context"
	"errors"

	"media-platform/internal/domain/repository"
	"media-platform/internal/presentation/dto"
	"media-platform/internal/presentation/presenter"

	domainErrors "media-platform/internal/domain/errors"
)

// CommentService はコメントに関するアプリケーションサービスを提供します
type CommentService struct {
	commentRepo      repository.CommentRepository
	contentRepo      repository.ContentRepository
	userRepo         repository.UserRepository
	commentPresenter *presenter.CommentPresenter
}

// NewCommentService は新しいCommentServiceのインスタンスを生成します
func NewCommentService(
	commentRepo repository.CommentRepository,
	contentRepo repository.ContentRepository,
	userRepo repository.UserRepository,
	commentPresenter *presenter.CommentPresenter,
) *CommentService {
	return &CommentService{
		commentRepo:      commentRepo,
		contentRepo:      contentRepo,
		userRepo:         userRepo,
		commentPresenter: commentPresenter,
	}
}

// GetCommentByID は指定したIDのコメントを取得します
func (s *CommentService) GetCommentByID(ctx context.Context, id int64) (*dto.CommentResponse, error) {
	comment, err := s.commentRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("コメントが見つかりません")
	}

	// ユーザー情報の取得
	user, err := s.userRepo.Find(ctx, comment.UserID)
	if err != nil {
		return nil, err
	}

	return s.commentPresenter.ToCommentResponseWithUser(comment, user), nil
}

// GetCommentsByContent はコンテンツに対するコメント一覧を取得します
func (s *CommentService) GetCommentsByContent(ctx context.Context, contentID int64, limit, offset int) (*dto.CommentListResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
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
		return nil, err
	}

	// 総コメント数の取得
	totalCount, err := s.commentRepo.CountByContent(ctx, contentID)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*dto.CommentResponse
	for _, comment := range comments {
		// ユーザー情報の取得
		user, err := s.userRepo.Find(ctx, comment.UserID)
		if err != nil {
			continue // ユーザー情報取得エラーは無視してコメントは表示
		}

		response := s.commentPresenter.ToCommentResponseWithUser(comment, user)

		// 返信の取得（最初の数件のみ）
		replies, err := s.commentRepo.FindReplies(ctx, comment.ID, 5, 0)
		if err == nil && len(replies) > 0 {
			response.Replies = make([]*dto.CommentResponse, 0, len(replies))
			for _, reply := range replies {
				// 返信のユーザー情報も取得
				replyUser, err := s.userRepo.Find(ctx, reply.UserID)
				if err != nil {
					continue
				}

				replyResponse := s.commentPresenter.ToCommentResponseWithUser(reply, replyUser)
				response.Replies = append(response.Replies, replyResponse)
			}
		}

		responses = append(responses, response)
	}

	return s.commentPresenter.ToCommentListResponse(responses, totalCount, limit), nil
}

// GetReplies はコメントに対する返信を取得します
func (s *CommentService) GetReplies(ctx context.Context, parentID int64, limit, offset int) ([]*dto.CommentResponse, error) {
	// 親コメントの存在確認
	parentComment, err := s.commentRepo.Find(ctx, parentID)
	if err != nil {
		return nil, err
	}
	if parentComment == nil {
		return nil, errors.New("親コメントが見つかりません")
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
		return nil, err
	}

	// レスポンスの作成
	var responses []*dto.CommentResponse
	for _, reply := range replies {
		// ユーザー情報の取得
		user, err := s.userRepo.Find(ctx, reply.UserID)
		if err != nil {
			continue
		}

		response := s.commentPresenter.ToCommentResponseWithUser(reply, user)
		responses = append(responses, response)
	}

	return responses, nil
}

// GetCommentsByUser はユーザーが投稿したコメント一覧を取得します
func (s *CommentService) GetCommentsByUser(ctx context.Context, userID int64, limit, offset int) (*dto.CommentListResponse, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ユーザーが見つかりません")
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
		return nil, err
	}

	// 総コメント数の取得
	totalCount, err := s.commentRepo.CountByUser(ctx, userID)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*dto.CommentResponse
	for _, comment := range comments {
		response := s.commentPresenter.ToCommentResponseWithUser(comment, user)
		responses = append(responses, response)
	}

	return s.commentPresenter.ToCommentListResponse(responses, totalCount, limit), nil
}

// CreateComment は新しいコメントを作成します
func (s *CommentService) CreateComment(ctx context.Context, userID int64, req *dto.CreateCommentRequest) (*dto.CommentResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, req.ContentID)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// 親コメントの存在確認（指定されている場合）
	if req.ParentID != nil {
		parentComment, err := s.commentRepo.Find(ctx, *req.ParentID)
		if err != nil {
			return nil, err
		}
		if parentComment == nil {
			return nil, errors.New("親コメントが見つかりません")
		}

		// 親コメントが同じコンテンツに属していることを確認
		if parentComment.ContentID != req.ContentID {
			return nil, errors.New("親コメントは同じコンテンツに属している必要があります")
		}

		// ネストレベルのチェック（返信の返信は許可しない）
		if parentComment.ParentID != nil {
			return nil, errors.New("コメントの入れ子は1レベルまでです")
		}
	}

	// コメントエンティティの作成
	comment := s.commentPresenter.ToCommentEntity(req, userID)

	// ドメインルールのバリデーション
	if err := comment.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コメントの保存
	if err := s.commentRepo.Create(ctx, comment); err != nil {
		return nil, err
	}

	// ユーザー情報の取得
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, err
	}

	return s.commentPresenter.ToCommentResponseWithUser(comment, user), nil
}

// UpdateComment はコメントを更新します
func (s *CommentService) UpdateComment(ctx context.Context, id int64, userID int64, userRole string, req *dto.UpdateCommentRequest) (*dto.CommentResponse, error) {
	// コメントの取得
	comment, err := s.commentRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("コメントが見つかりません")
	}

	// 編集権限のチェック
	if !comment.CanEdit(userID, userRole) {
		return nil, errors.New("このコメントを編集する権限がありません")
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
		return nil, err
	}

	// ユーザー情報の取得
	user, err := s.userRepo.Find(ctx, comment.UserID)
	if err != nil {
		return nil, err
	}

	return s.commentPresenter.ToCommentResponseWithUser(comment, user), nil
}

// DeleteComment はコメントを削除します
func (s *CommentService) DeleteComment(ctx context.Context, id int64, userID int64, userRole string) error {
	// コメントの取得
	comment, err := s.commentRepo.Find(ctx, id)
	if err != nil {
		return err
	}
	if comment == nil {
		return errors.New("コメントが見つかりません")
	}

	// 削除権限のチェック
	if !comment.CanDelete(userID, userRole) {
		return errors.New("このコメントを削除する権限がありません")
	}

	// コメントの削除
	return s.commentRepo.Delete(ctx, id)
}
