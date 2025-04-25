package usecase

import (
	"context"
	"fmt"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/domain/repository"
)

// RatingUseCase は評価に関するユースケースを定義するインターフェースです
type RatingUseCase interface {
	// コンテンツIDによる評価一覧取得
	GetRatingsByContentID(ctx context.Context, contentID int64) ([]*model.Rating, error)
	// ユーザーIDによる評価一覧取得
	GetRatingsByUserID(ctx context.Context, userID int64) ([]*model.Rating, error)
	// 評価の投稿/更新
	CreateOrUpdateRating(ctx context.Context, rating *model.Rating) error
	// 評価の削除
	DeleteRating(ctx context.Context, id int64, userID int64, isAdmin bool) error
	// コンテンツの平均評価取得
	GetAverageRatingByContentID(ctx context.Context, contentID int64) (*model.RatingAverage, error)
}

// ratingUseCase はRatingUseCaseインターフェースの実装です
type ratingUseCase struct {
	ratingRepo  repository.RatingRepository
	contentRepo repository.ContentRepository // コンテンツの存在確認のため
}

// NewRatingUseCase は新しいRatingUseCaseインスタンスを作成します
func NewRatingUseCase(ratingRepo repository.RatingRepository, contentRepo repository.ContentRepository) RatingUseCase {
	return &ratingUseCase{
		ratingRepo:  ratingRepo,
		contentRepo: contentRepo,
	}
}

// GetRatingsByContentID はコンテンツIDによる評価一覧を取得します
func (uc *ratingUseCase) GetRatingsByContentID(ctx context.Context, contentID int64) ([]*model.Rating, error) {
	// コンテンツの存在確認（オプション）
	/*
		content, err := uc.contentRepo.Find(ctx, contentID)
		if err != nil {
			return nil, fmt.Errorf("コンテンツの存在確認に失敗しました: %w", err)
		}

		if content == nil {
			return nil, domainErrors.NewValidationError("指定されたコンテンツが存在しません")
		}
	*/

	return uc.ratingRepo.FindByContentID(ctx, contentID)
}

// GetRatingsByUserID はユーザーIDによる評価一覧を取得します
func (uc *ratingUseCase) GetRatingsByUserID(ctx context.Context, userID int64) ([]*model.Rating, error) {
	return uc.ratingRepo.FindByUserID(ctx, userID)
}

// CreateOrUpdateRating は評価の投稿/更新を行います
func (uc *ratingUseCase) CreateOrUpdateRating(ctx context.Context, rating *model.Rating) error {
	// コンテンツの存在確認（オプション）
	/*
		content, err := uc.contentRepo.Find(ctx, rating.ContentID)
		if err != nil {
			return fmt.Errorf("コンテンツの存在確認に失敗しました: %w", err)
		}

		if content == nil {
			return domainErrors.NewValidationError("指定されたコンテンツが存在しません")
		}
	*/

	// 既存の評価を検索
	existingRating, err := uc.ratingRepo.FindByUserAndContentID(ctx, rating.UserID, rating.ContentID)
	if err != nil {
		return fmt.Errorf("既存の評価の確認に失敗しました: %w", err)
	}

	if existingRating != nil {
		// 既存の評価を更新
		existingRating.Value = rating.Value
		err = uc.ratingRepo.Update(ctx, existingRating)
		if err != nil {
			return err
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
func (uc *ratingUseCase) DeleteRating(ctx context.Context, id int64, userID int64, isAdmin bool) error {
	rating, err := uc.ratingRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("評価の検索に失敗しました: %w", err)
	}

	if rating == nil {
		return domainErrors.NewValidationError("指定された評価が見つかりません")
	}

	// 権限チェック（評価の作成者または管理者のみ削除可能）
	if rating.UserID != userID && !isAdmin {
		return domainErrors.NewValidationError("この評価を削除する権限がありません")
	}

	return uc.ratingRepo.Delete(ctx, id)
}

// GetAverageRatingByContentID はコンテンツの平均評価を取得します
func (uc *ratingUseCase) GetAverageRatingByContentID(ctx context.Context, contentID int64) (*model.RatingAverage, error) {
	// コンテンツの存在確認（オプション）
	/*
		content, err := uc.contentRepo.Find(ctx, contentID)
		if err != nil {
			return nil, fmt.Errorf("コンテンツの存在確認に失敗しました: %w", err)
		}

		if content == nil {
			return nil, domainErrors.NewValidationError("指定されたコンテンツが存在しません")
		}
	*/

	return uc.ratingRepo.GetAverageByContentID(ctx, contentID)
}
