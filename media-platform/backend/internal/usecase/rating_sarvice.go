package service

import (
	"context"
	"errors"

	"media-platform/internal/domain/repository"
	"media-platform/internal/presentation/dto"
	"media-platform/internal/presentation/presenter"

	domainErrors "media-platform/internal/domain/errors"
)

// RatingService は評価に関するアプリケーションサービスを提供します
type RatingService struct {
	ratingRepo      repository.RatingRepository
	contentRepo     repository.ContentRepository
	userRepo        repository.UserRepository
	ratingPresenter *presenter.RatingPresenter
}

// NewRatingService は新しいRatingServiceのインスタンスを生成します
func NewRatingService(
	ratingRepo repository.RatingRepository,
	contentRepo repository.ContentRepository,
	userRepo repository.UserRepository,
	ratingPresenter *presenter.RatingPresenter,
) *RatingService {
	return &RatingService{
		ratingRepo:      ratingRepo,
		contentRepo:     contentRepo,
		userRepo:        userRepo,
		ratingPresenter: ratingPresenter,
	}
}

// GetRatingsByContentID は指定したコンテンツIDの評価一覧を取得します
func (s *RatingService) GetRatingsByContentID(ctx context.Context, contentID int64, limit, offset int) ([]*dto.RatingResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// デフォルト値の設定
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
		return nil, err
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
	var responses []*dto.RatingResponse
	for _, rating := range ratings[start:end] {
		response := s.ratingPresenter.ToRatingResponse(rating)
		responses = append(responses, response)
	}

	return responses, nil
}

// GetRatingsByUserID は指定したユーザーIDの評価一覧を取得します
func (s *RatingService) GetRatingsByUserID(ctx context.Context, userID int64, limit, offset int) ([]*dto.RatingResponse, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ユーザーが見つかりません")
	}

	// デフォルト値の設定
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
		return nil, err
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
	var responses []*dto.RatingResponse
	for _, rating := range ratings[start:end] {
		response := s.ratingPresenter.ToRatingResponse(rating)
		responses = append(responses, response)
	}

	return responses, nil
}

// GetStatsByContentID は指定したコンテンツIDの評価統計を取得します
func (s *RatingService) GetStatsByContentID(ctx context.Context, contentID int64) (*dto.RatingStatsResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// 評価統計の取得
	stats, err := s.ratingRepo.GetStatsByContentID(ctx, contentID)
	if err != nil {
		return nil, err
	}

	return s.ratingPresenter.ToRatingStatsResponse(stats), nil
}

// GetUserRatingStatus は指定したコンテンツに対するユーザーの評価状態を取得します
func (s *RatingService) GetUserRatingStatus(ctx context.Context, userID, contentID int64) (*dto.UserRatingStatusResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, contentID)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ユーザーが見つかりません")
	}

	// ユーザーの評価を取得
	rating, err := s.ratingRepo.FindByUserAndContentID(ctx, userID, contentID)
	if err != nil {
		return nil, err
	}

	return s.ratingPresenter.ToUserRatingStatusResponse(contentID, rating), nil
}

// CreateOrUpdateRating は評価の作成/削除を行います（トグル動作）
func (s *RatingService) CreateOrUpdateRating(ctx context.Context, userID int64, req *dto.CreateRatingRequest) (*dto.RatingResponse, error) {
	// コンテンツの存在確認
	content, err := s.contentRepo.Find(ctx, req.ContentID)
	if err != nil {
		return nil, err
	}
	if content == nil {
		return nil, errors.New("コンテンツが見つかりません")
	}

	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ユーザーが見つかりません")
	}

	// 評価値を1に強制設定
	req.Value = 1

	// リクエストのバリデーション
	if req.ContentID == 0 {
		return nil, domainErrors.NewValidationError("コンテンツIDは必須です")
	}
	if req.Value != 1 {
		return nil, domainErrors.NewValidationError("評価値は1（グッド）である必要があります")
	}

	// 既存の評価を検索
	existingRating, err := s.ratingRepo.FindByUserAndContentID(ctx, userID, req.ContentID)
	if err != nil {
		return nil, err
	}

	// トグル動作：既存評価がある場合は削除、ない場合は作成
	if existingRating != nil {
		// 既存の評価がある場合は削除（トグルオフ）
		err = s.ratingRepo.Delete(ctx, existingRating.ID)
		if err != nil {
			return nil, err
		}
		return nil, nil // nilを返して削除されたことを示す
	}

	// 新規評価を作成（トグルオン）
	rating := s.ratingPresenter.ToRatingEntity(req, userID)

	// ドメインルールのバリデーション
	if err := rating.Validate(); err != nil {
		return nil, domainErrors.NewValidationError(err.Error())
	}

	// 評価の保存
	if err := s.ratingRepo.Create(ctx, rating); err != nil {
		return nil, err
	}

	return s.ratingPresenter.ToRatingResponse(rating), nil
}

// DeleteRating は評価を削除します
func (s *RatingService) DeleteRating(ctx context.Context, id int64, userID int64, isAdmin bool) error {
	// 評価の取得
	rating, err := s.ratingRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if rating == nil {
		return domainErrors.NewValidationError("指定された評価が見つかりません")
	}

	// 削除権限のチェック
	if !rating.CanDelete(userID, func() string {
		if isAdmin {
			return "admin"
		}
		return "user"
	}()) {
		return domainErrors.NewValidationError("この評価を削除する権限がありません")
	}

	// 評価の削除
	return s.ratingRepo.Delete(ctx, id)
}

// GetRatingsByContentIDs は複数のコンテンツIDの評価統計を一括取得します（パフォーマンス最適化用）
func (s *RatingService) GetRatingsByContentIDs(ctx context.Context, contentIDs []int64) (map[int64]*dto.RatingStatsResponse, error) {
	if len(contentIDs) == 0 {
		return make(map[int64]*dto.RatingStatsResponse), nil
	}

	// 評価統計の一括取得
	statsMap, err := s.ratingRepo.GetStatsByContentIDs(ctx, contentIDs)
	if err != nil {
		return nil, err
	}

	// レスポンスの作成
	responseMap := make(map[int64]*dto.RatingStatsResponse)
	for contentID, stats := range statsMap {
		responseMap[contentID] = s.ratingPresenter.ToRatingStatsResponse(stats)
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

// GetTopRatedContents は評価の高いコンテンツを取得します（トレンド機能用）
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

	// TODO: RepositoryにGetTopRatedContentIDsメソッドを追加する必要があります
	// ここでは仮実装として空のスライスを返します
	return []int64{}, nil
}

// GetUserLikedContentIDs はユーザーがいいねしたコンテンツIDの一覧を取得します
func (s *RatingService) GetUserLikedContentIDs(ctx context.Context, userID int64, limit, offset int) ([]int64, error) {
	// ユーザーの存在確認
	user, err := s.userRepo.Find(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("ユーザーが見つかりません")
	}

	// デフォルト値の設定
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
	return s.ratingRepo.FindContentIDsByUserID(ctx, userID, limit, offset)
}
