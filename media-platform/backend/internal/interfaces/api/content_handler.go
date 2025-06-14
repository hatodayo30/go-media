package api

import (
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"

	domainErrors "media-platform/internal/domain/errors"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

// ContentHandler はコンテンツに関するHTTPハンドラを提供します
type ContentHandler struct {
	contentUseCase *usecase.ContentUseCase
}

// NewContentHandler は新しいContentHandlerのインスタンスを生成します
func NewContentHandler(contentUseCase *usecase.ContentUseCase) *ContentHandler {
	return &ContentHandler{
		contentUseCase: contentUseCase,
	}
}

// GetContentByID は指定したIDのコンテンツを取得するハンドラです
func (h *ContentHandler) GetContentByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
		return
	}

	content, err := h.contentUseCase.GetContentByID(c.Request.Context(), id)
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
			"content": content,
		},
	})
}

// GetContents はコンテンツ一覧を取得するハンドラです
func (h *ContentHandler) GetContents(c *gin.Context) {
	// クエリパラメータの取得
	query := h.parseContentQuery(c)

	contents, totalCount, err := h.contentUseCase.GetContents(c.Request.Context(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "コンテンツの取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"contents": contents,
			"pagination": gin.H{
				"total":  totalCount,
				"limit":  query.Limit,
				"offset": query.Offset,
			},
		},
	})
}

// GetPublishedContents は公開済みのコンテンツ一覧を取得するハンドラです
func (h *ContentHandler) GetPublishedContents(c *gin.Context) {
	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)

	contents, err := h.contentUseCase.GetPublishedContents(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "コンテンツの取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"contents": contents,
			"pagination": gin.H{
				"limit":  limit,
				"offset": offset,
			},
		},
	})
}

// GetContentsByAuthor は指定した著者のコンテンツ一覧を取得するハンドラです
func (h *ContentHandler) GetContentsByAuthor(c *gin.Context) {
	// 著者IDのパラメータを取得
	authorIDStr := c.Param("authorId")
	authorID, err := strconv.ParseInt(authorIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効な著者IDです",
		})
		return
	}

	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)

	contents, err := h.contentUseCase.GetContentsByAuthor(c.Request.Context(), authorID, limit, offset)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "指定された著者が存在しません" {
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
			"contents": contents,
			"pagination": gin.H{
				"limit":  limit,
				"offset": offset,
			},
			"author_id": authorID,
		},
	})
}

// GetContentsByCategory は指定したカテゴリのコンテンツ一覧を取得するハンドラです
func (h *ContentHandler) GetContentsByCategory(c *gin.Context) {
	// カテゴリIDのパラメータを取得
	categoryIDStr := c.Param("categoryId")
	categoryID, err := strconv.ParseInt(categoryIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なカテゴリIDです",
		})
		return
	}

	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)

	contents, err := h.contentUseCase.GetContentsByCategory(c.Request.Context(), categoryID, limit, offset)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "指定されたカテゴリが存在しません" {
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
			"contents": contents,
			"pagination": gin.H{
				"limit":  limit,
				"offset": offset,
			},
			"category_id": categoryID,
		},
	})
}

// GetTrendingContents は人気のコンテンツ一覧を取得するハンドラです
func (h *ContentHandler) GetTrendingContents(c *gin.Context) {
	// リミットパラメータの取得
	limitStr := c.DefaultQuery("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	contents, err := h.contentUseCase.GetTrendingContents(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "コンテンツの取得に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"contents": contents,
			"limit":    limit,
		},
	})
}

