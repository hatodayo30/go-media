// internal/interfaces/api/router.go
package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Ginルーターを使用するように変更
func NewRouter(userHandler *UserHandler) *gin.Engine {
	// Ginのデフォルト設定（ロガーとリカバリーミドルウェア付き）
	r := gin.Default()

	// グローバルミドルウェア
	r.Use(gin.Recovery())

	// バージョン付きAPIグループ
	v1 := r.Group("/api/v1")
	{
		// ヘルスチェックエンドポイント
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
			})
		})

		// ユーザー関連エンドポイント
		users := v1.Group("/users")
		{
			users.GET("", userHandler.GetUsers)
			users.POST("", userHandler.CreateUser)
			users.GET("/:id", userHandler.GetUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", userHandler.DeleteUser)
		}

		// 認証関連エンドポイント
		auth := v1.Group("/auth")
		{
			auth.POST("/login", userHandler.Login)
		}
	}

	return r
}

// カスタムミドルウェアの例
func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// リクエスト前の処理
		// logger.Infof("Method: %s, Path: %s, RemoteAddr: %s",
		//     c.Request.Method,
		//     c.Request.URL.Path,
		//     c.ClientIP())

		c.Next() // 次のミドルウェアに進む

		// リクエスト後の処理
		// ステータスコードやレスポンス時間などのログ出力が可能
	}
}
