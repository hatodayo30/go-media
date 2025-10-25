package controller

import (
	"net/http"
	"strconv"

	"media-platform/internal/adapter/presenter"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/usecase/service"

	"github.com/labstack/echo/v4"
)

// FollowController はフォロー機能のHTTPハンドラーを提供します
type FollowController struct {
	followService   *service.FollowService
	followPresenter *presenter.FollowPresenter
}

// NewFollowController は新しいFollowControllerのインスタンスを生成します
func NewFollowController(
	followService *service.FollowService,
	followPresenter *presenter.FollowPresenter,
) *FollowController {
	return &FollowController{
		followService:   followService,
		followPresenter: followPresenter,
	}
}

// FollowUser はユーザーをフォローします
// POST /api/users/:id/follow
func (ctrl *FollowController) FollowUser(c echo.Context) error {
	// 現在のユーザーIDを取得
	followerID, err := ctrl.getUserIDFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	// フォロー対象のユーザーIDを取得
	followingIDStr := c.Param("id")
	followingID, err := strconv.ParseInt(followingIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// フォロー実行
	serviceResp, err := ctrl.followService.FollowUser(c.Request().Context(), followerID, followingID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Service DTOをPresentation DTOに変換
	response := ctrl.followPresenter.ToHTTPFollowResponse(serviceResp)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"follow": response,
		},
	})
}

// UnfollowUser はユーザーのフォローを解除します
// DELETE /api/users/:id/follow
func (ctrl *FollowController) UnfollowUser(c echo.Context) error {
	// 現在のユーザーIDを取得
	followerID, err := ctrl.getUserIDFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	// フォロー解除対象のユーザーIDを取得
	followingIDStr := c.Param("id")
	followingID, err := strconv.ParseInt(followingIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// フォロー解除実行
	err = ctrl.followService.UnfollowUser(c.Request().Context(), followerID, followingID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// GetFollowers はフォロワー一覧を取得します
// GET /api/users/:id/followers
func (ctrl *FollowController) GetFollowers(c echo.Context) error {
	// ユーザーIDを取得
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// フォロワー一覧取得
	serviceResp, err := ctrl.followService.GetFollowers(c.Request().Context(), userID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Service DTOをPresentation DTOに変換
	response := ctrl.followPresenter.ToHTTPFollowersResponse(serviceResp)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   response,
	})
}

// GetFollowing はフォロー中のユーザー一覧を取得します
// GET /api/users/:id/following
func (ctrl *FollowController) GetFollowing(c echo.Context) error {
	// ユーザーIDを取得
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// フォロー中一覧取得
	serviceResp, err := ctrl.followService.GetFollowing(c.Request().Context(), userID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Service DTOをPresentation DTOに変換
	response := ctrl.followPresenter.ToHTTPFollowingResponse(serviceResp)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   response,
	})
}

// GetFollowStats はフォロー統計を取得します
// GET /api/users/:id/follow-stats
func (ctrl *FollowController) GetFollowStats(c echo.Context) error {
	// ユーザーIDを取得
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// 現在のユーザーID取得（認証されていない場合は0）
	currentUserID, _ := ctrl.getUserIDFromContext(c)

	// フォロー統計取得
	serviceResp, err := ctrl.followService.GetFollowStats(c.Request().Context(), userID, currentUserID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Service DTOをPresentation DTOに変換
	response := ctrl.followPresenter.ToHTTPFollowStatsResponse(serviceResp)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   response,
	})
}

// GetFollowingFeed はフォロー中のユーザーのコンテンツフィードを取得します
// GET /api/users/following-feed
func (ctrl *FollowController) GetFollowingFeed(c echo.Context) error {
	// 現在のユーザーIDを取得
	userID, err := ctrl.getUserIDFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	// クエリパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// フォロー中フィード取得
	serviceResp, err := ctrl.followService.GetFollowingFeed(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Service DTOをPresentation DTOに変換
	response := ctrl.followPresenter.ToHTTPFollowingFeedResponse(serviceResp)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   response,
	})
}

// ========== ヘルパーメソッド ==========

// getUserIDFromContext はJWTミドルウェアからユーザーIDを取得します
func (ctrl *FollowController) getUserIDFromContext(c echo.Context) (int64, error) {
	userIDInterface := c.Get("user_id")
	if userIDInterface == nil {
		return 0, domainErrors.NewValidationError("認証が必要です")
	}

	// float64から int64に変換（JWTのclaimsは通常float64）
	switch v := userIDInterface.(type) {
	case float64:
		return int64(v), nil
	case int64:
		return v, nil
	case int:
		return int64(v), nil
	default:
		return 0, domainErrors.NewValidationError("ユーザー情報の取得に失敗しました")
	}
}

// getPaginationParams はリクエストからページネーションパラメータを取得します
func (ctrl *FollowController) getPaginationParams(c echo.Context) (int, int) {
	limit := 20 // デフォルト値
	offset := 0 // デフォルト値

	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	return limit, offset
}

// handleError はエラーを適切なHTTPステータスコードでレスポンスします
func (ctrl *FollowController) handleError(c echo.Context, err error) error {
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