// SearchContents はキーワードでコンテンツを検索するハンドラです（既存UseCase活用版）
func (h *ContentHandler) SearchContents(c *gin.Context) {
	log.Println("🔍 検索リクエスト受信")

	// 検索キーワードの取得
	keyword := c.Query("q")
	if keyword == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "検索キーワードが必要です",
		})
		return
	}

	// 拡張パラメータの取得
	sortBy := c.DefaultQuery("sort_by", "date")
	categoryIDStr := c.Query("category_id")
	authorIDStr := c.Query("author_id")

	// ページネーションパラメータの取得
	limit, offset := h.getPaginationParams(c)

	log.Printf("📝 検索パラメータ: keyword=%s, sort_by=%s, category_id=%s, author_id=%s, limit=%d, offset=%d",
		keyword, sortBy, categoryIDStr, authorIDStr, limit, offset)

	// 🔍 拡張検索パラメータがある場合は高度な検索を使用
	hasAdvancedParams := categoryIDStr != "" || authorIDStr != "" || sortBy != "date"

	if hasAdvancedParams {
		log.Println("🔍 高度な検索パラメータ検出、ContentQueryを使用")
		h.handleAdvancedSearch(c, keyword, sortBy, categoryIDStr, authorIDStr, limit, offset)
		return
	}

	// 🔍 基本検索：既存のSearchContentsメソッドを使用
	log.Println("🔍 基本検索を実行")
	contents, err := h.contentUseCase.SearchContents(c.Request.Context(), keyword, limit, offset)
	if err != nil {
		log.Printf("❌ 基本検索エラー: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"status": "error",
			"error":  "コンテンツの検索に失敗しました: " + err.Error(),
		})
		return
	}

	log.Printf("✅ 基本検索完了: %d件", len(contents))

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"contents": contents,
			"pagination": gin.H{
				"limit":  limit,
				"offset": offset,
			},
			"query": keyword,
		},
	})
}

// handleAdvancedSearch は拡張検索パラメータがある場合の処理です
func (h *ContentHandler) handleAdvancedSearch(c *gin.Context, keyword, sortBy, categoryIDStr, authorIDStr string, limit, offset int) {
	log.Println("🔍 高度な検索処理開始")

	// ContentQueryを構築
	publishedStatus := "published"
	query := &model.ContentQuery{
		Limit:       limit,
		Offset:      offset,
		SearchQuery: &keyword,
		Status:      &publishedStatus,
		SortBy:      &sortBy,
	}

	// カテゴリフィルター
	if categoryIDStr != "" {
		if categoryID, err := strconv.ParseInt(categoryIDStr, 10, 64); err == nil {
			query.CategoryID = &categoryID
			log.Printf("🔍 カテゴリフィルター追加: %d", categoryID)
		} else {
			log.Printf("⚠️ 無効なカテゴリID: %s", categoryIDStr)
		}
	}

	// 著者フィルター
	if authorIDStr != "" {
		if authorID, err := strconv.ParseInt(authorIDStr, 10, 64); err == nil {
			query.AuthorID = &authorID
			log.Printf("🔍 著者フィルター追加: %d", authorID)
		} else {
			log.Printf("⚠️ 無効な著者ID: %s", authorIDStr)
		}
	}

	log.Printf("🔍 ContentQuery構築完了: %+v", query)

	// 🔍 UseCaseのSearchContentsAdvancedメソッドを使用（新規追加が必要）
	// または既存のGetContentsメソッドを直接使用
	contents, totalCount, err := h.contentUseCase.GetContents(c.Request.Context(), query)
	if err != nil {
		log.Printf("❌ 高度な検索エラー: %v", err)

		// エラー時は基本検索にフォールバック
		log.Println("🔄 基本検索にフォールバック")
		fallbackContents, fallbackErr := h.contentUseCase.SearchContents(c.Request.Context(), keyword, limit, offset)
		if fallbackErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"status": "error",
				"error":  "コンテンツの検索に失敗しました: " + fallbackErr.Error(),
			})
			return
		}

		log.Printf("✅ フォールバック検索完了: %d件", len(fallbackContents))

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"contents": fallbackContents,
				"pagination": gin.H{
					"total":  len(fallbackContents), // 正確な件数は不明
					"limit":  limit,
					"offset": offset,
				},
				"query":    keyword,
				"fallback": true,
				"message":  "一部の検索機能が制限されています",
			},
		})
		return
	}

	log.Printf("✅ 高度な検索完了: %d件（全%d件中）", len(contents), totalCount)

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"contents": contents,
			"pagination": gin.H{
				"total":  totalCount,
				"limit":  limit,
				"offset": offset,
			},
			"query":       keyword,
			"category_id": categoryIDStr,
			"author_id":   authorIDStr,
			"sort_by":     sortBy,
		},
	})
}

// CreateContent は新しいコンテンツを作成するハンドラです
func (h *ContentHandler) CreateContent(c *gin.Context) {
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

	var req model.CreateContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	content, err := h.contentUseCase.CreateContent(c.Request.Context(), userID, &req)
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
			"error":  "コンテンツの作成に失敗しました: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"content": content,
		},
	})
}

