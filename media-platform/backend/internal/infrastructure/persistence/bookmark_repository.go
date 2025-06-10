// infrastructure/persistence/bookmark_repository.go
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

type BookmarkRepositoryImpl struct {
	db *sql.DB
}

// NewBookmarkRepository は新しいBookmarkRepositoryインスタンスを作成します
func NewBookmarkRepository(db *sql.DB) repository.BookmarkRepository {
	return &BookmarkRepositoryImpl{
		db: db,
	}
}

// FindByContentID はコンテンツIDによるブックマーク一覧を取得します
func (r *BookmarkRepositoryImpl) FindByContentID(ctx context.Context, contentID int64) ([]*model.Bookmark, error) {
	query := `
		SELECT id, user_id, content_id, created_at, updated_at
		FROM bookmarks
		WHERE content_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, contentID)
	if err != nil {
		return nil, fmt.Errorf("ブックマークの検索に失敗しました: %w", err)
	}
	defer rows.Close()

	var bookmarks []*model.Bookmark
	for rows.Next() {
		bookmark := &model.Bookmark{}
		err := rows.Scan(
			&bookmark.ID,
			&bookmark.UserID,
			&bookmark.ContentID,
			&bookmark.CreatedAt,
			&bookmark.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("ブックマークデータの読み取りに失敗しました: %w", err)
		}
		bookmarks = append(bookmarks, bookmark)
	}

	return bookmarks, nil
}

// FindByUserID はユーザーIDによるブックマーク一覧を取得します
func (r *BookmarkRepositoryImpl) FindByUserID(ctx context.Context, userID int64) ([]*model.Bookmark, error) {
	query := `
		SELECT id, user_id, content_id, created_at, updated_at
		FROM bookmarks
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("ブックマークの検索に失敗しました: %w", err)
	}
	defer rows.Close()

	var bookmarks []*model.Bookmark
	for rows.Next() {
		bookmark := &model.Bookmark{}
		err := rows.Scan(
			&bookmark.ID,
			&bookmark.UserID,
			&bookmark.ContentID,
			&bookmark.CreatedAt,
			&bookmark.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("ブックマークデータの読み取りに失敗しました: %w", err)
		}
		bookmarks = append(bookmarks, bookmark)
	}

	return bookmarks, nil
}

// FindByID はIDによるブックマークを取得します
func (r *BookmarkRepositoryImpl) FindByID(ctx context.Context, id int64) (*model.Bookmark, error) {
	query := `
		SELECT id, user_id, content_id, created_at, updated_at
		FROM bookmarks
		WHERE id = $1
	`

	bookmark := &model.Bookmark{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&bookmark.ID,
		&bookmark.UserID,
		&bookmark.ContentID,
		&bookmark.CreatedAt,
		&bookmark.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("ブックマークの取得に失敗しました: %w", err)
	}

	return bookmark, nil
}

// FindByUserAndContentID はユーザーIDとコンテンツIDによるブックマークを取得します
func (r *BookmarkRepositoryImpl) FindByUserAndContentID(ctx context.Context, userID, contentID int64) (*model.Bookmark, error) {
	query := `
		SELECT id, user_id, content_id, created_at, updated_at
		FROM bookmarks
		WHERE user_id = $1 AND content_id = $2
	`

	bookmark := &model.Bookmark{}
	err := r.db.QueryRowContext(ctx, query, userID, contentID).Scan(
		&bookmark.ID,
		&bookmark.UserID,
		&bookmark.ContentID,
		&bookmark.CreatedAt,
		&bookmark.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("ブックマークの取得に失敗しました: %w", err)
	}

	return bookmark, nil
}

// Create はブックマークを作成します
func (r *BookmarkRepositoryImpl) Create(ctx context.Context, bookmark *model.Bookmark) error {
	query := `
		INSERT INTO bookmarks (user_id, content_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	now := time.Now()
	bookmark.CreatedAt = now
	bookmark.UpdatedAt = now

	err := r.db.QueryRowContext(
		ctx,
		query,
		bookmark.UserID,
		bookmark.ContentID,
		bookmark.CreatedAt,
		bookmark.UpdatedAt,
	).Scan(&bookmark.ID)

	if err != nil {
		// 一意制約違反の場合
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return fmt.Errorf("このブックマークは既に存在します")
		}
		return fmt.Errorf("ブックマークの作成に失敗しました: %w", err)
	}

	return nil
}

// Delete はブックマークを削除します
func (r *BookmarkRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM bookmarks WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("ブックマークの削除に失敗しました: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("削除結果の確認に失敗しました: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("削除対象のブックマークが見つかりません")
	}

	return nil
}

// CountByContentID はコンテンツIDによるブックマーク数を取得します（統計ビューを使用）
func (r *BookmarkRepositoryImpl) CountByContentID(ctx context.Context, contentID int64) (int64, error) {
	query := `
		SELECT COALESCE(bookmark_count, 0)
		FROM bookmark_stats
		WHERE content_id = $1
	`

	var count int64
	err := r.db.QueryRowContext(ctx, query, contentID).Scan(&count)
	if err == sql.ErrNoRows {
		return 0, nil // ブックマークが存在しない場合は0を返す
	}
	if err != nil {
		return 0, fmt.Errorf("ブックマーク数の取得に失敗しました: %w", err)
	}

	return count, nil
}
