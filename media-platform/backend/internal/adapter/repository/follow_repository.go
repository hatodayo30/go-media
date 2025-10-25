package repository

import (
	"context"
	"database/sql"
	"fmt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"

	"github.com/lib/pq"
)

type followRepository struct {
	db *sql.DB
}

// NewFollowRepository はFollowRepositoryを作成します
func NewFollowRepository(db *sql.DB) repository.FollowRepository {
	return &followRepository{db: db}
}

// Find は特定のフォロー関係をIDで取得します
func (r *followRepository) Find(ctx context.Context, id int64) (*entity.Follow, error) {
	query := `
		SELECT id, follower_id, following_id, created_at
		FROM follows
		WHERE id = $1
	`

	follow := &entity.Follow{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&follow.ID,
		&follow.FollowerID,
		&follow.FollowingID,
		&follow.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("follow", id)
		}
		return nil, fmt.Errorf("failed to find follow: %w", err)
	}

	return follow, nil
}

// FindByFollowerAndFollowing は特定のフォロー関係を取得します
func (r *followRepository) FindByFollowerAndFollowing(ctx context.Context, followerID, followingID int64) (*entity.Follow, error) {
	query := `
		SELECT id, follower_id, following_id, created_at
		FROM follows
		WHERE follower_id = $1 AND following_id = $2
	`

	follow := &entity.Follow{}
	err := r.db.QueryRowContext(ctx, query, followerID, followingID).Scan(
		&follow.ID,
		&follow.FollowerID,
		&follow.FollowingID,
		&follow.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, domainErrors.NewNotFoundError("follow", fmt.Sprintf("follower:%d->following:%d", followerID, followingID))
		}
		return nil, fmt.Errorf("failed to find follow relationship: %w", err)
	}

	return follow, nil
}

// Exists はフォロー関係が存在するかチェックします
func (r *followRepository) Exists(ctx context.Context, followerID, followingID int64) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM follows
			WHERE follower_id = $1 AND following_id = $2
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, followerID, followingID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check follow existence: %w", err)
	}

	return exists, nil
}

// Create はフォロー関係を作成します
func (r *followRepository) Create(ctx context.Context, follow *entity.Follow) error {
	query := `
		INSERT INTO follows (follower_id, following_id, created_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		follow.FollowerID,
		follow.FollowingID,
		follow.CreatedAt,
	).Scan(&follow.ID)

	if err != nil {
		// 重複エラーのチェック
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return domainErrors.NewConflictError("follow", "already following this user")
			}
		}
		return fmt.Errorf("failed to create follow: %w", err)
	}

	return nil
}

// Delete はフォロー関係を削除します
func (r *followRepository) Delete(ctx context.Context, followerID, followingID int64) error {
	query := `
		DELETE FROM follows
		WHERE follower_id = $1 AND following_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, followerID, followingID)
	if err != nil {
		return fmt.Errorf("failed to delete follow: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return domainErrors.NewNotFoundError("follow", fmt.Sprintf("follower:%d->following:%d", followerID, followingID))
	}

	return nil
}

// GetFollowers はフォロワー一覧を取得します
func (r *followRepository) GetFollowers(ctx context.Context, userID int64) ([]*entity.User, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password, u.bio, u.avatar, u.role, u.created_at, u.updated_at
		FROM users u
		INNER JOIN follows f ON u.id = f.follower_id
		WHERE f.following_id = $1
		ORDER BY f.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get followers: %w", err)
	}
	defer rows.Close()

	var followers []*entity.User
	for rows.Next() {
		user := &entity.User{}
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
			return nil, fmt.Errorf("failed to scan follower: %w", err)
		}
		followers = append(followers, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return followers, nil
}

