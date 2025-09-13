package controller

import (
	"net/http"
	"strconv"

	"media-platform/internal/usecase/dto"
	"media-platform/internal/usecase/service"

	"github.com/labstack/echo/v4"
)

// CategoryController はカテゴリに関するHTTPハンドラを提供します
type CategoryController struct {
	categoryService service.CategoryService
}

// NewCategoryController は新しいCategoryControllerのインスタンスを生成します
func NewCategoryController(categoryService service.CategoryService) *CategoryController {
	return &CategoryController{
		categoryService: categoryService,
	}
}

// GetCategories は全てのカテゴリを取得するハンドラです
func (ctrl *CategoryController) GetCategories(c echo.Context) error {
	categories, err := ctrl.categoryService.GetAllCategories(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"categories": categories,
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

	category, err := ctrl.categoryService.GetCategoryByID(c.Request().Context(), id)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"category": category,
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

	category, err := ctrl.categoryService.CreateCategory(c.Request().Context(), &req)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"category": category,
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

	category, err := ctrl.categoryService.UpdateCategory(c.Request().Context(), id, &req)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "カテゴリが見つかりません" {
			statusCode = http.StatusNotFound
		}
		return c.JSON(statusCode, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data": map[string]interface{}{
			"category": category,
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

	err = ctrl.categoryService.DeleteCategory(c.Request().Context(), id)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "カテゴリが見つかりません" {
			statusCode = http.StatusNotFound
		}
		return c.JSON(statusCode, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	return c.NoContent(http.StatusNoContent)
}
