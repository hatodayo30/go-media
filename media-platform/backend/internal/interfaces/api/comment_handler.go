package api

import (
	"fmt"
	"log"
	"net/http"
	"reflect"
	"strconv"

	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
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
	log.Println("=== GetCommentsByContent ハンドラ開始 ===")

	// コンテンツIDの取得（修正済み: "id"パラメータを使用）
	contentIDStr := c.Param("id")
	contentID, err := strconv.ParseInt(contentIDStr, 10, 64)
	if err != nil {
		log.Printf("❌ 無効なコンテンツID: %s", contentIDStr)
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
		return
	}

	log.Printf("✅ コンテンツID: %d", contentID)

	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)
	log.Printf("📄 ページネーション: limit=%d, offset=%d", limit, offset)

	comments, totalCount, err := h.commentUseCase.GetCommentsByContent(c.Request.Context(), contentID, limit, offset)
	if err != nil {
		log.Printf("❌ コメント取得エラー: %v", err)
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

	log.Printf("✅ コメント取得成功: %d件 (全体: %d件)", len(comments), totalCount)

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

func (h *CommentHandler) CreateComment(c *gin.Context) {
	log.Println("=== CreateComment ハンドラ開始 ===")

	// JWTミドルウェアで設定されたユーザー情報を取得
	userClaims, exists := c.Get("user")
	if !exists {
		log.Println("❌ 認証情報が見つかりません")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "認証されていません",
		})
		return
	}

	log.Printf("🔑 JWT Claims: %+v (Type: %T)", userClaims, userClaims)

	// リフレクションを使用した安全な型変換
	var userID int64

	// まず interface{} として受け取り、Mapとして扱えるかチェック
	claimsValue := reflect.ValueOf(userClaims)
	if claimsValue.Kind() != reflect.Map {
		log.Printf("❌ Claims is not a map, kind: %v", claimsValue.Kind())
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "JWTクレームが不正な形式です",
		})
		return
	}

	// user_id キーの値を取得
	userIDValue := claimsValue.MapIndex(reflect.ValueOf("user_id"))
	if !userIDValue.IsValid() {
		log.Printf("❌ user_id key not found in claims")
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  "user_idが見つかりません",
		})
		return
	}

	// user_id の値を取得
	userIDInterface := userIDValue.Interface()
	log.Printf("🔍 user_id value: %+v (Type: %T)", userIDInterface, userIDInterface)

	// float64 または string として処理
	switch v := userIDInterface.(type) {
	case float64:
		userID = int64(v)
		log.Printf("✅ User ID (from float64): %d", userID)
	case string:
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil {
			userID = parsed
			log.Printf("✅ User ID (from string): %d", userID)
		} else {
			log.Printf("❌ user_id string parse error: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{
				"status": "error",
				"error":  "user_idの形式が不正です",
			})
			return
		}
	case int:
		userID = int64(v)
		log.Printf("✅ User ID (from int): %d", userID)
	case int64:
		userID = v
		log.Printf("✅ User ID (from int64): %d", userID)
	default:
		log.Printf("❌ user_id unexpected type: %T, value: %+v", v, v)
		c.JSON(http.StatusUnauthorized, gin.H{
			"status": "error",
			"error":  fmt.Sprintf("user_idの型が不正です: %T", v),
		})
		return
	}

	// リクエストデータの取得と変換
	var reqData map[string]interface{}
	if err := c.ShouldBindJSON(&reqData); err != nil {
		log.Printf("❌ JSON bind error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	log.Printf("📋 Request Data: %+v", reqData)

	// CreateCommentRequestの作成（フロントエンドのcontent → Body への変換）
	req := &model.CreateCommentRequest{}

	// content → Body の変換
	if content, ok := reqData["content"].(string); ok {
		req.Body = content
		log.Printf("✅ Content/Body: %s", content)
	} else {
		log.Printf("❌ content field missing or wrong type. Data: %+v", reqData)
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "コメント内容が必要です",
		})
		return
	}

	// content_id の変換
	if contentIDFloat, ok := reqData["content_id"].(float64); ok {
		req.ContentID = int64(contentIDFloat)
		log.Printf("✅ Content ID: %d", req.ContentID)
	} else {
		log.Printf("❌ content_id field missing or wrong type. Data: %+v", reqData)
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "コンテンツIDが必要です",
		})
		return
	}

	// parent_id の変換（オプション）
	if parentIDFloat, ok := reqData["parent_id"].(float64); ok {
		parentID := int64(parentIDFloat)
		req.ParentID = &parentID
		log.Printf("✅ Parent ID: %d", parentID)
	} else {
		log.Println("ℹ️ parent_id not provided (optional)")
	}

	log.Printf("📤 Final CreateCommentRequest: %+v", req)
	log.Printf("🆔 User ID for creation: %d", userID)

	// ユースケース呼び出し
	comment, err := h.commentUseCase.CreateComment(c.Request.Context(), userID, req)
	if err != nil {
		log.Printf("❌ UseCase error: %v (Type: %T)", err, err)

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

	log.Printf("✅ Comment created successfully: %+v", comment)

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

	// JWT型変換の修正
	var userID int64
	var userRole string

	if claims, ok := userClaims.(jwt.MapClaims); ok {
		if userIDFloat, ok := claims["user_id"].(float64); ok {
			userID = int64(userIDFloat)
		}
		if role, ok := claims["role"].(string); ok {
			userRole = role
		}
	} else if claims, ok := userClaims.(map[string]interface{}); ok {
		if userIDFloat, ok := claims["user_id"].(float64); ok {
			userID = int64(userIDFloat)
		}
		if role, ok := claims["role"].(string); ok {
			userRole = role
		}
	}

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

	// JWT型変換の修正
	var userID int64
	var userRole string

	if claims, ok := userClaims.(jwt.MapClaims); ok {
		if userIDFloat, ok := claims["user_id"].(float64); ok {
			userID = int64(userIDFloat)
		}
		if role, ok := claims["role"].(string); ok {
			userRole = role
		}
	} else if claims, ok := userClaims.(map[string]interface{}); ok {
		if userIDFloat, ok := claims["user_id"].(float64); ok {
			userID = int64(userIDFloat)
		}
		if role, ok := claims["role"].(string); ok {
			userRole = role
		}
	}

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
