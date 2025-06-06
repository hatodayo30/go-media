package usecase

import (
	"context"
	"errors"
	"fmt"
	domainErrors "media-platform/internal/domain/errors"
	"time"

	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
)

// ContentUseCase はコンテンツに関するユースケースを提供します
type ContentUseCase struct {
	contentRepo  repository.ContentRepository
	categoryRepo repository.CategoryRepository
	userRepo     repository.UserRepository
}

// NewContentUseCase は新しいContentUseCaseのインスタンスを生成します
func NewContentUseCase(
	contentRepo repository.ContentRepository,
	categoryRepo repository.CategoryRepository,
	userRepo repository.UserRepository,
) *ContentUseCase {
	return &ContentUseCase{
		contentRepo:  contentRepo,
		categoryRepo: categoryRepo,
		userRepo:     userRepo,
	}
}

// GetContentByID は指定したIDのコンテンツを取得します
func (u *ContentUseCase) GetContentByID(ctx context.Context, id int64) (*model.ContentResponse, error) {
	content, err := u.contentRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// 表示回数を増加させる
	if err := u.contentRepo.IncrementViewCount(ctx, id); err != nil {
		// 閲覧数の更新に失敗してもコンテンツは表示可能とする
		fmt.Printf("閲覧数の更新に失敗しました: %v\n", err)
	}

	return content.ToResponse(), nil
}

// GetContents は条件に合うコンテンツの一覧を取得します
func (u *ContentUseCase) GetContents(ctx context.Context, query *model.ContentQuery) ([]*model.ContentResponse, int, error) {
	// デフォルト値の設定
	if query.Limit <= 0 {
		query.Limit = 10
	}
	if query.Limit > 100 {
		query.Limit = 100 // 最大リミットを設定
	}
	if query.Offset < 0 {
		query.Offset = 0
	}

	// コンテンツの取得
	contents, err := u.contentRepo.FindAll(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	// トータル件数の取得
	totalCount, err := u.contentRepo.CountAll(ctx, query)
	if err != nil {
		return nil, 0, err
	}

	// レスポンスの作成
	var responses []*model.ContentResponse
	for _, content := range contents {
		responses = append(responses, content.ToResponse())
	}

	return responses, totalCount, nil
}

// GetPublishedContents は公開済みのコンテンツの一覧を取得します
func (u *ContentUseCase) GetPublishedContents(ctx context.Context, limit, offset int) ([]*model.ContentResponse, error) {
	// デフォルト値の設定
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100 // 最大リミットを設定
	}
	if offset < 0 {
		offset = 0
	}

	// 公開済みコンテンツの取得
	contents, err := u.contentRepo.FindPublished(ctx, limit, offset)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*model.ContentResponse
	for _, content := range contents {
		responses = append(responses, content.ToResponse())
	}

	return responses, nil
}

// GetContentsByAuthor は指定した著者のコンテンツ一覧を取得します
func (u *ContentUseCase) GetContentsByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*model.ContentResponse, error) {
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

	// 著者の存在チェック
	exists, err := u.userExists(ctx, authorID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("指定された著者が存在しません")
	}

	// 著者のコンテンツ取得
	contents, err := u.contentRepo.FindByAuthor(ctx, authorID, limit, offset)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*model.ContentResponse
	for _, content := range contents {
		responses = append(responses, content.ToResponse())
	}

	return responses, nil
}

// GetContentsByCategory は指定したカテゴリのコンテンツ一覧を取得します
func (u *ContentUseCase) GetContentsByCategory(ctx context.Context, categoryID int64, limit, offset int) ([]*model.ContentResponse, error) {
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

	// カテゴリの存在チェック
	exists, err := u.categoryExists(ctx, categoryID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("指定されたカテゴリが存在しません")
	}

	// カテゴリのコンテンツ取得
	contents, err := u.contentRepo.FindByCategory(ctx, categoryID, limit, offset)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*model.ContentResponse
	for _, content := range contents {
		responses = append(responses, content.ToResponse())
	}

	return responses, nil
}

// GetTrendingContents は人気のコンテンツ一覧を取得します
func (u *ContentUseCase) GetTrendingContents(ctx context.Context, limit int) ([]*model.ContentResponse, error) {
	// デフォルト値の設定
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50 // トレンド用の最大リミットを設定
	}

	// 人気コンテンツの取得
	contents, err := u.contentRepo.FindTrending(ctx, limit)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*model.ContentResponse
	for _, content := range contents {
		responses = append(responses, content.ToResponse())
	}

	return responses, nil
}

// SearchContents はキーワードでコンテンツを検索します
func (u *ContentUseCase) SearchContents(ctx context.Context, keyword string, limit, offset int) ([]*model.ContentResponse, error) {
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

	// キーワードが空の場合は公開済みコンテンツを返す
	if keyword == "" {
		return u.GetPublishedContents(ctx, limit, offset)
	}

	// コンテンツ検索
	contents, err := u.contentRepo.Search(ctx, keyword, limit, offset)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	var responses []*model.ContentResponse
	for _, content := range contents {
		responses = append(responses, content.ToResponse())
	}

	return responses, nil
}

