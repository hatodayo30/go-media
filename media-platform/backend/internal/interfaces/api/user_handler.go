package api

import (
	"net/http"
	"strconv"

	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"

	domainErrors "media-platform/internal/domain/errors"

	"github.com/gin-gonic/gin"
)

// UserHandler はユーザーに関するHTTPハンドラを提供します
type UserHandler struct {
	userUseCase *usecase.UserUseCase
}

// NewUserHandler は新しいUserHandlerのインスタンスを生成します
func NewUserHandler(userUseCase *usecase.UserUseCase) *UserHandler {
	return &UserHandler{
		userUseCase: userUseCase,
	}
}

// Register はユーザー登録を行うハンドラです
func (h *UserHandler) Register(c *gin.Context) {
	var req model.CreateUserRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	user, err := h.userUseCase.Register(c.Request.Context(), &req)
	if err != nil {
		// ValidationError か判断
		if _, ok := err.(*domainErrors.ValidationError); ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}

		// その他のエラー
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "ユーザー登録に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"user": user,
		},
	})
}

// Login はユーザーログインを行うハンドラです
func (h *UserHandler) Login(c *gin.Context) {
	var req model.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	token, user, err := h.userUseCase.Login(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"token": token,
			"user":  user,
		},
	})
}

// GetCurrentUser は現在ログイン中のユーザー情報を取得するハンドラです
func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	// JWTミドルウェアで設定されたユーザー情報を取得
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "認証されていません",
		})
		return
	}

	// トークンから取得したユーザーIDでユーザー情報を取得
	claims := userClaims.(map[string]interface{})
	userID := int64(claims["user_id"].(float64))

	user, err := h.userUseCase.GetCurrentUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "ユーザー情報の取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"user": user,
		},
	})
}

// GetUserByID は指定したIDのユーザー情報を取得するハンドラです
func (h *UserHandler) GetUserByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
		return
	}

	user, err := h.userUseCase.GetUserByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"user": user,
		},
	})
}

// GetAllUsers は全てのユーザー情報を取得するハンドラです
func (h *UserHandler) GetAllUsers(c *gin.Context) {
	// ページネーションパラメータの取得
	limit := 10 // デフォルト値
	offset := 0 // デフォルト値

	limitStr := c.DefaultQuery("limit", "10")
	if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
		limit = val
	}

	offsetStr := c.DefaultQuery("offset", "0")
	if val, err := strconv.Atoi(offsetStr); err == nil && val >= 0 {
		offset = val
	}

	users, err := h.userUseCase.GetAllUsers(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "ユーザー情報の取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"users": users,
			"pagination": gin.H{
				"limit":  limit,
				"offset": offset,
			},
		},
	})
}

// UpdateUser はユーザー情報を更新するハンドラです
func (h *UserHandler) UpdateUser(c *gin.Context) {
	// JWTミドルウェアで設定されたユーザー情報を取得
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "認証されていません",
		})
		return
	}

	// トークンから取得したユーザーIDでユーザー情報を取得
	claims := userClaims.(map[string]interface{})
	userID := int64(claims["user_id"].(float64))

	var req model.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	user, err := h.userUseCase.UpdateUser(c.Request.Context(), userID, &req)
	if err != nil {
		// ValidationError か判断
		if _, ok := err.(*domainErrors.ValidationError); ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}

		statusCode := http.StatusInternalServerError
		if err.Error() == "ユーザーが見つかりません" {
			statusCode = http.StatusNotFound
		}

		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  "ユーザー情報の更新に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"user": user,
		},
	})
}

// UpdateUserByAdmin は管理者がユーザー情報を更新するハンドラです
func (h *UserHandler) UpdateUserByAdmin(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
		return
	}

	var req model.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	user, err := h.userUseCase.UpdateUserByAdmin(c.Request.Context(), id, &req)
	if err != nil {
		// ValidationErrorかどうかをチェック
		if _, ok := err.(*domainErrors.ValidationError); ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}

		statusCode := http.StatusInternalServerError
		if err.Error() == "ユーザーが見つかりません" {
			statusCode = http.StatusNotFound
		}

		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  "ユーザー情報の更新に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"user": user,
		},
	})
}

// DeleteUser はユーザーを削除するハンドラです
func (h *UserHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
		return
	}

	err = h.userUseCase.DeleteUser(c.Request.Context(), id)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "ユーザーが見つかりません" {
			statusCode = http.StatusNotFound
		}

		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  "ユーザーの削除に失敗しました: " + err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}
