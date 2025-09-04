package http

import (
	"net/http"
	"strconv"

	"media-platform/internal/application/service"
	domainErrors "media-platform/internal/domain/errors"
	"media-platform/internal/presentation/dto"
	"media-platform/internal/presentation/presenter"

	"github.com/labstack/echo/v4"
)

// UserController はユーザーに関するHTTPハンドラーを提供します
type UserController struct {
	userService   *service.UserService
	userPresenter *presenter.UserPresenter
}

// NewUserController は新しいUserControllerのインスタンスを生成します
func NewUserController(userService *service.UserService, userPresenter *presenter.UserPresenter) *UserController {
	return &UserController{
		userService:   userService,
		userPresenter: userPresenter,
	}
}

// Register はユーザー登録を処理します
// POST /api/users/register
func (ctrl *UserController) Register(c echo.Context) error {
	var req dto.CreateUserRequest

	// リクエストボディの取得とバインド
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なリクエストです: " + err.Error(),
		})
	}

	// DTOをCommandに変換
	cmd := &service.RegisterUserCommand{
		Username: req.Username,
		Email:    req.Email,
		Password: req.Password,
		Bio:      req.Bio,
		Avatar:   req.Avatar,
	}

	// ユーザー登録の実行
	result, err := ctrl.userService.RegisterUser(c.Request().Context(), cmd)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで変換
	response := ctrl.userPresenter.ToUserResponse(result.User)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"user": response,
		},
	})
}

// Login はユーザーログインを処理します
// POST /api/users/login
func (ctrl *UserController) Login(c echo.Context) error {
	var req dto.LoginRequest

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なリクエストです: " + err.Error(),
		})
	}

	// DTOをCommandに変換
	cmd := &service.LoginCommand{
		Email:    req.Email,
		Password: req.Password,
	}

	// ログインの実行
	result, err := ctrl.userService.LoginUser(c.Request().Context(), cmd)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで変換
	userResponse := ctrl.userPresenter.ToUserResponse(result.User)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"token": *result.Token,
			"user":  userResponse,
		},
	})
}

// GetUser は指定したIDのユーザーを取得します
// GET /api/users/:id
func (ctrl *UserController) GetUser(c echo.Context) error {
	// パスパラメータの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// ユーザー取得の実行
	result, err := ctrl.userService.GetUserByID(c.Request().Context(), id)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで変換
	response := ctrl.userPresenter.ToUserResponse(result.User)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"user": response,
		},
	})
}

// GetAllUsers は全てのユーザーを取得します
// GET /api/users
func (ctrl *UserController) GetAllUsers(c echo.Context) error {
	// クエリパラメータの取得
	limit, offset := ctrl.getPaginationParams(c)

	// ユーザー一覧取得の実行
	users, err := ctrl.userService.GetAllUsers(c.Request().Context(), limit, offset)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで変換
	responses := ctrl.userPresenter.ToUserResponseList(users)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"users": responses,
			"pagination": map[string]interface{}{
				"limit":  limit,
				"offset": offset,
			},
		},
	})
}

// UpdateUser はユーザー情報を更新します（管理者用）
// PUT /api/users/:id
func (ctrl *UserController) UpdateUserByAdmin(c echo.Context) error {
	// パスパラメータの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	var req dto.UpdateUserRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なリクエストです: " + err.Error(),
		})
	}

	// DTOをCommandに変換
	cmd := &service.UpdateUserCommand{
		ID: id,
	}

	if req.Username != "" {
		cmd.Username = &req.Username
	}
	if req.Email != "" {
		cmd.Email = &req.Email
	}
	if req.Password != "" {
		cmd.Password = &req.Password
	}
	if req.Bio != "" {
		cmd.Bio = &req.Bio
	}
	if req.Avatar != "" {
		cmd.Avatar = &req.Avatar
	}

	// ユーザー更新の実行
	result, err := ctrl.userService.UpdateUser(c.Request().Context(), cmd)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで変換
	response := ctrl.userPresenter.ToUserResponse(result.User)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"user": response,
		},
	})
}

