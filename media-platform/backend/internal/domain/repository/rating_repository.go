package repository

import (
	"context"
	"media-platform/internal/domain/entity"
)

// RatingRepository は評価情報の永続化を担当するドメインリポジトリインターフェースです
type RatingRepository interface {
	// IDによる評価取得
	FindByID(ctx context.Context, id int64) (*entity.Rating, error)

	// ユーザーIDとコンテンツIDによる評価取得（重複チェック用）
	FindByUserAndContentID(ctx context.Context, userID, contentID int64) (*entity.Rating, error)

	// コンテンツIDによる評価一覧取得
	FindByContentID(ctx context.Context, contentID int64) ([]*entity.Rating, error)

	// ユーザーIDによる評価一覧取得
	FindByUserID(ctx context.Context, userID int64) ([]*entity.Rating, error)

	// 評価の作成
	Create(ctx context.Context, rating *entity.Rating) error

	// 評価の削除
	Delete(ctx context.Context, id int64) error

	// コンテンツIDによるいいね統計取得
	GetStatsByContentID(ctx context.Context, contentID int64) (*entity.RatingStats, error)

	// 複数コンテンツのいいね統計を一括取得（パフォーマンス最適化用）
	GetStatsByContentIDs(ctx context.Context, contentIDs []int64) (map[int64]*entity.RatingStats, error)

	// ユーザーが評価したコンテンツID一覧を取得（ページング対応）
	FindContentIDsByUserID(ctx context.Context, userID int64, limit, offset int) ([]int64, error)

	// 指定期間内の評価数を取得（トレンド分析用）
	CountByDateRange(ctx context.Context, contentID int64, startDate, endDate string) (int, error)

	FindTopRatedContentIDs(ctx context.Context, limit, days int) ([]int64, error)
}
