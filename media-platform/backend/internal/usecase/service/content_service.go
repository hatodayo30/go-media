package service

import (
	"context"
	"fmt"

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

// ✅ Entity → DTO 変換（Service層の責務）
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
	}
}

func (s *ContentService) toContentResponseList(contents []*entity.Content) []*dto.ContentResponse {
	responses := make([]*dto.ContentResponse, len(contents))
	for i, content := range contents {
		responses[i] = s.toContentResponse(content)
	}
	return responses
}

// ✅ DTOを返す（HTTP表現は返さない）
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
		content.Title = req.Title
	}
	if req.Body != "" {
		content.Body = req.Body
	}
	if req.Type != "" {
		content.Type = entity.ContentType(req.Type)
	}
	if req.CategoryID != 0 {
		content.CategoryID = req.CategoryID
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
