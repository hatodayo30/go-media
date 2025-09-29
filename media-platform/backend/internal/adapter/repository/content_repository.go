package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
)

type ContentRepositoryImpl struct {
	db *sql.DB
}

func NewContentRepository(db *sql.DB) repository.ContentRepository {
	return &ContentRepositoryImpl{
		db: db,
	}
}

func (r *ContentRepositoryImpl) Find(ctx context.Context, id int64) (*entity.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE id = $1
	`

	var content entity.Content
	var publishedAt sql.NullTime

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&content.ID,
		&content.Title,
		&content.Body,
		&content.Type,
		&content.AuthorID,
		&content.CategoryID,
		&content.Status,
		&content.ViewCount,
		&publishedAt,
		&content.CreatedAt,
		&content.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("content", id)
		}
		return nil, fmt.Errorf("failed to find content: %w", err)
	}

	if publishedAt.Valid {
		content.PublishedAt = &publishedAt.Time
	}

	return &content, nil
}

func (r *ContentRepositoryImpl) FindByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE author_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, authorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query contents by author: %w", err)
	}
	defer rows.Close()

	return r.scanContentRows(rows)
}

func (r *ContentRepositoryImpl) FindByCategory(ctx context.Context, categoryID int64, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE category_id = $1 AND status = 'published' AND published_at <= NOW()
		ORDER BY published_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, categoryID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query contents by category: %w", err)
	}
	defer rows.Close()

	return r.scanContentRows(rows)
}

func (r *ContentRepositoryImpl) FindPublished(ctx context.Context, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE status = 'published' AND published_at <= NOW()
		ORDER BY published_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query published contents: %w", err)
	}
	defer rows.Close()

	return r.scanContentRows(rows)
}

func (r *ContentRepositoryImpl) FindTrending(ctx context.Context, limit int) ([]*entity.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE status = 'published' AND published_at <= NOW()
		ORDER BY view_count DESC, published_at DESC
		LIMIT $1
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query trending contents: %w", err)
	}
	defer rows.Close()

	return r.scanContentRows(rows)
}

// Search は全文検索とスコアリングを使った高度な検索を実行します
func (r *ContentRepositoryImpl) Search(ctx context.Context, keyword string, limit, offset int) ([]*entity.Content, error) {
	// キーワードのクリーンアップ
	cleanKeyword := strings.TrimSpace(keyword)
	if cleanKeyword == "" {
		return r.FindPublished(ctx, limit, offset)
	}

	// まず全文検索関数を試行
	query := `
		SELECT 
			id, title, body, type, author_id, category_id, 
			status, view_count, published_at, created_at, updated_at
		FROM search_contents($1, $2, $3)
	`

	rows, err := r.db.QueryContext(ctx, query, cleanKeyword, limit, offset)
	if err != nil {
		// 全文検索関数が存在しない、または失敗した場合はフォールバック
		return r.searchFallback(ctx, cleanKeyword, limit, offset)
	}
	defer rows.Close()

	contents, err := r.scanContentRows(rows)
	if err != nil {
		// スキャンに失敗した場合もフォールバック
		return r.searchFallback(ctx, cleanKeyword, limit, offset)
	}

	// 結果が0件の場合もフォールバック検索を試行
	if len(contents) == 0 {
		return r.searchFallback(ctx, cleanKeyword, limit, offset)
	}

	return contents, nil
}

// searchFallback は全文検索が利用できない場合の高度なILIKE検索
func (r *ContentRepositoryImpl) searchFallback(ctx context.Context, keyword string, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT 
			id, title, body, type, author_id, category_id, 
			status, view_count, published_at, created_at, updated_at,
			-- 関連性スコア計算
			(
				-- タイトル完全一致（最高点）
				CASE WHEN LOWER(title) = LOWER($1) THEN 100
				-- タイトル部分一致（高得点）
				     WHEN title ILIKE $4 THEN 50
				     ELSE 0 
				END +
				-- 本文部分一致（中程度）
				CASE WHEN body ILIKE $4 THEN 20
				     ELSE 0 
				END +
				-- 人気度ボーナス
				CASE WHEN view_count > 1000 THEN 10
				     WHEN view_count > 100 THEN 5
				     WHEN view_count > 10 THEN 2
				     ELSE 0 
				END +
				-- 新鮮度ボーナス
				CASE WHEN published_at > NOW() - INTERVAL '7 days' THEN 3
				     WHEN published_at > NOW() - INTERVAL '30 days' THEN 2
				     ELSE 0 
				END
			) as relevance_score
		FROM contents
		WHERE (title ILIKE $4 OR body ILIKE $4)
		    AND status = 'published' 
		    AND published_at <= NOW()
		ORDER BY relevance_score DESC, view_count DESC, published_at DESC
		LIMIT $2 OFFSET $3
	`

	likePattern := "%" + keyword + "%"
	rows, err := r.db.QueryContext(ctx, query, keyword, limit, offset, likePattern)
	if err != nil {
		return nil, fmt.Errorf("failed to search contents (fallback): %w", err)
	}
	defer rows.Close()

	return r.scanContentRowsWithScore(rows)
}

