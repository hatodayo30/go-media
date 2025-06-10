// infrastructure/persistence/rating_repository.go
package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
	"time"

	"github.com/lib/pq"
)

type RatingRepositoryImpl struct {
	db *sql.DB
}

// NewRatingRepository は新しいRatingRepositoryインスタンスを作成します
func NewRatingRepository(db *sql.DB) repository.RatingRepository {
	return &RatingRepositoryImpl{
		db: db,
	}
}

// FindByContentID はコンテンツIDによる評価一覧を取得します
func (r *RatingRepositoryImpl) FindByContentID(ctx context.Context, contentID int64) ([]*model.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE content_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, contentID)
	if err != nil {
		return nil, fmt.Errorf("評価の検索に失敗しました: %w", err)
	}
	defer rows.Close()

	var ratings []*model.Rating
	for rows.Next() {
		rating := &model.Rating{}
		err := rows.Scan(
			&rating.ID,
			&rating.Value,
			&rating.UserID,
			&rating.ContentID,
			&rating.CreatedAt,
			&rating.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("評価データの読み取りに失敗しました: %w", err)
		}
		ratings = append(ratings, rating)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("行の処理中にエラーが発生しました: %w", err)
	}

	return ratings, nil
}

// FindByUserID はユーザーIDによる評価一覧を取得します
func (r *RatingRepositoryImpl) FindByUserID(ctx context.Context, userID int64) ([]*model.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("評価の検索に失敗しました: %w", err)
	}
	defer rows.Close()

	var ratings []*model.Rating
	for rows.Next() {
		rating := &model.Rating{}
		err := rows.Scan(
			&rating.ID,
			&rating.Value,
			&rating.UserID,
			&rating.ContentID,
			&rating.CreatedAt,
			&rating.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("評価データの読み取りに失敗しました: %w", err)
		}
		ratings = append(ratings, rating)
	}

	return ratings, nil
}

// FindByID はIDによる評価を取得します
func (r *RatingRepositoryImpl) FindByID(ctx context.Context, id int64) (*model.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE id = $1
	`

	rating := &model.Rating{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rating.ID,
		&rating.Value,
		&rating.UserID,
		&rating.ContentID,
		&rating.CreatedAt,
		&rating.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("評価の取得に失敗しました: %w", err)
	}

	return rating, nil
}

// FindByUserAndContentID はユーザーIDとコンテンツIDによる評価を取得します
func (r *RatingRepositoryImpl) FindByUserAndContentID(ctx context.Context, userID, contentID int64) (*model.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE user_id = $1 AND content_id = $2
	`

	rating := &model.Rating{}
	err := r.db.QueryRowContext(ctx, query, userID, contentID).Scan(
		&rating.ID,
		&rating.Value,
		&rating.UserID,
		&rating.ContentID,
		&rating.CreatedAt,
		&rating.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("評価の取得に失敗しました: %w", err)
	}

	return rating, nil
}

// Create は評価を作成します
func (r *RatingRepositoryImpl) Create(ctx context.Context, rating *model.Rating) error {
	query := `
		INSERT INTO ratings (value, user_id, content_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	now := time.Now()
	rating.CreatedAt = now
	rating.UpdatedAt = now

	err := r.db.QueryRowContext(
		ctx,
		query,
		rating.Value,
		rating.UserID,
		rating.ContentID,
		rating.CreatedAt,
		rating.UpdatedAt,
	).Scan(&rating.ID)

	if err != nil {
		// 一意制約違反の場合
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return fmt.Errorf("この評価は既に存在します")
		}
		return fmt.Errorf("評価の作成に失敗しました: %w", err)
	}

	return nil
}

// Update は評価を更新します
func (r *RatingRepositoryImpl) Update(ctx context.Context, rating *model.Rating) error {
	query := `
		UPDATE ratings
		SET value = $1, updated_at = $2
		WHERE id = $3
	`

	rating.UpdatedAt = time.Now()

	result, err := r.db.ExecContext(ctx, query, rating.Value, rating.UpdatedAt, rating.ID)
	if err != nil {
		return fmt.Errorf("評価の更新に失敗しました: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("更新結果の確認に失敗しました: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("更新対象の評価が見つかりません")
	}

	return nil
}

// Delete は評価を削除します
func (r *RatingRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM ratings WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("評価の削除に失敗しました: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("削除結果の確認に失敗しました: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("削除対象の評価が見つかりません")
	}

	return nil
}

// GetAverageByContentID はコンテンツIDによる平均評価を取得します（統計ビューを使用）
func (r *RatingRepositoryImpl) GetAverageByContentID(ctx context.Context, contentID int64) (*model.RatingAverage, error) {
	query := `
		SELECT 
			content_id,
			total_ratings,
			CASE 
				WHEN total_ratings > 0 THEN CAST(likes AS FLOAT) / total_ratings 
				ELSE 0 
			END as average,
			likes,
			dislikes
		FROM rating_stats
		WHERE content_id = $1
	`

	ratingAverage := &model.RatingAverage{}
	err := r.db.QueryRowContext(ctx, query, contentID).Scan(
		&ratingAverage.ContentID,
		&ratingAverage.Count,
		&ratingAverage.Average,
		&ratingAverage.LikeCount,
		&ratingAverage.DislikeCount,
	)

	if err == sql.ErrNoRows {
		// 評価が存在しない場合はデフォルト値を返す
		return &model.RatingAverage{
			ContentID:    contentID,
			Average:      0.0,
			Count:        0,
			LikeCount:    0,
			DislikeCount: 0,
		}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("平均評価の取得に失敗しました: %w", err)
	}

	return ratingAverage, nil
}
