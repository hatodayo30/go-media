package service

import (
	"context"
	"fmt"
	"log"
	"strings"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
	"media-platform/internal/usecase/dto" // ✅ usecase/dto に変更
)

// ContentService はコンテンツに関するアプリケーションサービスを提供します
type ContentService struct {
	contentRepo  repository.ContentRepository
	categoryRepo repository.CategoryRepository
	userRepo     repository.UserRepository
}

// NewContentService は新しいContentServiceのインスタンスを生成します
func NewContentService(
	contentRepo repository.ContentRepository,
	categoryRepo repository.CategoryRepository,
	userRepo repository.UserRepository,
) *ContentService {
	return &ContentService{
		contentRepo:  contentRepo,
		categoryRepo: categoryRepo,
		userRepo:     userRepo,
	}
}

// ✅ Entity → DTO変換をService内で実装（RatingServiceと同じパターン）
func (s *ContentService) toContentResponse(content *entity.Content) *dto.ContentResponse {
	return &dto.ContentResponse{
		ID:          content.ID,
		Title:       content.Title,
		Body:        content.Body,
		Type:        string(content.Type),
		Status:      string(content.Status),
		AuthorID:    content.AuthorID,
		CategoryID:  content.CategoryID,
		ViewCount:   content.ViewCount,
		CreatedAt:   content.CreatedAt,
		UpdatedAt:   content.UpdatedAt,
		PublishedAt: content.PublishedAt, // DTOに合わせて追加

	}
}

// ✅ EntityList → DTOList変換をService内で実装
func (s *ContentService) toContentResponseList(contents []*entity.Content) []*dto.ContentResponse {
	responses := make([]*dto.ContentResponse, len(contents))
	for i, content := range contents {
		responses[i] = s.toContentResponse(content)
	}
	return responses
}

// ✅ CreateContentRequest → Entity変換をService内で実装
func (s *ContentService) toContentEntity(req *dto.CreateContentRequest, authorID int64) *entity.Content {
	return &entity.Content{
		Title:      req.Title,
		Body:       req.Body,
		Type:       entity.ContentType(req.Type),
		Status:     entity.ContentStatusDraft, // デフォルトは下書き
		AuthorID:   authorID,
		CategoryID: req.CategoryID,
		ViewCount:  0,
	}
}

// GetContentByID は指定したIDのコンテンツを取得します
// GetContentByID は指定したIDのコンテンツを取得します
func (s *ContentService) GetContentByID(ctx context.Context, id int64) (*dto.ContentResponse, error) {
	content, err := s.contentRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", id)
	}

	// 表示回数を増加させる
	if err := s.contentRepo.IncrementViewCount(ctx, id); err != nil {
		// 閲覧数の更新に失敗してもコンテンツは表示可能とする
		log.Printf("閲覧数の更新に失敗しました: %v", err)
	}

	return s.toContentResponse(content), nil
}

// GetContents は条件に合うコンテンツの一覧を取得します
func (s *ContentService) GetContents(ctx context.Context, query *dto.ContentQuery) ([]*dto.ContentResponse, int, error) {
	log.Printf("ContentService.GetContents: %+v", query)

	// デフォルト値の設定
	if query.Limit <= 0 {
		query.Limit = 10
	}
	if query.Limit > 100 {
		query.Limit = 100
	}
	if query.Offset < 0 {
		query.Offset = 0
	}

	// コンテンツの取得
	contents, err := s.contentRepo.FindAll(ctx, query)
	if err != nil {
		log.Printf("ContentService.GetContents FindAll error: %v", err)
		return nil, 0, fmt.Errorf("contents lookup failed: %w", err)
	}

	// トータル件数の取得
	totalCount, err := s.contentRepo.CountAll(ctx, query)
	if err != nil {
		log.Printf("ContentService.GetContents CountAll error: %v", err)
		return nil, 0, fmt.Errorf("contents count failed: %w", err)
	}

	// レスポンスの作成
	responses := s.toContentResponseList(contents)

	log.Printf("ContentService.GetContents完了: %d件（全%d件中）", len(responses), totalCount)
	return responses, totalCount, nil
}

// GetPublishedContents は公開済みのコンテンツの一覧を取得します
func (s *ContentService) GetPublishedContents(ctx context.Context, limit, offset int) ([]*dto.ContentResponse, error) {
	log.Printf("ContentService.GetPublishedContents: limit=%d, offset=%d", limit, offset)

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

	// 公開済みコンテンツの取得
	contents, err := s.contentRepo.FindPublished(ctx, limit, offset)
	if err != nil {
		log.Printf("ContentService.GetPublishedContents error: %v", err)
		return nil, fmt.Errorf("published contents lookup failed: %w", err)
	}

	// レスポンスの作成
	responses := s.toContentResponseList(contents)

	log.Printf("ContentService.GetPublishedContents完了: %d件", len(responses))
	return responses, nil
}

