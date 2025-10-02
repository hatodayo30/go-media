package repository

import (
	"context"
	"database/sql"
	"fmt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"

	"github.com/lib/pq"
)

type RatingRepositoryImpl struct {
	db *sql.DB
}

func NewRatingRepository(db *sql.DB) repository.RatingRepository {
	return &RatingRepositoryImpl{
		db: db,
	}
}

func (r *RatingRepositoryImpl) FindByID(ctx context.Context, id int64) (*entity.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE id = $1
	`

	rating := &entity.Rating{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&rating.ID,
		&rating.Value,
		&rating.UserID,
		&rating.ContentID,
		&rating.CreatedAt,
		&rating.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("rating", id)
		}
		return nil, fmt.Errorf("failed to find rating: %w", err)
	}

	return rating, nil
}

func (r *RatingRepositoryImpl) FindByUserAndContentID(ctx context.Context, userID, contentID int64) (*entity.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE user_id = $1 AND content_id = $2
	`

	rating := &entity.Rating{}
	err := r.db.QueryRowContext(ctx, query, userID, contentID).Scan(
		&rating.ID,
		&rating.Value,
		&rating.UserID,
		&rating.ContentID,
		&rating.CreatedAt,
		&rating.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // 存在しない場合はnilを返す（エラーではない）
		}
		return nil, fmt.Errorf("failed to find rating: %w", err)
	}

	return rating, nil
}

func (r *RatingRepositoryImpl) FindByContentID(ctx context.Context, contentID int64) ([]*entity.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE content_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, contentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query ratings by content: %w", err)
	}
	defer rows.Close()

	return r.scanRatingRows(rows)
}

func (r *RatingRepositoryImpl) FindByUserID(ctx context.Context, userID int64) ([]*entity.Rating, error) {
	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query ratings by user: %w", err)
	}
	defer rows.Close()

	return r.scanRatingRows(rows)
}

func (r *RatingRepositoryImpl) Create(ctx context.Context, rating *entity.Rating) error {
	query := `
		INSERT INTO ratings (value, user_id, content_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

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
		// UNIQUE制約違反の場合
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return domainErrors.NewConflictError("rating", "すでにこのコンテンツを評価済みです")
		}
		return fmt.Errorf("failed to create rating: %w", err)
	}

	return nil
}

func (r *RatingRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM ratings WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete rating: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("rating", id)
	}

	return nil
}

func (r *RatingRepositoryImpl) GetStatsByContentID(ctx context.Context, contentID int64) (*entity.RatingStats, error) {
	query := `SELECT COUNT(*) FROM ratings WHERE content_id = $1 AND value = 1`

	var likeCount int
	err := r.db.QueryRowContext(ctx, query, contentID).Scan(&likeCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get rating stats: %w", err)
	}

	return entity.NewRatingStats(contentID, likeCount), nil
}

func (r *RatingRepositoryImpl) GetStatsByContentIDs(ctx context.Context, contentIDs []int64) (map[int64]*entity.RatingStats, error) {
	if len(contentIDs) == 0 {
		return make(map[int64]*entity.RatingStats), nil
	}

	query := `
		SELECT content_id, COUNT(*) as like_count
		FROM ratings 
		WHERE content_id = ANY($1) AND value = 1
		GROUP BY content_id
	`

	rows, err := r.db.QueryContext(ctx, query, pq.Array(contentIDs))
	if err != nil {
		return nil, fmt.Errorf("failed to get rating stats: %w", err)
	}
	defer rows.Close()

	statsMap := make(map[int64]*entity.RatingStats)
	for rows.Next() {
		var contentID int64
		var likeCount int
		if err := rows.Scan(&contentID, &likeCount); err != nil {
			return nil, fmt.Errorf("failed to scan rating stats: %w", err)
		}
		statsMap[contentID] = entity.NewRatingStats(contentID, likeCount)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	// 評価がないコンテンツには0を設定
	for _, contentID := range contentIDs {
		if _, exists := statsMap[contentID]; !exists {
			statsMap[contentID] = entity.NewRatingStats(contentID, 0)
		}
	}

	return statsMap, nil
}

func (r *RatingRepositoryImpl) FindContentIDsByUserID(ctx context.Context, userID int64, limit, offset int) ([]int64, error) {
	query := `
		SELECT content_id 
		FROM ratings 
		WHERE user_id = $1 
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query content IDs: %w", err)
	}
	defer rows.Close()

	var contentIDs []int64
	for rows.Next() {
		var contentID int64
		if err := rows.Scan(&contentID); err != nil {
			return nil, fmt.Errorf("failed to scan content ID: %w", err)
		}
		contentIDs = append(contentIDs, contentID)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return contentIDs, nil
}

func (r *RatingRepositoryImpl) CountByDateRange(ctx context.Context, contentID int64, startDate, endDate string) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM ratings 
		WHERE content_id = $1 
			AND created_at >= $2 
			AND created_at <= $3
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, contentID, startDate, endDate).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count ratings: %w", err)
	}

	return count, nil
}

func (r *RatingRepositoryImpl) FindTopRatedContentIDs(ctx context.Context, limit, days int) ([]int64, error) {
	query := `
		SELECT content_id, COUNT(*) as like_count
		FROM ratings 
		WHERE created_at >= NOW() - INTERVAL '1 day' * $1
		GROUP BY content_id 
		ORDER BY like_count DESC, content_id ASC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, days, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query top rated contents: %w", err)
	}
	defer rows.Close()

	var contentIDs []int64
	for rows.Next() {
		var contentID int64
		var likeCount int64
		if err := rows.Scan(&contentID, &likeCount); err != nil {
			return nil, fmt.Errorf("failed to scan content ID: %w", err)
		}
		contentIDs = append(contentIDs, contentID)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return contentIDs, nil
}

// scanRatingRows は共通のスキャン処理
func (r *RatingRepositoryImpl) scanRatingRows(rows *sql.Rows) ([]*entity.Rating, error) {
	var ratings []*entity.Rating
	for rows.Next() {
		rating := &entity.Rating{}
		err := rows.Scan(
			&rating.ID,
			&rating.Value,
			&rating.UserID,
			&rating.ContentID,
			&rating.CreatedAt,
			&rating.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan rating: %w", err)
		}
		ratings = append(ratings, rating)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return ratings, nil
}
