package controller

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"media-platform/internal/adapter/presenter"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/usecase/dto"
	"media-platform/internal/usecase/service"

	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
)

// ContentController はコンテンツに関するHTTPハンドラを提供します
type ContentController struct {
	contentService   *service.ContentService
	contentPresenter *presenter.ContentPresenter
}

// NewContentController は新しいContentControllerのインスタンスを生成します
func NewContentController(
	contentService *service.ContentService,
	contentPresenter *presenter.ContentPresenter,
) *ContentController {
	return &ContentController{
		contentService:   contentService,
		contentPresenter: contentPresenter,
	}
}

// GetContent は指定したIDのコンテンツを取得するハンドラです
func (ctrl *ContentController) GetContent(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	// UseCaseからコンテンツを取得
	contentDTO, err := ctrl.contentService.GetContentByID(c.Request().Context(), id)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContent := ctrl.contentPresenter.ToHTTPContentResponse(contentDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"content": httpContent,
		},
	})
}

// GetContents はコンテンツ一覧を取得するハンドラです
func (ctrl *ContentController) GetContents(c echo.Context) error {
	// クエリパラメータの取得
	query := ctrl.parseContentQuery(c)

	// UseCaseからコンテンツ一覧を取得
	contentDTOs, totalCount, err := ctrl.contentService.GetContents(c.Request().Context(), query)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(contentDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"contents": httpContents,
			"pagination": map[string]interface{}{
				"total":  totalCount,
				"limit":  query.Limit,
				"offset": query.Offset,
			},
		},
	})
}

// GetPublishedContents は公開済みのコンテンツ一覧を取得するハンドラです
func (ctrl *ContentController) GetPublishedContents(c echo.Context) error {
	// ページネーションパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// UseCaseから公開済みコンテンツを取得
	contentDTOs, err := ctrl.contentService.GetPublishedContents(c.Request().Context(), limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(contentDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"contents": httpContents,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
		},
	})
}

// GetContentsByAuthor は指定した著者のコンテンツ一覧を取得するハンドラです
func (ctrl *ContentController) GetContentsByAuthor(c echo.Context) error {
	// 著者IDのパラメータを取得
	authorIDStr := c.Param("authorId")
	authorID, err := strconv.ParseInt(authorIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効な著者IDです",
		})
	}

	// ページネーションパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// UseCaseから著者のコンテンツを取得
	contentDTOs, err := ctrl.contentService.GetContentsByAuthor(c.Request().Context(), authorID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(contentDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"contents": httpContents,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"author_id": authorID,
		},
	})
}

// GetContentsByCategory は指定したカテゴリのコンテンツ一覧を取得するハンドラです
func (ctrl *ContentController) GetContentsByCategory(c echo.Context) error {
	// カテゴリIDのパラメータを取得
	categoryIDStr := c.Param("categoryId")
	categoryID, err := strconv.ParseInt(categoryIDStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なカテゴリIDです",
		})
	}

	// ページネーションパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// UseCaseからカテゴリのコンテンツを取得
	contentDTOs, err := ctrl.contentService.GetContentsByCategory(c.Request().Context(), categoryID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(contentDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"contents": httpContents,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"category_id": categoryID,
		},
	})
}

// GetTrendingContents は人気のコンテンツ一覧を取得するハンドラです
func (ctrl *ContentController) GetTrendingContents(c echo.Context) error {
	// リミットパラメータの取得
	limitStr := c.QueryParam("limit")
	if limitStr == "" {
		limitStr = "10"
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 10
	}

	// UseCaseから人気コンテンツを取得
	contentDTOs, err := ctrl.contentService.GetTrendingContents(c.Request().Context(), limit)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(contentDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"contents": httpContents,
			"limit":    limit,
		},
	})
}

