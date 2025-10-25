package service

import (
	"context"
	"fmt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
	"media-platform/internal/usecase/dto"
)

// FollowService はフォロー機能のサービスです
type FollowService struct {
	followRepo repository.FollowRepository
	userRepo   repository.UserRepository
}

// NewFollowService はFollowServiceを作成します
func NewFollowService(
	followRepo repository.FollowRepository,
	userRepo repository.UserRepository,
) *FollowService {
	return &FollowService{
		followRepo: followRepo,
		userRepo:   userRepo,
	}
}

// ========== Entity to DTO変換メソッド（Service内で実装） ==========
// toFollowResponse はFollowエンティティをFollowResponseに変換します
func (s *FollowService) toFollowResponse(follow *entity.Follow) *dto.FollowResponse {
	return &dto.FollowResponse{
		ID:          follow.ID,
		FollowerID:  follow.FollowerID,
		FollowingID: follow.FollowingID,
		CreatedAt:   follow.CreatedAt,
	}
}

// toFollowStatsResponse はFollowStatsエンティティをFollowStatsResponseに変換します
func (s *FollowService) toFollowStatsResponse(stats *entity.FollowStats) *dto.FollowStatsResponse {
	return &dto.FollowStatsResponse{
		FollowersCount: stats.FollowersCount,
		FollowingCount: stats.FollowingCount,
		IsFollowing:    stats.IsFollowing,
		IsFollowedBy:   stats.IsFollowedBy,
		IsMutualFollow: stats.IsMutualFollow(),
	}
}

// toUserResponse はUserエンティティをUserResponseに変換します
func (s *FollowService) toUserResponse(user *entity.User) dto.UserResponse {
	return dto.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Bio:       user.Bio,
		Avatar:    user.Avatar,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
		UpdatedAt: user.UpdatedAt,
	}
}

// toFollowUserResponseList はUserエンティティスライスをFollowUserResponseスライスに変換します
func (s *FollowService) toFollowUserResponseList(users []*entity.User) []dto.FollowUserResponse {
	responses := make([]dto.FollowUserResponse, len(users))
	for i, user := range users {
		responses[i] = dto.FollowUserResponse{
			User:      s.toUserResponse(user),
			CreatedAt: user.CreatedAt, // ユーザーの作成日時（本来はフォロー日時だが簡略化）
		}
	}
	return responses
}

// toContentResponse はContentエンティティをContentResponseに変換します
func (s *FollowService) toContentResponse(content *entity.Content) dto.ContentResponse {
	response := dto.ContentResponse{
		ID:          content.ID,
		Title:       content.Title,
		Body:        content.Body,
		Type:        string(content.Type),
		AuthorID:    content.AuthorID,
		CategoryID:  content.CategoryID,
		Status:      string(content.Status),
		ViewCount:   content.ViewCount,
		PublishedAt: content.PublishedAt,
		CreatedAt:   content.CreatedAt,
		UpdatedAt:   content.UpdatedAt,
	}

	// 趣味投稿専用フィールド
	if content.WorkTitle != "" {
		response.WorkTitle = content.WorkTitle
	}
	if content.Rating != nil {
		response.Rating = content.Rating
	}
	if content.RecommendationLevel != "" {
		response.RecommendationLevel = string(content.RecommendationLevel)
	}
	if len(content.Tags) > 0 {
		response.Tags = content.Tags
	}
	if content.ImageURL != "" {
		response.ImageURL = content.ImageURL
	}
	if content.ExternalURL != "" {
		response.ExternalURL = content.ExternalURL
	}
	if content.ReleaseYear != nil {
		response.ReleaseYear = content.ReleaseYear
	}
	if content.ArtistName != "" {
		response.ArtistName = content.ArtistName
	}
	if content.Genre != "" {
		response.Genre = content.Genre
	}

	return response
}

// toContentResponseList はContentエンティティスライスをContentResponseスライスに変換します
func (s *FollowService) toContentResponseList(contents []*entity.Content) []dto.ContentResponse {
	responses := make([]dto.ContentResponse, len(contents))
	for i, content := range contents {
		responses[i] = s.toContentResponse(content)
	}
	return responses
}

// ========== Use Cases ==========

