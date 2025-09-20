package presenter

import (
	"media-platform/internal/domain/entity"
	"media-platform/internal/usecase/dto" // ✅ 修正: presentation/dto → usecase/dto
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

// ⚠️ 削除されたメソッド（Service層の責務）:
// - ToRatingEntity: RatingService.toRatingEntityで実装済み
// - ValidateCreateRatingRequest: Service/Entityの責務
// - ToCreateRatingRequest: 不要なラッパー
// - ToRatingQueryFromParams: Controller層で直接DTOを作成すべき
// - ToUserRatingStatusResponse: RatingServiceで実装済み
// - ToToggleResultResponse: Controller層で直接作成すべき
// - ToRatingListWithPagination: 複雑すぎ、Controller層で組み立てるべき
// - ToRatingWithUserResponse: 使用されていない過剰機能
// - ToContentRatingsSummary: Service層の責務
// - ToErrorResponse: 汎用的すぎ、Controller層で処理すべき
