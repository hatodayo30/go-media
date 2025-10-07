package controller

import (
	"net/http"
	"strconv"

	"media-platform/internal/adapter/presenter"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/usecase/dto"
	"media-platform/internal/usecase/service"

	"github.com/labstack/echo/v4"
)

// CommentController はコメントに関するHTTPハンドラを提供します
type CommentController struct {
	commentService   *service.CommentService
	commentPresenter *presenter.CommentPresenter
}

// NewCommentController は新しいCommentControllerのインスタンスを生成します
func NewCommentController(
	commentService *service.CommentService,
	commentPresenter *presenter.CommentPresenter,
) *CommentController {
	return &CommentController{
		commentService:   commentService,
		commentPresenter: commentPresenter,
	}
}

// GetComment は指定したIDのコメントを取得します
// GET /api/comments/:id
func (ctrl *CommentController) GetComment(c echo.Context) error {
	id, err := ctrl.extractIDFromPath(c, "id")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコメントIDです",
		})
	}

	// UseCaseからコメントを取得
	commentDTO, err := ctrl.commentService.GetCommentByID(c.Request().Context(), id)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpComment := ctrl.commentPresenter.ToHTTPCommentResponse(commentDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"comment": httpComment,
		},
	})
}

// GetCommentsByContent はコンテンツに関連するコメント一覧を取得します
// GET /api/contents/:contentId/comments
func (ctrl *CommentController) GetCommentsByContent(c echo.Context) error {
	contentID, err := ctrl.extractIDFromPath(c, "contentId")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコンテンツIDです",
		})
	}

	limit, offset := ctrl.extractPaginationParams(c)

	// UseCaseからコメント一覧を取得
	commentListDTO, err := ctrl.commentService.GetCommentsByContent(c.Request().Context(), contentID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpComments := ctrl.commentPresenter.ToHTTPCommentResponseList(commentListDTO.Comments)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"comments": httpComments,
			"pagination": map[string]interface{}{
				"total":    commentListDTO.TotalCount,
				"limit":    limit,
				"offset":   offset,
				"has_more": commentListDTO.HasMore,
			},
			"content_id": contentID,
		},
	})
}

// GetReplies はコメントに対する返信を取得します
// GET /api/comments/parent/:parentId/replies
func (ctrl *CommentController) GetReplies(c echo.Context) error {
	parentID, err := ctrl.extractIDFromPath(c, "parentId")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効な親コメントIDです",
		})
	}

	limit, offset := ctrl.extractPaginationParams(c)

	// UseCaseから返信を取得
	replyDTOs, err := ctrl.commentService.GetReplies(c.Request().Context(), parentID, limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpReplies := ctrl.commentPresenter.ToHTTPCommentResponseList(replyDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"replies": httpReplies,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
			"parent_id": parentID,
		},
	})
}

// CreateComment は新しいコメントを作成します
// POST /api/comments
func (ctrl *CommentController) CreateComment(c echo.Context) error {
	// 認証情報の取得
	userID, err := ctrl.extractCurrentUserID(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  "認証が必要です",
		})
	}

	// リクエストデータの変換（フロントエンドの"content"フィールドを"body"に変換）
	var requestData map[string]interface{}
	if err := c.Bind(&requestData); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なリクエストです: " + err.Error(),
		})
	}

	// DTOの作成
	req, err := ctrl.convertToCreateCommentRequest(requestData)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	// UseCaseでコメントを作成
	commentDTO, err := ctrl.commentService.CreateComment(c.Request().Context(), userID, req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpComment := ctrl.commentPresenter.ToHTTPCommentResponse(commentDTO)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"comment": httpComment,
		},
	})
}

// UpdateComment はコメントを更新します
// PUT /api/comments/:id
func (ctrl *CommentController) UpdateComment(c echo.Context) error {
	id, err := ctrl.extractIDFromPath(c, "id")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコメントIDです",
		})
	}

	userID, userRole, err := ctrl.extractCurrentUserInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  "認証が必要です",
		})
	}

	var req dto.UpdateCommentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なリクエストです: " + err.Error(),
		})
	}

	// UseCaseでコメントを更新
	commentDTO, err := ctrl.commentService.UpdateComment(c.Request().Context(), id, userID, userRole, &req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpComment := ctrl.commentPresenter.ToHTTPCommentResponse(commentDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"comment": httpComment,
		},
	})
}

// DeleteComment はコメントを削除します
// DELETE /api/comments/:id
func (ctrl *CommentController) DeleteComment(c echo.Context) error {
	id, err := ctrl.extractIDFromPath(c, "id")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なコメントIDです",
		})
	}

	userID, userRole, err := ctrl.extractCurrentUserInfo(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  "認証が必要です",
		})
	}

	// UseCaseでコメントを削除
	err = ctrl.commentService.DeleteComment(c.Request().Context(), id, userID, userRole)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// ========== ヘルパーメソッド ==========

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

	userID, ok := userIDInterface.(float64)
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
	limit = 10
	offset = 0

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

// handleError はエラーを適切なHTTPステータスコードでレスポンスします
func (ctrl *CommentController) handleError(c echo.Context, err error) error {
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
