package service

import (
	"context"
	"fmt"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/repository"
	"media-platform/internal/usecase/dto"
)

// RatingService は評価に関するアプリケーションサービスを提供します
type RatingService struct {
	ratingRepo  repository.RatingRepository
	contentRepo repository.ContentRepository
	userRepo    repository.UserRepository
}

// NewRatingService は新しいRatingServiceのインスタンスを生成します
func NewRatingService(
	ratingRepo repository.RatingRepository,
	contentRepo repository.ContentRepository,
	userRepo repository.UserRepository,
) *RatingService {
	return &RatingService{
		ratingRepo:  ratingRepo,
		contentRepo: contentRepo,
		userRepo:    userRepo,
	}
}

// ========== Entity to DTO変換メソッド（Service内で実装） ==========

// toRatingResponse はEntityをRatingResponseに変換します
func (s *RatingService) toRatingResponse(rating *entity.Rating) *dto.RatingResponse {
	return &dto.RatingResponse{
		ID:        rating.ID,
		Value:     rating.Value,
		UserID:    rating.UserID,
		ContentID: rating.ContentID,
		CreatedAt: rating.CreatedAt,
		UpdatedAt: rating.UpdatedAt,
	}
}

// toRatingResponseList はEntityスライスをRatingResponseスライスに変換します
func (s *RatingService) toRatingResponseList(ratings []*entity.Rating) []*dto.RatingResponse {
	responses := make([]*dto.RatingResponse, len(ratings))
	for i, rating := range ratings {
		responses[i] = s.toRatingResponse(rating)
	}
	return responses
}

// toRatingStatsResponse は統計情報をRatingStatsResponseに変換します
func (s *RatingService) toRatingStatsResponse(stats *entity.RatingStats) *dto.RatingStatsResponse {
	return &dto.RatingStatsResponse{
		ContentID: stats.ContentID,
		LikeCount: stats.LikeCount,
		Count:     stats.Count,
	}
}

// toUserRatingStatusResponse はユーザー評価状態をレスポンスに変換します
func (s *RatingService) toUserRatingStatusResponse(contentID int64, rating *entity.Rating) *dto.UserRatingStatusResponse {
	response := &dto.UserRatingStatusResponse{
		ContentID: contentID,
		HasRated:  rating != nil,
		RatingID:  nil,
	}

	if rating != nil {
		response.RatingID = &rating.ID
	}

	return response
}

// ========== Use Cases ==========

// GetRatingsByContentID は指定したコンテンツIDの評価一覧を取得します
func (s *RatingService) GetRatingsByContentID(ctx context.Context, contentID int64, limit, offset int) ([]*dto.RatingResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", contentID)
	}

	// パラメータの正規化
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	// 評価の取得
	ratings, err := s.ratingRepo.FindByContentID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("ratings lookup failed: %w", err)
	}

	// ページネーション適用
	start := offset
	end := offset + limit
	if start > len(ratings) {
		return []*dto.RatingResponse{}, nil
	}
	if end > len(ratings) {
		end = len(ratings)
	}

	// レスポンスの作成
	return s.toRatingResponseList(ratings[start:end]), nil
}

// GetRatingsByUserID は指定したユーザーIDの評価一覧を取得します
func (s *RatingService) GetRatingsByUserID(ctx context.Context, userID int64, limit, offset int) ([]*dto.RatingResponse, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", userID)
	}

	// パラメータの正規化
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	// 評価の取得
	ratings, err := s.ratingRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ratings lookup failed: %w", err)
	}

	// ページネーション適用
	start := offset
	end := offset + limit
	if start > len(ratings) {
		return []*dto.RatingResponse{}, nil
	}
	if end > len(ratings) {
		end = len(ratings)
	}

	return s.toRatingResponseList(ratings[start:end]), nil
}

// GetStatsByContentID は指定したコンテンツIDの評価統計を取得します
func (s *RatingService) GetStatsByContentID(ctx context.Context, contentID int64) (*dto.RatingStatsResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", contentID)
	}

	// 評価統計の取得
	stats, err := s.ratingRepo.GetStatsByContentID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("rating stats lookup failed: %w", err)
	}

	return s.toRatingStatsResponse(stats), nil
}

// GetUserRatingStatus は指定したコンテンツに対するユーザーの評価状態を取得します
func (s *RatingService) GetUserRatingStatus(ctx context.Context, userID, contentID int64) (*dto.UserRatingStatusResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", contentID)
	}

	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", userID)
	}

	// ユーザーの評価を取得
	rating, err := s.ratingRepo.FindByUserAndContentID(ctx, userID, contentID)
	if err != nil {
		return nil, fmt.Errorf("user rating lookup failed: %w", err)
	}

	return s.toUserRatingStatusResponse(contentID, rating), nil
}

