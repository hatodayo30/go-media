package main

import (
	"log"
	"os"

	"media-platform/internal/infrastructure/db"
	"media-platform/internal/interfaces/api"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

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
		jwtSecret = "your-secret-key"
	}
	jwtConfig := api.NewJWTConfig(jwtSecret)

	// API専用ルーターの設定
	api.SetupRouter(router, dbConn, jwtConfig)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("API Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
