// domain/repository/rating_repository.go
package repository

import (
	"context"
	"media-platform/internal/domain/model"
)

// RatingRepository は評価情報の永続化を担当するインターフェースです
type RatingRepository interface {
	// コンテンツIDによる評価取得
	FindByContentID(ctx context.Context, contentID int64) ([]*model.Rating, error)
	// ユーザーIDによる評価取得
	FindByUserID(ctx context.Context, userID int64) ([]*model.Rating, error)
	// IDによる評価取得
	FindByID(ctx context.Context, id int64) (*model.Rating, error)
	// ユーザーIDとコンテンツIDによる評価取得
	FindByUserAndContentID(ctx context.Context, userID, contentID int64) (*model.Rating, error)
	// 評価の作成
	Create(ctx context.Context, rating *model.Rating) error
	// 評価の更新（削除予定）
	Update(ctx context.Context, rating *model.Rating) error
	// 評価の削除
	Delete(ctx context.Context, id int64) error
	// コンテンツIDによるいいね統計取得（GetAverageByContentIDから変更）
	GetStatsByContentID(ctx context.Context, contentID int64) (*model.RatingStats, error)
}
