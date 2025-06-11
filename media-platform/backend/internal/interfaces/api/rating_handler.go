package api

import (
	"errors"
	"net/http"
	"strconv"

	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"

	domainErrors "media-platform/internal/domain/errors"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// RatingHandler は評価に関するHTTPハンドラを提供します
type RatingHandler struct {
	ratingUseCase *usecase.RatingUseCase
}

// NewRatingHandler は新しいRatingHandlerのインスタンスを生成します
func NewRatingHandler(ratingUseCase *usecase.RatingUseCase) *RatingHandler {
	return &RatingHandler{
		ratingUseCase: ratingUseCase,
	}
}

// GetRatingsByContentID は指定したコンテンツIDの評価一覧を取得するハンドラです
func (h *RatingHandler) GetRatingsByContentID(c *gin.Context) {
	contentIDStr := c.Param("id")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
		return
	}

	ratings, err := h.ratingUseCase.GetRatingsByContentID(c.Request.Context(), contentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "評価の取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"ratings": ratings,
			"total":   len(ratings),
		},
	})
}

// GetRatingsByUserID は指定したユーザーIDの評価一覧を取得するハンドラです
func (h *RatingHandler) GetRatingsByUserID(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
		return
	}

	ratings, err := h.ratingUseCase.GetRatingsByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "評価の取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"ratings": ratings,
			"total":   len(ratings),
		},
	})
}

// 🔄 新メソッド: GetGoodStatsByContentID は指定したコンテンツIDのグッド統計を取得するハンドラです
func (h *RatingHandler) GetGoodStatsByContentID(c *gin.Context) {
	contentIDStr := c.Param("id")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
		return
	}

	ratingStats, err := h.ratingUseCase.GetRatingStatsByContentID(c.Request.Context(), contentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "グッド統計取得に失敗しました: " + err.Error(),
		})
		return
	}

	// フロントエンドの期待する形式に変換
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"good_count": ratingStats.LikeCount, // like_count → good_count
			"count":      ratingStats.Count,
			"content_id": ratingStats.ContentID,
		},
	})
}

// 🔄 下位互換性のため残す：GetAverageRatingByContentID
func (h *RatingHandler) GetAverageRatingByContentID(c *gin.Context) {
	contentIDStr := c.Param("id")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
		return
	}

	ratingStats, err := h.ratingUseCase.GetRatingStatsByContentID(c.Request.Context(), contentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "平均評価取得に失敗しました: " + err.Error(),
		})
		return
	}

	// 下位互換性のため、両方のフィールド名で返す
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			// 新形式
			"good_count": ratingStats.LikeCount,
			"count":      ratingStats.Count,
			"content_id": ratingStats.ContentID,
			// 旧形式（下位互換性）
			"like_count":    ratingStats.LikeCount,
			"dislike_count": 0,   // 常に0
			"average":       1.0, // グッドのみなので常に1.0
		},
	})
}

// CreateRating は新しい評価を作成するハンドラです
func (h *RatingHandler) CreateRating(c *gin.Context) {
	// ユーザー認証情報を取得
	claims, err := h.getUserClaimsFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	// ユーザーIDを取得
	userID, err := h.getUserIDFromClaims(claims)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	var req model.CreateRatingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	// 🔄 値を1（グッド）に強制
	req.Value = 1

	// 評価エンティティを作成
	rating := &model.Rating{
		UserID:    userID,
		ContentID: req.ContentID,
		Value:     req.Value,
	}

	err = h.ratingUseCase.CreateOrUpdateRating(c.Request.Context(), rating)
	if err != nil {
		// ValidationError か判断
		if _, ok := err.(*domainErrors.ValidationError); ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "評価の作成に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"rating": rating,
		},
	})
}

// DeleteRating は評価を削除するハンドラです
func (h *RatingHandler) DeleteRating(c *gin.Context) {
	// 評価IDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効な評価IDです",
		})
		return
	}

	// ユーザー認証情報を取得
	claims, err := h.getUserClaimsFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	// ユーザーIDとロールを取得
	userID, err := h.getUserIDFromClaims(claims)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	userRole, err := h.getUserRoleFromClaims(claims)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	isAdmin := userRole == "admin"
	err = h.ratingUseCase.DeleteRating(c.Request.Context(), id, userID, isAdmin)
	if err != nil {
		// ValidationError か判断
		if _, ok := err.(*domainErrors.ValidationError); ok {
			statusCode := http.StatusBadRequest
			if err.Error() == "この評価を削除する権限がありません" {
				statusCode = http.StatusForbidden
			} else if err.Error() == "指定された評価が見つかりません" {
				statusCode = http.StatusNotFound
			}
			c.JSON(statusCode, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "評価の削除に失敗しました: " + err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// ヘルパーメソッド：ユーザー認証情報をコンテキストから取得
func (h *RatingHandler) getUserClaimsFromContext(c *gin.Context) (jwt.MapClaims, error) {
	userClaims, exists := c.Get("user")
	if !exists {
		return nil, errors.New("認証されていません")
	}

	claims, ok := userClaims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("認証情報の形式が不正です")
	}

	return claims, nil
}

// ヘルパーメソッド：クレームからユーザーIDを取得
func (h *RatingHandler) getUserIDFromClaims(claims jwt.MapClaims) (int64, error) {
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
func (h *RatingHandler) getUserRoleFromClaims(claims jwt.MapClaims) (string, error) {
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
