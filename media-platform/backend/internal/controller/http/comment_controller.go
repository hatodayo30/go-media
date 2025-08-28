package http

import (
	"net/http"
	"strconv"

	"media-platform/internal/application/service"
	"media-platform/internal/presentation/dto"

	domainErrors "media-platform/internal/domain/errors"

	"github.com/labstack/echo/v4"
)

// CommentController はコメントに関するHTTPアダプターです
type CommentController struct {
	commentService *service.CommentService
}

// NewCommentController は新しいCommentControllerのインスタンスを生成します
func NewCommentController(commentService *service.CommentService) *CommentController {
	return &CommentController{
		commentService: commentService,
	}
}

// GetComment は指定したIDのコメントを取得します
// GET /api/comments/:id
func (ctrl *CommentController) GetComment(c echo.Context) error {
	id, err := ctrl.extractIDFromPath(c, "id")
	if err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "無効なコメントIDです", err)
	}

	comment, err := ctrl.commentService.GetCommentByID(c.Request().Context(), id)
	if err != nil {
		return ctrl.handleServiceError(c, err)
	}

	return ctrl.successResponse(c, http.StatusOK, map[string]interface{}{
		"comment": comment,
	})
}

// GetCommentsByContent はコンテンツに関連するコメント一覧を取得します
// GET /api/contents/:id/comments
func (ctrl *CommentController) GetCommentsByContent(c echo.Context) error {
	contentID, err := ctrl.extractIDFromPath(c, "id")
	if err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "無効なコンテンツIDです", err)
	}

	limit, offset := ctrl.extractPaginationParams(c)

	commentListResponse, err := ctrl.commentService.GetCommentsByContent(c.Request().Context(), contentID, limit, offset)
	if err != nil {
		return ctrl.handleServiceError(c, err)
	}

	return ctrl.successResponse(c, http.StatusOK, map[string]interface{}{
		"comments": commentListResponse.Comments,
		"pagination": map[string]interface{}{
			"total":    commentListResponse.TotalCount,
			"limit":    limit,
			"offset":   offset,
			"has_more": commentListResponse.HasMore,
		},
		"content_id": contentID,
	})
}

// GetReplies はコメントに対する返信を取得します
// GET /api/comments/parent/:parentId/replies
func (ctrl *CommentController) GetReplies(c echo.Context) error {
	parentID, err := ctrl.extractIDFromPath(c, "parentId")
	if err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "無効な親コメントIDです", err)
	}

	limit, offset := ctrl.extractPaginationParams(c)

	replies, err := ctrl.commentService.GetReplies(c.Request().Context(), parentID, limit, offset)
	if err != nil {
		return ctrl.handleServiceError(c, err)
	}

	return ctrl.successResponse(c, http.StatusOK, map[string]interface{}{
		"replies": replies,
		"pagination": map[string]interface{}{
			"limit":  limit,
			"offset": offset,
		},
		"parent_id": parentID,
	})
}

// CreateComment は新しいコメントを作成します
// POST /api/comments
func (ctrl *CommentController) CreateComment(c echo.Context) error {
	// 認証情報の取得
	userID, err := ctrl.extractCurrentUserID(c)
	if err != nil {
		return ctrl.errorResponse(c, http.StatusUnauthorized, "認証が必要です", err)
	}

	// リクエストデータの変換（フロントエンドの"content"フィールドを"body"に変換）
	var requestData map[string]interface{}
	if err := c.Bind(&requestData); err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "無効なリクエストです", err)
	}

	// DTOの作成
	req, err := ctrl.convertToCreateCommentRequest(requestData)
	if err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "リクエストデータが無効です", err)
	}

	comment, err := ctrl.commentService.CreateComment(c.Request().Context(), userID, req)
	if err != nil {
		return ctrl.handleServiceError(c, err)
	}

	return ctrl.successResponse(c, http.StatusCreated, map[string]interface{}{
		"comment": comment,
	})
}

// UpdateComment はコメントを更新します
// PUT /api/comments/:id
func (ctrl *CommentController) UpdateComment(c echo.Context) error {
	id, err := ctrl.extractIDFromPath(c, "id")
	if err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "無効なコメントIDです", err)
	}

	userID, userRole, err := ctrl.extractCurrentUserInfo(c)
	if err != nil {
		return ctrl.errorResponse(c, http.StatusUnauthorized, "認証が必要です", err)
	}

	var req dto.UpdateCommentRequest
	if err := ctrl.bindAndValidateRequest(c, &req); err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "無効なリクエストです", err)
	}

	comment, err := ctrl.commentService.UpdateComment(c.Request().Context(), id, userID, userRole, &req)
	if err != nil {
		return ctrl.handleServiceError(c, err)
	}

	return ctrl.successResponse(c, http.StatusOK, map[string]interface{}{
		"comment": comment,
	})
}

