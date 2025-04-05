package usecase

import (
	"context"
	"errors"
	"fmt"

	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
)

// CategoryUseCase はカテゴリに関するユースケースを提供します
type CategoryUseCase struct {
	categoryRepo repository.CategoryRepository
}

// NewCategoryUseCase は新しいCategoryUseCaseのインスタンスを生成します
func NewCategoryUseCase(categoryRepo repository.CategoryRepository) *CategoryUseCase {
	return &CategoryUseCase{
		categoryRepo: categoryRepo,
	}
}

// GetAllCategories は全てのカテゴリを取得します
func (u *CategoryUseCase) GetAllCategories(ctx context.Context) ([]*model.CategoryResponse, error) {
	categories, err := u.categoryRepo.FindAll(ctx)
	if err != nil {
		return nil, err
	}

	var responses []*model.CategoryResponse
	for _, category := range categories {
		responses = append(responses, category.ToResponse())
	}

	return responses, nil
}

// GetCategoryByID は指定したIDのカテゴリを取得します
func (u *CategoryUseCase) GetCategoryByID(ctx context.Context, id int64) (*model.CategoryResponse, error) {
	category, err := u.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if category == nil {
		return nil, errors.New("カテゴリが見つかりません")
	}

	return category.ToResponse(), nil
}

// CreateCategory は新しいカテゴリを作成します
func (u *CategoryUseCase) CreateCategory(ctx context.Context, req *model.CreateCategoryRequest) (*model.CategoryResponse, error) {
	// 名前の重複チェック
	existingCategory, err := u.categoryRepo.FindByName(ctx, req.Name)
	if err != nil {
		return nil, err
	}
	if existingCategory != nil {
		return nil, fmt.Errorf("カテゴリ名 %s は既に使用されています", req.Name)
	}

	// 親カテゴリの存在チェック
	if req.ParentID != nil {
		parentCategory, err := u.categoryRepo.FindByID(ctx, *req.ParentID)
		if err != nil {
			return nil, err
		}
		if parentCategory == nil {
			return nil, fmt.Errorf("親カテゴリID %d は存在しません", *req.ParentID)
		}
	}

	category := &model.Category{
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
	}

	// バリデーション
	if err := category.Validate(); err != nil {
		return nil, err
	}

	// 保存
	createdCategory, err := u.categoryRepo.Create(ctx, category)
	if err != nil {
		return nil, err
	}

	return createdCategory.ToResponse(), nil
}

// UpdateCategory は既存のカテゴリを更新します
func (u *CategoryUseCase) UpdateCategory(ctx context.Context, id int64, req *model.UpdateCategoryRequest) (*model.CategoryResponse, error) {
	// カテゴリの存在チェック
	category, err := u.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, fmt.Errorf("ID %d のカテゴリは存在しません", id)
	}

	// 名前の更新があり、かつ重複する場合はエラー
	if req.Name != "" && req.Name != category.Name {
		existingCategory, err := u.categoryRepo.FindByName(ctx, req.Name)
		if err != nil {
			return nil, err
		}
		if existingCategory != nil && existingCategory.ID != id {
			return nil, fmt.Errorf("カテゴリ名 %s は既に使用されています", req.Name)
		}
		category.Name = req.Name
	}

	// 説明の更新
	if req.Description != category.Description {
		category.Description = req.Description
	}

	// 親カテゴリの更新
	if req.ParentID != nil {
		// 自分自身を親にすることはできない
		if *req.ParentID == id {
			return nil, errors.New("自分自身を親カテゴリにすることはできません")
		}

		// 親カテゴリが指定されている場合、その存在チェック
		if *req.ParentID != 0 {
			parentCategory, err := u.categoryRepo.FindByID(ctx, *req.ParentID)
			if err != nil {
				return nil, err
			}
			if parentCategory == nil {
				return nil, fmt.Errorf("親カテゴリID %d は存在しません", *req.ParentID)
			}

			// 循環参照のチェック
			hasCircularReference, err := u.categoryRepo.CheckCircularReference(ctx, id, *req.ParentID)
			if err != nil {
				return nil, err
			}
			if hasCircularReference {
				return nil, errors.New("カテゴリの循環参照は許可されていません")
			}
		}

		category.ParentID = req.ParentID
	}

	// バリデーション
	if err := category.Validate(); err != nil {
		return nil, err
	}

	// 更新の保存
	updatedCategory, err := u.categoryRepo.Update(ctx, category)
	if err != nil {
		return nil, err
	}

	return updatedCategory.ToResponse(), nil
}

// DeleteCategory は指定したIDのカテゴリを削除します
func (u *CategoryUseCase) DeleteCategory(ctx context.Context, id int64) error {
	// カテゴリの存在チェック
	category, err := u.categoryRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if category == nil {
		return fmt.Errorf("ID %d のカテゴリは存在しません", id)
	}

	// 削除
	return u.categoryRepo.Delete(ctx, id)
}
