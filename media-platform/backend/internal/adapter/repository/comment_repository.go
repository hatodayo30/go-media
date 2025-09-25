package repository

import (
	"context"
	"database/sql"
	"fmt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
)

type CommentRepositoryImpl struct {
	db *sql.DB
}

func NewCommentRepository(db *sql.DB) repository.CommentRepository {
	return &CommentRepositoryImpl{
		db: db,
	}
}

// CommentQuery をRepository内で定義（または別の方法で解決）
type CommentQuery struct {
	ContentID *int64
	UserID    *int64
	ParentID  *int64
	Limit     int
	Offset    int
}

func (r *CommentRepositoryImpl) Find(ctx context.Context, id int64) (*entity.Comment, error) {
	query := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE id = $1
	`

	var comment entity.Comment
	var parentID sql.NullInt64

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&comment.ID,
		&comment.Body,
		&comment.UserID,
		&comment.ContentID,
		&parentID,
		&comment.CreatedAt,
		&comment.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("comment", id)
		}
		return nil, fmt.Errorf("failed to find comment: %w", err)
	}

	if parentID.Valid {
		comment.ParentID = &parentID.Int64
	}

	return &comment, nil
}

// シンプルなメソッドに分割（複雑なクエリビルダーを削除）
func (r *CommentRepositoryImpl) FindByContent(ctx context.Context, contentID int64, limit, offset int) ([]*entity.Comment, error) {
	query := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE content_id = $1 AND parent_id IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, contentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query comments: %w", err)
	}
	defer rows.Close()

	var comments []*entity.Comment
	for rows.Next() {
		var comment entity.Comment
		var parentID sql.NullInt64

		err := rows.Scan(
			&comment.ID,
			&comment.Body,
			&comment.UserID,
			&comment.ContentID,
			&parentID,
			&comment.CreatedAt,
			&comment.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan comment: %w", err)
		}

		if parentID.Valid {
			comment.ParentID = &parentID.Int64
		}

		comments = append(comments, &comment)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return comments, nil
}

func (r *CommentRepositoryImpl) FindByUser(ctx context.Context, userID int64, limit, offset int) ([]*entity.Comment, error) {
	query := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query comments by user: %w", err)
	}
	defer rows.Close()

	var comments []*entity.Comment
	for rows.Next() {
		var comment entity.Comment
		var parentID sql.NullInt64

		err := rows.Scan(
			&comment.ID,
			&comment.Body,
			&comment.UserID,
			&comment.ContentID,
			&parentID,
			&comment.CreatedAt,
			&comment.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan comment: %w", err)
		}

		if parentID.Valid {
			comment.ParentID = &parentID.Int64
		}

		comments = append(comments, &comment)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return comments, nil
}

func (r *CommentRepositoryImpl) FindReplies(ctx context.Context, parentID int64, limit, offset int) ([]*entity.Comment, error) {
	query := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE parent_id = $1
		ORDER BY created_at ASC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, parentID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query replies: %w", err)
	}
	defer rows.Close()

	var comments []*entity.Comment
	for rows.Next() {
		var comment entity.Comment
		var dbParentID sql.NullInt64

		err := rows.Scan(
			&comment.ID,
			&comment.Body,
			&comment.UserID,
			&comment.ContentID,
			&dbParentID,
			&comment.CreatedAt,
			&comment.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan reply: %w", err)
		}

		if dbParentID.Valid {
			comment.ParentID = &dbParentID.Int64
		}

		comments = append(comments, &comment)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return comments, nil
}

func (r *CommentRepositoryImpl) Create(ctx context.Context, comment *entity.Comment) error {
	query := `
		INSERT INTO comments (body, user_id, content_id, parent_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	var parentID sql.NullInt64
	if comment.ParentID != nil {
		parentID.Int64 = *comment.ParentID
		parentID.Valid = true
	}

	err := r.db.QueryRowContext(ctx, query,
		comment.Body,
		comment.UserID,
		comment.ContentID,
		parentID,
		comment.CreatedAt,
		comment.UpdatedAt,
	).Scan(&comment.ID)

	if err != nil {
		return fmt.Errorf("failed to create comment: %w", err)
	}

	return nil
}

func (r *CommentRepositoryImpl) Update(ctx context.Context, comment *entity.Comment) error {
	query := `
		UPDATE comments
		SET body = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query,
		comment.Body,
		comment.UpdatedAt,
		comment.ID,
	)
	if err != nil {
		return fmt.Errorf("failed to update comment: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("comment", comment.ID)
	}

	return nil
}

func (r *CommentRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM comments WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete comment: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("comment", id)
	}

	return nil
}

func (r *CommentRepositoryImpl) CountByContent(ctx context.Context, contentID int64) (int64, error) {
	query := `SELECT COUNT(*) FROM comments WHERE content_id = $1`

	var count int64
	err := r.db.QueryRowContext(ctx, query, contentID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count comments: %w", err)
	}

	return count, nil
}

func (r *CommentRepositoryImpl) CountByUser(ctx context.Context, userID int64) (int64, error) {
	query := `SELECT COUNT(*) FROM comments WHERE user_id = $1`

	var count int64
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count user comments: %w", err)
	}

	return count, nil
}