// UpdateCurrentUser は現在のユーザー情報を更新します
// PUT /api/users/me
func (ctrl *UserController) UpdateCurrentUser(c echo.Context) error {
	// JWTミドルウェアから現在のユーザーIDを取得
	userID, err := ctrl.getUserIDFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	var req dto.UpdateUserRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なリクエストです: " + err.Error(),
		})
	}

	// DTOをCommandに変換
	cmd := &service.UpdateUserCommand{
		ID: userID,
	}

	if req.Username != "" {
		cmd.Username = &req.Username
	}
	if req.Email != "" {
		cmd.Email = &req.Email
	}
	if req.Password != "" {
		cmd.Password = &req.Password
	}
	if req.Bio != "" {
		cmd.Bio = &req.Bio
	}
	if req.Avatar != "" {
		cmd.Avatar = &req.Avatar
	}

	// ユーザー更新の実行
	result, err := ctrl.userService.UpdateUser(c.Request().Context(), cmd)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで変換
	response := ctrl.userPresenter.ToUserResponse(result.User)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"user": response,
		},
	})
}

// DeleteUser はユーザーを削除します
// DELETE /api/users/:id
func (ctrl *UserController) DeleteUser(c echo.Context) error {
	// パスパラメータの取得
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なユーザーIDです",
		})
	}

	// ユーザー削除の実行
	err = ctrl.userService.DeleteUser(c.Request().Context(), id)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// GetCurrentUser は現在ログイン中のユーザー情報を取得します
// GET /api/users/me
func (ctrl *UserController) GetCurrentUser(c echo.Context) error {
	// JWTミドルウェアから現在のユーザーIDを取得
	userID, err := ctrl.getUserIDFromContext(c)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	// 現在のユーザー取得の実行
	result, err := ctrl.userService.GetUserByID(c.Request().Context(), userID)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで変換
	response := ctrl.userPresenter.ToUserResponse(result.User)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"user": response,
		},
	})
}

// GetPublicUsers は公開ユーザー一覧を取得します
// GET /api/users/public
func (ctrl *UserController) GetPublicUsers(c echo.Context) error {
	// 公開ユーザー取得の実行
	users, err := ctrl.userService.GetPublicUsers(c.Request().Context())
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// Presenterで公開プロフィール用に変換
	responses := ctrl.userPresenter.ToPublicUserResponseList(users)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"users": responses,
		},
	})
}

// ========== ヘルパーメソッド ==========

// getPaginationParams はリクエストからページネーションパラメータを取得します
func (ctrl *UserController) getPaginationParams(c echo.Context) (int, int) {
	limit := 10 // デフォルト値
	offset := 0 // デフォルト値

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

// getUserIDFromContext はJWTミドルウェアからユーザーIDを取得します
func (ctrl *UserController) getUserIDFromContext(c echo.Context) (int64, error) {
	userIDInterface := c.Get("user_id")
	if userIDInterface == nil {
		return 0, domainErrors.NewValidationError("認証が必要です")
	}

	// float64から int64に変換（JWTのclaimsは通常float64）
	switch v := userIDInterface.(type) {
	case float64:
		return int64(v), nil
	case int64:
		return v, nil
	case int:
		return int64(v), nil
	default:
		return 0, domainErrors.NewValidationError("ユーザー情報の取得に失敗しました")
	}
}

// handleError はエラーを適切なHTTPステータスコードでレスポンスします
func (ctrl *UserController) handleError(c echo.Context, err error) error {
	// Domain Errorの種類に応じてステータスコードを決定
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

	// その他のエラーは内部サーバーエラー
	return c.JSON(http.StatusInternalServerError, map[string]interface{}{
		"status": "error",
		"error":  "内部サーバーエラーが発生しました",
	})
}
