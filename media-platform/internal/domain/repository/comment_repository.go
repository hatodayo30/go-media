package repository

import (
	"context"
	"media-platform/internal/domain/model"
)

type CommentRepository interface {
	// Find は指定したIDのコメントを取得します
	Find(ctx context.Context, id int64) (*model.Comment, error)

	// FindAll は条件に合うコメントを取得します
	FindAll(ctx context.Context, query *model.CommentQuery) ([]*model.Comment, error)

	// FindByContent はコンテンツに関連するコメントを取得します
	FindByContent(ctx context.Context, contentID int64, limit, offset int) ([]*model.Comment, error)

	// FindByUser はユーザーが投稿したコメントを取得します
	FindByUser(ctx context.Context, userID int64, limit, offset int) ([]*model.Comment, error)

	// FindReplies はコメントに対する返信を取得します
	FindReplies(ctx context.Context, parentID int64, limit, offset int) ([]*model.Comment, error)

	// Create は新しいコメントを作成します
	Create(ctx context.Context, comment *model.Comment) error

	// Update は既存のコメントを更新します
	Update(ctx context.Context, comment *model.Comment) error

	// Delete は指定したIDのコメントを削除します
	Delete(ctx context.Context, id int64) error

	// CountByContent はコンテンツに関連するコメント数を取得します
	CountByContent(ctx context.Context, contentID int64) (int, error)

	// CountByUser はユーザーが投稿したコメント数を取得します
	CountByUser(ctx context.Context, userID int64) (int, error)
}
