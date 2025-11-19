package repository

import (
	"context"
	"database/sql"
	"fmt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
)

type CategoryRepositoryImpl struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) repository.CategoryRepository {
	return &CategoryRepositoryImpl{
		db: db,
	}
}

func (r *CategoryRepositoryImpl) FindAll(ctx context.Context) ([]*entity.Category, error) {
	query := `
		SELECT id, name, description, parent_id, created_at, updated_at
		FROM categories
		ORDER BY name
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query categories: %w", err)
	}
	defer rows.Close()

	var categories []*entity.Category
	for rows.Next() {
		var category entity.Category
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
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}

		if parentID.Valid {
			pid := parentID.Int64
			category.ParentID = &pid
		}

		categories = append(categories, &category)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return categories, nil
}

func (r *CategoryRepositoryImpl) FindByID(ctx context.Context, id int64) (*entity.Category, error) {
	query := `
		SELECT id, name, description, parent_id, created_at, updated_at
		FROM categories
		WHERE id = $1
	`

	var category entity.Category
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
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("category", id)
		}
		return nil, fmt.Errorf("failed to find category: %w", err)
	}

	if parentID.Valid {
		pid := parentID.Int64
		category.ParentID = &pid
	}

	return &category, nil
}

func (r *CategoryRepositoryImpl) FindByName(ctx context.Context, name string) (*entity.Category, error) {
	query := `
		SELECT id, name, description, parent_id, created_at, updated_at
		FROM categories
		WHERE name = $1
	`

	var category entity.Category
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
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("category", name)
		}
		return nil, fmt.Errorf("failed to find category by name: %w", err)
	}

	if parentID.Valid {
		pid := parentID.Int64
		category.ParentID = &pid
	}

	return &category, nil
}

func (r *CategoryRepositoryImpl) Create(ctx context.Context, category *entity.Category) (*entity.Category, error) {
	query := `
		INSERT INTO categories (name, description, parent_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
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
		category.CreatedAt,
		category.UpdatedAt,
	).Scan(&category.ID)

	if err != nil {
		return nil, fmt.Errorf("failed to create category: %w", err)
	}

	return category, nil
}

func (r *CategoryRepositoryImpl) Update(ctx context.Context, category *entity.Category) (*entity.Category, error) {
	query := `
		UPDATE categories
		SET name = $1, description = $2, parent_id = $3, updated_at = $4
		WHERE id = $5
	`

	var parentIDSQL sql.NullInt64
	if category.ParentID != nil {
		parentIDSQL.Int64 = *category.ParentID
		parentIDSQL.Valid = true
	}

	result, err := r.db.ExecContext(
		ctx,
		query,
		category.Name,
		category.Description,
		parentIDSQL,
		category.UpdatedAt,
		category.ID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to update category: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return nil, domainErrors.NewNotFoundError("category", category.ID)
	}

	return category, nil
}

func (r *CategoryRepositoryImpl) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM categories WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete category: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("category", id)
	}

	return nil
}

func (r *CategoryRepositoryImpl) CheckCircularReference(ctx context.Context, categoryID, parentID int64) (bool, error) {
	query := `
		WITH RECURSIVE category_tree AS (
			SELECT id, parent_id
			FROM categories
			WHERE id = $1
			
			UNION ALL
			
			SELECT c.id, c.parent_id
			FROM categories c
			JOIN category_tree ct ON c.id = ct.parent_id
		)
		SELECT EXISTS (
			SELECT 1 FROM category_tree WHERE id = $2
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, parentID, categoryID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check circular reference: %w", err)
	}

	return exists, nil
}