// GetFollowing はフォロー中のユーザー一覧を取得します
func (r *followRepository) GetFollowing(ctx context.Context, userID int64) ([]*entity.User, error) {
	query := `
		SELECT u.id, u.username, u.email, u.password, u.bio, u.avatar, u.role, u.created_at, u.updated_at
		FROM users u
		INNER JOIN follows f ON u.id = f.following_id
		WHERE f.follower_id = $1
		ORDER BY f.created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get following: %w", err)
	}
	defer rows.Close()

	var following []*entity.User
	for rows.Next() {
		user := &entity.User{}
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
			return nil, fmt.Errorf("failed to scan following: %w", err)
		}
		following = append(following, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return following, nil
}

// GetFollowersCount はフォロワー数を取得します
func (r *followRepository) GetFollowersCount(ctx context.Context, userID int64) (int64, error) {
	query := `
		SELECT COUNT(*) FROM follows WHERE following_id = $1
	`

	var count int64
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get followers count: %w", err)
	}

	return count, nil
}

// GetFollowingCount はフォロー中の数を取得します
func (r *followRepository) GetFollowingCount(ctx context.Context, userID int64) (int64, error) {
	query := `
		SELECT COUNT(*) FROM follows WHERE follower_id = $1
	`

	var count int64
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get following count: %w", err)
	}

	return count, nil
}

// GetFollowStats はフォロー統計を取得します
func (r *followRepository) GetFollowStats(ctx context.Context, userID int64, currentUserID int64) (*entity.FollowStats, error) {
	// フォロワー数とフォロー中数を取得
	followersCount, err := r.GetFollowersCount(ctx, userID)
	if err != nil {
		return nil, err
	}

	followingCount, err := r.GetFollowingCount(ctx, userID)
	if err != nil {
		return nil, err
	}

	// 現在のユーザーがこのユーザーをフォローしているか
	isFollowing := false
	if currentUserID > 0 && currentUserID != userID {
		isFollowing, err = r.Exists(ctx, currentUserID, userID)
		if err != nil {
			return nil, err
		}
	}

	// このユーザーが現在のユーザーをフォローしているか
	isFollowedBy := false
	if currentUserID > 0 && currentUserID != userID {
		isFollowedBy, err = r.Exists(ctx, userID, currentUserID)
		if err != nil {
			return nil, err
		}
	}

	return entity.NewFollowStats(followersCount, followingCount, isFollowing, isFollowedBy), nil
}

// GetFollowingFeed はフォロー中のユーザーのコンテンツを取得します
func (r *followRepository) GetFollowingFeed(ctx context.Context, userID int64, limit, offset int) ([]*entity.Content, error) {
	query := `
		SELECT 
			c.id, c.title, c.body, c.type, c.author_id, c.category_id, 
			c.status, c.view_count, c.published_at, c.created_at, c.updated_at,
			c.work_title, c.rating, c.recommendation_level, c.tags,
			c.image_url, c.external_url, c.release_year, c.artist_name, c.genre
		FROM contents c
		INNER JOIN follows f ON c.author_id = f.following_id
		WHERE f.follower_id = $1
			AND c.status = 'published'
			AND c.published_at <= NOW()
		ORDER BY c.published_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.QueryContext(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get following feed: %w", err)
	}
	defer rows.Close()

	var contents []*entity.Content
	for rows.Next() {
		content := &entity.Content{}
		var tags pq.StringArray

		err := rows.Scan(
			&content.ID,
			&content.Title,
			&content.Body,
			&content.Type,
			&content.AuthorID,
			&content.CategoryID,
			&content.Status,
			&content.ViewCount,
			&content.PublishedAt,
			&content.CreatedAt,
			&content.UpdatedAt,
			&content.WorkTitle,
			&content.Rating,
			&content.RecommendationLevel,
			&tags,
			&content.ImageURL,
			&content.ExternalURL,
			&content.ReleaseYear,
			&content.ArtistName,
			&content.Genre,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan content: %w", err)
		}

		content.Tags = []string(tags)
		contents = append(contents, content)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	return contents, nil
}
