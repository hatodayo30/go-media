package repository

import (
	"context"

	"media-platform/internal/domain/model"
)

// ContentRepository はコンテンツに関する永続化を担当するインターフェースです
type ContentRepository interface {
	// Find は指定したIDのコンテンツを取得します
	Find(ctx context.Context, id int64) (*model.Content, error)

	// FindAll は条件に合うコンテンツを全て取得します
	FindAll(ctx context.Context, query *model.ContentQuery) ([]*model.Content, error)

	// CountAll は条件に合うコンテンツの総数を取得します
	CountAll(ctx context.Context, query *model.ContentQuery) (int, error)

	// FindByAuthor は指定した著者のコンテンツを取得します
	FindByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*model.Content, error)

	// FindByCategory は指定したカテゴリのコンテンツを取得します
	FindByCategory(ctx context.Context, categoryID int64, limit, offset int) ([]*model.Content, error)

	// FindPublished は公開済みのコンテンツを取得します
	FindPublished(ctx context.Context, limit, offset int) ([]*model.Content, error)

	// FindTrending は閲覧数の多いコンテンツを取得します
	FindTrending(ctx context.Context, limit int) ([]*model.Content, error)

	// Search はキーワードでコンテンツを検索します
	Search(ctx context.Context, keyword string, limit, offset int) ([]*model.Content, error)

	// Create は新しいコンテンツを作成します
	Create(ctx context.Context, content *model.Content) error

	// Update は既存のコンテンツを更新します
	Update(ctx context.Context, content *model.Content) error

	// Delete は指定したIDのコンテンツを削除します
	Delete(ctx context.Context, id int64) error

	// IncrementViewCount はコンテンツの閲覧数を増加させます
	IncrementViewCount(ctx context.Context, id int64) error
}
