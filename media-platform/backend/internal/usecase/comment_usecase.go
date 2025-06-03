package usecase

import (
	"context"
	"errors"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
	"time"
)

// CommentUseCase はコメントに関するユースケースを提供します
type CommentUseCase struct {
	commentRepo repository.CommentRepository
	contentRepo repository.ContentRepository
	userRepo    repository.UserRepository
}

// NewCommentUseCase は新しいCommentUseCaseのインスタンスを生成します
func NewCommentUseCase(
	commentRepo repository.CommentRepository,
	contentRepo repository.ContentRepository,
	userRepo repository.UserRepository,
) *CommentUseCase {
	return &CommentUseCase{
		commentRepo: commentRepo,
		contentRepo: contentRepo,
		userRepo:    userRepo,
	}
}

// GetCommentByID は指定したIDのコメントを取得します
func (u *CommentUseCase) GetCommentByID(ctx context.Context, id int64) (*model.CommentResponse, error) {
	comment, err := u.commentRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if comment == nil {
		return nil, errors.New("コメントが見つかりません")
	}

	response := comment.ToResponse()

	// ユーザー情報の取得（オプション）
	user, err := u.userRepo.Find(ctx, comment.UserID)
	if err == nil && user != nil {
		response.User = &model.UserBrief{
			ID:       user.ID,
			Username: user.Username,
			Avatar:   user.Avatar,
		}
	}

	return response, nil
}

// GetCommentsByContent はコンテンツに対するコメント一覧を取得します
func (u *CommentUseCase) GetCommentsByContent(ctx context.Context, contentID int64, limit, offset int) ([]*model.CommentResponse, int, error) {
	// コンテンツの存在確認
	content, err := u.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, 0, err
	}
	if content == nil {
		return nil, 0, errors.New("コンテンツが見つかりません")
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
	query := &model.CommentQuery{
		ContentID: &contentID,
		ParentID:  nil, // 親コメントのみ
		Limit:     limit,
		Offset:    offset,
	}

	comments, err := u.commentRepo.FindAll(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	// 総コメント数の取得
	totalCount, err := u.commentRepo.CountByContent(ctx, contentID)
	if err != nil {
		return nil, 0, err
	}

	// レスポンスの作成
	var responses []*model.CommentResponse
	for _, comment := range comments {
		response := comment.ToResponse()

		// ユーザー情報の取得
		user, err := u.userRepo.Find(ctx, comment.UserID)
		if err == nil && user != nil {
			response.User = &model.UserBrief{
				ID:       user.ID,
				Username: user.Username,
				Avatar:   user.Avatar,
			}
		}

		// 返信の取得（最初の数件のみ）
		replies, err := u.commentRepo.FindReplies(ctx, comment.ID, 5, 0)
		if err == nil && len(replies) > 0 {
			response.Replies = make([]*model.CommentResponse, 0, len(replies))
			for _, reply := range replies {
				replyResponse := reply.ToResponse()

				// 返信のユーザー情報も取得
				replyUser, err := u.userRepo.Find(ctx, reply.UserID)
				if err == nil && replyUser != nil {
					replyResponse.User = &model.UserBrief{
						ID:       replyUser.ID,
						Username: replyUser.Username,
						Avatar:   replyUser.Avatar,
					}
				}

				response.Replies = append(response.Replies, replyResponse)
			}
		}

		responses = append(responses, response)
	}

	return responses, totalCount, nil
}

// GetReplies はコメントに対する返信を取得します
func (u *CommentUseCase) GetReplies(ctx context.Context, parentID int64, limit, offset int) ([]*model.CommentResponse, error) {
	// 親コメントの存在確認
	parentComment, err := u.commentRepo.Find(ctx, parentID)
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
	replies, err := u.commentRepo.FindReplies(ctx, parentID, limit, offset)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*model.CommentResponse
	for _, reply := range replies {
		response := reply.ToResponse()

		// ユーザー情報の取得
		user, err := u.userRepo.Find(ctx, reply.UserID)
		if err == nil && user != nil {
			response.User = &model.UserBrief{
				ID:       user.ID,
				Username: user.Username,
				Avatar:   user.Avatar,
			}
		}

		responses = append(responses, response)
	}

	return responses, nil
}

// GetCommentsByUser はユーザーが投稿したコメント一覧を取得します
func (u *CommentUseCase) GetCommentsByUser(ctx context.Context, userID int64, limit, offset int) ([]*model.CommentResponse, int, error) {
	// ユーザーの存在確認
	user, err := u.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	if user == nil {
		return nil, 0, errors.New("ユーザーが見つかりません")
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
	comments, err := u.commentRepo.FindByUser(ctx, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	// 総コメント数の取得
	totalCount, err := u.commentRepo.CountByUser(ctx, userID)
	if err != nil {
		return nil, 0, err
	}

	// レスポンスの作成
	var responses []*model.CommentResponse
	for _, comment := range comments {
		response := comment.ToResponse()
		response.User = &model.UserBrief{
			ID:       user.ID,
			Username: user.Username,
			Avatar:   user.Avatar,
		}
		responses = append(responses, response)
	}

	return responses, totalCount, nil
}

// CreateComment は新しいコメントを作成します
func (u *CommentUseCase) CreateComment(ctx context.Context, userID int64, req *model.CreateCommentRequest) (*model.CommentResponse, error) {
	// コンテンツの存在確認
	content, err := u.contentRepo.Find(ctx, req.ContentID)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// 親コメントの存在確認（指定されている場合）
	if req.ParentID != nil {
		parentComment, err := u.commentRepo.Find(ctx, *req.ParentID)
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
	now := time.Now()
	comment := &model.Comment{
		Body:      req.Body,
		UserID:    userID,
		ContentID: req.ContentID,
		ParentID:  req.ParentID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// バリデーション
	if err := comment.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コメントの保存
	if err := u.commentRepo.Create(ctx, comment); err != nil {
		return nil, err
	}

	// レスポンスの作成
	response := comment.ToResponse()

	// ユーザー情報の取得
	user, err := u.userRepo.Find(ctx, userID)
	if err == nil && user != nil {
		response.User = &model.UserBrief{
			ID:       user.ID,
			Username: user.Username,
			Avatar:   user.Avatar,
		}
	}

	return response, nil
}

// UpdateComment はコメントを更新します
func (u *CommentUseCase) UpdateComment(ctx context.Context, id int64, userID int64, userRole string, req *model.UpdateCommentRequest) (*model.CommentResponse, error) {
	// コメントの取得
	comment, err := u.commentRepo.Find(ctx, id)
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

	// バリデーション
	if err := comment.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コメントの更新
	if err := u.commentRepo.Update(ctx, comment); err != nil {
		return nil, err
	}

	// レスポンスの作成
	response := comment.ToResponse()

	// ユーザー情報の取得
	user, err := u.userRepo.Find(ctx, comment.UserID)
	if err == nil && user != nil {
		response.User = &model.UserBrief{
			ID:       user.ID,
			Username: user.Username,
			Avatar:   user.Avatar,
		}
	}

	return response, nil
}

// DeleteComment はコメントを削除します
func (u *CommentUseCase) DeleteComment(ctx context.Context, id int64, userID int64, userRole string) error {
	// コメントの取得
	comment, err := u.commentRepo.Find(ctx, id)
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
	return u.commentRepo.Delete(ctx, id)
}
