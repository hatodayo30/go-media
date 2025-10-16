package service

import (
	"context"
	"fmt"
	"strings"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
	"media-platform/internal/usecase/dto"
)

type ContentService struct {
	contentRepo  repository.ContentRepository
	categoryRepo repository.CategoryRepository
	userRepo     repository.UserRepository
}

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

// Entity → DTO 変換（Service層の責務）
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
		PublishedAt: content.PublishedAt,

		// 趣味投稿専用フィールド
		WorkTitle:           content.WorkTitle,
		Rating:              content.Rating,
		RecommendationLevel: string(content.RecommendationLevel),
		Tags:                content.Tags,
		ImageURL:            content.ImageURL,
		ExternalURL:         content.ExternalURL,
		ReleaseYear:         content.ReleaseYear,
		ArtistName:          content.ArtistName,
		Genre:               content.Genre,
	}
}

func (s *ContentService) toContentResponseList(contents []*entity.Content) []*dto.ContentResponse {
	responses := make([]*dto.ContentResponse, len(contents))
	for i, content := range contents {
		responses[i] = s.toContentResponse(content)
	}
	return responses
}

// ✅ 追加：GetContents - 条件に応じた検索
func (s *ContentService) GetContents(ctx context.Context, query *dto.ContentQuery) ([]*dto.ContentResponse, int, error) {
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

	var contents []*entity.Content
	var err error

	// ビジネスロジック: 条件に応じて適切なRepositoryメソッドを選択
	switch {
	case query.SearchQuery != nil && *query.SearchQuery != "":
		// 検索クエリがある場合
		if query.CategoryID != nil {
			// カテゴリ + 検索
			contents, err = s.searchByKeywordAndCategory(ctx, *query.SearchQuery, *query.CategoryID, query.Limit, query.Offset)
		} else if query.AuthorID != nil {
			// 著者 + 検索
			contents, err = s.searchByKeywordAndAuthor(ctx, *query.SearchQuery, *query.AuthorID, query.Limit, query.Offset)
		} else {
			// 検索のみ
			contents, err = s.contentRepo.Search(ctx, *query.SearchQuery, query.Limit, query.Offset)
		}

	case query.AuthorID != nil:
		// 著者別
		contents, err = s.contentRepo.FindByAuthor(ctx, *query.AuthorID, query.Limit, query.Offset)

	case query.CategoryID != nil:
		// カテゴリ別
		contents, err = s.contentRepo.FindByCategory(ctx, *query.CategoryID, query.Limit, query.Offset)

	default:
		// デフォルトは公開済みコンテンツ
		contents, err = s.contentRepo.FindPublished(ctx, query.Limit, query.Offset)
	}

	if err != nil {
		return nil, 0, fmt.Errorf("contents lookup failed: %w", err)
	}

	// 総数の計算（簡易実装）
	totalCount := len(contents)

	return s.toContentResponseList(contents), totalCount, nil
}

func (s *ContentService) GetContentByID(ctx context.Context, id int64) (*dto.ContentResponse, error) {
	content, err := s.contentRepo.Find(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}

	if err := s.contentRepo.IncrementViewCount(ctx, id); err != nil {
		// ログ出力のみ（ビジネスロジックに影響させない）
	}

	return s.toContentResponse(content), nil
}

func (s *ContentService) GetPublishedContents(ctx context.Context, limit, offset int) ([]*dto.ContentResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	contents, err := s.contentRepo.FindPublished(ctx, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("published contents lookup failed: %w", err)
	}

	return s.toContentResponseList(contents), nil
}

func (s *ContentService) GetContentsByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*dto.ContentResponse, error) {
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
	author, err := s.userRepo.Find(ctx, authorID)
	if err != nil {
		return nil, fmt.Errorf("author lookup failed: %w", err)
	}
	if author == nil {
		return nil, domainErrors.NewNotFoundError("User", authorID)
	}

	contents, err := s.contentRepo.FindByAuthor(ctx, authorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("contents by author lookup failed: %w", err)
	}

	return s.toContentResponseList(contents), nil
}

func (s *ContentService) GetContentsByCategory(ctx context.Context, categoryID int64, limit, offset int) ([]*dto.ContentResponse, error) {
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
	category, err := s.categoryRepo.FindByID(ctx, categoryID)
	if err != nil {
		return nil, fmt.Errorf("category lookup failed: %w", err)
	}
	if category == nil {
		return nil, domainErrors.NewNotFoundError("Category", categoryID)
	}

	contents, err := s.contentRepo.FindByCategory(ctx, categoryID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("contents by category lookup failed: %w", err)
	}

	return s.toContentResponseList(contents), nil
}

