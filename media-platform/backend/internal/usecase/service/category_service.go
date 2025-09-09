package service

import (
	"context"
	"errors"
	"fmt"

	"media-platform/internal/domain/repository"
	"media-platform/internal/presentation/dto"
	"media-platform/internal/presentation/presenter"
)

// CategoryService はカテゴリに関するアプリケーションサービスを提供します
type CategoryService struct {
	categoryRepo      repository.CategoryRepository
	categoryPresenter *presenter.CategoryPresenter
}

// NewCategoryService は新しいCategoryServiceのインスタンスを生成します
func NewCategoryService(categoryRepo repository.CategoryRepository, categoryPresenter *presenter.CategoryPresenter) *CategoryService {
	return &CategoryService{
		categoryRepo:      categoryRepo,
		categoryPresenter: categoryPresenter,
	}
}

// GetAllCategories は全てのカテゴリを取得します
func (s *CategoryService) GetAllCategories(ctx context.Context) ([]*dto.CategoryResponse, error) {
	categories, err := s.categoryRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	return s.categoryPresenter.ToCategoryResponseList(categories), nil
}

// GetCategoryByID は指定したIDのカテゴリを取得します
func (s *CategoryService) GetCategoryByID(ctx context.Context, id int64) (*dto.CategoryResponse, error) {
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if category == nil {
		return nil, errors.New("カテゴリが見つかりません")
	}

	return s.categoryPresenter.ToCategoryResponse(category), nil
}

// CreateCategory は新しいカテゴリを作成します
func (s *CategoryService) CreateCategory(ctx context.Context, req *dto.CreateCategoryRequest) (*dto.CategoryResponse, error) {
	// 名前の重複チェック
	existingCategory, err := s.categoryRepo.FindByName(ctx, req.Name)
	if err != nil {
		return nil, err
	}
	if existingCategory != nil {
		return nil, fmt.Errorf("カテゴリ名 %s は既に使用されています", req.Name)
	}

	// 親カテゴリの存在チェック
	if req.ParentID != nil {
		parentCategory, err := s.categoryRepo.FindByID(ctx, *req.ParentID)
		if err != nil {
			return nil, err
		}
		if parentCategory == nil {
			return nil, fmt.Errorf("親カテゴリID %d は存在しません", *req.ParentID)
		}
	}

	// エンティティの作成
	category := s.categoryPresenter.ToCategoryEntity(req)

	// ドメインルールのバリデーション
	if err := category.Validate(); err != nil {
		return nil, err
	}

	// 保存
	createdCategory, err := s.categoryRepo.Create(ctx, category)
	if err != nil {
		return nil, err
	}

	return s.categoryPresenter.ToCategoryResponse(createdCategory), nil
}

// UpdateCategory は既存のカテゴリを更新します
func (s *CategoryService) UpdateCategory(ctx context.Context, id int64, req *dto.UpdateCategoryRequest) (*dto.CategoryResponse, error) {
	// カテゴリの存在チェック
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, fmt.Errorf("ID %d のカテゴリは存在しません", id)
	}

	// 名前の更新があり、かつ重複する場合はエラー
	if req.Name != "" && req.Name != category.Name {
		existingCategory, err := s.categoryRepo.FindByName(ctx, req.Name)
		if err != nil {
			return nil, err
		}
		if existingCategory != nil && existingCategory.ID != id {
			return nil, fmt.Errorf("カテゴリ名 %s は既に使用されています", req.Name)
		}

		if err := category.SetName(req.Name); err != nil {
			return nil, err
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
			return nil, errors.New("自分自身を親カテゴリにすることはできません")
		}

		// 親カテゴリが指定されている場合、その存在チェック
		if *req.ParentID != 0 {
			parentCategory, err := s.categoryRepo.FindByID(ctx, *req.ParentID)
			if err != nil {
				return nil, err
			}
			if parentCategory == nil {
				return nil, fmt.Errorf("親カテゴリID %d は存在しません", *req.ParentID)
			}

			// 循環参照のチェック
			hasCircularReference, err := s.categoryRepo.CheckCircularReference(ctx, id, *req.ParentID)
			if err != nil {
				return nil, err
			}
			if hasCircularReference {
				return nil, errors.New("カテゴリの循環参照は許可されていません")
			}
		}

		if err := category.SetParentID(req.ParentID); err != nil {
			return nil, err
		}
	}

	// ドメインルールのバリデーション
	if err := category.Validate(); err != nil {
		return nil, err
	}

	// 更新の保存
	updatedCategory, err := s.categoryRepo.Update(ctx, category)
	if err != nil {
		return nil, err
	}

	return s.categoryPresenter.ToCategoryResponse(updatedCategory), nil
}

// DeleteCategory は指定したIDのカテゴリを削除します
func (s *CategoryService) DeleteCategory(ctx context.Context, id int64) error {
	// カテゴリの存在チェック
	category, err := s.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if category == nil {
		return fmt.Errorf("ID %d のカテゴリは存在しません", id)
	}

	// 削除
	return s.categoryRepo.Delete(ctx, id)
}
