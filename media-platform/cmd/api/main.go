package main

import (
	"log"
	"net/http"
	"os"

	"media-platform/internal/infrastructure/db"
	"media-platform/internal/interfaces/api"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// authMiddleware は認証が必要なルートで使用する認証ミドルウェアです
func authMiddleware(c *gin.Context) {
	// ここでJWTトークンの検証などの認証ロジックを実装
	// 例: Cookieからトークンを取得し、検証する

	// 仮実装: ユーザーがログインしているかの確認
	// 実際には「api」パッケージ内のJWT検証機能を使用するべきです
	token, err := c.Cookie("auth_token")
	if err != nil || token == "" {
		// 未認証の場合はログインページにリダイレクト
		c.Redirect(http.StatusSeeOther, "/login")
		c.Abort()
		return
	}

	// ここでトークンの検証処理を行う
	// JWTConfigを使用した実装に置き換えることが望ましい
	// 例: jwtConfig.ValidateToken(token)

	// 認証成功の場合は次のハンドラに進む
	c.Next()
}

func main() {
	// 環境変数のロード
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// データベース接続
	dbConn, err := db.NewConnection()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbConn.Close()

	// Ginルーターの初期化
	router := gin.Default()

	// JWTの設定
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key" // 開発用のデフォルト値。本番環境では必ず環境変数から設定すること。
	}
	jwtConfig := api.NewJWTConfig(jwtSecret)

	// ルーターの設定
	api.SetupRouter(router, dbConn, jwtConfig)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082" // デフォルトポート
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
	// フロントエンドルートの追加
	// ホームページ
	router.GET("/", func(c *gin.Context) {
		c.HTML(200, "index.html", gin.H{
			"title": "メディアプラットフォーム",
		})
	})

	// 認証ページ
	router.GET("/login", func(c *gin.Context) {
		c.HTML(200, "login.html", gin.H{
			"title": "ログイン",
		})
	})

	router.GET("/register", func(c *gin.Context) {
		c.HTML(200, "register.html", gin.H{
			"title": "アカウント登録",
		})
	})

	// プロフィールページ（認証必須）
	router.GET("/profile", authMiddleware, func(c *gin.Context) {
		c.HTML(200, "profile.html", gin.H{
			"title": "マイプロフィール",
		})
	})

	// コンテンツ関連ページ
	router.GET("/contents", func(c *gin.Context) {
		c.HTML(200, "content/list.html", gin.H{
			"title": "コンテンツ一覧",
		})
	})

	router.GET("/contents/:id", func(c *gin.Context) {
		contentID := c.Param("id")
		c.HTML(200, "content/single.html", gin.H{
			"title":     "コンテンツ詳細",
			"contentID": contentID,
		})
	})

	// コンテンツ作成・編集（認証必須）
	router.GET("/contents/create", authMiddleware, func(c *gin.Context) {
		c.HTML(200, "content/create.html", gin.H{
			"title": "コンテンツ作成",
		})
	})

	router.GET("/contents/:id/edit", authMiddleware, func(c *gin.Context) {
		contentID := c.Param("id")
		c.HTML(200, "content/edit.html", gin.H{
			"title":     "コンテンツ編集",
			"contentID": contentID,
		})
	})
}
