package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"media-platform/internal/domain/model"
	"media-platform/internal/usecase"
)

type UserHandler struct {
	userUseCase *usecase.UserUseCase
}

func NewUserHandler(userUseCase *usecase.UserUseCase) *UserHandler {
	return &UserHandler{
		userUseCase: userUseCase,
	}
}

// ユーザー登録ハンドラー
func (h *UserHandler) CreateUser(c *gin.Context) {
	var user model.User

	// リクエストボディをバインド
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "無効なリクエストフォーマット",
			"details": err.Error(),
		})
		return
	}

	// バリデーション
	if user.Username == "" || user.Email == "" || user.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "ユーザー名、メールアドレス、パスワードは必須です",
		})
		return
	}

	// ユーザー作成
	if err := h.userUseCase.CreateUser(c.Request.Context(), &user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// レスポンス返却
	c.JSON(http.StatusCreated, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
		"message":  "ユーザーが正常に作成されました",
	})
}

// ユーザー取得ハンドラー
func (h *UserHandler) GetUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無効なユーザーID",
		})
		return
	}

	user, err := h.userUseCase.GetUserByID(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "ユーザーが見つかりません",
		})
		return
	}

	c.JSON(http.StatusOK, user)
}

// ユーザー一覧取得ハンドラー
func (h *UserHandler) GetUsers(c *gin.Context) {
	// クエリパラメータからlimitとoffsetを取得
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	users, err := h.userUseCase.GetUsers(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, users)
}

// ユーザー更新ハンドラー
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無効なユーザーID",
		})
		return
	}

	var user model.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "無効なリクエストフォーマット",
			"details": err.Error(),
		})
		return
	}

	// URLのIDとリクエストボディのIDが一致することを確認
	user.ID = uint(id)

	if err := h.userUseCase.UpdateUser(c.Request.Context(), &user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ユーザー情報が正常に更新されました",
	})
}

// ユーザー削除ハンドラー
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "無効なユーザーID",
		})
		return
	}

	if err := h.userUseCase.DeleteUser(c.Request.Context(), uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ユーザーが正常に削除されました",
	})
}

// ユーザーログインハンドラー
func (h *UserHandler) Login(c *gin.Context) {
	var credentials struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&credentials); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "無効なリクエストフォーマット",
			"details": err.Error(),
		})
		return
	}

	user, err := h.userUseCase.AuthenticateUser(c.Request.Context(), credentials.Email, credentials.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "ログインに成功しました",
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
			"role":     user.Role,
		},
	})
}
