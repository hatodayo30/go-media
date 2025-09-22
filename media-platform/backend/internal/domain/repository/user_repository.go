package repository

import (
	"context"

	"media-platform/internal/domain/entity"
)

// UserRepository はユーザーの永続化に関するインターフェースです
type UserRepository interface {
	// Find は指定されたIDのユーザーを取得します
	Find(ctx context.Context, id int64) (*entity.User, error)

	// FindByEmail はメールアドレスでユーザーを取得します
	FindByEmail(ctx context.Context, email string) (*entity.User, error)

	// FindByUsername はユーザー名でユーザーを取得します
	FindByUsername(ctx context.Context, username string) (*entity.User, error)

	// FindAll は全てのユーザーを取得します（ページング対応）
	FindAll(ctx context.Context, limit, offset int) ([]*entity.User, error)

	// Create は新しいユーザーを作成します
	Create(ctx context.Context, user *entity.User) error

	// Update は既存のユーザー情報を更新します
	Update(ctx context.Context, user *entity.User) error

	// Delete は指定されたIDのユーザーを削除します
	Delete(ctx context.Context, id int64) error
}
