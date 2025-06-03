package persistence

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
)

// ContentRepositoryImpl はContentRepositoryインターフェースの実装です
type ContentRepositoryImpl struct {
	db *sql.DB
}

// NewContentRepository は新しいContentRepositoryのインスタンスを生成します
func NewContentRepository(db *sql.DB) repository.ContentRepository {
	return &ContentRepositoryImpl{
		db: db,
	}
}

// Find は指定したIDのコンテンツを取得します
func (r *ContentRepositoryImpl) Find(ctx context.Context, id int64) (*model.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE id = $1
	`

	var content model.Content
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
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	if publishedAt.Valid {
		content.PublishedAt = &publishedAt.Time
	}

	return &content, nil
}

// FindAll は条件に合うコンテンツを全て取得します
func (r *ContentRepositoryImpl) FindAll(ctx context.Context, query *model.ContentQuery) ([]*model.Content, error) {
	// ベースクエリ
	baseQuery := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE 1=1
	`

	// WHERE句の条件とパラメータを構築
	whereClause, args := r.buildWhereClause(query)
	orderClause := r.buildOrderClause(query)

	// 最終的なクエリを構築
	finalQuery := fmt.Sprintf("%s %s %s LIMIT $%d OFFSET $%d", baseQuery, whereClause, orderClause, len(args)+1, len(args)+2)
	args = append(args, query.Limit, query.Offset)

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, finalQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
	var contents []*model.Content
	for rows.Next() {
		var content model.Content
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
			return nil, err
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return contents, nil
}

// CountAll は条件に合うコンテンツの総数を取得します
func (r *ContentRepositoryImpl) CountAll(ctx context.Context, query *model.ContentQuery) (int, error) {
	// ベースクエリ
	baseQuery := `
		SELECT COUNT(*)
		FROM contents
		WHERE 1=1
	`

	// WHERE句の条件とパラメータを構築
	whereClause, args := r.buildWhereClause(query)

	// 最終的なクエリを構築
	finalQuery := baseQuery + whereClause

	// クエリ実行
	var count int
	err := r.db.QueryRowContext(ctx, finalQuery, args...).Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}

// FindByAuthor は指定した著者のコンテンツを取得します
func (r *ContentRepositoryImpl) FindByAuthor(ctx context.Context, authorID int64, limit, offset int) ([]*model.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE author_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, authorID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
	var contents []*model.Content
	for rows.Next() {
		var content model.Content
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
			return nil, err
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return contents, nil
}

// FindByCategory は指定したカテゴリのコンテンツを取得します
func (r *ContentRepositoryImpl) FindByCategory(ctx context.Context, categoryID int64, limit, offset int) ([]*model.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE category_id = $1 AND status = 'published' AND published_at <= NOW()
		ORDER BY published_at DESC
		LIMIT $2 OFFSET $3
	`

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, categoryID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
	var contents []*model.Content
	for rows.Next() {
		var content model.Content
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
			return nil, err
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return contents, nil
}

// FindPublished は公開済みのコンテンツを取得します
func (r *ContentRepositoryImpl) FindPublished(ctx context.Context, limit, offset int) ([]*model.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE status = 'published' AND published_at <= NOW()
		ORDER BY published_at DESC
		LIMIT $1 OFFSET $2
	`

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
	var contents []*model.Content
	for rows.Next() {
		var content model.Content
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
			return nil, err
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return contents, nil
}

// FindTrending は閲覧数の多いコンテンツを取得します
func (r *ContentRepositoryImpl) FindTrending(ctx context.Context, limit int) ([]*model.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE status = 'published' AND published_at <= NOW()
		ORDER BY view_count DESC, published_at DESC
		LIMIT $1
	`

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
	var contents []*model.Content
	for rows.Next() {
		var content model.Content
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
			return nil, err
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return contents, nil
}

// Search はキーワードでコンテンツを検索します
func (r *ContentRepositoryImpl) Search(ctx context.Context, keyword string, limit, offset int) ([]*model.Content, error) {
	query := `
		SELECT id, title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at
		FROM contents
		WHERE (title ILIKE $1 OR body ILIKE $1) 
			AND status = 'published' 
			AND published_at <= NOW()
		ORDER BY 
			ts_rank(to_tsvector('japanese', title), to_tsquery('japanese', $2)) DESC,
			published_at DESC
		LIMIT $3 OFFSET $4
	`

	// 検索用のワイルドカードパターンとtsqueryを作成
	likePattern := "%" + keyword + "%"
	tsQuery := strings.Replace(keyword, " ", " & ", -1)

	// クエリ実行
	rows, err := r.db.QueryContext(ctx, query, likePattern, tsQuery, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// 結果をスライスに格納
	var contents []*model.Content
	for rows.Next() {
		var content model.Content
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
			return nil, err
		}

		if publishedAt.Valid {
			content.PublishedAt = &publishedAt.Time
		}

		contents = append(contents, &content)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return contents, nil
}

// Create は新しいコンテンツを作成します
func (r *ContentRepositoryImpl) Create(ctx context.Context, content *model.Content) error {
	query := `
		INSERT INTO contents (title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`

	// 現在時刻の設定
	now := time.Now()
	content.CreatedAt = now
	content.UpdatedAt = now

	var publishedAt *time.Time
	if content.Status == model.ContentStatusPublished {
		if content.PublishedAt == nil {
			publishedAt = &now
		} else {
			publishedAt = content.PublishedAt
		}
	}

	// クエリ実行
	return r.db.QueryRowContext(ctx, query,
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
}

// Update は既存のコンテンツを更新します
func (r *ContentRepositoryImpl) Update(ctx context.Context, content *model.Content) error {
	query := `
		UPDATE contents
		SET title = $1, body = $2, type = $3, category_id = $4, status = $5, published_at = $6, updated_at = $7
		WHERE id = $8
	`

	// 現在時刻の設定
	content.UpdatedAt = time.Now()

	var publishedAt *time.Time
	if content.Status == model.ContentStatusPublished {
		if content.PublishedAt == nil {
			now := time.Now()
			publishedAt = &now
			content.PublishedAt = publishedAt
		} else {
			publishedAt = content.PublishedAt
		}
	} else {
		publishedAt = content.PublishedAt // nullまたは以前の公開日時
	}

	// クエリ実行
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
		return err
	}

	// 更新された行数をチェック
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("コンテンツが見つかりません")
	}

	return nil
}

// Delete は指定したIDのコンテンツを削除します
func (r *ContentRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `
		DELETE FROM contents
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
		return errors.New("コンテンツが見つかりません")
	}

	return nil
}

// IncrementViewCount はコンテンツの閲覧数を増加させます
func (r *ContentRepositoryImpl) IncrementViewCount(ctx context.Context, id int64) error {
	query := `
		UPDATE contents
		SET view_count = view_count + 1, updated_at = NOW()
		WHERE id = $1
	`

	// クエリ実行
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	// 更新された行数をチェック
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("コンテンツが見つかりません")
	}

	return nil
}

// buildWhereClause は検索条件からWHERE句を構築します
func (r *ContentRepositoryImpl) buildWhereClause(query *model.ContentQuery) (string, []interface{}) {
	var conditions []string
	var args []interface{}
	argCount := 1

	// 著者IDによるフィルタリング
	if query.AuthorID != nil {
		conditions = append(conditions, fmt.Sprintf("author_id = $%d", argCount))
		args = append(args, *query.AuthorID)
		argCount++
	}

	// カテゴリIDによるフィルタリング
	if query.CategoryID != nil {
		conditions = append(conditions, fmt.Sprintf("category_id = $%d", argCount))
		args = append(args, *query.CategoryID)
		argCount++
	}

	// ステータスによるフィルタリング
	if query.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *query.Status)
		argCount++
	}

	// キーワード検索
	if query.SearchQuery != nil && *query.SearchQuery != "" {
		conditions = append(conditions, fmt.Sprintf("(title ILIKE $%d OR body ILIKE $%d)", argCount, argCount))
		args = append(args, "%"+*query.SearchQuery+"%")
		argCount++
	}

	// 条件がある場合は WHERE 句を構築
	if len(conditions) > 0 {
		return " AND " + strings.Join(conditions, " AND "), args
	}

	return "", args
}

// buildOrderClause は並び替え条件からORDER BY句を構築します
func (r *ContentRepositoryImpl) buildOrderClause(query *model.ContentQuery) string {
	// デフォルトのソート順
	sortBy := "created_at"
	sortOrder := "DESC"

	// ソートフィールドの指定がある場合
	if query.SortBy != nil && *query.SortBy != "" {
		// 安全なフィールド名のみを許可
		allowedFields := map[string]bool{
			"id":           true,
			"title":        true,
			"author_id":    true,
			"category_id":  true,
			"status":       true,
			"view_count":   true,
			"published_at": true,
			"created_at":   true,
			"updated_at":   true,
		}

		if allowedFields[*query.SortBy] {
			sortBy = *query.SortBy
		}
	}

	// ソート順の指定がある場合
	if query.SortOrder != nil && *query.SortOrder != "" {
		if strings.ToUpper(*query.SortOrder) == "ASC" {
			sortOrder = "ASC"
		}
	}

	return fmt.Sprintf("ORDER BY %s %s", sortBy, sortOrder)
}