// CreateOrUpdateRating は評価の作成/削除を行います（トグル動作）
func (s *RatingService) CreateOrUpdateRating(ctx context.Context, userID int64, req *dto.CreateRatingRequest) (*dto.RatingResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, req.ContentID)
	if err != nil {
		return nil, fmt.Errorf("content lookup failed: %w", err)
	}
	if content == nil {
		return nil, domainErrors.NewNotFoundError("Content", req.ContentID)
	}

	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", userID)
	}

	// 評価値を1に強制設定（いいね機能）
	req.Value = 1

	// リクエストのバリデーション
	if req.ContentID == 0 {
		return nil, domainErrors.NewValidationError("コンテンツIDは必須です")
	}
	if req.Value != 1 {
		return nil, domainErrors.NewValidationError("評価値は1（いいね）である必要があります")
	}

	// 既存の評価を検索
	existingRating, err := s.ratingRepo.FindByUserAndContentID(ctx, userID, req.ContentID)
	if err != nil {
		return nil, fmt.Errorf("existing rating lookup failed: %w", err)
	}

	// トグル動作：既存評価がある場合は削除、ない場合は作成
	if existingRating != nil {
		// 既存の評価がある場合は削除（トグルオフ）
		err = s.ratingRepo.Delete(ctx, existingRating.ID)
		if err != nil {
			return nil, fmt.Errorf("rating deletion failed: %w", err)
		}
		return nil, nil // nilを返して削除されたことを示す
	}

	// 新規評価エンティティを作成
	rating, err := entity.NewRating(userID, req.ContentID, req.Value)
	if err != nil {
		return nil, err
	}

	// 評価の保存
	if err := s.ratingRepo.Create(ctx, rating); err != nil {
		return nil, fmt.Errorf("rating creation failed: %w", err)
	}

	return s.toRatingResponse(rating), nil
}

// DeleteRating は評価を削除します
func (s *RatingService) DeleteRating(ctx context.Context, id int64, userID int64, isAdmin bool) error {
	// 評価の取得
	rating, err := s.ratingRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("rating lookup failed: %w", err)
	}
	if rating == nil {
		return domainErrors.NewNotFoundError("Rating", id)
	}

	// 削除権限のチェック
	if !isAdmin && rating.UserID != userID {
		return domainErrors.NewValidationError("この評価を削除する権限がありません")
	}

	// 評価の削除
	if err := s.ratingRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("rating deletion failed: %w", err)
	}

	return nil
}

// GetRatingsByContentIDs は複数のコンテンツIDの評価統計を一括取得します
func (s *RatingService) GetRatingsByContentIDs(ctx context.Context, contentIDs []int64) (map[int64]*dto.RatingStatsResponse, error) {
	if len(contentIDs) == 0 {
		return make(map[int64]*dto.RatingStatsResponse), nil
	}

	// 評価統計の一括取得
	statsMap, err := s.ratingRepo.GetStatsByContentIDs(ctx, contentIDs)
	if err != nil {
		return nil, fmt.Errorf("rating stats lookup failed: %w", err)
	}

	// レスポンスの作成
	responseMap := make(map[int64]*dto.RatingStatsResponse)
	for contentID, stats := range statsMap {
		responseMap[contentID] = s.toRatingStatsResponse(stats)
	}

	// 統計がないコンテンツに対してはゼロ値を設定
	for _, contentID := range contentIDs {
		if _, exists := responseMap[contentID]; !exists {
			responseMap[contentID] = &dto.RatingStatsResponse{
				ContentID: contentID,
				LikeCount: 0,
				Count:     0,
			}
		}
	}

	return responseMap, nil
}

// GetTopRatedContents は評価の高いコンテンツを取得します
func (s *RatingService) GetTopRatedContents(ctx context.Context, limit int, days int) ([]int64, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	if days <= 0 {
		days = 7 // デフォルト7日間
	}

	// 指定期間の評価の高いコンテンツを取得
	return s.ratingRepo.FindTopRatedContentIDs(ctx, limit, days)
}

// GetUserLikedContentIDs はユーザーがいいねしたコンテンツIDの一覧を取得します
func (s *RatingService) GetUserLikedContentIDs(ctx context.Context, userID int64, limit, offset int) ([]int64, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}
	if user == nil {
		return nil, domainErrors.NewNotFoundError("User", userID)
	}

	// パラメータの正規化
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	// ユーザーが評価したコンテンツIDを取得
	contentIDs, err := s.ratingRepo.FindContentIDsByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("user liked contents lookup failed: %w", err)
	}

	return contentIDs, nil
}
