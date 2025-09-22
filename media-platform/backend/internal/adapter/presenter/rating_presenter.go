package presenter

import (
	"media-platform/internal/usecase/dto" // UseCase DTOのみに依存
)

// RatingPresenter は評価のプレゼンテーション変換を担当します
type RatingPresenter struct{}

// NewRatingPresenter は新しいRatingPresenterのインスタンスを生成します
func NewRatingPresenter() *RatingPresenter {
	return &RatingPresenter{}
}

// ========== HTTP Response DTO構造体 ==========

// HTTPRatingResponse はHTTPレスポンス用の評価情報です
type HTTPRatingResponse struct {
	ID        int64  `json:"id"`
	Value     int    `json:"value"`
	UserID    int64  `json:"user_id"`
	ContentID int64  `json:"content_id"`
	CreatedAt string `json:"created_at"` // RFC3339形式の文字列
	UpdatedAt string `json:"updated_at,omitempty"`
}

// HTTPRatingStatsResponse はHTTPレスポンス用の評価統計です
type HTTPRatingStatsResponse struct {
	ContentID int64 `json:"content_id"`
	LikeCount int   `json:"like_count"`
	Count     int   `json:"count"`
}

// ========== UseCase DTO → HTTP Response DTO変換 ==========

// ToHTTPRatingResponse はUseCase DTOをHTTPレスポンス用DTOに変換します
func (p *RatingPresenter) ToHTTPRatingResponse(ratingDTO *dto.RatingResponse) *HTTPRatingResponse {
	if ratingDTO == nil {
		return nil
	}

	return &HTTPRatingResponse{
		ID:        ratingDTO.ID,
		Value:     ratingDTO.Value,
		UserID:    ratingDTO.UserID,
		ContentID: ratingDTO.ContentID,
		CreatedAt: ratingDTO.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: ratingDTO.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}

// ToHTTPRatingStatsResponse はUseCase統計DTOをHTTPレスポンス用DTOに変換します
func (p *RatingPresenter) ToHTTPRatingStatsResponse(statsDTO *dto.RatingStatsResponse) *HTTPRatingStatsResponse {
	if statsDTO == nil {
		return &HTTPRatingStatsResponse{
			ContentID: 0,
			LikeCount: 0,
			Count:     0,
		}
	}

	return &HTTPRatingStatsResponse{
		ContentID: statsDTO.ContentID,
		LikeCount: statsDTO.LikeCount,
		Count:     statsDTO.Count,
	}
}

// ToHTTPRatingResponseList はUseCase DTOリストをHTTPレスポンス用DTOリストに変換します
func (p *RatingPresenter) ToHTTPRatingResponseList(ratingDTOs []*dto.RatingResponse) []*HTTPRatingResponse {
	if ratingDTOs == nil {
		return []*HTTPRatingResponse{}
	}

	responses := make([]*HTTPRatingResponse, 0, len(ratingDTOs))
	for _, ratingDTO := range ratingDTOs {
		if ratingDTO != nil {
			responses = append(responses, p.ToHTTPRatingResponse(ratingDTO))
		}
	}

	return responses
}

// ToHTTPRatingStatsResponseMap は統計DTOマップをHTTPレスポンス用DTOマップに変換します
func (p *RatingPresenter) ToHTTPRatingStatsResponseMap(statsDTOMap map[int64]*dto.RatingStatsResponse) map[int64]*HTTPRatingStatsResponse {
	if statsDTOMap == nil {
		return make(map[int64]*HTTPRatingStatsResponse)
	}

	responseMap := make(map[int64]*HTTPRatingStatsResponse, len(statsDTOMap))
	for contentID, statsDTO := range statsDTOMap {
		responseMap[contentID] = p.ToHTTPRatingStatsResponse(statsDTO)
	}

	return responseMap
}