func (s *ContentService) GetTrendingContents(ctx context.Context, limit int) ([]*dto.ContentResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	contents, err := s.contentRepo.FindTrending(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("trending contents lookup failed: %w", err)
	}

	return s.toContentResponseList(contents), nil
}

func (s *ContentService) SearchContents(ctx context.Context, keyword string, limit, offset int) ([]*dto.ContentResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	contents, err := s.contentRepo.Search(ctx, keyword, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("search contents failed: %w", err)
	}

	return s.toContentResponseList(contents), nil
}

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
	content := &entity.Content{
		Title:      req.Title,
		Body:       req.Body,
		Type:       entity.ContentType(req.Type),
		Status:     entity.ContentStatusDraft,
		AuthorID:   authorID,
		CategoryID: req.CategoryID,
		ViewCount:  0,

		// 趣味投稿専用フィールド
		WorkTitle:           req.WorkTitle,
		Rating:              req.Rating,
		RecommendationLevel: entity.RecommendationLevel(req.RecommendationLevel),
		Tags:                req.Tags,
		ImageURL:            req.ImageURL,
		ExternalURL:         req.ExternalURL,
		ReleaseYear:         req.ReleaseYear,
		ArtistName:          req.ArtistName,
		Genre:               req.Genre,
	}

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
		category, err := s.categoryRepo.FindByID(ctx, req.CategoryID)
		if err != nil {
			return nil, fmt.Errorf("category lookup failed: %w", err)
		}
		if category == nil {
			return nil, domainErrors.NewNotFoundError("Category", req.CategoryID)
		}

		if err := content.SetCategoryID(req.CategoryID); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	// 趣味投稿専用フィールドの更新
	if req.WorkTitle != "" {
		content.WorkTitle = req.WorkTitle
	}
	if req.Rating != nil {
		if err := content.SetRating(*req.Rating); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}
	if req.RecommendationLevel != "" {
		if err := content.SetRecommendationLevel(entity.RecommendationLevel(req.RecommendationLevel)); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}
	if len(req.Tags) > 0 {
		content.SetTags(req.Tags)
	}
	if req.ImageURL != "" {
		content.ImageURL = req.ImageURL
	}
	if req.ExternalURL != "" {
		content.ExternalURL = req.ExternalURL
	}
	if req.ReleaseYear != nil {
		content.ReleaseYear = req.ReleaseYear
	}
	if req.ArtistName != "" {
		content.ArtistName = req.ArtistName
	}
	if req.Genre != "" {
		content.Genre = req.Genre
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

// ✅ 追加：UpdateContentStatus
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
		return nil, fmt.Errorf("content status update failed: %w", err)
	}

	return s.toContentResponse(content), nil
}

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

// searchByKeywordAndCategory はキーワード + カテゴリ検索
func (s *ContentService) searchByKeywordAndCategory(ctx context.Context, keyword string, categoryID int64, limit, offset int) ([]*entity.Content, error) {
	// カテゴリ別取得後にキーワードでフィルタリング
	contents, err := s.contentRepo.FindByCategory(ctx, categoryID, limit*2, offset)
	if err != nil {
		return nil, err
	}

	return s.filterByKeyword(contents, keyword, limit), nil
}

// searchByKeywordAndAuthor はキーワード + 著者検索
func (s *ContentService) searchByKeywordAndAuthor(ctx context.Context, keyword string, authorID int64, limit, offset int) ([]*entity.Content, error) {
	// 著者別取得後にキーワードでフィルタリング
	contents, err := s.contentRepo.FindByAuthor(ctx, authorID, limit*2, offset)
	if err != nil {
		return nil, err
	}

	return s.filterByKeyword(contents, keyword, limit), nil
}

// filterByKeyword はキーワードでコンテンツをフィルタリング
func (s *ContentService) filterByKeyword(contents []*entity.Content, keyword string, limit int) []*entity.Content {
	var filtered []*entity.Content
	lowerKeyword := strings.ToLower(keyword)

	for _, content := range contents {
		if strings.Contains(strings.ToLower(content.Title), lowerKeyword) ||
			strings.Contains(strings.ToLower(content.Body), lowerKeyword) {
			filtered = append(filtered, content)
			if len(filtered) >= limit {
				break
			}
		}
	}

	return filtered
}
