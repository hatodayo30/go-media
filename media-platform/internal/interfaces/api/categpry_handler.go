package api

import (
	"net/http"
	"strconv"

	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"

	"github.com/gin-gonic/gin"
)

// CategoryHandler はカテゴリに関するHTTPハンドラを提供します
type CategoryHandler struct {
	categoryUseCase *usecase.CategoryUseCase
}

// NewCategoryHandler は新しいCategoryHandlerのインスタンスを生成します
func NewCategoryHandler(categoryUseCase *usecase.CategoryUseCase) *CategoryHandler {
	return &CategoryHandler{
		categoryUseCase: categoryUseCase,
	}
}

// GetAllCategories は全てのカテゴリを取得するハンドラです
// @Summary カテゴリ一覧を取得
// @Description 全てのカテゴリを取得します
// @Tags categories
// @Accept json
// @Produce json
// @Success 200 {object} []model.CategoryResponse
// @Router /categories [get]
func (h *CategoryHandler) GetAllCategories(c *gin.Context) {
	categories, err := h.categoryUseCase.GetAllCategories(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"categories": categories,
		},
	})
}

// GetCategoryByID は指定したIDのカテゴリを取得するハンドラです
// @Summary カテゴリを取得
// @Description 指定したIDのカテゴリを取得します
// @Tags categories
// @Accept json
// @Produce json
// @Param id path int true "カテゴリID"
// @Success 200 {object} model.CategoryResponse
// @Failure 404 {object} map[string]string
// @Router /categories/{id} [get]
func (h *CategoryHandler) GetCategoryByID(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無効なカテゴリIDです",
		})
		return
	}

	category, err := h.categoryUseCase.GetCategoryByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"category": category,
		},
	})
}

// CreateCategory は新しいカテゴリを作成するハンドラです
// @Summary カテゴリを作成
// @Description 新しいカテゴリを作成します
// @Tags categories
// @Accept json
// @Produce json
// @Param category body model.CreateCategoryRequest true "カテゴリ情報"
// @Success 201 {object} model.CategoryResponse
// @Failure 400 {object} map[string]string
// @Router /categories [post]
// @Security ApiKeyAuth
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	var req model.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "リクエストデータが無効です",
		})
		return
	}

	category, err := h.categoryUseCase.CreateCategory(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"status": "success",
		"data": gin.H{
			"category": category,
		},
	})
}

// UpdateCategory は既存のカテゴリを更新するハンドラです
// @Summary カテゴリを更新
// @Description 指定したIDのカテゴリを更新します
// @Tags categories
// @Accept json
// @Produce json
// @Param id path int true "カテゴリID"
// @Param category body model.UpdateCategoryRequest true "更新するカテゴリ情報"
// @Success 200 {object} model.CategoryResponse
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /categories/{id} [put]
// @Security ApiKeyAuth
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無効なカテゴリIDです",
		})
		return
	}

	var req model.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "リクエストデータが無効です",
		})
		return
	}

	category, err := h.categoryUseCase.UpdateCategory(c.Request.Context(), id, &req)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "カテゴリが見つかりません" {
			statusCode = http.StatusNotFound
		}
		c.JSON(statusCode, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"data": gin.H{
			"category": category,
		},
	})
}

// DeleteCategory は指定したIDのカテゴリを削除するハンドラです
// @Summary カテゴリを削除
// @Description 指定したIDのカテゴリを削除します
// @Tags categories
// @Accept json
// @Produce json
// @Param id path int true "カテゴリID"
// @Success 204 "No Content"
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /categories/{id} [delete]
// @Security ApiKeyAuth
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無効なカテゴリIDです",
		})
		return
	}

	err = h.categoryUseCase.DeleteCategory(c.Request.Context(), id)
	if err != nil {
		statusCode := http.StatusBadRequest
		if err.Error() == "カテゴリが見つかりません" {
			statusCode = http.StatusNotFound
		}
		c.JSON(statusCode, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.Status(http.StatusNoContent)
}
