package main

import (
	"html/template"
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

	// カスタムテンプレート関数の設定
	router.SetFuncMap(template.FuncMap{
		"dict": func(values ...interface{}) map[string]interface{} {
			if len(values)%2 != 0 {
				return nil
			}
			dict := make(map[string]interface{})
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil
				}
				dict[key] = values[i+1]
			}
			return dict
		},
	})

	// テンプレートディレクトリの存在確認
	if _, err := os.Stat("templates"); os.IsNotExist(err) {
		log.Println("Warning: templates directory not found")
	} else {
		log.Println("Loading templates from templates directory")

		// すべてのテンプレートファイルを読み込み
		router.LoadHTMLGlob("templates/**/*")
		log.Println("Templates loaded")
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
