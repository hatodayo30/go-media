package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
)

type ratingRepository struct {
	db *sql.DB
}

// NewRatingRepository は新しいRatingRepositoryインスタンスを作成します
func NewRatingRepository(db *sql.DB) repository.RatingRepository {
	return &ratingRepository{
		db: db,
	}
}

// FindByContentID はコンテンツIDによる評価一覧を取得します
func (r *ratingRepository) FindByContentID(ctx context.Context, contentID int64) ([]*model.Rating, error) {
	// コンテンツIDの検証
	if contentID <= 0 {
		return nil, domainErrors.NewValidationError("コンテンツIDは正の整数である必要があります")
	}

	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE content_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, contentID)
	if err != nil {
		return nil, fmt.Errorf("評価一覧の取得に失敗しました: %w", err)
	}
	defer rows.Close()

	var ratings []*model.Rating
	for rows.Next() {
		var rating model.Rating
		if err := rows.Scan(
			&rating.ID,
			&rating.Value,
			&rating.UserID,
			&rating.ContentID,
			&rating.CreatedAt,
			&rating.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("評価データの読み込みに失敗しました: %w", err)
		}
		ratings = append(ratings, &rating)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("評価データの読み込み中にエラーが発生しました: %w", err)
	}

	return ratings, nil
}

// FindByUserID はユーザーIDによる評価一覧を取得します
func (r *ratingRepository) FindByUserID(ctx context.Context, userID int64) ([]*model.Rating, error) {
	// ユーザーIDの検証
	if userID <= 0 {
		return nil, domainErrors.NewValidationError("ユーザーIDは正の整数である必要があります")
	}

	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("ユーザーの評価一覧の取得に失敗しました: %w", err)
	}
	defer rows.Close()

	var ratings []*model.Rating
	for rows.Next() {
		var rating model.Rating
		if err := rows.Scan(
			&rating.ID,
			&rating.Value,
			&rating.UserID,
			&rating.ContentID,
			&rating.CreatedAt,
			&rating.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("評価データの読み込みに失敗しました: %w", err)
		}
		ratings = append(ratings, &rating)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("評価データの読み込み中にエラーが発生しました: %w", err)
	}

	return ratings, nil
}

// FindByID はIDによる評価を取得します
func (r *ratingRepository) FindByID(ctx context.Context, id int64) (*model.Rating, error) {
	// IDの検証
	if id <= 0 {
		return nil, domainErrors.NewValidationError("評価IDは正の整数である必要があります")
	}

	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE id = $1
	`

	var rating model.Rating
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
			return nil, nil // 評価が見つからない場合はnilを返す
		}
		return nil, fmt.Errorf("評価の取得に失敗しました: %w", err)
	}

	return &rating, nil
}

// FindByUserAndContentID はユーザーとコンテンツの組み合わせによる評価を取得します
func (r *ratingRepository) FindByUserAndContentID(ctx context.Context, userID, contentID int64) (*model.Rating, error) {
	// IDの検証
	if userID <= 0 {
		return nil, domainErrors.NewValidationError("ユーザーIDは正の整数である必要があります")
	}

	if contentID <= 0 {
		return nil, domainErrors.NewValidationError("コンテンツIDは正の整数である必要があります")
	}

	query := `
		SELECT id, value, user_id, content_id, created_at, updated_at
		FROM ratings
		WHERE user_id = $1 AND content_id = $2
	`

	var rating model.Rating
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
			return nil, nil // 評価が見つからない場合はnilを返す
		}
		return nil, fmt.Errorf("ユーザーとコンテンツの組み合わせによる評価の取得に失敗しました: %w", err)
	}

	return &rating, nil
}

// Create は評価を作成します
func (r *ratingRepository) Create(ctx context.Context, rating *model.Rating) error {
	// 評価データの検証
	if err := validateRating(rating); err != nil {
		return err
	}

	now := time.Now()
	query := `
		INSERT INTO ratings (value, user_id, content_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	err := r.db.QueryRowContext(ctx, query,
		rating.Value,
		rating.UserID,
		rating.ContentID,
		now,
		now,
	).Scan(&rating.ID)

	if err != nil {
		// PostgreSQLのユニーク制約違反の場合
		if err.Error() == `pq: duplicate key value violates unique constraint "ratings_user_id_content_id_key"` {
			return domainErrors.NewValidationError("既にこのコンテンツに対する評価が存在します")
		}
		return fmt.Errorf("評価の作成に失敗しました: %w", err)
	}

	rating.CreatedAt = now
	rating.UpdatedAt = now

	return nil
}

// Update は評価を更新します
func (r *ratingRepository) Update(ctx context.Context, rating *model.Rating) error {
	// IDの検証
	if rating.ID <= 0 {
		return domainErrors.NewValidationError("評価IDは正の整数である必要があります")
	}

	// 評価値の検証
	if rating.Value < 1 || rating.Value > 5 {
		return domainErrors.NewValidationError("評価値は1から5の間で設定してください")
	}

	now := time.Now()
	query := `
		UPDATE ratings
		SET value = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query, rating.Value, now, rating.ID)
	if err != nil {
		return fmt.Errorf("評価の更新に失敗しました: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("更新結果の確認に失敗しました: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewValidationError("更新対象の評価が見つかりません")
	}

	rating.UpdatedAt = now
	return nil
}

// Delete は評価を削除します
func (r *ratingRepository) Delete(ctx context.Context, id int64) error {
	// IDの検証
	if id <= 0 {
		return domainErrors.NewValidationError("評価IDは正の整数である必要があります")
	}

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
		return domainErrors.NewValidationError("削除対象の評価が見つかりません")
	}

	return nil
}

// GetAverageByContentID はコンテンツの平均評価を取得します
func (r *ratingRepository) GetAverageByContentID(ctx context.Context, contentID int64) (*model.RatingAverage, error) {
	// コンテンツIDの検証
	if contentID <= 0 {
		return nil, domainErrors.NewValidationError("コンテンツIDは正の整数である必要があります")
	}

	query := `
		SELECT COALESCE(AVG(value), 0) as average, COUNT(*) as count
		FROM ratings
		WHERE content_id = $1
	`

	var average float64
	var count int

	err := r.db.QueryRowContext(ctx, query, contentID).Scan(&average, &count)
	if err != nil {
		return nil, fmt.Errorf("平均評価の取得に失敗しました: %w", err)
	}

	return &model.RatingAverage{
		ContentID: contentID,
		Average:   average,
		Count:     count,
	}, nil
}

// validateRating は評価データのバリデーションを行います
func validateRating(rating *model.Rating) error {
	if rating.UserID <= 0 {
		return domainErrors.NewValidationError("ユーザーIDは正の整数である必要があります")
	}

	if rating.ContentID <= 0 {
		return domainErrors.NewValidationError("コンテンツIDは正の整数である必要があります")
	}

	if rating.Value < 1 || rating.Value > 5 {
		return domainErrors.NewValidationError("評価値は1から5の間で設定してください")
	}

	return nil
}
