package repository

import (
	"context"

	"media-platform/internal/domain/model"
)

// CategoryRepository はカテゴリに関する永続化を担当するインターフェースです
type CategoryRepository interface {
	// FindAll は全てのカテゴリを取得します
	FindAll(ctx context.Context) ([]*model.Category, error)

	// FindByID は指定したIDのカテゴリを取得します
	FindByID(ctx context.Context, id int64) (*model.Category, error)

	// FindByName は指定した名前のカテゴリを取得します
	FindByName(ctx context.Context, name string) (*model.Category, error)

	// Create は新しいカテゴリを作成します
	Create(ctx context.Context, category *model.Category) (*model.Category, error)

	// Update は既存のカテゴリを更新します
	Update(ctx context.Context, category *model.Category) (*model.Category, error)

	// Delete は指定したIDのカテゴリを削除します
	Delete(ctx context.Context, id int64) error

	// CheckCircularReference はカテゴリの循環参照をチェックします
	CheckCircularReference(ctx context.Context, categoryID, parentID int64) (bool, error)
}
