package repository

import (
	"context"
	"media-platform/internal/domain/entity"
)

// ContentRepository はコンテンツの永続化に関するインターフェースです
type ContentRepository interface {
	// Find は指定されたIDのコンテンツを取得します
	Find(ctx context.Context, id int64) (*entity.Content, error)

	// FindPublished は公開済みのコンテンツ一覧を取得します
	FindPublished(ctx context.Context, limit, offset int) ([]*entity.Content, error)

	// FindByAuthor は指定した著者のコンテンツ一覧を取得します
	FindByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*entity.Content, error)

	// FindByCategory は指定したカテゴリのコンテンツ一覧を取得します
	FindByCategory(ctx context.Context, categoryID int64, limit, offset int) ([]*entity.Content, error)

	// FindTrending は人気のコンテンツ一覧を取得します
	FindTrending(ctx context.Context, limit int) ([]*entity.Content, error)

	// Search はキーワードでコンテンツを検索します
	Search(ctx context.Context, keyword string, limit, offset int) ([]*entity.Content, error)

	// Create は新しいコンテンツを作成します
	Create(ctx context.Context, content *entity.Content) error

	// Update は既存のコンテンツ情報を更新します
	Update(ctx context.Context, content *entity.Content) error

	// Delete は指定されたIDのコンテンツを削除します
	Delete(ctx context.Context, id int64) error

	// IncrementViewCount は閲覧数をインクリメントします
	IncrementViewCount(ctx context.Context, id int64) error
}
