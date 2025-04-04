package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"media-platform/configs"
	"media-platform/internal/infrastructure/db"
	"media-platform/internal/infrastructure/persistence"
	"media-platform/internal/interfaces/api"
	"media-platform/internal/usecase"
	"media-platform/pkg/logger"
)

func main() {
	// ロガーの初期化
	logger := logger.NewLogger()
	logger.Info("Starting Media Platform API Server")

	// 設定の読み込み
	config, err := configs.NewConfig()
	if err != nil {
		logger.Fatal("Failed to load config", err)
	}

	// データベース接続の初期化
	database, err := db.Connect(config)
	if err != nil {
		logger.Fatal("Failed to connect to database", err)
	}
	defer database.Close()

	// リポジトリの初期化
	userRepo := persistence.NewUserRepository(database)

	// ユースケースの初期化
	userUseCase := usecase.NewUserUseCase(userRepo)

	// Ginルーターの設定
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())

	// ユーザーハンドラーの初期化
	userHandler := api.NewUserHandler(userUseCase)

	// ルーティングの設定
	v1 := router.Group("/api/v1")
	{
		// ヘルスチェックエンドポイント
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "ok",
				"time":   time.Now(),
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

	// HTTPサーバーの設定
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", config.ServerPort),
		Handler:      router,
		ReadTimeout:  config.ReadTimeout,
		WriteTimeout: config.WriteTimeout,
		IdleTimeout:  120 * time.Second,
	}

	// サーバーを非同期で起動
	go func() {
		logger.Info(fmt.Sprintf("Server is running on port %d", config.ServerPort))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server", err)
		}
	}()

	// グレースフルシャットダウンのための準備
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// サーバーの終了処理（タイムアウト付き）
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", err)
	}

	logger.Info("Server exiting")
}
