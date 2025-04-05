package persistence

import (
	"context"
	"database/sql"
	"errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
	"time"
)

// CategoryRepositoryImpl はCategoryRepositoryインターフェースの実装です
type CategoryRepositoryImpl struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) repository.CategoryRepository {
	return &CategoryRepositoryImpl{
		db: db,
	}
}

// FindAll は全てのカテゴリを取得します
func (r *CategoryRepositoryImpl) FindAll(ctx context.Context) ([]*model.Category, error) {
	query := `
		SELECT id, name, description, parent_id, created_at, updated_at
		FROM categories
		ORDER BY name
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*model.Category
	for rows.Next() {
		var category model.Category
		var parentID sql.NullInt64

		err := rows.Scan(
			&category.ID,
			&category.Name,
			&category.Description,
			&parentID,
			&category.CreatedAt,
			&category.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if parentID.Valid {
			pid := parentID.Int64
			category.ParentID = &pid
		}

		categories = append(categories, &category)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return categories, nil
}

// FindByID は指定したIDのカテゴリを取得します
func (r *CategoryRepositoryImpl) FindByID(ctx context.Context, id int64) (*model.Category, error) {
	query := `
		SELECT id, name, description, parent_id, created_at, updated_at
		FROM categories
		WHERE id = $1
	`

	var category model.Category
	var parentID sql.NullInt64

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&category.ID,
		&category.Name,
		&category.Description,
		&parentID,
		&category.CreatedAt,
		&category.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // カテゴリが見つからない場合はnilを返す
		}
		return nil, err
	}

	if parentID.Valid {
		pid := parentID.Int64
		category.ParentID = &pid
	}

	return &category, nil
}

// FindByName は指定した名前のカテゴリを取得します
func (r *CategoryRepositoryImpl) FindByName(ctx context.Context, name string) (*model.Category, error) {
	query := `
		SELECT id, name, description, parent_id, created_at, updated_at
		FROM categories
		WHERE name = $1
	`

	var category model.Category
	var parentID sql.NullInt64

	err := r.db.QueryRowContext(ctx, query, name).Scan(
		&category.ID,
		&category.Name,
		&category.Description,
		&parentID,
		&category.CreatedAt,
		&category.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // カテゴリが見つからない場合はnilを返す
		}
		return nil, err
	}

	if parentID.Valid {
		pid := parentID.Int64
		category.ParentID = &pid
	}

	return &category, nil
}

// Create は新しいカテゴリを作成します
func (r *CategoryRepositoryImpl) Create(ctx context.Context, category *model.Category) (*model.Category, error) {
	query := `
		INSERT INTO categories (name, description, parent_id)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at
	`

	var parentIDSQL sql.NullInt64
	if category.ParentID != nil {
		parentIDSQL.Int64 = *category.ParentID
		parentIDSQL.Valid = true
	}

	err := r.db.QueryRowContext(
		ctx,
		query,
		category.Name,
		category.Description,
		parentIDSQL,
	).Scan(
		&category.ID,
		&category.CreatedAt,
		&category.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return category, nil
}

// Update は既存のカテゴリを更新します
func (r *CategoryRepositoryImpl) Update(ctx context.Context, category *model.Category) (*model.Category, error) {
	query := `
		UPDATE categories
		SET name = $1, description = $2, parent_id = $3, updated_at = $4
		WHERE id = $5
		RETURNING updated_at
	`

	var parentIDSQL sql.NullInt64
	if category.ParentID != nil {
		parentIDSQL.Int64 = *category.ParentID
		parentIDSQL.Valid = true
	}

	now := time.Now()

	err := r.db.QueryRowContext(
		ctx,
		query,
		category.Name,
		category.Description,
		parentIDSQL,
		now,
		category.ID,
	).Scan(&category.UpdatedAt)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("カテゴリが見つかりません")
		}
		return nil, err
	}

	return category, nil
}

// Delete は指定したIDのカテゴリを削除します
func (r *CategoryRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `
		DELETE FROM categories
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("カテゴリが見つかりません")
	}

	return nil
}

// CheckCircularReference はカテゴリの循環参照をチェックします
func (r *CategoryRepositoryImpl) CheckCircularReference(ctx context.Context, categoryID, parentID int64) (bool, error) {
	query := `
		WITH RECURSIVE category_tree AS (
			-- 初期のカテゴリ（指定された親カテゴリ）
			SELECT id, parent_id
			FROM categories
			WHERE id = $1
			
			UNION ALL
			
			-- 親をたどる再帰
			SELECT c.id, c.parent_id
			FROM categories c
			JOIN category_tree ct ON c.id = ct.parent_id
		)
		-- カテゴリIDが循環参照内に存在するかチェック
		SELECT EXISTS (
			SELECT 1 FROM category_tree WHERE id = $2
		);
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, parentID, categoryID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}
