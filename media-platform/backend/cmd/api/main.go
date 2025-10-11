package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"media-platform/internal/adapter/middleware"
	"media-platform/internal/adapter/router"
	"media-platform/internal/infrastructure/database"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
)

func main() {
	// ログ設定
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// 環境変数のロード
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Warning: .env file not found, using environment variables")
	}

	// データベース接続
	log.Println("🔌 Connecting to database...")
	dbConn, err := database.NewConnection()
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}
	defer func() {
		if err := dbConn.Close(); err != nil {
			log.Printf("❌ Error closing database: %v", err)
		}
	}()

	// Echoインスタンスの作成
	e := echo.New()
	e.HideBanner = true // Echoのバナーを非表示

	// JWTの設定
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Println("⚠️  Warning: JWT_SECRET not set, using default (insecure)")
		jwtSecret = "your-secret-key-change-in-production"
	}
	jwtConfig := middleware.NewJWTConfig(jwtSecret)

	// APIルーターの設定
	log.Println("🔧 Setting up routes...")
	router.SetupRouter(e, dbConn, jwtConfig)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	// Graceful Shutdown対応
	go func() {
		log.Printf("🚀 Server starting on http://localhost:%s", port)
		log.Printf("📝 API documentation: http://localhost:%s/health", port)
		if err := e.Start(":" + port); err != nil {
			log.Printf("⚠️  Server shutdown: %v", err)
		}
	}()

	// シグナル待機（Graceful Shutdown）
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")
}