// DeleteComment はコメントを削除します
// DELETE /api/comments/:id
func (ctrl *CommentController) DeleteComment(c echo.Context) error {
	id, err := ctrl.extractIDFromPath(c, "id")
	if err != nil {
		return ctrl.errorResponse(c, http.StatusBadRequest, "無効なコメントIDです", err)
	}

	userID, userRole, err := ctrl.extractCurrentUserInfo(c)
	if err != nil {
		return ctrl.errorResponse(c, http.StatusUnauthorized, "認証が必要です", err)
	}

	err = ctrl.commentService.DeleteComment(c.Request().Context(), id, userID, userRole)
	if err != nil {
		return ctrl.handleServiceError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// --- ヘルパーメソッド ---

// convertToCreateCommentRequest はマップデータをCreateCommentRequestに変換します
func (ctrl *CommentController) convertToCreateCommentRequest(data map[string]interface{}) (*dto.CreateCommentRequest, error) {
	req := &dto.CreateCommentRequest{}

	// "content"フィールドを"body"に変換
	if content, ok := data["content"].(string); ok {
		req.Body = content
	} else if body, ok := data["body"].(string); ok {
		req.Body = body
	} else {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "コメント内容が必要です")
	}

	// content_idの変換
	if contentIDFloat, ok := data["content_id"].(float64); ok {
		req.ContentID = int64(contentIDFloat)
	} else {
		return nil, echo.NewHTTPError(http.StatusBadRequest, "コンテンツIDが必要です")
	}

	// parent_idの変換（オプション）
	if parentIDFloat, ok := data["parent_id"].(float64); ok {
		parentID := int64(parentIDFloat)
		req.ParentID = &parentID
	}

	return req, nil
}

// bindAndValidateRequest はリクエストボディをバインドし、基本的な検証を行います
func (ctrl *CommentController) bindAndValidateRequest(c echo.Context, req interface{}) error {
	if err := c.Bind(req); err != nil {
		return err
	}
	return nil
}

// extractIDFromPath はパスからIDを抽出します
func (ctrl *CommentController) extractIDFromPath(c echo.Context, paramName string) (int64, error) {
	idStr := c.Param(paramName)
	return strconv.ParseInt(idStr, 10, 64)
}

// extractCurrentUserID は現在のユーザーIDを抽出します
func (ctrl *CommentController) extractCurrentUserID(c echo.Context) (int64, error) {
	userIDInterface := c.Get("user_id")
	if userIDInterface == nil {
		return 0, echo.NewHTTPError(http.StatusUnauthorized, "認証情報がありません")
	}

	userID, ok := userIDInterface.(float64) // JWTのclaimsは通常float64
	if !ok {
		return 0, echo.NewHTTPError(http.StatusInternalServerError, "ユーザー情報の型変換に失敗")
	}

	return int64(userID), nil
}

// extractCurrentUserInfo は現在のユーザーのIDとロールを抽出します
func (ctrl *CommentController) extractCurrentUserInfo(c echo.Context) (int64, string, error) {
	userID, err := ctrl.extractCurrentUserID(c)
	if err != nil {
		return 0, "", err
	}

	roleInterface := c.Get("role")
	role, ok := roleInterface.(string)
	if !ok {
		role = "user" // デフォルト値
	}

	return userID, role, nil
}

// extractPaginationParams はページネーションパラメータを抽出します
func (ctrl *CommentController) extractPaginationParams(c echo.Context) (limit, offset int) {
	limit = 10 // デフォルト値
	offset = 0 // デフォルト値

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

// successResponse は成功レスポンスを構築します
func (ctrl *CommentController) successResponse(c echo.Context, statusCode int, data interface{}) error {
	response := map[string]interface{}{
		"status": "success",
		"data":   data,
	}
	return c.JSON(statusCode, response)
}

// errorResponse はエラーレスポンスを構築します
func (ctrl *CommentController) errorResponse(c echo.Context, statusCode int, message string, err error) error {
	response := map[string]interface{}{
		"status": "error",
		"error":  message,
	}

	// 開発環境では詳細なエラー情報を含める
	if c.Get("app_env") == "development" && err != nil {
		response["detail"] = err.Error()
	}

	return c.JSON(statusCode, response)
}

// handleServiceError はApplication Serviceからのエラーを適切なHTTPエラーに変換します
func (ctrl *CommentController) handleServiceError(c echo.Context, err error) error {
	switch {
	case isValidationError(err):
		return ctrl.errorResponse(c, http.StatusBadRequest, err.Error(), err)
	case isNotFoundError(err):
		return ctrl.errorResponse(c, http.StatusNotFound, err.Error(), err)
	case isForbiddenError(err):
		return ctrl.errorResponse(c, http.StatusForbidden, err.Error(), err)
	default:
		return ctrl.errorResponse(c, http.StatusInternalServerError, "内部サーバーエラーが発生しました", err)
	}
}

// エラータイプ判定のヘルパー関数
func isValidationError(err error) bool {
	_, ok := err.(*domainErrors.ValidationError)
	return ok
}

func isNotFoundError(err error) bool {
	return err.Error() == "コメントが見つかりません" ||
		err.Error() == "コンテンツが見つかりません" ||
		err.Error() == "親コメントが見つかりません"
}

func isForbiddenError(err error) bool {
	return err.Error() == "このコメントを編集する権限がありません" ||
		err.Error() == "このコメントを削除する権限がありません"
}
