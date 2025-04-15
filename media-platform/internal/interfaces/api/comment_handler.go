package api

import (
	"net/http"
	"strconv"

	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"

	"github.com/gin-gonic/gin"
)

// CommentHandler はコメントに関するHTTPハンドラを提供します
type CommentHandler struct {
	commentUseCase *usecase.CommentUseCase
}

// NewCommentHandler は新しいCommentHandlerのインスタンスを生成します
func NewCommentHandler(commentUseCase *usecase.CommentUseCase) *CommentHandler {
	return &CommentHandler{
		commentUseCase: commentUseCase,
	}
}

// GetCommentByID は指定したIDのコメントを取得するハンドラです
func (h *CommentHandler) GetCommentByID(c *gin.Context) {
	// コメントIDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコメントIDです",
		})
		return
	}

	comment, err := h.commentUseCase.GetCommentByID(c.Request.Context(), id)
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
			"comment": comment,
		},
	})
}

// GetCommentsByContent はコンテンツに関連するコメント一覧を取得するハンドラです
func (h *CommentHandler) GetCommentsByContent(c *gin.Context) {
	// コンテンツIDの取得
	contentIDStr := c.Param("contentId")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
		return
	}

	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)

	comments, totalCount, err := h.commentUseCase.GetCommentsByContent(c.Request.Context(), contentID, limit, offset)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "コンテンツが見つかりません" {
			statusCode = http.StatusNotFound
		}
		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"comments": comments,
			"pagination": gin.H{
				"total":  totalCount,
				"limit":  limit,
				"offset": offset,
			},
			"content_id": contentID,
		},
	})
}

// GetReplies はコメントに対する返信を取得するハンドラです
func (h *CommentHandler) GetReplies(c *gin.Context) {
	// 親コメントIDの取得
	parentIDStr := c.Param("parentId")
	parentID, err := strconv.ParseInt(parentIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効な親コメントIDです",
		})
		return
	}

	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)

	replies, err := h.commentUseCase.GetReplies(c.Request.Context(), parentID, limit, offset)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "親コメントが見つかりません" {
			statusCode = http.StatusNotFound
		}
		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"replies": replies,
			"pagination": gin.H{
				"limit":  limit,
				"offset": offset,
			},
			"parent_id": parentID,
		},
	})
}

// GetCommentsByUser はユーザーが投稿したコメント一覧を取得するハンドラです
func (h *CommentHandler) GetCommentsByUser(c *gin.Context) {
	// ユーザーIDの取得
	userIDStr := c.Param("userId")
	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
		return
	}

	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)

	comments, totalCount, err := h.commentUseCase.GetCommentsByUser(c.Request.Context(), userID, limit, offset)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "ユーザーが見つかりません" {
			statusCode = http.StatusNotFound
		}
		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"comments": comments,
			"pagination": gin.H{
				"total":  totalCount,
				"limit":  limit,
				"offset": offset,
			},
			"user_id": userID,
		},
	})
}

// CreateComment は新しいコメントを作成するハンドラです
func (h *CommentHandler) CreateComment(c *gin.Context) {
	// JWTミドルウェアで設定されたユーザー情報を取得
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "認証されていません",
		})
		return
	}

	// ユーザーIDの取得
	claims := userClaims.(map[string]interface{})
	userID := int64(claims["user_id"].(float64))

	var req model.CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	comment, err := h.commentUseCase.CreateComment(c.Request.Context(), userID, &req)
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
		if err.Error() == "コンテンツが見つかりません" || err.Error() == "親コメントが見つかりません" {
			statusCode = http.StatusNotFound
		}

		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  "コメントの作成に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"comment": comment,
		},
	})
}

// UpdateComment はコメントを更新するハンドラです
func (h *CommentHandler) UpdateComment(c *gin.Context) {
	// コメントIDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコメントIDです",
		})
		return
	}

	// JWTミドルウェアで設定されたユーザー情報を取得
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "認証されていません",
		})
		return
	}

	// ユーザー情報の取得
	claims := userClaims.(map[string]interface{})
	userID := int64(claims["user_id"].(float64))
	userRole := claims["role"].(string)

	var req model.UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	comment, err := h.commentUseCase.UpdateComment(c.Request.Context(), id, userID, userRole, &req)
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
		if err.Error() == "コメントが見つかりません" {
			statusCode = http.StatusNotFound
		} else if err.Error() == "このコメントを編集する権限がありません" {
			statusCode = http.StatusForbidden
		}

		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  "コメントの更新に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"comment": comment,
		},
	})
}

// DeleteComment はコメントを削除するハンドラです
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	// コメントIDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコメントIDです",
		})
		return
	}

	// JWTミドルウェアで設定されたユーザー情報を取得
	userClaims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "認証されていません",
		})
		return
	}

	// ユーザー情報の取得
	claims := userClaims.(map[string]interface{})
	userID := int64(claims["user_id"].(float64))
	userRole := claims["role"].(string)

	err = h.commentUseCase.DeleteComment(c.Request.Context(), id, userID, userRole)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "コメントが見つかりません" {
			statusCode = http.StatusNotFound
		} else if err.Error() == "このコメントを削除する権限がありません" {
			statusCode = http.StatusForbidden
		}

		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  "コメントの削除に失敗しました: " + err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// getPaginationParams はリクエストからページネーションパラメータを取得します
func (h *CommentHandler) getPaginationParams(c *gin.Context) (int, int) {
	// デフォルト値
	limit := 10
	offset := 0

	// リミットの解析
	limitStr := c.DefaultQuery("limit", "10")
	if val, err := strconv.Atoi(limitStr); err == nil && val > 0 {
		limit = val
	}

	// オフセットの解析
	offsetStr := c.DefaultQuery("offset", "0")
	if val, err := strconv.Atoi(offsetStr); err == nil && val >= 0 {
		offset = val
	}

	return limit, offset
}
