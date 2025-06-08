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

	// リポジトリとユースケースの初期化
	userRepo := persistence.NewUserRepository(db.GetDB())
	categoryRepo := persistence.NewCategoryRepository(db.GetDB())
	contentRepo := persistence.NewContentRepository(db.GetDB())
	commentRepo := persistence.NewCommentRepository(db.GetDB())
	ratingRepo := persistence.NewRatingRepository(db.GetDB())

	userUseCase := usecase.NewUserUseCase(userRepo)
	categoryUseCase := usecase.NewCategoryUseCase(categoryRepo)
	contentUseCase := usecase.NewContentUseCase(contentRepo, categoryRepo, userRepo)
	commentUseCase := usecase.NewCommentUseCase(commentRepo, contentRepo, userRepo)
	ratingUseCase := usecase.NewRatingUseCase(ratingRepo, contentRepo)

	// ハンドラーの初期化
	userHandler := NewUserHandler(userUseCase)
	categoryHandler := NewCategoryHandler(categoryUseCase)
	contentHandler := NewContentHandler(contentUseCase)
	commentHandler := NewCommentHandler(commentUseCase)
	ratingHandler := NewRatingHandler(ratingUseCase)

	// ユーザーAPI
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
	contentRoutes := api.Group("/contents")
	{
		// 認証不要のエンドポイント（読み取り系）
		contentRoutes.GET("", contentHandler.GetContents)
		contentRoutes.GET("/published", contentHandler.GetPublishedContents)
		contentRoutes.GET("/trending", contentHandler.GetTrendingContents)
		contentRoutes.GET("/search", contentHandler.SearchContents)
		contentRoutes.GET("/author/:authorId", contentHandler.GetContentsByAuthor)
		contentRoutes.GET("/category/:categoryId", contentHandler.GetContentsByCategory)

		// ★ 重要：より具体的なルートを先に定義
		contentRoutes.GET("/:id/comments", commentHandler.GetCommentsByContent)
		contentRoutes.GET("/:id/ratings", ratingHandler.GetRatingsByContentID)
		contentRoutes.GET("/:id/rating/average", ratingHandler.GetAverageRatingByContentID)

		// 一般的なコンテンツ取得（これを最後に配置）
		contentRoutes.GET("/:id", contentHandler.GetContentByID)

		// 認証が必要なエンドポイント（書き込み系）
		contentRoutes.POST("", authMiddleware, contentHandler.CreateContent)
		contentRoutes.PUT("/:id", authMiddleware, contentHandler.UpdateContent)
		contentRoutes.PATCH("/:id/status", authMiddleware, contentHandler.UpdateContentStatus)
		contentRoutes.DELETE("/:id", authMiddleware, contentHandler.DeleteContent)
	}

	// コメントAPI
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

	// ユーザー評価API
	userRatingRoutes := api.Group("/users")
	{
		userRatingRoutes.GET("/:id/ratings", ratingHandler.GetRatingsByUserID)
	}

	// 評価API（書き込み系）
	ratingRoutes := api.Group("/ratings")
	{
		ratingRoutes.POST("", authMiddleware, ratingHandler.CreateOrUpdateRating)
		ratingRoutes.DELETE("/:id", authMiddleware, ratingHandler.DeleteRating)
	}

	// ヘルスチェックエンドポイント
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	log.Println("API server configured for backend-only mode")
}
