package controller

import (
	"errors"
	"net/http"
	"strconv"

	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/usecase/dto"
	"media-platform/internal/usecase/service"

	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
)

// RatingController は評価に関するHTTPハンドラを提供します
type RatingController struct {
	ratingService service.RatingService
}

// NewRatingController は新しいRatingControllerのインスタンスを生成します
func NewRatingController(ratingService service.RatingService) *RatingController {
	return &RatingController{
		ratingService: ratingService,
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

	ratings, err := ctrl.ratingService.GetRatingsByContentID(c.Request().Context(), contentID, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "評価の取得に失敗しました: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"ratings": ratings,
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

	ratings, err := ctrl.ratingService.GetRatingsByUserID(c.Request().Context(), userID, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "評価の取得に失敗しました: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"ratings": ratings,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"user_id": userID,
		},
	})
}

// GetAverageRatingByContentID は指定したコンテンツIDの評価統計を取得するハンドラです
func (ctrl *RatingController) GetAverageRatingByContentID(c echo.Context) error {
	contentIDStr := c.Param("contentId")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	stats, err := ctrl.ratingService.GetStatsByContentID(c.Request().Context(), contentID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "評価統計の取得に失敗しました: " + err.Error(),
		})
	}

	// 下位互換性のため、両方のフィールド名で返す
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			// 新形式
			"good_count": stats.LikeCount,
			"count":      stats.Count,
			"content_id": stats.ContentID,
			// 旧形式（下位互換性）
			"like_count":    stats.LikeCount,
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

	stats, err := ctrl.ratingService.GetStatsByContentID(c.Request().Context(), contentID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "グッド統計取得に失敗しました: " + err.Error(),
		})
	}

	// フロントエンドの期待する形式に変換
	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"good_count": stats.LikeCount, // like_count → good_count
			"count":      stats.Count,
			"content_id": stats.ContentID,
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

	status, err := ctrl.ratingService.GetUserRatingStatus(c.Request().Context(), userID, contentID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "評価状態の取得に失敗しました: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"user_rating_status": status,
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

	rating, err := ctrl.ratingService.CreateOrUpdateRating(c.Request().Context(), userID, &req)
	if err != nil {
		// ValidationError か判断
		if _, ok := err.(*domainErrors.ValidationError); ok {
			return c.JSON(http.StatusBadRequest, map[string]interface{}{
				"status": "error",
				"error":  err.Error(),
			})
		}

		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "評価の作成に失敗しました: " + err.Error(),
		})
	}

	// トグル動作の結果に応じてレスポンスを変更
	if rating == nil {
		// 評価が削除された場合（トグルオフ）
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"action":  "removed",
				"message": "評価を取り消しました",
			},
		})
	} else {
		// 評価が作成された場合（トグルオン）
		return c.JSON(http.StatusCreated, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"rating":  rating,
				"action":  "created",
				"message": "評価を追加しました",
			},
		})
	}
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
	err = ctrl.ratingService.DeleteRating(c.Request().Context(), id, userID, isAdmin)
	if err != nil {
		// ValidationError か判断
		if _, ok := err.(*domainErrors.ValidationError); ok {
			statusCode := http.StatusBadRequest
			if err.Error() == "この評価を削除する権限がありません" {
				statusCode = http.StatusForbidden
			} else if err.Error() == "指定された評価が見つかりません" {
				statusCode = http.StatusNotFound
			}
			return c.JSON(statusCode, map[string]interface{}{
				"status": "error",
				"error":  err.Error(),
			})
		}

		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "評価の削除に失敗しました: " + err.Error(),
		})
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

	rating, err := ctrl.ratingService.CreateOrUpdateRating(c.Request().Context(), userID, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  "いいねの操作に失敗しました: " + err.Error(),
		})
	}

	// トグル動作の結果に応じてレスポンスを変更
	if rating == nil {
		// 評価が削除された場合（トグルオフ）
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"action":    "removed",
				"has_liked": false,
				"message":   "いいねを取り消しました",
			},
		})
	} else {
		// 評価が作成された場合（トグルオン）
		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"action":    "created",
				"has_liked": true,
				"rating_id": rating.ID,
				"message":   "いいねしました",
			},
		})
	}
}

// getPaginationParams はリクエストからページネーションパラメータを取得します
func (ctrl *RatingController) getPaginationParams(c echo.Context) (int, int) {
	limit := 10
	offset := 0

	limitStr := c.QueryParam("limit")
	if limitStr == "" {
		limitStr = "10"
	}
	if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
		limit = val
	}

	offsetStr := c.QueryParam("offset")
	if offsetStr == "" {
		offsetStr = "0"
	}
	if val, err := strconv.Atoi(offsetStr); err == nil && val >= 0 {
		offset = val
	}

	return limit, offset
}

// ヘルパーメソッド：ユーザー認証情報をコンテキストから取得
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

// ヘルパーメソッド：クレームからユーザーIDを取得
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

// ヘルパーメソッド：クレームからユーザーロールを取得
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