// GetContentsByAuthor は指定した著者のコンテンツ一覧を取得します
func (s *ContentService) GetContentsByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*dto.ContentResponse, error) {
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
	exists, err := s.userExists(ctx, authorID)
	if err != nil {
		return nil, fmt.Errorf("author existence check failed: %w", err)
	}
	if !exists {
		return nil, domainErrors.NewNotFoundError("User", authorID)
	}

	// 著者のコンテンツ取得
	contents, err := s.contentRepo.FindByAuthor(ctx, authorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("contents by author lookup failed: %w", err)
	}

	// レスポンスの作成
	return s.toContentResponseList(contents), nil
}

// GetContentsByCategory は指定したカテゴリのコンテンツ一覧を取得します
func (s *ContentService) GetContentsByCategory(ctx context.Context, categoryID int64, limit, offset int) ([]*dto.ContentResponse, error) {
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
	exists, err := s.categoryExists(ctx, categoryID)
	if err != nil {
		return nil, fmt.Errorf("category existence check failed: %w", err)
	}
	if !exists {
		return nil, domainErrors.NewNotFoundError("Category", categoryID)
	}

	// カテゴリのコンテンツ取得
	contents, err := s.contentRepo.FindByCategory(ctx, categoryID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("contents by category lookup failed: %w", err)
	}

	// レスポンスの作成
	return s.toContentResponseList(contents), nil
}

// GetTrendingContents は人気のコンテンツ一覧を取得します
func (s *ContentService) GetTrendingContents(ctx context.Context, limit int) ([]*dto.ContentResponse, error) {
	// デフォルト値の設定
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	// 人気コンテンツの取得
	contents, err := s.contentRepo.FindTrending(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("trending contents lookup failed: %w", err)
	}

	// レスポンスの作成
	return s.toContentResponseList(contents), nil
}

// SearchContents はキーワードでコンテンツを検索します
func (s *ContentService) SearchContents(ctx context.Context, keyword string, limit, offset int) ([]*dto.ContentResponse, error) {
	log.Printf("ContentService.SearchContents: keyword=%s, limit=%d, offset=%d", keyword, limit, offset)

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
		log.Println("キーワードが空のため、公開済みコンテンツを返します")
		return s.GetPublishedContents(ctx, limit, offset)
	}

	// ContentQueryを構築して既存のGetContentsメソッドを活用
	publishedStatus := "published"
	query := &dto.ContentQuery{
		Limit:       limit,
		Offset:      offset,
		SearchQuery: &keyword,
		Status:      &publishedStatus,
	}

	log.Printf("ContentQuery構築: %+v", query)

	// 既存のGetContentsメソッドを使用
	responses, _, err := s.GetContents(ctx, query)
	if err != nil {
		log.Printf("ContentService.SearchContents GetContents error: %v", err)

		// PostgreSQL全文検索エラーの場合、フォールバック検索を試行
		if s.isSearchError(err) {
			log.Println("検索エラー検出、フォールバック検索を実行")
			return s.fallbackSearch(ctx, keyword, limit, offset)
		}

		return nil, err
	}

	log.Printf("ContentService.SearchContents完了: %d件", len(responses))
	return responses, nil
}

// SearchContentsAdvanced は拡張された検索機能を提供します
func (s *ContentService) SearchContentsAdvanced(ctx context.Context, query *dto.ContentQuery) ([]*dto.ContentResponse, int, error) {
	log.Printf("ContentService.SearchContentsAdvanced: %+v", query)

	// デフォルト値の設定
	if query.Limit <= 0 {
		query.Limit = 10
	}
	if query.Limit > 100 {
		query.Limit = 100
	}
	if query.Offset < 0 {
		query.Offset = 0
	}

	// 公開済みコンテンツのみを対象とする
	if query.Status == nil {
		publishedStatus := "published"
		query.Status = &publishedStatus
	}

	// 既存のGetContentsメソッドを活用
	responses, totalCount, err := s.GetContents(ctx, query)
	if err != nil {
		log.Printf("ContentService.SearchContentsAdvanced error: %v", err)

		// 検索エラーの場合のフォールバック
		if s.isSearchError(err) && query.SearchQuery != nil {
			log.Println("高度な検索でエラー、フォールバック検索を実行")
			fallbackResponses, fallbackErr := s.fallbackSearch(ctx, *query.SearchQuery, query.Limit, query.Offset)
			if fallbackErr != nil {
				return nil, 0, fallbackErr
			}
			return fallbackResponses, len(fallbackResponses), nil
		}

		return nil, 0, err
	}

	log.Printf("ContentService.SearchContentsAdvanced完了: %d件（全%d件中）", len(responses), totalCount)
	return responses, totalCount, nil
}