// SearchContents はキーワードでコンテンツを検索するハンドラです
func (ctrl *ContentController) SearchContents(c echo.Context) error {
	log.Println("🔍 検索リクエスト受信")

	// 検索キーワードの取得
	keyword := c.QueryParam("q")
	if keyword == "" {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "検索キーワードが必要です",
		})
	}

	// 拡張パラメータの取得
	sortBy := c.QueryParam("sort_by")
	if sortBy == "" {
		sortBy = "date"
	}
	categoryIDStr := c.QueryParam("category_id")
	authorIDStr := c.QueryParam("author_id")

	// ページネーションパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	log.Printf("📝 検索パラメータ: keyword=%s, sort_by=%s, category_id=%s, author_id=%s, limit=%d, offset=%d",
		keyword, sortBy, categoryIDStr, authorIDStr, limit, offset)

	// 拡張検索パラメータがある場合は高度な検索を使用
	hasAdvancedParams := categoryIDStr != "" || authorIDStr != "" || sortBy != "date"

	if hasAdvancedParams {
		log.Println("🔍 高度な検索パラメータ検出、ContentQueryを使用")
		return ctrl.handleAdvancedSearch(c, keyword, sortBy, categoryIDStr, authorIDStr, limit, offset)
	}

	// 基本検索：既存のSearchContentsメソッドを使用
	log.Println("🔍 基本検索を実行")
	contentDTOs, err := ctrl.contentService.SearchContents(c.Request().Context(), keyword, limit, offset)
	if err != nil {
		log.Printf("❌ 基本検索エラー: %v", err)
		return ctrl.handleError(c, err)
	}

	log.Printf("✅ 基本検索完了: %d件", len(contentDTOs))

	// PresenterでHTTPレスポンス用に変換
	httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(contentDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"contents": httpContents,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"query": keyword,
		},
	})
}

// handleAdvancedSearch は拡張検索パラメータがある場合の処理です
func (ctrl *ContentController) handleAdvancedSearch(c echo.Context, keyword, sortBy, categoryIDStr, authorIDStr string, limit, offset int) error {
	log.Println("🔍 高度な検索処理開始")

	// ContentQueryを構築
	publishedStatus := "published"
	query := &dto.ContentQuery{
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
		}
	}

	// 著者フィルター
	if authorIDStr != "" {
		if authorID, err := strconv.ParseInt(authorIDStr, 10, 64); err == nil {
			query.AuthorID = &authorID
			log.Printf("🔍 著者フィルター追加: %d", authorID)
		}
	}

	log.Printf("🔍 ContentQuery構築完了: %+v", query)

	// ServiceのGetContentsメソッドを使用
	contentDTOs, totalCount, err := ctrl.contentService.GetContents(c.Request().Context(), query)
	if err != nil {
		log.Printf("❌ 高度な検索エラー: %v", err)

		// エラー時は基本検索にフォールバック
		log.Println("🔄 基本検索にフォールバック")
		fallbackDTOs, fallbackErr := ctrl.contentService.SearchContents(c.Request().Context(), keyword, limit, offset)
		if fallbackErr != nil {
			return ctrl.handleError(c, fallbackErr)
		}

		log.Printf("✅ フォールバック検索完了: %d件", len(fallbackDTOs))

		// PresenterでHTTPレスポンス用に変換
		httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(fallbackDTOs)

		return c.JSON(http.StatusOK, map[string]interface{}{
			"status": "success",
			"data": map[string]interface{}{
				"contents": httpContents,
				"pagination": map[string]interface{}{
					"total":  len(fallbackDTOs),
					"limit":  limit,
					"offset": offset,
				},
				"query":    keyword,
				"fallback": true,
				"message":  "一部の検索機能が制限されています",
			},
		})
	}

	log.Printf("✅ 高度な検索完了: %d件（全%d件中）", len(contentDTOs), totalCount)

	// PresenterでHTTPレスポンス用に変換
	httpContents := ctrl.contentPresenter.ToHTTPContentResponseList(contentDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"contents": httpContents,
			"pagination": map[string]interface{}{
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
func (ctrl *ContentController) CreateContent(c echo.Context) error {
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

	var req dto.CreateContentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	// UseCaseでコンテンツを作成
	contentDTO, err := ctrl.contentService.CreateContent(c.Request().Context(), userID, &req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContent := ctrl.contentPresenter.ToHTTPContentResponse(contentDTO)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"content": httpContent,
		},
	})
}

