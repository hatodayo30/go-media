package controller

import (
	"errors"
	"net/http"
	"strconv"

	"media-platform/internal/adapter/presenter"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/usecase/dto"
	"media-platform/internal/usecase/service"

	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
)

// RatingController は評価に関するHTTPハンドラを提供します
type RatingController struct {
	ratingService   *service.RatingService
	ratingPresenter *presenter.RatingPresenter
}

// NewRatingController は新しいRatingControllerのインスタンスを生成します
func NewRatingController(
	ratingService *service.RatingService,
	ratingPresenter *presenter.RatingPresenter,
) *RatingController {
	return &RatingController{
		ratingService:   ratingService,
		ratingPresenter: ratingPresenter,
	}
}

// GetRatingsByContentID は指定したコンテンツIDの評価一覧を取得するハンドラです
func (ctrl *RatingController) GetRatingsByContentID(c echo.Context) error {
	contentIDStr := c.Param("contentId")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	// ページネーションパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// UseCaseから評価を取得
	ratingDTOs, err := ctrl.ratingService.GetRatingsByContentID(c.Request().Context(), contentID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpRatings := ctrl.ratingPresenter.ToHTTPRatingResponseList(ratingDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"ratings": httpRatings,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"content_id": contentID,
		},
	})
}

// GetRatingsByUserID は指定したユーザーIDの評価一覧を取得するハンドラです
func (ctrl *RatingController) GetRatingsByUserID(c echo.Context) error {
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// ページネーションパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// UseCaseから評価を取得
	ratingDTOs, err := ctrl.ratingService.GetRatingsByUserID(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpRatings := ctrl.ratingPresenter.ToHTTPRatingResponseList(ratingDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"ratings": httpRatings,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"user_id": userID,
		},
	})
}

// GetAverageRatingByContentID は指定したコンテンツIDの評価統計を取得するハンドラです（旧API互換性）
func (ctrl *RatingController) GetAverageRatingByContentID(c echo.Context) error {
	contentIDStr := c.Param("contentId")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	// UseCaseから統計を取得
	statsDTO, err := ctrl.ratingService.GetStatsByContentID(c.Request().Context(), contentID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpStats := ctrl.ratingPresenter.ToHTTPRatingStatsResponse(statsDTO)

	// 下位互換性のため、両方のフィールド名で返す
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			// 新形式
			"good_count": httpStats.LikeCount,
			"count":      httpStats.Count,
			"content_id": httpStats.ContentID,
			// 旧形式（下位互換性）
			"like_count":    httpStats.LikeCount,
			"dislike_count": 0,   // 常に0
			"average":       1.0, // グッドのみなので常に1.0
		},
	})
}

// GetGoodStatsByContentID は指定したコンテンツIDのグッド統計を取得するハンドラです
func (ctrl *RatingController) GetGoodStatsByContentID(c echo.Context) error {
	contentIDStr := c.Param("contentId")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	// UseCaseから統計を取得
	statsDTO, err := ctrl.ratingService.GetStatsByContentID(c.Request().Context(), contentID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpStats := ctrl.ratingPresenter.ToHTTPRatingStatsResponse(statsDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"good_count": httpStats.LikeCount,
			"count":      httpStats.Count,
			"content_id": httpStats.ContentID,
		},
	})
}

// GetUserRatingStatus は指定したコンテンツに対するユーザーの評価状態を取得するハンドラです
func (ctrl *RatingController) GetUserRatingStatus(c echo.Context) error {
	contentIDStr := c.Param("contentId")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	// ユーザー認証情報を取得
	claims, err := ctrl.getUserClaimsFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	userID, err := ctrl.getUserIDFromClaims(claims)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	// UseCaseから評価状態を取得
	statusDTO, err := ctrl.ratingService.GetUserRatingStatus(c.Request().Context(), userID, contentID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// DTOをそのまま返す（シンプルな構造のため変換不要）
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"user_rating_status": statusDTO,
		},
	})
}

// CreateRating は新しい評価を作成するハンドラです（トグル動作）
func (ctrl *RatingController) CreateRating(c echo.Context) error {
	// ユーザー認証情報を取得
	claims, err := ctrl.getUserClaimsFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	userID, err := ctrl.getUserIDFromClaims(claims)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	var req dto.CreateRatingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	// 値を1（グッド）に強制
	req.Value = 1

	// UseCaseで評価を作成/削除
	ratingDTO, err := ctrl.ratingService.CreateOrUpdateRating(c.Request().Context(), userID, &req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// トグル動作の結果に応じてレスポンスを変更
	if ratingDTO == nil {
		// 評価が削除された場合（トグルオフ）
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"action":  "removed",
				"message": "評価を取り消しました",
			},
		})
	}

	// PresenterでHTTPレスポンス用に変換
	httpRating := ctrl.ratingPresenter.ToHTTPRatingResponse(ratingDTO)

	// 評価が作成された場合（トグルオン）
	return c.JSON(http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"rating":  httpRating,
			"action":  "created",
			"message": "評価を追加しました",
		},
	})
}

// DeleteRating は評価を削除するハンドラです
func (ctrl *RatingController) DeleteRating(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効な評価IDです",
		})
	}

	// ユーザー認証情報を取得
	claims, err := ctrl.getUserClaimsFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	userID, err := ctrl.getUserIDFromClaims(claims)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	userRole, err := ctrl.getUserRoleFromClaims(claims)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	isAdmin := userRole == "admin"

	// UseCaseで評価を削除
	err = ctrl.ratingService.DeleteRating(c.Request().Context(), id, userID, isAdmin)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// ToggleLike はいいねのトグル（追加/削除）を行うハンドラです