// CreateContent は新しいコンテンツを作成します
func (s *ContentService) CreateContent(ctx context.Context, authorID int64, req *dto.CreateContentRequest) (*dto.ContentResponse, error) {
	// 著者の存在確認
	author, err := s.userRepo.Find(ctx, authorID)
	if err != nil {
		return nil, fmt.Errorf("author lookup failed: %w", err)
	}
	if author == nil {
		return nil, domainErrors.NewNotFoundError("User", authorID)
	}

	// カテゴリの存在確認
	category, err := s.categoryRepo.FindByID(ctx, req.CategoryID)
	if err != nil {
		return nil, fmt.Errorf("category lookup failed: %w", err)
	}
	if category == nil {
		return nil, domainErrors.NewNotFoundError("Category", req.CategoryID)
	}

	// コンテンツエンティティの作成
	content := s.toContentEntity(req, authorID)

	// ドメインルールのバリデーション
	if err := content.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コンテンツの保存
	if err := s.contentRepo.Create(ctx, content); err != nil {
		return nil, fmt.Errorf("content creation failed: %w", err)
	}

	return s.toContentResponse(content), nil
}

// UpdateContent は既存のコンテンツを更新します
func (s *ContentService) UpdateContent(ctx context.Context, id int64, userID int64, userRole string, req *dto.UpdateContentRequest) (*dto.ContentResponse, error) {
	// コンテンツの取得
	content, err := s.contentRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", id)
	}

	// 編集権限チェック
	if !content.CanEdit(userID, userRole) {
		return nil, domainErrors.NewValidationError("このコンテンツを編集する権限がありません")
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
		if err := content.SetType(entity.ContentType(req.Type)); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	if req.CategoryID != 0 {
		// カテゴリの存在チェック
		exists, err := s.categoryExists(ctx, req.CategoryID)
		if err != nil {
			return nil, fmt.Errorf("category existence check failed: %w", err)
		}
		if !exists {
			return nil, domainErrors.NewNotFoundError("Category", req.CategoryID)
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
	if err := s.contentRepo.Update(ctx, content); err != nil {
		return nil, fmt.Errorf("content update failed: %w", err)
	}

	return s.toContentResponse(content), nil
}

// UpdateContentStatus はコンテンツのステータスを更新します
func (s *ContentService) UpdateContentStatus(ctx context.Context, id int64, userID int64, userRole string, req *dto.UpdateContentStatusRequest) (*dto.ContentResponse, error) {
	// コンテンツの取得
	content, err := s.contentRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", id)
	}

	// 編集権限チェック
	if !content.CanEdit(userID, userRole) {
		return nil, domainErrors.NewValidationError("このコンテンツを編集する権限がありません")
	}

	// ステータスの更新
	if err := content.SetStatus(entity.ContentStatus(req.Status)); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// コンテンツの更新
	if err := s.contentRepo.Update(ctx, content); err != nil {
		return nil, fmt.Errorf("content update failed: %w", err)
	}

	return s.toContentResponse(content), nil
}

// DeleteContent はコンテンツを削除します
func (s *ContentService) DeleteContent(ctx context.Context, id int64, userID int64, userRole string) error {
	// コンテンツの取得
	content, err := s.contentRepo.Find(ctx, id)
	if err != nil {
		return fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return domainErrors.NewNotFoundError("Content", id)
	}

	// 編集権限チェック
	if !content.CanEdit(userID, userRole) {
		return domainErrors.NewValidationError("このコンテンツを削除する権限がありません")
	}

	// コンテンツの削除
	if err := s.contentRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("content deletion failed: %w", err)
	}

	return nil
}

// ========== ヘルパーメソッド ==========

// fallbackSearch はPostgreSQL全文検索エラー時のフォールバック検索です
func (s *ContentService) fallbackSearch(ctx context.Context, keyword string, limit, offset int) ([]*dto.ContentResponse, error) {
	log.Printf("ContentService.fallbackSearch実行: keyword=%s", keyword)

	// リポジトリの基本的な検索メソッドを使用
	contents, err := s.contentRepo.Search(ctx, keyword, limit, offset)
	if err != nil {
		log.Printf("ContentService.fallbackSearch error: %v", err)

		// フォールバック検索も失敗した場合、公開済みコンテンツを返す
		log.Println("フォールバック検索も失敗、公開済みコンテンツを返します")
		return s.GetPublishedContents(ctx, limit, offset)
	}

	// レスポンスの作成
	responses := s.toContentResponseList(contents)

	log.Printf("ContentService.fallbackSearch完了: %d件", len(responses))
	return responses, nil
}

// isSearchError は検索関連のエラーかどうかを判定します
func (s *ContentService) isSearchError(err error) bool {
	if err == nil {
		return false
	}

	errMsg := err.Error()
	searchErrors := []string{
		"text search configuration",
		"to_tsvector",
		"to_tsquery",
		"ts_rank",
		"検索に失敗",
		"search failed",
	}

	for _, searchErr := range searchErrors {
		if strings.Contains(errMsg, searchErr) {
			log.Printf("検索エラー検出: %s", searchErr)
			return true
		}
	}

	return false
}

// categoryExists はカテゴリの存在チェックを行います
func (s *ContentService) categoryExists(ctx context.Context, categoryID int64) (bool, error) {
	category, err := s.categoryRepo.FindByID(ctx, categoryID)
	if err != nil {
		return false, err
	}
	return category != nil, nil
}

// userExists はユーザーの存在チェックを行います
func (s *ContentService) userExists(ctx context.Context, userID int64) (bool, error) {
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return false, err
	}
	return user != nil, nil
}
