package api

import (
	"errors"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// RatingHandler は評価に関するHTTPハンドラーです
type RatingHandler struct {
	ratingUseCase usecase.RatingUseCase
}

// NewRatingHandler は新しいRatingHandlerインスタンスを作成します
func NewRatingHandler(ratingUseCase usecase.RatingUseCase) *RatingHandler {
	return &RatingHandler{
		ratingUseCase: ratingUseCase,
	}
}

// GetRatingsByContentID はコンテンツに対する評価一覧を取得します
// @Summary コンテンツに対する評価一覧を取得
// @Description 指定されたコンテンツIDに対する評価一覧を取得します
// @Tags ratings
// @Accept json
// @Produce json
// @Param id path int true "コンテンツID"
// @Success 200 {array} model.Rating
// @Router /api/contents/{id}/ratings [get]
func (h *RatingHandler) GetRatingsByContentID(c *gin.Context) {
	contentIDStr := c.Param("id") // contentId → id に変更
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なコンテンツIDです"})
		return
	}

	ratings, err := h.ratingUseCase.GetRatingsByContentID(c.Request.Context(), contentID)
	if err != nil {
		var validationErr *domainErrors.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "評価一覧の取得中にエラーが発生しました"})
		return
	}

	c.JSON(http.StatusOK, ratings)
}

// CreateOrUpdateRating は評価の投稿/更新を行います
// @Summary 評価の投稿/更新
// @Description 評価を投稿または更新します
// @Tags ratings
// @Accept json
// @Produce json
// @Param rating body model.Rating true "評価情報"
// @Success 201 {object} model.Rating
// @Router /api/ratings [post]
func (h *RatingHandler) CreateOrUpdateRating(c *gin.Context) {
	var rating model.Rating
	if err := c.ShouldBindJSON(&rating); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効な評価データです: " + err.Error()})
		return
	}

	// ユーザーIDをJWTから取得（認証ミドルウェアによって設定）
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証されていません"})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザーIDの型が正しくありません"})
		return
	}

	rating.UserID = userID

	if err := h.ratingUseCase.CreateOrUpdateRating(c.Request.Context(), &rating); err != nil {
		var validationErr *domainErrors.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "評価の投稿/更新中にエラーが発生しました"})
		return
	}

	c.JSON(http.StatusCreated, rating)
}

// DeleteRating は評価を削除します
// @Summary 評価の削除
// @Description 指定された評価を削除します
// @Tags ratings
// @Accept json
// @Produce json
// @Param id path int true "評価ID"
// @Success 204 {object} nil
// @Router /api/ratings/{id} [delete]
func (h *RatingHandler) DeleteRating(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効な評価IDです"})
		return
	}

	// ユーザーIDとロールをJWTから取得（認証ミドルウェアによって設定）
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証されていません"})
		return
	}

	userID, ok := userIDValue.(int64)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザーIDの型が正しくありません"})
		return
	}

	// 管理者かどうかを確認
	roleValue, exists := c.Get("user_role")
	isAdmin := false
	if exists {
		role, ok := roleValue.(string)
		if ok && role == "admin" {
			isAdmin = true
		}
	}

	if err := h.ratingUseCase.DeleteRating(c.Request.Context(), id, userID, isAdmin); err != nil {
		var validationErr *domainErrors.ValidationError
		if errors.As(err, &validationErr) {
			if validationErr.Error() == "この評価を削除する権限がありません" {
				c.JSON(http.StatusForbidden, gin.H{"error": validationErr.Error()})
				return
			}
			if validationErr.Error() == "指定された評価が見つかりません" {
				c.JSON(http.StatusNotFound, gin.H{"error": validationErr.Error()})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "評価の削除中にエラーが発生しました"})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetAverageRatingByContentID はコンテンツの平均評価を取得します
// @Summary コンテンツの平均評価取得
// @Description 指定されたコンテンツの平均評価を取得します
// @Tags ratings
// @Accept json
// @Produce json
// @Param id path int true "コンテンツID"
// @Success 200 {object} model.RatingAverage
// @Router /api/contents/{id}/rating/average [get]
func (h *RatingHandler) GetAverageRatingByContentID(c *gin.Context) {
	contentIDStr := c.Param("id") // contentId → id に変更
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なコンテンツIDです"})
		return
	}

	average, err := h.ratingUseCase.GetAverageRatingByContentID(c.Request.Context(), contentID)
	if err != nil {
		var validationErr *domainErrors.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "平均評価の取得中にエラーが発生しました"})
		return
	}

	c.JSON(http.StatusOK, average)
}

// GetRatingsByUserID はユーザーが投稿した評価一覧を取得します
// @Summary ユーザーが投稿した評価一覧
// @Description 指定されたユーザーが投稿した評価一覧を取得します
// @Tags ratings
// @Accept json
// @Produce json
// @Param id path int true "ユーザーID"
// @Success 200 {array} model.Rating
// @Router /api/users/{id}/ratings [get]
func (h *RatingHandler) GetRatingsByUserID(c *gin.Context) {
	userIDStr := c.Param("id") // userId → id に変更
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "無効なユーザーIDです"})
		return
	}

	ratings, err := h.ratingUseCase.GetRatingsByUserID(c.Request.Context(), userID)
	if err != nil {
		var validationErr *domainErrors.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザーの評価一覧の取得中にエラーが発生しました"})
		return
	}

	c.JSON(http.StatusOK, ratings)
}
