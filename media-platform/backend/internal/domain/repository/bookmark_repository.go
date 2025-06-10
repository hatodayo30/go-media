// domain/repository/bookmark_repository.go
package repository

import (
	"context"
	"media-platform/internal/domain/model"
)

// BookmarkRepository はブックマーク情報の永続化を担当するインターフェースです
type BookmarkRepository interface {
	// コンテンツIDによるブックマーク取得
	FindByContentID(ctx context.Context, contentID int64) ([]*model.Bookmark, error)
	// ユーザーIDによるブックマーク取得
	FindByUserID(ctx context.Context, userID int64) ([]*model.Bookmark, error)
	// IDによるブックマーク取得
	FindByID(ctx context.Context, id int64) (*model.Bookmark, error)
	// ユーザーIDとコンテンツIDによるブックマーク取得
	FindByUserAndContentID(ctx context.Context, userID, contentID int64) (*model.Bookmark, error)
	// ブックマークの作成
	Create(ctx context.Context, bookmark *model.Bookmark) error
	// ブックマークの削除
	Delete(ctx context.Context, id int64) error
	// コンテンツIDによるブックマーク数取得
	CountByContentID(ctx context.Context, contentID int64) (int64, error)
}