// UpdateContent はコンテンツを更新するハンドラです
func (h *ContentHandler) UpdateContent(c *gin.Context) {
	// コンテンツIDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
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

	var req model.UpdateContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	content, err := h.contentUseCase.UpdateContent(c.Request.Context(), id, userID, userRole, &req)
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
		if err.Error() == "コンテンツが見つかりません" {
			statusCode = http.StatusNotFound
		} else if err.Error() == "このコンテンツを編集する権限がありません" {
			statusCode = http.StatusForbidden
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
			"content": content,
		},
	})
}

// UpdateContentStatus はコンテンツのステータスを更新するハンドラです
func (h *ContentHandler) UpdateContentStatus(c *gin.Context) {
	// コンテンツIDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
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

	var req model.UpdateContentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
		return
	}

	content, err := h.contentUseCase.UpdateContentStatus(c.Request.Context(), id, userID, userRole, &req)
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
		if err.Error() == "コンテンツが見つかりません" {
			statusCode = http.StatusNotFound
		} else if err.Error() == "このコンテンツを編集する権限がありません" {
			statusCode = http.StatusForbidden
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
			"content": content,
		},
	})
}

// DeleteContent はコンテンツを削除するハンドラです
func (h *ContentHandler) DeleteContent(c *gin.Context) {
	// コンテンツIDの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status": "error",
			"error":  "無効なコンテンツIDです",
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

	err = h.contentUseCase.DeleteContent(c.Request.Context(), id, userID, userRole)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "コンテンツが見つかりません" {
			statusCode = http.StatusNotFound
		} else if err.Error() == "このコンテンツを削除する権限がありません" {
			statusCode = http.StatusForbidden
		}

		c.JSON(statusCode, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}

// parseContentQuery はリクエストからContentQueryを作成します
func (h *ContentHandler) parseContentQuery(c *gin.Context) *model.ContentQuery {
	query := &model.ContentQuery{}

	// ページネーションパラメータの取得
	limitStr := c.DefaultQuery("limit", "10")
	if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
		query.Limit = limit
	} else {
		query.Limit = 10
	}

	offsetStr := c.DefaultQuery("offset", "0")
	if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
		query.Offset = offset
	} else {
		query.Offset = 0
	}

	// 著者IDフィルタの取得
	if authorIDStr := c.Query("author_id"); authorIDStr != "" {
		if authorID, err := strconv.ParseInt(authorIDStr, 10, 64); err == nil {
			authorIDInt := int64(authorID)
			query.AuthorID = &authorIDInt
		}
	}

	// カテゴリIDフィルタの取得
	if categoryIDStr := c.Query("category_id"); categoryIDStr != "" {
		if categoryID, err := strconv.ParseInt(categoryIDStr, 10, 64); err == nil {
			categoryIDInt := int64(categoryID)
			query.CategoryID = &categoryIDInt
		}
	}

	// ステータスフィルタの取得
	if status := c.Query("status"); status != "" {
		query.Status = &status
	}

	// 検索クエリの取得
	if searchQuery := c.Query("q"); searchQuery != "" {
		query.SearchQuery = &searchQuery
	}

	// ソート条件の取得
	if sortBy := c.Query("sort_by"); sortBy != "" {
		query.SortBy = &sortBy
	}

	// ソート順の取得
	if sortOrder := c.Query("sort_order"); sortOrder != "" {
		query.SortOrder = &sortOrder
	}

	return query
}

// getPaginationParams はリクエストからページネーションパラメータを取得します
func (h *ContentHandler) getPaginationParams(c *gin.Context) (int, int) {
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

// isPostgreSQLTextSearchError はPostgreSQLの全文検索エラーかどうかを判定します
func isPostgreSQLTextSearchError(err error) bool {
	if err == nil {
		return false
	}

	errMsg := err.Error()
	// PostgreSQLの日本語全文検索関連エラーを検出
	textSearchErrors := []string{
		"text search configuration \"japanese\" does not exist",
		"to_tsvector",
		"to_tsquery",
		"ts_rank",
	}

	for _, searchErr := range textSearchErrors {
		if strings.Contains(errMsg, searchErr) {
			log.Printf("🔍 PostgreSQL全文検索エラー検出: %s", searchErr)
			return true
		}
	}

	return false
}

// ヘルパーメソッド：ユーザー認証情報をコンテキストから取得
func (h *ContentHandler) getUserClaimsFromContext(c *gin.Context) (jwt.MapClaims, error) {
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
func (h *ContentHandler) getUserIDFromClaims(claims jwt.MapClaims) (int64, error) {
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
func (h *ContentHandler) getUserRoleFromClaims(claims jwt.MapClaims) (string, error) {
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
