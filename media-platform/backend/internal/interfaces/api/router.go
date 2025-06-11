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
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	config.AllowCredentials = true
	router.Use(cors.New(config))

	router.SetTrustedProxies(nil)

	// ミドルウェアの設定
	authMiddleware := jwtConfig.AuthMiddleware()
	adminMiddleware := RoleMiddleware([]string{"admin"})

	// APIグループ
	api := router.Group("/api")

	// リポジトリの初期化
	userRepo := persistence.NewUserRepository(db.GetDB())
	categoryRepo := persistence.NewCategoryRepository(db.GetDB())
	contentRepo := persistence.NewContentRepository(db.GetDB())
	commentRepo := persistence.NewCommentRepository(db.GetDB())
	ratingRepo := persistence.NewRatingRepository(db.GetDB())
	// bookmarkRepo の削除

	// ユースケースの初期化
	userUseCase := usecase.NewUserUseCase(userRepo)
	categoryUseCase := usecase.NewCategoryUseCase(categoryRepo)
	contentUseCase := usecase.NewContentUseCase(contentRepo, categoryRepo, userRepo)
	commentUseCase := usecase.NewCommentUseCase(commentRepo, contentRepo, userRepo)
	ratingUseCase := usecase.NewRatingUseCase(ratingRepo, contentRepo)
	// bookmarkUseCase の削除

	// ハンドラーの初期化
	userHandler := NewUserHandler(userUseCase)
	categoryHandler := NewCategoryHandler(categoryUseCase)
	contentHandler := NewContentHandler(contentUseCase)
	commentHandler := NewCommentHandler(commentUseCase)
	ratingHandler := NewRatingHandler(ratingUseCase)
	// bookmarkHandler の削除

	// ユーザーAPI
	userRoutes := api.Group("/users")
	{
		userRoutes.POST("/register", userHandler.Register)
		userRoutes.POST("/login", userHandler.Login)
		userRoutes.GET("/me", authMiddleware, userHandler.GetCurrentUser)
		userRoutes.PUT("/me", authMiddleware, userHandler.UpdateUser)
		userRoutes.GET("", authMiddleware, adminMiddleware, userHandler.GetAllUsers)
		userRoutes.GET("/:id", authMiddleware, adminMiddleware, userHandler.GetUserByID)
		userRoutes.PUT("/:id", authMiddleware, adminMiddleware, userHandler.UpdateUserByAdmin)
		userRoutes.DELETE("/:id", authMiddleware, adminMiddleware, userHandler.DeleteUser)

		// 評価のみ残す
		userRoutes.GET("/:id/ratings", ratingHandler.GetRatingsByUserID)
	}

	// カテゴリAPI
	categoryRoutes := api.Group("/categories")
	{
		categoryRoutes.GET("", categoryHandler.GetAllCategories)
		categoryRoutes.GET("/:id", categoryHandler.GetCategoryByID)
		categoryRoutes.POST("", authMiddleware, adminMiddleware, categoryHandler.CreateCategory)
		categoryRoutes.PUT("/:id", authMiddleware, adminMiddleware, categoryHandler.UpdateCategory)
		categoryRoutes.DELETE("/:id", authMiddleware, adminMiddleware, categoryHandler.DeleteCategory)
	}

	// コンテンツAPI
	contentRoutes := api.Group("/contents")
	{
		contentRoutes.GET("", contentHandler.GetContents)
		contentRoutes.GET("/published", contentHandler.GetPublishedContents)
		contentRoutes.GET("/trending", contentHandler.GetTrendingContents)
		contentRoutes.GET("/search", contentHandler.SearchContents)
		contentRoutes.GET("/author/:authorId", contentHandler.GetContentsByAuthor)
		contentRoutes.GET("/category/:categoryId", contentHandler.GetContentsByCategory)
		contentRoutes.GET("/:id/comments", commentHandler.GetCommentsByContent)

		// 評価のみ残す
		contentRoutes.GET("/:id/ratings", ratingHandler.GetRatingsByContentID)
		contentRoutes.GET("/:id/ratings/average", ratingHandler.GetAverageRatingByContentID)

		contentRoutes.GET("/:id", contentHandler.GetContentByID)
		contentRoutes.POST("", authMiddleware, contentHandler.CreateContent)
		contentRoutes.PUT("/:id", authMiddleware, contentHandler.UpdateContent)
		contentRoutes.PATCH("/:id/status", authMiddleware, contentHandler.UpdateContentStatus)
		contentRoutes.DELETE("/:id", authMiddleware, contentHandler.DeleteContent)
	}

	// コメントAPI
	commentRoutes := api.Group("/comments")
	{
		commentRoutes.GET("/parent/:parentId/replies", commentHandler.GetReplies)
		commentRoutes.GET("/:id", commentHandler.GetCommentByID)
		commentRoutes.POST("", authMiddleware, commentHandler.CreateComment)
		commentRoutes.PUT("/:id", authMiddleware, commentHandler.UpdateComment)
		commentRoutes.DELETE("/:id", authMiddleware, commentHandler.DeleteComment)
	}

	// 評価API
	ratingRoutes := api.Group("/ratings")
	{
		ratingRoutes.POST("", authMiddleware, ratingHandler.CreateRating)
		ratingRoutes.DELETE("/:id", authMiddleware, ratingHandler.DeleteRating)
	}

	// ヘルスチェック
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	log.Println("✅ API server configured with rating-only functionality")
	log.Println("📊 Rating endpoints:")
	log.Println("  GET    /api/contents/:id/ratings")
	log.Println("  GET    /api/contents/:id/ratings/average")
	log.Println("  POST   /api/ratings")
	log.Println("  DELETE /api/ratings/:id")
}
