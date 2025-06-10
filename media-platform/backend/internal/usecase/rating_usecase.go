// usecase/rating_usecase.go
package usecase

import (
	"context"
	"fmt"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
)

// RatingUseCase は評価に関するビジネスロジックを提供します
type RatingUseCase struct {
	ratingRepo  repository.RatingRepository
	contentRepo repository.ContentRepository
}

// NewRatingUseCase は新しいRatingUseCaseインスタンスを作成します
func NewRatingUseCase(ratingRepo repository.RatingRepository, contentRepo repository.ContentRepository) *RatingUseCase {
	return &RatingUseCase{
		ratingRepo:  ratingRepo,
		contentRepo: contentRepo,
	}
}

// GetRatingsByContentID はコンテンツIDによる評価一覧を取得します
func (uc *RatingUseCase) GetRatingsByContentID(ctx context.Context, contentID int64) ([]*model.Rating, error) {
	ratings, err := uc.ratingRepo.FindByContentID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("評価の取得に失敗しました: %w", err)
	}

	return ratings, nil
}

// GetRatingsByUserID はユーザーIDによる評価一覧を取得します
func (uc *RatingUseCase) GetRatingsByUserID(ctx context.Context, userID int64) ([]*model.Rating, error) {
	ratings, err := uc.ratingRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("評価の取得に失敗しました: %w", err)
	}

	return ratings, nil
}

// CreateOrUpdateRating は評価の投稿/更新を行います
func (uc *RatingUseCase) CreateOrUpdateRating(ctx context.Context, rating *model.Rating) error {
	// バリデーション
	if err := rating.Validate(); err != nil {
		return err
	}

	// 既存の評価を検索
	existingRating, err := uc.ratingRepo.FindByUserAndContentID(ctx, rating.UserID, rating.ContentID)
	if err != nil {
		return fmt.Errorf("既存の評価の確認に失敗しました: %w", err)
	}

	if existingRating != nil {
		// 既存の評価を更新
		if err := existingRating.SetValue(rating.Value); err != nil {
			return err
		}

		err = uc.ratingRepo.Update(ctx, existingRating)
		if err != nil {
			return fmt.Errorf("評価の更新に失敗しました: %w", err)
		}

		// 返り値として使用するため、IDをセット
		rating.ID = existingRating.ID
		rating.CreatedAt = existingRating.CreatedAt
		rating.UpdatedAt = existingRating.UpdatedAt
		return nil
	}

	// 新規評価を作成
	return uc.ratingRepo.Create(ctx, rating)
}

// DeleteRating は評価を削除します
func (uc *RatingUseCase) DeleteRating(ctx context.Context, id int64, userID int64, isAdmin bool) error {
	rating, err := uc.ratingRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("評価の検索に失敗しました: %w", err)
	}

	if rating == nil {
		return domainErrors.NewValidationError("指定された評価が見つかりません")
	}

	// 権限チェック(評価の作成者または管理者のみ削除可能)
	if rating.UserID != userID && !isAdmin {
		return domainErrors.NewValidationError("この評価を削除する権限がありません")
	}

	return uc.ratingRepo.Delete(ctx, id)
}

// GetRatingStatsByContentID はコンテンツの評価統計を取得します
func (uc *RatingUseCase) GetRatingStatsByContentID(ctx context.Context, contentID int64) (*model.RatingAverage, error) {
	return uc.ratingRepo.GetAverageByContentID(ctx, contentID)
}
