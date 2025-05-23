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

	// テンプレートディレクトリの存在確認
	if _, err := os.Stat("templates"); os.IsNotExist(err) {
		log.Println("Warning: templates directory not found")
	} else {
		log.Println("Loading templates from templates directory")
		router.LoadHTMLGlob("templates/*")
	}

	// 静的ファイルディレクトリの存在確認
	if _, err := os.Stat("static"); os.IsNotExist(err) {
		log.Println("Warning: static directory not found")
	} else {
		log.Println("Loading static files from static directory")
		router.Static("/static", "./static")
	}

	// JWTの設定
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "your-secret-key"
	}
	jwtConfig := api.NewJWTConfig(jwtSecret)

	// ルーターの設定
	api.SetupRouter(router, dbConn, jwtConfig)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
