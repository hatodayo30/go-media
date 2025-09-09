package presenter

import (
	"time"

	"media-platform/internal/domain/entity"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/presentation/dto"
)

// RatingPresenter は評価のプレゼンテーション変換を担当します
type RatingPresenter struct{}

// NewRatingPresenter は新しいRatingPresenterのインスタンスを生成します
func NewRatingPresenter() *RatingPresenter {
	return &RatingPresenter{}
}

// ToRatingResponse はエンティティからレスポンスDTOに変換します
func (p *RatingPresenter) ToRatingResponse(rating *entity.Rating) *dto.RatingResponse {
	if rating == nil {
		return nil
	}

	return &dto.RatingResponse{
		ID:        rating.ID,
		Value:     rating.Value,
		UserID:    rating.UserID,
		ContentID: rating.ContentID,
		CreatedAt: rating.CreatedAt,
		UpdatedAt: rating.UpdatedAt,
	}
}

// ToRatingStatsResponse は統計エンティティからレスポンスDTOに変換します
func (p *RatingPresenter) ToRatingStatsResponse(stats *entity.RatingStats) *dto.RatingStatsResponse {
	if stats == nil {
		return &dto.RatingStatsResponse{
			ContentID: 0,
			LikeCount: 0,
			Count:     0,
		}
	}

	return &dto.RatingStatsResponse{
		ContentID: stats.ContentID,
		LikeCount: stats.LikeCount,
		Count:     stats.Count,
	}
}

// ToUserRatingStatusResponse はユーザーの評価状態をレスポンスDTOに変換します
func (p *RatingPresenter) ToUserRatingStatusResponse(contentID int64, rating *entity.Rating) *dto.UserRatingStatusResponse {
	response := &dto.UserRatingStatusResponse{
		ContentID: contentID,
		HasLiked:  false,
		RatingID:  nil,
	}

	if rating != nil {
		response.HasLiked = true
		response.RatingID = &rating.ID
	}

	return response
}

// ToRatingEntity はリクエストDTOからエンティティに変換します
func (p *RatingPresenter) ToRatingEntity(req *dto.CreateRatingRequest, userID int64) *entity.Rating {
	if req == nil {
		return nil
	}

	now := time.Now()

	return &entity.Rating{
		ID:        0, // 新規作成時は0
		Value:     1, // 常に1（グッド）に固定
		UserID:    userID,
		ContentID: req.ContentID,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// ToRatingResponseList はエンティティのスライスをレスポンスDTOのスライスに変換します
func (p *RatingPresenter) ToRatingResponseList(ratings []*entity.Rating) []*dto.RatingResponse {
	if ratings == nil {
		return []*dto.RatingResponse{}
	}

	responses := make([]*dto.RatingResponse, 0, len(ratings))
	for _, rating := range ratings {
		if rating != nil {
			responses = append(responses, p.ToRatingResponse(rating))
		}
	}

	return responses
}

// ToRatingStatsResponseMap は統計マップをレスポンスDTOマップに変換します
func (p *RatingPresenter) ToRatingStatsResponseMap(statsMap map[int64]*entity.RatingStats) map[int64]*dto.RatingStatsResponse {
	if statsMap == nil {
		return make(map[int64]*dto.RatingStatsResponse)
	}

	responseMap := make(map[int64]*dto.RatingStatsResponse, len(statsMap))
	for contentID, stats := range statsMap {
		responseMap[contentID] = p.ToRatingStatsResponse(stats)
	}

	return responseMap
}

// ToRatingListWithPagination はページネーション情報付きのレスポンスを作成します
func (p *RatingPresenter) ToRatingListWithPagination(
	ratings []*entity.Rating,
	totalCount int,
	limit int,
	offset int,
) *dto.RatingListResponse {
	responses := p.ToRatingResponseList(ratings)

	return &dto.RatingListResponse{
		Ratings: responses,
		Pagination: dto.PaginationResponse{
			Total:  totalCount,
			Limit:  limit,
			Offset: offset,
		},
	}
}

// ToToggleResultResponse はトグル操作の結果をレスポンスDTOに変換します
func (p *RatingPresenter) ToToggleResultResponse(
	rating *entity.Rating,
	action string,
	message string,
) *dto.ToggleRatingResponse {
	response := &dto.ToggleRatingResponse{
		Action:  action,
		Message: message,
	}

	if rating != nil {
		// 評価が作成された場合
		response.HasLiked = true
		response.RatingID = &rating.ID
		response.Rating = p.ToRatingResponse(rating)
	} else {
		// 評価が削除された場合
		response.HasLiked = false
		response.RatingID = nil
		response.Rating = nil
	}

	return response
}

// ToCreateRatingRequest はフォームデータからリクエストDTOに変換します（バリデーション用）
func (p *RatingPresenter) ToCreateRatingRequest(contentID int64, value int) *dto.CreateRatingRequest {
	return &dto.CreateRatingRequest{
		ContentID: contentID,
		Value:     value,
	}
}

// ToRatingWithUserResponse はユーザー情報付きの評価レスポンスを作成します
func (p *RatingPresenter) ToRatingWithUserResponse(
	rating *entity.Rating,
	user *entity.User,
) *dto.RatingWithUserResponse {
	if rating == nil {
		return nil
	}

	response := &dto.RatingWithUserResponse{
		ID:        rating.ID,
		Value:     rating.Value,
		ContentID: rating.ContentID,
		CreatedAt: rating.CreatedAt,
		UpdatedAt: rating.UpdatedAt,
	}

	if user != nil {
		response.User = &dto.UserBasicInfo{
			ID:       user.ID,
			Username: user.Username,
			Email:    user.Email, // 必要に応じて非表示にする
		}
	}

	return response
}

// ValidateCreateRatingRequest はリクエストDTOのバリデーションを行います
func (p *RatingPresenter) ValidateCreateRatingRequest(req *dto.CreateRatingRequest) error {
	if req == nil {
		return domainErrors.NewValidationError("リクエストが空です")
	}

	// エンティティを作成してバリデーション
	rating := p.ToRatingEntity(req, 1) // 仮のユーザーIDでバリデーション
	if rating == nil {
		return domainErrors.NewValidationError("評価データの作成に失敗しました")
	}

	return rating.Validate()
}

// ToRatingQueryFromParams はクエリパラメータからクエリDTOに変換します
func (p *RatingPresenter) ToRatingQueryFromParams(
	userID *int64,
	contentID *int64,
	limit int,
	offset int,
) *dto.RatingQuery {
	return &dto.RatingQuery{
		UserID:    userID,
		ContentID: contentID,
		Limit:     limit,
		Offset:    offset,
	}
}

// ToContentRatingsSummary はコンテンツの評価サマリーを作成します
func (p *RatingPresenter) ToContentRatingsSummary(
	contentID int64,
	stats *entity.RatingStats,
	userRating *entity.Rating,
) *dto.ContentRatingsSummary {
	summary := &dto.ContentRatingsSummary{
		ContentID: contentID,
		Stats:     p.ToRatingStatsResponse(stats),
		UserStatus: &dto.UserRatingStatusResponse{
			ContentID: contentID,
			HasLiked:  false,
			RatingID:  nil,
		},
	}

	if userRating != nil {
		summary.UserStatus.HasLiked = true
		summary.UserStatus.RatingID = &userRating.ID
	}

	return summary
}

// ToErrorResponse はエラーレスポンスを作成します
func (p *RatingPresenter) ToErrorResponse(err error, code string) *dto.ErrorResponse {
	return &dto.ErrorResponse{
		Code:    code,
		Message: err.Error(),
	}
}