// CreateContent は新しいコンテンツを作成します
func (u *ContentUseCase) CreateContent(ctx context.Context, authorID int64, req *model.CreateContentRequest) (*model.ContentResponse, error) {
	// デフォルトステータスの設定
	status := model.ContentStatusDraft // デフォルトは下書き
	if req.Status != "" {
		// フロントエンドから送信されたstatusを使用
		switch req.Status {
		case "draft":
			status = model.ContentStatusDraft
		case "published":
			status = model.ContentStatusPublished
		case "pending":
			status = model.ContentStatusPending
		default:
			status = model.ContentStatusDraft // 無効な値の場合はデフォルト
		}
	}

	// コンテンツエンティティの作成
	content := &model.Content{
		Title:      req.Title,
		Body:       req.Body,
		Type:       model.ContentType(req.Type),
		AuthorID:   authorID,
		CategoryID: req.CategoryID,
		Status:     status, // ステータスを設定
		ViewCount:  0,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	// 公開ステータスの場合は公開日時を設定
	if status == model.ContentStatusPublished {
		now := time.Now()
		content.PublishedAt = &now
	}

	// バリデーション
	if err := content.Validate(); err != nil {
		return nil, err
	}

	// 著者の存在確認
	author, err := u.userRepo.Find(ctx, authorID)
	if err != nil {
		return nil, err
	}
	if author == nil {
		return nil, errors.New("指定された著者が存在しません")
	}

	// カテゴリの存在確認（正しいメソッド名使用）
	category, err := u.categoryRepo.FindByID(ctx, req.CategoryID)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, errors.New("指定されたカテゴリが存在しません")
	}

	// コンテンツの保存
	if err := u.contentRepo.Create(ctx, content); err != nil {
		return nil, err
	}

	return content.ToResponse(), nil
}

// UpdateContent は既存のコンテンツを更新します
func (u *ContentUseCase) UpdateContent(ctx context.Context, id int64, userID int64, userRole string, req *model.UpdateContentRequest) (*model.ContentResponse, error) {
	// コンテンツの取得
	content, err := u.contentRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// 編集権限チェック
	if !content.CanEdit(userID, userRole) {
		return nil, errors.New("このコンテンツを編集する権限がありません")
	}

	// フィールドの更新
	if req.Title != "" {
		if err := content.SetTitle(req.Title); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	if req.Body != "" {
		if err := content.SetBody(req.Body); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	if req.Type != "" {
		if err := content.SetType(model.ContentType(req.Type)); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	if req.CategoryID != 0 {
		// カテゴリの存在チェック
		exists, err := u.categoryExists(ctx, req.CategoryID)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, errors.New("指定されたカテゴリが存在しません")
		}

		if err := content.SetCategoryID(req.CategoryID); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	// ドメインルールのバリデーション
	if err := content.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コンテンツの更新
	if err := u.contentRepo.Update(ctx, content); err != nil {
		return nil, err
	}

	return content.ToResponse(), nil
}

// UpdateContentStatus はコンテンツのステータスを更新します
func (u *ContentUseCase) UpdateContentStatus(ctx context.Context, id int64, userID int64, userRole string, req *model.UpdateContentStatusRequest) (*model.ContentResponse, error) {
	// コンテンツの取得
	content, err := u.contentRepo.Find(ctx, id)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// 編集権限チェック
	if !content.CanEdit(userID, userRole) {
		return nil, errors.New("このコンテンツを編集する権限がありません")
	}

	// ステータスの更新
	if err := content.SetStatus(model.ContentStatus(req.Status)); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コンテンツの更新
	if err := u.contentRepo.Update(ctx, content); err != nil {
		return nil, err
	}

	return content.ToResponse(), nil
}

// DeleteContent はコンテンツを削除します
func (u *ContentUseCase) DeleteContent(ctx context.Context, id int64, userID int64, userRole string) error {
	// コンテンツの取得
	content, err := u.contentRepo.Find(ctx, id)
	if err != nil {
		return err
	}
	if content == nil {
		return errors.New("コンテンツが見つかりません")
	}

	// 編集権限チェック
	if !content.CanEdit(userID, userRole) {
		return errors.New("このコンテンツを削除する権限がありません")
	}

	// コンテンツの削除
	return u.contentRepo.Delete(ctx, id)
}

// カテゴリの存在チェック
func (u *ContentUseCase) categoryExists(ctx context.Context, categoryID int64) (bool, error) {
	category, err := u.contentRepo.Find(ctx, categoryID)
	if err != nil {
		return false, err
	}
	return category != nil, nil
}

// ユーザーの存在チェック
func (u *ContentUseCase) userExists(ctx context.Context, userID int64) (bool, error) {
	user, err := u.userRepo.Find(ctx, userID)
	if err != nil {
		return false, err
	}
	return user != nil, nil
}
