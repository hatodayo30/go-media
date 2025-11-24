package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

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
		Genre:       content.Genre,
		Status:      string(content.Status),
		AuthorID:    content.AuthorID,
		CategoryID:  content.CategoryID,
		ViewCount:   content.ViewCount,
		CreatedAt:   content.CreatedAt,
		UpdatedAt:   content.UpdatedAt,
		PublishedAt: content.PublishedAt,
	}
}

func (s *ContentService) toContentResponseList(contents []*entity.Content) []*dto.ContentResponse {
	responses := make([]*dto.ContentResponse, len(contents))
	for i, content := range contents {
		responses[i] = s.toContentResponse(content)
	}
	return responses
}

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

	log.Printf("🔍 GetContents called with:")
	log.Printf("  - Status: %v", query.Status)
	log.Printf("  - AuthorID: %v", query.AuthorID)
	log.Printf("  - CategoryID: %v", query.CategoryID)
	log.Printf("  - SearchQuery: %v", query.SearchQuery)
	log.Printf("  - Type: %v", query.Type)
	log.Printf("  - Genre: %v", query.Genre)
	log.Printf("  - Limit: %d, Offset: %d", query.Limit, query.Offset)

	var contents []*entity.Content
	var err error

	// statusのみで published の場合
	if query.Status != nil && *query.Status == "published" && query.AuthorID == nil {
		log.Printf("🔍 公開コンテンツ一覧取得: FindPublished")
		contents, err = s.contentRepo.FindPublished(ctx, query.Limit, query.Offset)
		if err != nil {
			log.Printf("❌ FindPublished error: %v", err)
			return nil, 0, fmt.Errorf("published contents lookup failed: %w", err)
		}
		log.Printf("✅ FindPublished success: %d contents", len(contents))
	} else if query.Status != nil && *query.Status != "" && query.AuthorID != nil {
		// status + authorID の場合（下書き取得用）
		log.Printf("🔍 ステータス検索: status=%s, authorID=%d", *query.Status, *query.AuthorID)
		contents, err = s.contentRepo.FindByStatus(ctx, *query.Status, *query.AuthorID, query.Limit, query.Offset)
		if err != nil {
			log.Printf("❌ FindByStatus error: %v", err)
			return nil, 0, fmt.Errorf("contents by status lookup failed: %w", err)
		}
		log.Printf("✅ FindByStatus success: %d contents", len(contents))
	} else if query.SearchQuery != nil && *query.SearchQuery != "" {
		// 検索クエリがある場合
		log.Printf("🔍 検索クエリ: %s", *query.SearchQuery)
		if query.CategoryID != nil {
			contents, err = s.searchByKeywordAndCategory(ctx, *query.SearchQuery, *query.CategoryID, query.Limit, query.Offset)
		} else if query.AuthorID != nil {
			contents, err = s.searchByKeywordAndAuthor(ctx, *query.SearchQuery, *query.AuthorID, query.Limit, query.Offset)
		} else {
			contents, err = s.contentRepo.Search(ctx, *query.SearchQuery, query.Limit, query.Offset)
		}
		if err != nil {
			log.Printf("❌ Search error: %v", err)
			return nil, 0, fmt.Errorf("search failed: %w", err)
		}
	} else if query.AuthorID != nil {
		// 著者別
		log.Printf("🔍 著者別取得: authorID=%d", *query.AuthorID)
		contents, err = s.contentRepo.FindByAuthor(ctx, *query.AuthorID, query.Limit, query.Offset)
		if err != nil {
			log.Printf("❌ FindByAuthor error: %v", err)
			return nil, 0, fmt.Errorf("contents by author lookup failed: %w", err)
		}
	} else if query.CategoryID != nil {
		// カテゴリ別
		log.Printf("🔍 カテゴリ別取得: categoryID=%d", *query.CategoryID)
		contents, err = s.contentRepo.FindByCategory(ctx, *query.CategoryID, query.Limit, query.Offset)
		if err != nil {
			log.Printf("❌ FindByCategory error: %v", err)
			return nil, 0, fmt.Errorf("contents by category lookup failed: %w", err)
		}
	} else {
		// デフォルト: 公開済みコンテンツ
		log.Printf("🔍 デフォルト: 公開コンテンツ取得")
		contents, err = s.contentRepo.FindPublished(ctx, query.Limit, query.Offset)
		if err != nil {
			log.Printf("❌ FindPublished (default) error: %v", err)
			return nil, 0, fmt.Errorf("default published contents lookup failed: %w", err)
		}
	}

	log.Printf("✅ GetContents completed: %d contents found", len(contents))
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
	log.Printf("📝 CreateContent開始: authorID=%d", authorID)
	log.Printf("📝 リクエスト内容: %+v", req)

	// 著者の存在確認
	log.Printf("🔍 著者確認中: authorID=%d", authorID)
	author, err := s.userRepo.Find(ctx, authorID)
	if err != nil {
		log.Printf("❌ 著者検索エラー: %v", err)
		return nil, fmt.Errorf("author lookup failed: %w", err)
	}
	if author == nil {
		log.Printf("❌ 著者が見つかりません: authorID=%d", authorID)
		return nil, domainErrors.NewNotFoundError("User", authorID)
	}
	log.Printf("✅ 著者確認完了: %s", author.Username)

	// カテゴリの存在確認
	log.Printf("🔍 カテゴリ確認中: categoryID=%d", req.CategoryID)
	category, err := s.categoryRepo.FindByID(ctx, req.CategoryID)
	if err != nil {
		log.Printf("❌ カテゴリ検索エラー: %v", err)
		return nil, fmt.Errorf("category lookup failed: %w", err)
	}
	if category == nil {
		log.Printf("❌ カテゴリが見つかりません: categoryID=%d", req.CategoryID)
		return nil, domainErrors.NewNotFoundError("Category", req.CategoryID)
	}
	log.Printf("✅ カテゴリ確認完了: %s", category.Name)

	// コンテンツエンティティの作成
	log.Printf("🔨 エンティティ作成中...")

	// ✅ リクエストのStatusをそのまま使用
	var status entity.ContentStatus
	if req.Status == "published" {
		status = entity.ContentStatusPublished
	} else if req.Status == "archived" {
		status = entity.ContentStatusArchived
	} else {
		status = entity.ContentStatusDraft
	}

	content := &entity.Content{
		Title:      req.Title,
		Body:       req.Body,
		Type:       entity.ContentType(req.Type),
		Genre:      req.Genre,
		Status:     status, // ✅ リクエストのstatusを使用
		AuthorID:   authorID,
		CategoryID: req.CategoryID,
		ViewCount:  0,
	}

	// ✅ publishedの場合、published_atを設定（これを追加！）
	if status == entity.ContentStatusPublished {
		now := time.Now()
		content.PublishedAt = &now
		log.Printf("✅ 公開日時設定: %v", now)
	}
	log.Printf("✅ エンティティ作成完了: %+v", content)

	// ドメインルールのバリデーション
	log.Printf("🔍 バリデーション開始...")
	if err := content.Validate(); err != nil {
		log.Printf("❌ バリデーションエラー: %v", err)
		return nil, domainErrors.NewValidationError(err.Error())
	}
	log.Printf("✅ バリデーション完了")

	// コンテンツの保存
	log.Printf("💾 DB保存開始...")
	if err := s.contentRepo.Create(ctx, content); err != nil {
		log.Printf("❌ DB保存エラー: %v", err)
		return nil, fmt.Errorf("content creation failed: %w", err)
	}
	log.Printf("✅ DB保存完了: contentID=%d", content.ID)

	response := s.toContentResponse(content)
	log.Printf("✅ CreateContent完了: %+v", response)
	return response, nil
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
	if req.Genre != "" {
		content.SetGenre(req.Genre)
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

func (s *ContentService) searchByKeywordAndCategory(ctx context.Context, keyword string, categoryID int64, limit, offset int) ([]*entity.Content, error) {
	// カテゴリ別取得後にキーワードでフィルタリング
	contents, err := s.contentRepo.FindByCategory(ctx, categoryID, limit*2, offset)
	if err != nil {
		return nil, err
	}

	return s.filterByKeyword(contents, keyword, limit), nil
}

func (s *ContentService) searchByKeywordAndAuthor(ctx context.Context, keyword string, authorID int64, limit, offset int) ([]*entity.Content, error) {
	// 著者別取得後にキーワードでフィルタリング
	contents, err := s.contentRepo.FindByAuthor(ctx, authorID, limit*2, offset)
	if err != nil {
		return nil, err
	}

	return s.filterByKeyword(contents, keyword, limit), nil
}

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
