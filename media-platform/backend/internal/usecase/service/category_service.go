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

// CategoryService はカテゴリに関するアプリケーションサービスを提供します
type CategoryService struct {
	categoryRepo repository.CategoryRepository
}

// NewCategoryService は新しいCategoryServiceのインスタンスを生成します
func NewCategoryService(categoryRepo repository.CategoryRepository) *CategoryService {
	return &CategoryService{
		categoryRepo: categoryRepo,
	}
}

// ========== Entity to DTO変換メソッド（Service内で実装） ==========

// toCategoryResponse はEntityをCategoryResponseに変換します
func (s *CategoryService) toCategoryResponse(category *entity.Category) *dto.CategoryResponse {
	return &dto.CategoryResponse{
		ID:          category.ID,
		Name:        category.Name,
		Description: category.Description,
		ParentID:    category.ParentID,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}
}

// toCategoryResponseList はEntityスライスをCategoryResponseスライスに変換します
func (s *CategoryService) toCategoryResponseList(categories []*entity.Category) []*dto.CategoryResponse {
	responses := make([]*dto.CategoryResponse, len(categories))
	for i, category := range categories {
		responses[i] = s.toCategoryResponse(category)
	}
	return responses
}

// toCategoryEntity はCreateCategoryRequestからEntityを作成します
func (s *CategoryService) toCategoryEntity(req *dto.CreateCategoryRequest) *entity.Category {
	now := time.Now()
	return &entity.Category{
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// ========== Use Cases ==========

// GetAllCategories は全てのカテゴリを取得します
func (s *CategoryService) GetAllCategories(ctx context.Context) ([]*dto.CategoryResponse, error) {
	categories, err := s.categoryRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("categories lookup failed: %w", err)
	}

	return s.toCategoryResponseList(categories), nil
}

// GetCategoryByID は指定したIDのカテゴリを取得します
func (s *CategoryService) GetCategoryByID(ctx context.Context, id int64) (*dto.CategoryResponse, error) {
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("category lookup failed: %w", err)
	}

	if category == nil {
		return nil, domainErrors.NewNotFoundError("Category", id)
	}

	return s.toCategoryResponse(category), nil
}

// CreateCategory は新しいカテゴリを作成します
func (s *CategoryService) CreateCategory(ctx context.Context, req *dto.CreateCategoryRequest) (*dto.CategoryResponse, error) {
	// 名前の重複チェック
	existingCategory, err := s.categoryRepo.FindByName(ctx, req.Name)
	if err != nil {
		return nil, fmt.Errorf("category name check failed: %w", err)
	}
	if existingCategory != nil {
		return nil, domainErrors.NewConflictError("Category", fmt.Sprintf("name '%s' already exists", req.Name))
	}

	// 親カテゴリの存在チェック
	if req.ParentID != nil {
		parentCategory, err := s.categoryRepo.FindByID(ctx, *req.ParentID)
		if err != nil {
			return nil, fmt.Errorf("parent category lookup failed: %w", err)
		}
		if parentCategory == nil {
			return nil, domainErrors.NewNotFoundError("Parent Category", *req.ParentID)
		}
	}

	// エンティティの作成
	category := s.toCategoryEntity(req)

	// ドメインルールのバリデーション
	if err := category.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// 保存
	createdCategory, err := s.categoryRepo.Create(ctx, category)
	if err != nil {
		return nil, fmt.Errorf("category creation failed: %w", err)
	}

	return s.toCategoryResponse(createdCategory), nil
}

// UpdateCategory は既存のカテゴリを更新します
func (s *CategoryService) UpdateCategory(ctx context.Context, id int64, req *dto.UpdateCategoryRequest) (*dto.CategoryResponse, error) {
	// カテゴリの存在チェック
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("category lookup failed: %w", err)
	}
	if category == nil {
		return nil, domainErrors.NewNotFoundError("Category", id)
	}

	// 名前の更新があり、かつ重複する場合はエラー
	if req.Name != "" && req.Name != category.Name {
		existingCategory, err := s.categoryRepo.FindByName(ctx, req.Name)
		if err != nil {
			return nil, fmt.Errorf("category name check failed: %w", err)
		}
		if existingCategory != nil && existingCategory.ID != id {
			return nil, domainErrors.NewConflictError("Category", fmt.Sprintf("name '%s' already exists", req.Name))
		}

		if err := category.SetName(req.Name); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	// 説明の更新
	if req.Description != category.Description {
		category.SetDescription(req.Description)
	}

	// 親カテゴリの更新
	if req.ParentID != nil {
		// 自分自身を親にすることはできない
		if *req.ParentID == id {
			return nil, domainErrors.NewValidationError("自分自身を親カテゴリにすることはできません")
		}

		// 親カテゴリが指定されている場合、その存在チェック
		if *req.ParentID != 0 {
			parentCategory, err := s.categoryRepo.FindByID(ctx, *req.ParentID)
			if err != nil {
				return nil, fmt.Errorf("parent category lookup failed: %w", err)
			}
			if parentCategory == nil {
				return nil, domainErrors.NewNotFoundError("Parent Category", *req.ParentID)
			}

			// 循環参照のチェック
			hasCircularReference, err := s.categoryRepo.CheckCircularReference(ctx, id, *req.ParentID)
			if err != nil {
				return nil, fmt.Errorf("circular reference check failed: %w", err)
			}
			if hasCircularReference {
				return nil, domainErrors.NewValidationError("カテゴリの循環参照は許可されていません")
			}
		}

		if err := category.SetParentID(req.ParentID); err != nil {
			return nil, domainErrors.NewValidationError(err.Error())
		}
	}

	// ドメインルールのバリデーション
	if err := category.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// 更新の保存
	updatedCategory, err := s.categoryRepo.Update(ctx, category)
	if err != nil {
		return nil, fmt.Errorf("category update failed: %w", err)
	}

	return s.toCategoryResponse(updatedCategory), nil
}

// DeleteCategory は指定したIDのカテゴリを削除します
func (s *CategoryService) DeleteCategory(ctx context.Context, id int64) error {
	// カテゴリの存在チェック
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("category lookup failed: %w", err)
	}
	if category == nil {
		return domainErrors.NewNotFoundError("Category", id)
	}

	// 削除
	if err := s.categoryRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("category deletion failed: %w", err)
	}

	return nil
}