// FollowUser はユーザーをフォローします
func (s *FollowService) FollowUser(ctx context.Context, followerID, followingID int64) (*dto.FollowResponse, error) {
	// 自己フォローのチェック
	if followerID == followingID {
		return nil, domainErrors.NewValidationError("自分自身をフォローすることはできません")
	}

	// フォロー対象のユーザーが存在するか確認
	followingUser, err := s.userRepo.Find(ctx, followingID)
	if err != nil {
		if domainErrors.IsNotFoundError(err) {
			return nil, domainErrors.NewNotFoundError("user", followingID)
		}
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if followingUser == nil {
		return nil, domainErrors.NewNotFoundError("user", followingID)
	}

	// すでにフォロー済みかチェック
	exists, err := s.followRepo.Exists(ctx, followerID, followingID)
	if err != nil {
		return nil, fmt.Errorf("follow existence check failed: %w", err)
	}
	if exists {
		return nil, domainErrors.NewConflictError("follow", "already following this user")
	}

	// フォロー関係を作成
	follow, err := entity.NewFollow(followerID, followingID)
	if err != nil {
		return nil, err
	}

	if err := s.followRepo.Create(ctx, follow); err != nil {
		return nil, fmt.Errorf("follow creation failed: %w", err)
	}

	return s.toFollowResponse(follow), nil
}

// UnfollowUser はユーザーのフォローを解除します
func (s *FollowService) UnfollowUser(ctx context.Context, followerID, followingID int64) error {
	// フォロー関係が存在するか確認
	exists, err := s.followRepo.Exists(ctx, followerID, followingID)
	if err != nil {
		return fmt.Errorf("follow existence check failed: %w", err)
	}
	if !exists {
		return domainErrors.NewNotFoundError("follow", fmt.Sprintf("follower:%d->following:%d", followerID, followingID))
	}

	// フォロー解除
	if err := s.followRepo.Delete(ctx, followerID, followingID); err != nil {
		return fmt.Errorf("unfollow failed: %w", err)
	}

	return nil
}

// GetFollowers はフォロワー一覧を取得します
func (s *FollowService) GetFollowers(ctx context.Context, userID int64) (*dto.FollowersResponse, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		if domainErrors.IsNotFoundError(err) {
			return nil, domainErrors.NewNotFoundError("user", userID)
		}
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("user", userID)
	}

	followers, err := s.followRepo.GetFollowers(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("followers lookup failed: %w", err)
	}

	return &dto.FollowersResponse{
		Followers: s.toFollowUserResponseList(followers),
		Total:     len(followers),
	}, nil
}

// GetFollowing はフォロー中のユーザー一覧を取得します
func (s *FollowService) GetFollowing(ctx context.Context, userID int64) (*dto.FollowingResponse, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		if domainErrors.IsNotFoundError(err) {
			return nil, domainErrors.NewNotFoundError("user", userID)
		}
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("user", userID)
	}

	following, err := s.followRepo.GetFollowing(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("following lookup failed: %w", err)
	}

	return &dto.FollowingResponse{
		Following: s.toFollowUserResponseList(following),
		Total:     len(following),
	}, nil
}

// GetFollowStats はフォロー統計を取得します
func (s *FollowService) GetFollowStats(ctx context.Context, userID int64, currentUserID int64) (*dto.FollowStatsResponse, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		if domainErrors.IsNotFoundError(err) {
			return nil, domainErrors.NewNotFoundError("user", userID)
		}
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("user", userID)
	}

	stats, err := s.followRepo.GetFollowStats(ctx, userID, currentUserID)
	if err != nil {
		return nil, fmt.Errorf("follow stats lookup failed: %w", err)
	}

	return s.toFollowStatsResponse(stats), nil
}

// GetFollowingFeed はフォロー中のユーザーのコンテンツを取得します
func (s *FollowService) GetFollowingFeed(ctx context.Context, userID int64, limit, offset int) (*dto.FollowingFeedResponse, error) {
	// デフォルト値設定
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	contents, err := s.followRepo.GetFollowingFeed(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("following feed lookup failed: %w", err)
	}

	return &dto.FollowingFeedResponse{
		Feed: s.toContentResponseList(contents),
		Pagination: dto.PaginationInfo{
			Limit:  limit,
			Offset: offset,
			Total:  len(contents),
		},
	}, nil
}