func (ctrl *RatingController) ToggleLike(c echo.Context) error {
	contentIDStr := c.Param("contentId")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	// ユーザー認証情報を取得
	claims, err := ctrl.getUserClaimsFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	userID, err := ctrl.getUserIDFromClaims(claims)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	// CreateRatingRequestを構築
	req := &dto.CreateRatingRequest{
		ContentID: contentID,
		Value:     1, // 常に1（グッド）
	}

	// UseCaseで評価を作成/削除
	ratingDTO, err := ctrl.ratingService.CreateOrUpdateRating(c.Request().Context(), userID, req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// トグル動作の結果に応じてレスポンスを変更
	if ratingDTO == nil {
		// 評価が削除された場合（トグルオフ）
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"action":    "removed",
				"has_liked": false,
				"message":   "いいねを取り消しました",
			},
		})
	}

	// PresenterでHTTPレスポンス用に変換
	httpRating := ctrl.ratingPresenter.ToHTTPRatingResponse(ratingDTO)

	// 評価が作成された場合（トグルオン）
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"action":    "created",
			"has_liked": true,
			"rating_id": httpRating.ID,
			"message":   "いいねしました",
		},
	})
}

// GetUserLikedContents はユーザーがいいねしたコンテンツを取得するハンドラです
func (ctrl *RatingController) GetUserLikedContents(c echo.Context) error {
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// ページネーションパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// UseCaseからいいねしたコンテンツIDを取得
	contentIDs, err := ctrl.ratingService.GetUserLikedContentIDs(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"content_ids": contentIDs,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"user_id": userID,
		},
	})
}

// GetTopRatedContents は人気コンテンツを取得するハンドラです
func (ctrl *RatingController) GetTopRatedContents(c echo.Context) error {
	// クエリパラメータの取得
	limit := 10
	days := 7

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}

	if daysStr := c.QueryParam("days"); daysStr != "" {
		if val, err := strconv.Atoi(daysStr); err == nil && val > 0 {
			days = val
		}
	}

	// 人気コンテンツIDを取得
	contentIDs, err := ctrl.ratingService.GetTopRatedContents(c.Request().Context(), limit, days)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"content_ids": contentIDs,
			"limit":       limit,
			"days":        days,
		},
	})
}

// GetBulkRatingStats は複数コンテンツの評価統計を一括取得するハンドラです
func (ctrl *RatingController) GetBulkRatingStats(c echo.Context) error {
	// リクエストボディから取得
	var req struct {
		ContentIDs []int64 `json:"content_ids"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	if len(req.ContentIDs) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "content_idsは必須です",
		})
	}

	// 評価統計を一括取得
	statsDTOMap, err := ctrl.ratingService.GetRatingsByContentIDs(c.Request().Context(), req.ContentIDs)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpStatsMap := ctrl.ratingPresenter.ToHTTPRatingStatsResponseMap(statsDTOMap)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"stats": httpStatsMap,
		},
	})
}

// ========== ヘルパーメソッド ==========

// getPaginationParams はリクエストからページネーションパラメータを取得します
func (ctrl *RatingController) getPaginationParams(c echo.Context) (int, int) {
	limit := 10
	offset := 0

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
			limit = val
		}
	}

	if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if val, err := strconv.Atoi(offsetStr); err == nil && val >= 0 {
			offset = val
		}
	}

	return limit, offset
}

// getUserClaimsFromContext はユーザー認証情報をコンテキストから取得します
func (ctrl *RatingController) getUserClaimsFromContext(c echo.Context) (jwt.MapClaims, error) {
	userClaims := c.Get("user")
	if userClaims == nil {
		return nil, errors.New("認証されていません")
	}

	claims, ok := userClaims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("認証情報の形式が不正です")
	}

	return claims, nil
}

// getUserIDFromClaims はクレームからユーザーIDを取得します
func (ctrl *RatingController) getUserIDFromClaims(claims jwt.MapClaims) (int64, error) {
	userIDInterface, exists := claims["user_id"]
	if !exists {
		return 0, errors.New("ユーザーIDが見つかりません")
	}

	userIDFloat, ok := userIDInterface.(float64)
	if !ok {
		return 0, errors.New("ユーザーIDの形式が不正です")
	}

	return int64(userIDFloat), nil
}

// getUserRoleFromClaims はクレームからユーザーロールを取得します
func (ctrl *RatingController) getUserRoleFromClaims(claims jwt.MapClaims) (string, error) {
	userRoleInterface, exists := claims["role"]
	if !exists {
		return "", errors.New("ユーザーロールが見つかりません")
	}

	userRole, ok := userRoleInterface.(string)
	if !ok {
		return "", errors.New("ユーザーロールの形式が不正です")
	}

	return userRole, nil
}

// handleError はエラーを適切なHTTPステータスコードでレスポンスします
func (ctrl *RatingController) handleError(c echo.Context, err error) error {
	// Domain Errorの種類に応じてステータスコードを決定
	if domainErrors.IsValidationError(err) {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	if domainErrors.IsNotFoundError(err) {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	if domainErrors.IsConflictError(err) {
		return c.JSON(http.StatusConflict, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	if domainErrors.IsPermissionError(err) {
		return c.JSON(http.StatusForbidden, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	// その他のエラーは内部サーバーエラー
	return c.JSON(http.StatusInternalServerError, map[string]interface{}{
		"status": "error",
		"error":  "内部サーバーエラーが発生しました",
	})
}
