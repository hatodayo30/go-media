package main

import (
	"log"
	"os"

	"media-platform/internal/controller/http"
	"media-platform/internal/controller/middleware"
	"media-platform/internal/infrastructure/database"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
)

func main() {
	// 環境変数のロード
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// データベース接続
	dbConn, err := database.NewConnection()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer dbConn.Close()

	// Echoインスタンスの作成
	e := echo.New()

	// JWTの設定
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key"
	}
	jwtConfig := middleware.NewJWTConfig(jwtSecret)

	// API専用ルーターの設定
	http.SetupRouter(e, dbConn, jwtConfig)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("Echo API Server starting on port %s", port)
	if err := e.Start(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
