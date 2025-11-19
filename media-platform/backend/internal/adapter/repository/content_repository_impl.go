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
		SELECT 
			id, title, body, type, genre, author_id, category_id, 
			status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE id = $1
	`

	var content entity.Content
	var publishedAt sql.NullTime
	var genre sql.NullString

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&content.ID,
		&content.Title,
		&content.Body,
		&content.Type,
		&genre,
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
	if genre.Valid {
		content.Genre = genre.String
	}

	return &content, nil
}

func (r *ContentRepositoryImpl) FindByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT 
			id, title, body, type, genre, author_id, category_id,
			status, view_count, published_at, created_at, updated_at
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
		SELECT 
			id, title, body, type, genre, author_id, category_id,
			status, view_count, published_at, created_at, updated_at
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
		SELECT 
			id, title, body, type, genre, author_id, category_id,
			status, view_count, published_at, created_at, updated_at
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

func (r *ContentRepositoryImpl) FindByStatus(ctx context.Context, status string, authorID int64, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT 
			id, title, body, type, genre, author_id, category_id,
			status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE status = $1 AND author_id = $2
		ORDER BY updated_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.QueryContext(ctx, query, status, authorID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query contents by status: %w", err)
	}
	defer rows.Close()

	return r.scanContentRows(rows)
}

func (r *ContentRepositoryImpl) FindTrending(ctx context.Context, limit int) ([]*entity.Content, error) {
	query := `
		SELECT 
			id, title, body, type, genre, author_id, category_id,
			status, view_count, published_at, created_at, updated_at
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

func (r *ContentRepositoryImpl) Search(ctx context.Context, keyword string, limit, offset int) ([]*entity.Content, error) {
	cleanKeyword := strings.TrimSpace(keyword)
	if cleanKeyword == "" {
		return r.FindPublished(ctx, limit, offset)
	}

	// まず全文検索関数を試行
	query := `
		SELECT 
			id, title, body, type, genre, author_id, category_id,
			status, view_count, published_at, created_at, updated_at
		FROM search_contents($1, $2, $3)
	`

	rows, err := r.db.QueryContext(ctx, query, cleanKeyword, limit, offset)
	if err != nil {
		return r.searchFallback(ctx, cleanKeyword, limit, offset)
	}
	defer rows.Close()

	contents, err := r.scanContentRows(rows)
	if err != nil {
		return r.searchFallback(ctx, cleanKeyword, limit, offset)
	}

	if len(contents) == 0 {
		return r.searchFallback(ctx, cleanKeyword, limit, offset)
	}

	return contents, nil
}

func (r *ContentRepositoryImpl) searchFallback(ctx context.Context, keyword string, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT 
			id, title, body, type, genre, author_id, category_id, 
			status, view_count, published_at, created_at, updated_at,
			(
				CASE WHEN LOWER(title) = LOWER($1) THEN 100
				     WHEN title ILIKE $4 THEN 50
				     ELSE 0 
				END +
				CASE WHEN body ILIKE $4 THEN 20
				     ELSE 0 
				END +
				CASE WHEN view_count > 1000 THEN 10
				     WHEN view_count > 100 THEN 5
				     WHEN view_count > 10 THEN 2
				     ELSE 0 
				END +
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
		INSERT INTO contents (
			title, body, type, genre, author_id, category_id, 
			status, view_count, published_at, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
		content.Genre,
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
		SET title = $1, body = $2, type = $3, genre = $4, category_id = $5, 
		    status = $6, published_at = $7, updated_at = $8
		WHERE id = $9
	`

	var publishedAt sql.NullTime
	if content.PublishedAt != nil {
		publishedAt = sql.NullTime{Time: *content.PublishedAt, Valid: true}
	}

	result, err := r.db.ExecContext(ctx, query,
		content.Title,
		content.Body,
		content.Type,
		content.Genre,
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

func (r *ContentRepositoryImpl) scanContentRows(rows *sql.Rows) ([]*entity.Content, error) {
	var contents []*entity.Content
	for rows.Next() {
		var content entity.Content
		var publishedAt sql.NullTime
		var genre sql.NullString

		err := rows.Scan(
			&content.ID,
			&content.Title,
			&content.Body,
			&content.Type,
			&genre,
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
		if genre.Valid {
			content.Genre = genre.String
		}

		contents = append(contents, &content)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return contents, nil
}

func (r *ContentRepositoryImpl) scanContentRowsWithScore(rows *sql.Rows) ([]*entity.Content, error) {
	var contents []*entity.Content
	for rows.Next() {
		var content entity.Content
		var publishedAt sql.NullTime
		var genre sql.NullString
		var relevanceScore int

		err := rows.Scan(
			&content.ID,
			&content.Title,
			&content.Body,
			&content.Type,
			&genre,
			&content.AuthorID,
			&content.CategoryID,
			&content.Status,
			&content.ViewCount,
			&publishedAt,
			&content.CreatedAt,
			&content.UpdatedAt,
			&relevanceScore,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan content with score: %w", err)
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}
		if genre.Valid {
			content.Genre = genre.String
		}

		contents = append(contents, &content)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return contents, nil
}
