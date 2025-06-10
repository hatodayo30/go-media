// interfaces/api/bookmark_handler.go
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

// BookmarkHandler はブックマークに関するHTTPハンドラを提供します
type BookmarkHandler struct {
	bookmarkUseCase *usecase.BookmarkUseCase
}

// NewBookmarkHandler は新しいBookmarkHandlerのインスタンスを生成します
func NewBookmarkHandler(bookmarkUseCase *usecase.BookmarkUseCase) *BookmarkHandler {
	return &BookmarkHandler{
		bookmarkUseCase: bookmarkUseCase,
	}
}

// GetBookmarksByContentID は指定したコンテンツIDのブックマーク一覧を取得するハンドラです
func (h *BookmarkHandler) GetBookmarksByContentID(c *gin.Context) {
	contentIDStr := c.Param("id")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
		return
	}

	bookmarks, err := h.bookmarkUseCase.GetBookmarksByContentID(c.Request.Context(), contentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "ブックマークの取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"bookmarks": bookmarks,
			"total":     len(bookmarks),
		},
	})
}

// GetBookmarksByUserID は指定したユーザーIDのブックマーク一覧を取得するハンドラです
func (h *BookmarkHandler) GetBookmarksByUserID(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
		return
	}

	bookmarks, err := h.bookmarkUseCase.GetBookmarksByUserID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "ブックマークの取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"bookmarks": bookmarks,
			"total":     len(bookmarks),
		},
	})
}

// CreateBookmark は新しいブックマークを作成するハンドラです
func (h *BookmarkHandler) CreateBookmark(c *gin.Context) {
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

	var req model.CreateBookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	// ブックマークエンティティを作成
	bookmark := &model.Bookmark{
		UserID:    userID,
		ContentID: req.ContentID,
	}

	err = h.bookmarkUseCase.CreateBookmark(c.Request.Context(), bookmark)
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
			"error":  "ブックマークの作成に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"bookmark": bookmark,
		},
	})
}

// DeleteBookmark はブックマークを削除するハンドラです
func (h *BookmarkHandler) DeleteBookmark(c *gin.Context) {
	// ブックマークIDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なブックマークIDです",
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
	err = h.bookmarkUseCase.DeleteBookmark(c.Request.Context(), id, userID, isAdmin)
	if err != nil {
		// ValidationError か判断
		if _, ok := err.(*domainErrors.ValidationError); ok {
			statusCode := http.StatusBadRequest
			if err.Error() == "このブックマークを削除する権限がありません" {
				statusCode = http.StatusForbidden
			} else if err.Error() == "指定されたブックマークが見つかりません" {
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
			"error":  "ブックマークの削除に失敗しました: " + err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// ToggleBookmark はブックマークの追加/削除を切り替えるハンドラです
func (h *BookmarkHandler) ToggleBookmark(c *gin.Context) {
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

	var req model.CreateBookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	bookmark, isCreated, err := h.bookmarkUseCase.ToggleBookmark(c.Request.Context(), userID, req.ContentID)
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
			"error":  "ブックマークの処理に失敗しました: " + err.Error(),
		})
		return
	}

	var message string
	if isCreated {
		message = "ブックマークを追加しました"
	} else {
		message = "ブックマークを削除しました"
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": message,
		"data": gin.H{
			"bookmark":   bookmark,
			"is_created": isCreated,
		},
	})
}

// ヘルパーメソッド：ユーザー認証情報をコンテキストから取得
func (h *BookmarkHandler) getUserClaimsFromContext(c *gin.Context) (jwt.MapClaims, error) {
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
func (h *BookmarkHandler) getUserIDFromClaims(claims jwt.MapClaims) (int64, error) {
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
func (h *BookmarkHandler) getUserRoleFromClaims(claims jwt.MapClaims) (string, error) {
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
