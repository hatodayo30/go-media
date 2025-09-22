package repository

import (
	"context"
	"database/sql"
	"fmt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
)

type userRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) repository.UserRepository {
	return &userRepository{
		db: db,
	}
}

// IDによるユーザー検索
func (r *userRepository) Find(ctx context.Context, id int64) (*entity.User, error) {
	query := `
		SELECT id, username, email, password, bio, avatar, role, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user entity.User
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Bio,
		&user.Avatar,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("user", id)
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	return &user, nil
}

// メールアドレスによるユーザー検索
func (r *userRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	query := `
		SELECT id, username, email, password, bio, avatar, role, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user entity.User
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Bio,
		&user.Avatar,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("user", email)
		}
		return nil, fmt.Errorf("failed to find user by email: %w", err)
	}

	return &user, nil
}

// ユーザー名によるユーザー検索
func (r *userRepository) FindByUsername(ctx context.Context, username string) (*entity.User, error) {
	query := `
		SELECT id, username, email, password, bio, avatar, role, created_at, updated_at
		FROM users
		WHERE username = $1
	`

	var user entity.User
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.Password,
		&user.Bio,
		&user.Avatar,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("user", username)
		}
		return nil, fmt.Errorf("failed to find user by username: %w", err)
	}

	return &user, nil
}

// 全ユーザーの取得（ページネーション付き）
func (r *userRepository) FindAll(ctx context.Context, limit, offset int) ([]*entity.User, error) {
	query := `
		SELECT id, username, email, password, bio, avatar, role, created_at, updated_at
		FROM users
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []*entity.User
	for rows.Next() {
		var user entity.User
		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.Password,
			&user.Bio,
			&user.Avatar,
			&user.Role,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, &user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return users, nil
}

// ユーザーの作成
func (r *userRepository) Create(ctx context.Context, user *entity.User) error {
	query := `
		INSERT INTO users (username, email, password, bio, avatar, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`

	err := r.db.QueryRowContext(ctx, query,
		user.Username,
		user.Email,
		user.Password,
		user.Bio,
		user.Avatar,
		user.Role,
		user.CreatedAt,
		user.UpdatedAt,
	).Scan(&user.ID)

	if err != nil {
		// UNIQUE制約違反などのチェック
		// PostgreSQLの場合: pq.Errorを使ってエラーコードをチェック
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// ユーザーの更新
func (r *userRepository) Update(ctx context.Context, user *entity.User) error {
	query := `
		UPDATE users
		SET username = $1, email = $2, password = $3, bio = $4, avatar = $5, role = $6, updated_at = $7
		WHERE id = $8
	`

	result, err := r.db.ExecContext(ctx, query,
		user.Username,
		user.Email,
		user.Password,
		user.Bio,
		user.Avatar,
		user.Role,
		user.UpdatedAt,
		user.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("user", user.ID)
	}

	return nil
}

// ユーザーの削除
func (r *userRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("user", id)
	}

	return nil
}

// GetPublicUsers は削除してください - これはPresenter層の責務です