func (r *ContentRepositoryImpl) Create(ctx context.Context, content *entity.Content) error {
	query := `
		INSERT INTO contents (title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`

	var publishedAt sql.NullTime
	if content.PublishedAt != nil {
		publishedAt = sql.NullTime{Time: *content.PublishedAt, Valid: true}
	}

	err := r.db.QueryRowContext(ctx, query,
		content.Title,
		content.Body,
		content.Type,
		content.AuthorID,
		content.CategoryID,
		content.Status,
		content.ViewCount,
		publishedAt,
		content.CreatedAt,
		content.UpdatedAt,
	).Scan(&content.ID)

	if err != nil {
		return fmt.Errorf("failed to create content: %w", err)
	}

	return nil
}

func (r *ContentRepositoryImpl) Update(ctx context.Context, content *entity.Content) error {
	query := `
		UPDATE contents
		SET title = $1, body = $2, type = $3, category_id = $4, status = $5, published_at = $6, updated_at = $7
		WHERE id = $8
	`

	var publishedAt sql.NullTime
	if content.PublishedAt != nil {
		publishedAt = sql.NullTime{Time: *content.PublishedAt, Valid: true}
	}

	result, err := r.db.ExecContext(ctx, query,
		content.Title,
		content.Body,
		content.Type,
		content.CategoryID,
		content.Status,
		publishedAt,
		content.UpdatedAt,
		content.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update content: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("content", content.ID)
	}

	return nil
}

func (r *ContentRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM contents WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete content: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("content", id)
	}

	return nil
}

func (r *ContentRepositoryImpl) IncrementViewCount(ctx context.Context, id int64) error {
	query := `
		UPDATE contents
		SET view_count = view_count + 1, updated_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to increment view count: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("content", id)
	}

	return nil
}

// scanContentRows は標準的なスキャン処理
func (r *ContentRepositoryImpl) scanContentRows(rows *sql.Rows) ([]*entity.Content, error) {
	var contents []*entity.Content
	for rows.Next() {
		var content entity.Content
		var publishedAt sql.NullTime

		err := rows.Scan(
			&content.ID,
			&content.Title,
			&content.Body,
			&content.Type,
			&content.AuthorID,
			&content.CategoryID,
			&content.Status,
			&content.ViewCount,
			&publishedAt,
			&content.CreatedAt,
			&content.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan content: %w", err)
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return contents, nil
}

// scanContentRowsWithScore は関連性スコアを含む結果をスキャン
func (r *ContentRepositoryImpl) scanContentRowsWithScore(rows *sql.Rows) ([]*entity.Content, error) {
	var contents []*entity.Content
	for rows.Next() {
		var content entity.Content
		var publishedAt sql.NullTime
		var relevanceScore int // スコアは読み取るが Entity には含めない

		err := rows.Scan(
			&content.ID,
			&content.Title,
			&content.Body,
			&content.Type,
			&content.AuthorID,
			&content.CategoryID,
			&content.Status,
			&content.ViewCount,
			&publishedAt,
			&content.CreatedAt,
			&content.UpdatedAt,
			&relevanceScore, // スコアカラムを読み取る
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan content with score: %w", err)
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return contents, nil
}
