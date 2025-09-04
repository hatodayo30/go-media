package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"media-platform/internal/domain/entity"
	"media-platform/internal/domain/repository"
	"media-platform/internal/presentation/dto"
)

// CommentRepositoryImpl はCommentRepositoryインターフェースの実装です
type CommentRepositoryImpl struct {
	db *sql.DB
}

// NewCommentRepository は新しいCommentRepositoryのインスタンスを生成します
func NewCommentRepository(db *sql.DB) repository.CommentRepository {
	return &CommentRepositoryImpl{
		db: db,
	}
}

// Find は指定したIDのコメントを取得します
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
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if parentID.Valid {
		comment.ParentID = &parentID.Int64
	}

	return &comment, nil
}

// FindAll は条件に合うコメントを取得します
func (r *CommentRepositoryImpl) FindAll(ctx context.Context, query *dto.CommentQuery) ([]*entity.Comment, error) {
	// ベースクエリ
	baseQuery := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE 1=1
	`

	// WHERE句の条件とパラメータを構築
	whereClause, args := r.buildWhereClause(query)

	// 最終的なクエリを構築
	finalQuery := fmt.Sprintf("%s %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		baseQuery, whereClause, len(args)+1, len(args)+2)
	args = append(args, query.Limit, query.Offset)

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, finalQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
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
			return nil, err
		}

		if parentID.Valid {
			comment.ParentID = &parentID.Int64
		}

		comments = append(comments, &comment)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

// FindByContent はコンテンツに関連するコメントを取得します
func (r *CommentRepositoryImpl) FindByContent(ctx context.Context, contentID int64, limit, offset int) ([]*entity.Comment, error) {
	query := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE content_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, contentID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
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
			return nil, err
		}

		if parentID.Valid {
			comment.ParentID = &parentID.Int64
		}

		comments = append(comments, &comment)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

// FindByUser はユーザーが投稿したコメントを取得します
func (r *CommentRepositoryImpl) FindByUser(ctx context.Context, userID int64, limit, offset int) ([]*entity.Comment, error) {
	query := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
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
			return nil, err
		}

		if parentID.Valid {
			comment.ParentID = &parentID.Int64
		}

		comments = append(comments, &comment)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

// FindReplies はコメントに対する返信を取得します
func (r *CommentRepositoryImpl) FindReplies(ctx context.Context, parentID int64, limit, offset int) ([]*entity.Comment, error) {
	query := `
		SELECT id, body, user_id, content_id, parent_id, created_at, updated_at
		FROM comments
		WHERE parent_id = $1
		ORDER BY created_at ASC
		LIMIT $2 OFFSET $3
	`

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, parentID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
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
			return nil, err
		}

		if dbParentID.Valid {
			comment.ParentID = &dbParentID.Int64
		}

		comments = append(comments, &comment)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return comments, nil
}

// Create は新しいコメントを作成します
func (r *CommentRepositoryImpl) Create(ctx context.Context, comment *entity.Comment) error {
	query := `
		INSERT INTO comments (body, user_id, content_id, parent_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	// 現在時刻の設定
	now := time.Now()
	comment.CreatedAt = now
	comment.UpdatedAt = now

	var parentID sql.NullInt64
	if comment.ParentID != nil {
		parentID.Int64 = *comment.ParentID
		parentID.Valid = true
	}

	// クエリ実行
	err := r.db.QueryRowContext(ctx, query,
		comment.Body,
		comment.UserID,
		comment.ContentID,
		parentID,
		comment.CreatedAt,
		comment.UpdatedAt,
	).Scan(&comment.ID)

	return err
}

// Update は既存のコメントを更新します
func (r *CommentRepositoryImpl) Update(ctx context.Context, comment *entity.Comment) error {
	query := `
		UPDATE comments
		SET body = $1, updated_at = $2
		WHERE id = $3
	`

	// 現在時刻の設定
	comment.UpdatedAt = time.Now()

	// クエリ実行
	result, err := r.db.ExecContext(ctx, query,
		comment.Body,
		comment.UpdatedAt,
		comment.ID,
	)
	if err != nil {
		return err
	}

	// 更新された行数をチェック
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("コメントが見つかりません")
	}

	return nil
}

// Delete は指定したIDのコメントを削除します
func (r *CommentRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `
		DELETE FROM comments
		WHERE id = $1
	`

	// クエリ実行
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	// 削除された行数をチェック
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("コメントが見つかりません")
	}

	return nil
}

// CountByContent はコンテンツに関連するコメント数を取得します
func (r *CommentRepositoryImpl) CountByContent(ctx context.Context, contentID int64) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM comments
		WHERE content_id = $1
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, contentID).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// CountByUser はユーザーが投稿したコメント数を取得します
func (r *CommentRepositoryImpl) CountByUser(ctx context.Context, userID int64) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM comments
		WHERE user_id = $1
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// buildWhereClause は検索条件からWHERE句を構築します
func (r *CommentRepositoryImpl) buildWhereClause(query *dto.CommentQuery) (string, []interface{}) {
	var conditions []string
	var args []interface{}
	argCount := 1

	// コンテンツIDによるフィルタリング
	if query.ContentID != nil {
		conditions = append(conditions, fmt.Sprintf("content_id = $%d", argCount))
		args = append(args, *query.ContentID)
		argCount++
	}

	// ユーザーIDによるフィルタリング
	if query.UserID != nil {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argCount))
		args = append(args, *query.UserID)
		argCount++
	}

	// 親コメントIDによるフィルタリング
	if query.ParentID != nil {
		if *query.ParentID == 0 {
			// 親コメントが0の場合はNULL（トップレベルコメント）を指定
			conditions = append(conditions, "parent_id IS NULL")
		} else {
			conditions = append(conditions, fmt.Sprintf("parent_id = $%d", argCount))
			args = append(args, *query.ParentID)
			argCount++
		}
	} else {
		// 親コメントの指定がない場合は、親コメント（トップレベル）のみを取得
		conditions = append(conditions, "parent_id IS NULL")
	}

	// 条件がある場合は WHERE 句を構築
	if len(conditions) > 0 {
		return " AND " + strings.Join(conditions, " AND "), args
	}

	return "", args
}
