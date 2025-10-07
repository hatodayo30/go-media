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

// CategoryController はカテゴリに関するHTTPハンドラを提供します
type CategoryController struct {
	categoryService   *service.CategoryService
	categoryPresenter *presenter.CategoryPresenter
}

// NewCategoryController は新しいCategoryControllerのインスタンスを生成します
func NewCategoryController(
	categoryService *service.CategoryService,
	categoryPresenter *presenter.CategoryPresenter,
) *CategoryController {
	return &CategoryController{
		categoryService:   categoryService,
		categoryPresenter: categoryPresenter,
	}
}

// GetCategories は全てのカテゴリを取得するハンドラです
func (ctrl *CategoryController) GetCategories(c echo.Context) error {
	// UseCaseから全カテゴリを取得
	categoryDTOs, err := ctrl.categoryService.GetAllCategories(c.Request().Context())
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpCategories := ctrl.categoryPresenter.ToHTTPCategoryResponseList(categoryDTOs)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"categories": httpCategories,
		},
	})
}

// GetCategory は指定したIDのカテゴリを取得するハンドラです
func (ctrl *CategoryController) GetCategory(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なカテゴリIDです",
		})
	}

	// UseCaseからカテゴリを取得
	categoryDTO, err := ctrl.categoryService.GetCategoryByID(c.Request().Context(), id)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpCategory := ctrl.categoryPresenter.ToHTTPCategoryResponse(categoryDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"category": httpCategory,
		},
	})
}

// CreateCategory は新しいカテゴリを作成するハンドラです
func (ctrl *CategoryController) CreateCategory(c echo.Context) error {
	var req dto.CreateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	// UseCaseでカテゴリを作成
	categoryDTO, err := ctrl.categoryService.CreateCategory(c.Request().Context(), &req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpCategory := ctrl.categoryPresenter.ToHTTPCategoryResponse(categoryDTO)

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"category": httpCategory,
		},
	})
}

// UpdateCategory は既存のカテゴリを更新するハンドラです
func (ctrl *CategoryController) UpdateCategory(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なカテゴリIDです",
		})
	}

	var req dto.UpdateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "リクエストデータが無効です: " + err.Error(),
		})
	}

	// UseCaseでカテゴリを更新
	categoryDTO, err := ctrl.categoryService.UpdateCategory(c.Request().Context(), id, &req)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	// PresenterでHTTPレスポンス用に変換
	httpCategory := ctrl.categoryPresenter.ToHTTPCategoryResponse(categoryDTO)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"category": httpCategory,
		},
	})
}

// DeleteCategory は指定したIDのカテゴリを削除するハンドラです
func (ctrl *CategoryController) DeleteCategory(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  "無効なカテゴリIDです",
		})
	}

	// UseCaseでカテゴリを削除
	err = ctrl.categoryService.DeleteCategory(c.Request().Context(), id)
	if err != nil {
		return ctrl.handleError(c, err)
	}

	return c.NoContent(http.StatusNoContent)
}

// ========== ヘルパーメソッド ==========

// handleError はエラーを適切なHTTPステータスコードでレスポンスします
func (ctrl *CategoryController) handleError(c echo.Context, err error) error {
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