// UpdateContent はコンテンツを更新するハンドラです
func (ctrl *ContentController) UpdateContent(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

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

	var req dto.UpdateContentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	// UseCaseでコンテンツを更新
	contentDTO, err := ctrl.contentService.UpdateContent(c.Request().Context(), id, userID, userRole, &req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContent := ctrl.contentPresenter.ToHTTPContentResponse(contentDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"content": httpContent,
		},
	})
}

// UpdateContentStatus はコンテンツのステータスを更新するハンドラです
func (ctrl *ContentController) UpdateContentStatus(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

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

	var req dto.UpdateContentStatusRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	// UseCaseでステータスを更新
	contentDTO, err := ctrl.contentService.UpdateContentStatus(c.Request().Context(), id, userID, userRole, &req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpContent := ctrl.contentPresenter.ToHTTPContentResponse(contentDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"content": httpContent,
		},
	})
}

// DeleteContent はコンテンツを削除するハンドラです
func (ctrl *ContentController) DeleteContent(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

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

	// UseCaseでコンテンツを削除
	err = ctrl.contentService.DeleteContent(c.Request().Context(), id, userID, userRole)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// ========== ヘルパーメソッド ==========

// parseContentQuery はリクエストからContentQueryを作成します
func (ctrl *ContentController) parseContentQuery(c echo.Context) *dto.ContentQuery {
	query := &dto.ContentQuery{}

	// ページネーション
	limitStr := c.QueryParam("limit")
	if limitStr == "" {
		limitStr = "10"
	}
	if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
		query.Limit = limit
	} else {
		query.Limit = 10
	}

	offsetStr := c.QueryParam("offset")
	if offsetStr == "" {
		offsetStr = "0"
	}
	if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
		query.Offset = offset
	} else {
		query.Offset = 0
	}

	// フィルター
	if authorIDStr := c.QueryParam("author_id"); authorIDStr != "" {
		if authorID, err := strconv.ParseInt(authorIDStr, 10, 64); err == nil {
			query.AuthorID = &authorID
		}
	}

	if categoryIDStr := c.QueryParam("category_id"); categoryIDStr != "" {
		if categoryID, err := strconv.ParseInt(categoryIDStr, 10, 64); err == nil {
			query.CategoryID = &categoryID
		}
	}

	if status := c.QueryParam("status"); status != "" {
		query.Status = &status
	}

	if searchQuery := c.QueryParam("q"); searchQuery != "" {
		query.SearchQuery = &searchQuery
	}

	if sortBy := c.QueryParam("sort_by"); sortBy != "" {
		query.SortBy = &sortBy
	}

	if sortOrder := c.QueryParam("sort_order"); sortOrder != "" {
		query.SortOrder = &sortOrder
	}

	return query
}

// getPaginationParams はリクエストからページネーションパラメータを取得します
func (ctrl *ContentController) getPaginationParams(c echo.Context) (int, int) {
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
func (ctrl *ContentController) getUserClaimsFromContext(c echo.Context) (jwt.MapClaims, error) {
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
func (ctrl *ContentController) getUserIDFromClaims(claims jwt.MapClaims) (int64, error) {
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
func (ctrl *ContentController) getUserRoleFromClaims(claims jwt.MapClaims) (string, error) {
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
func (ctrl *ContentController) handleError(c echo.Context, err error) error {
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

	return c.JSON(http.StatusInternalServerError, map[string]interface{}{
		"status": "error",
		"error":  "内部サーバーエラーが発生しました",
	})
}
