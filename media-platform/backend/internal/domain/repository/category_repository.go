package repository

import (
	"context"

	"media-platform/internal/domain/entity"
)

// CategoryRepository はカテゴリの永続化に関するインターフェースです
type CategoryRepository interface {
	// FindAll は全てのカテゴリを取得します
	FindAll(ctx context.Context) ([]*entity.Category, error)

	// FindByID は指定されたIDのカテゴリを取得します
	FindByID(ctx context.Context, id int64) (*entity.Category, error)

	// FindByName は指定された名前のカテゴリを取得します
	FindByName(ctx context.Context, name string) (*entity.Category, error)

	// Create は新しいカテゴリを作成します
	Create(ctx context.Context, category *entity.Category) (*entity.Category, error)

	// Update は既存のカテゴリ情報を更新します
	Update(ctx context.Context, category *entity.Category) (*entity.Category, error)

	// Delete は指定されたIDのカテゴリを削除します
	Delete(ctx context.Context, id int64) error

	// CheckCircularReference は循環参照をチェックします
	CheckCircularReference(ctx context.Context, categoryID int64, parentID int64) (bool, error)
}
