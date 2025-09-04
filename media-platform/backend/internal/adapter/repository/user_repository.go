package persistence

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"media-platform/internal/domain/model"
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
func (r *userRepository) Find(ctx context.Context, id int64) (*model.User, error) {
	query := `
		SELECT id, username, email, password, bio, avatar, role, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	var user model.User
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
			return nil, nil // ユーザーが見つからない場合はnilを返す
		}
		return nil, err
	}

	return &user, nil
}

// メールアドレスによるユーザー検索
func (r *userRepository) FindByEmail(ctx context.Context, email string) (*model.User, error) {
	query := `
		SELECT id, username, email, password, bio, avatar, role, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	var user model.User
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
			return nil, nil // ユーザーが見つからない場合はnilを返す
		}
		return nil, err
	}

	return &user, nil
}

// 全ユーザーの取得（ページネーション付き）
func (r *userRepository) FindAll(ctx context.Context, limit, offset int) ([]*model.User, error) {
	query := `
		SELECT id, username, email, password, bio, avatar, role, created_at, updated_at
		FROM users
		ORDER BY id
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		var user model.User
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
			return nil, err
		}
		users = append(users, &user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}

// ユーザーの作成
func (r *userRepository) Create(ctx context.Context, user *model.User) error {
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
		return fmt.Errorf("ユーザー作成エラー: %w", err)
	}

	return nil
}

// ユーザーの更新
func (r *userRepository) Update(ctx context.Context, user *model.User) error {
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
		return fmt.Errorf("ユーザー更新エラー: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("更新対象のユーザーが見つかりません")
	}

	return nil
}

// ユーザーの削除
func (r *userRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("ユーザー削除エラー: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("削除対象のユーザーが見つかりません")
	}

	return nil
}

// GetPublicUsers は公開情報のみを取得します
func (r *userRepository) GetPublicUsers(ctx context.Context) ([]*model.User, error) {
	query := `
		SELECT id, username, bio, role, created_at, updated_at
		FROM users
		ORDER BY id
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		var user model.User
		// パスワードとメールアドレスは取得しない
		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Bio,
			&user.Role,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		// パスワードとメールは空にしておく
		user.Password = ""
		user.Email = ""
		users = append(users, &user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
