package api

import (
	"log"
	"media-platform/internal/infrastructure/persistence"
	"media-platform/internal/usecase"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// SetupRouter はAPIルーターを設定します
func SetupRouter(router *gin.Engine, db persistence.DBConn, jwtConfig *JWTConfig) {
	// CORS設定
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"} // Reactアプリのオリジン
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	config.AllowCredentials = true
	router.Use(cors.New(config))

	// プロキシ警告を無効化
	router.SetTrustedProxies(nil)

	// ミドルウェアの設定
	authMiddleware := jwtConfig.AuthMiddleware()
	adminMiddleware := RoleMiddleware([]string{"admin"})

	// APIグループ
	api := router.Group("/api")

	// ユーザーAPI
	userRepo := persistence.NewUserRepository(db.GetDB())
	userUseCase := usecase.NewUserUseCase(userRepo)
	userHandler := NewUserHandler(userUseCase)

	userRoutes := api.Group("/users")
	{
		userRoutes.POST("/register", userHandler.Register)
		userRoutes.POST("/login", userHandler.Login)

		// 認証が必要なエンドポイント
		userRoutes.GET("/me", authMiddleware, userHandler.GetCurrentUser)
		userRoutes.PUT("/me", authMiddleware, userHandler.UpdateUser)

		// 管理者のみのエンドポイント
		userRoutes.GET("", authMiddleware, adminMiddleware, userHandler.GetAllUsers)
		userRoutes.GET("/:id", authMiddleware, adminMiddleware, userHandler.GetUserByID)
		userRoutes.PUT("/:id", authMiddleware, adminMiddleware, userHandler.UpdateUserByAdmin)
		userRoutes.DELETE("/:id", authMiddleware, adminMiddleware, userHandler.DeleteUser)
	}

	// カテゴリAPI
	categoryRepo := persistence.NewCategoryRepository(db.GetDB())
	categoryUseCase := usecase.NewCategoryUseCase(categoryRepo)
	categoryHandler := NewCategoryHandler(categoryUseCase)

	categoryRoutes := api.Group("/categories")
	{
		// 認証不要のエンドポイント
		categoryRoutes.GET("", categoryHandler.GetAllCategories)
		categoryRoutes.GET("/:id", categoryHandler.GetCategoryByID)

		// 管理者のみのエンドポイント
		categoryRoutes.POST("", authMiddleware, adminMiddleware, categoryHandler.CreateCategory)
		categoryRoutes.PUT("/:id", authMiddleware, adminMiddleware, categoryHandler.UpdateCategory)
		categoryRoutes.DELETE("/:id", authMiddleware, adminMiddleware, categoryHandler.DeleteCategory)
	}

	// コンテンツAPI
	contentRepo := persistence.NewContentRepository(db.GetDB())
	contentUseCase := usecase.NewContentUseCase(contentRepo, categoryRepo, userRepo)
	contentHandler := NewContentHandler(contentUseCase)

	contentRoutes := api.Group("/contents")
	{
		// 認証不要のエンドポイント（読み取り系）
		contentRoutes.GET("", contentHandler.GetContents)
		contentRoutes.GET("/published", contentHandler.GetPublishedContents)
		contentRoutes.GET("/trending", contentHandler.GetTrendingContents)
		contentRoutes.GET("/search", contentHandler.SearchContents)
		contentRoutes.GET("/author/:authorId", contentHandler.GetContentsByAuthor)
		contentRoutes.GET("/category/:categoryId", contentHandler.GetContentsByCategory)
		contentRoutes.GET("/:id", contentHandler.GetContentByID)

		// 認証が必要なエンドポイント（書き込み系）
		contentRoutes.POST("", authMiddleware, contentHandler.CreateContent)
		contentRoutes.PUT("/:id", authMiddleware, contentHandler.UpdateContent)
		contentRoutes.PATCH("/:id/status", authMiddleware, contentHandler.UpdateContentStatus)
		contentRoutes.DELETE("/:id", authMiddleware, contentHandler.DeleteContent)
	}

	// コメントAPI
	commentRepo := persistence.NewCommentRepository(db.GetDB())
	commentUseCase := usecase.NewCommentUseCase(commentRepo, contentRepo, userRepo)
	commentHandler := NewCommentHandler(commentUseCase)

	commentRoutes := api.Group("/comments")
	{
		// 認証不要のエンドポイント
		commentRoutes.GET("/parent/:parentId/replies", commentHandler.GetReplies)
		commentRoutes.GET("/:id", commentHandler.GetCommentByID)

		// 認証が必要なエンドポイント
		commentRoutes.POST("", authMiddleware, commentHandler.CreateComment)
		commentRoutes.PUT("/:id", authMiddleware, commentHandler.UpdateComment)
		commentRoutes.DELETE("/:id", authMiddleware, commentHandler.DeleteComment)
	}

	// 評価API
	ratingRepo := persistence.NewRatingRepository(db.GetDB())
	ratingUseCase := usecase.NewRatingUseCase(ratingRepo, contentRepo)
	ratingHandler := NewRatingHandler(ratingUseCase)

	// 評価管理API
	api.GET("/contents/:id/ratings", ratingHandler.GetRatingsByContentID)
	api.GET("/contents/:id/rating/average", ratingHandler.GetAverageRatingByContentID)
	api.GET("/users/:id/ratings", ratingHandler.GetRatingsByUserID)
	api.POST("/ratings", authMiddleware, ratingHandler.CreateOrUpdateRating)
	api.DELETE("/ratings/:id", authMiddleware, ratingHandler.DeleteRating)

	// ヘルスチェックエンドポイント
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	log.Println("API server configured for backend-only mode")
}
