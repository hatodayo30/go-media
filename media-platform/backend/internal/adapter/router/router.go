package router

import (
	"log"
	"net/http"

	"media-platform/internal/adapter/controller"
	"media-platform/internal/adapter/middleware"
	"media-platform/internal/adapter/presenter"       // ✅ presenter実装用
	"media-platform/internal/adapter/repository"      // ✅ repository実装用
	"media-platform/internal/infrastructure/database" // ✅ database DBConnインターフェース用
	"media-platform/internal/usecase/service"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
)

// SetupRouter はEcho APIルーターを設定します
func SetupRouter(e *echo.Echo, dbConn database.DBConn, jwtConfig *middleware.JWTConfig) {
	// CORS設定
	e.Use(echomiddleware.CORSWithConfig(echomiddleware.CORSConfig{
		AllowOrigins: []string{
			"http://localhost:3000", // React開発サーバー（デフォルト）
			"http://localhost:3001", // React開発サーバー（現在のポート）
			"http://localhost:3002", // その他のポート
		},
		AllowMethods: []string{
			echo.GET, echo.POST, echo.PUT, echo.PATCH, echo.DELETE, echo.HEAD, echo.OPTIONS,
		},
		AllowHeaders: []string{
			"Origin", "Content-Length", "Content-Type", "Authorization",
			"X-Requested-With", "Access-Control-Allow-Origin",
		},
		AllowCredentials: true,
	}))

	// 基本ミドルウェア
	e.Use(echomiddleware.Logger())
	e.Use(echomiddleware.Recover())

	// 依存関係の初期化
	setupDependencies(e, dbConn, jwtConfig)

	// ヘルスチェック
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	log.Println("✅ Echo API server configured")
	log.Println("🌐 CORS enabled for:")
	log.Println("  - http://localhost:3000")
	log.Println("  - http://localhost:3001")
	log.Println("  - http://localhost:3002")
}

// setupDependencies は依存関係を初期化し、ルートを設定します
func setupDependencies(e *echo.Echo, dbConn database.DBConn, jwtConfig *middleware.JWTConfig) {
	// Repository層の初期化
	userRepo := repository.NewUserRepository(dbConn.GetDB())
	categoryRepo := repository.NewCategoryRepository(dbConn.GetDB())
	contentRepo := repository.NewContentRepository(dbConn.GetDB())
	commentRepo := repository.NewCommentRepository(dbConn.GetDB())
	ratingRepo := repository.NewRatingRepository(dbConn.GetDB())

	// Presenter層の初期化（Controller用）
	userPresenter := presenter.NewUserPresenter()
	categoryPresenter := presenter.NewCategoryPresenter()
	contentPresenter := presenter.NewContentPresenter()
	commentPresenter := presenter.NewCommentPresenter()
	ratingPresenter := presenter.NewRatingPresenter()

	// Service層の初期化（Clean Architectureに準拠）
	// JWTトークンジェネレーターの実装が必要（TODO: 実装）
	// tokenGenerator := auth.NewJWTTokenGenerator("your-secret-key")

	userService := service.NewUserService(userRepo, nil) // tokenGeneratorを後で追加
	categoryService := service.NewCategoryService(categoryRepo)
	contentService := service.NewContentService(contentRepo, categoryRepo, userRepo)
	commentService := service.NewCommentService(commentRepo, contentRepo, userRepo)
	ratingService := service.NewRatingService(ratingRepo, contentRepo, userRepo)

	// Controller層の初期化
	userController := controller.NewUserController(userService, userPresenter)
	categoryController := controller.NewCategoryController(categoryService, categoryPresenter)
	contentController := controller.NewContentController(contentService, contentPresenter)
	commentController := controller.NewCommentController(commentService, commentPresenter)
	ratingController := controller.NewRatingController(ratingService, ratingPresenter)
	// ミドルウェアの設定
	authMiddleware := jwtConfig.AuthMiddleware()
	adminMiddleware := middleware.AdminMiddleware()

	// APIグループ
	api := e.Group("/api")

	// ユーザーAPI
	userRoutes := api.Group("/users")
	{
		// 認証不要
		userRoutes.POST("/register", userController.Register)
		userRoutes.POST("/login", userController.Login)
		userRoutes.GET("/public", userController.GetPublicUsers)

		// 認証必要
		userRoutes.GET("/me", userController.GetCurrentUser, authMiddleware)
		userRoutes.PUT("/me", userController.UpdateCurrentUser, authMiddleware)

		// 管理者限定
		userRoutes.GET("", userController.GetAllUsers, authMiddleware, adminMiddleware)
		userRoutes.GET("/:id", userController.GetUser, authMiddleware, adminMiddleware)
		userRoutes.PUT("/:id", userController.UpdateUserByAdmin, authMiddleware, adminMiddleware)
		userRoutes.DELETE("/:id", userController.DeleteUser, authMiddleware, adminMiddleware)

		// ユーザー評価履歴
		userRoutes.GET("/:id/ratings", ratingController.GetRatingsByUserID, authMiddleware)
		userRoutes.GET("/:id/liked-contents", ratingController.GetUserLikedContents, authMiddleware)
	}

	// カテゴリAPI
	categoryRoutes := api.Group("/categories")
	{
		// 認証不要
		categoryRoutes.GET("", categoryController.GetCategories)
		categoryRoutes.GET("/:id", categoryController.GetCategory)

		// 管理者限定
		categoryRoutes.POST("", categoryController.CreateCategory, authMiddleware, adminMiddleware)
		categoryRoutes.PUT("/:id", categoryController.UpdateCategory, authMiddleware, adminMiddleware)
		categoryRoutes.DELETE("/:id", categoryController.DeleteCategory, authMiddleware, adminMiddleware)
	}

	// コンテンツAPI
	contentRoutes := api.Group("/contents")
	{
		// 認証不要（公開コンテンツ）
		contentRoutes.GET("", contentController.GetContents)
		contentRoutes.GET("/published", contentController.GetPublishedContents)
		contentRoutes.GET("/trending", contentController.GetTrendingContents)
		contentRoutes.GET("/search", contentController.SearchContents)
		contentRoutes.GET("/author/:authorId", contentController.GetContentsByAuthor)
		contentRoutes.GET("/category/:categoryId", contentController.GetContentsByCategory)
		contentRoutes.GET("/:id", contentController.GetContent)

		// コメント関連
		contentRoutes.GET("/:id/comments", commentController.GetCommentsByContent)

		// 評価関連
		contentRoutes.GET("/:id/ratings", ratingController.GetRatingsByContentID)
		contentRoutes.GET("/:id/ratings/stats", ratingController.GetRatingStatsByContentID)
		contentRoutes.GET("/:id/ratings/user-status", ratingController.GetUserRatingStatus, authMiddleware)

		// 認証必要
		contentRoutes.POST("", contentController.CreateContent, authMiddleware)
		contentRoutes.PUT("/:id", contentController.UpdateContent, authMiddleware)
		contentRoutes.PATCH("/:id/status", contentController.UpdateContentStatus, authMiddleware)
		contentRoutes.DELETE("/:id", contentController.DeleteContent, authMiddleware)
	}

	// コメントAPI
	commentRoutes := api.Group("/comments")
	{
		// 認証不要（公開コメント）
		commentRoutes.GET("/:id", commentController.GetCommentByID)
		commentRoutes.GET("/parent/:parentId/replies", commentController.GetReplies)

		// 認証必要
		commentRoutes.POST("", commentController.CreateComment, authMiddleware)
		commentRoutes.PUT("/:id", commentController.UpdateComment, authMiddleware)
		commentRoutes.DELETE("/:id", commentController.DeleteComment, authMiddleware)
	}

	// 評価API（いいね機能）
	ratingRoutes := api.Group("/ratings")
	{
		// 認証必要
		ratingRoutes.POST("/create-or-update", ratingController.CreateOrUpdateRating, authMiddleware)
		ratingRoutes.DELETE("/:id", ratingController.DeleteRating, authMiddleware)

		// 統計情報（認証不要）
		ratingRoutes.GET("/top-contents", ratingController.GetTopRatedContents)
		ratingRoutes.POST("/bulk-stats", ratingController.GetBulkRatingStats)
	}

	// 管理者API
	adminRoutes := api.Group("/admin", authMiddleware, adminMiddleware)
	{
		// ユーザー管理
		adminRoutes.GET("/users", userController.GetAllUsers)
		adminRoutes.GET("/users/stats", userController.GetUserStats)

		// コンテンツ管理
		adminRoutes.GET("/contents/pending", contentController.GetPendingContents)
		adminRoutes.POST("/contents/:id/approve", contentController.ApproveContent)
		adminRoutes.POST("/contents/:id/reject", contentController.RejectContent)

		// システム統計
		adminRoutes.GET("/stats/dashboard", getAdminDashboard)
	}

	log.Println("✅ All routes configured:")
	log.Println("  📁 Users: /api/users")
	log.Println("  📁 Categories: /api/categories")
	log.Println("  📁 Contents: /api/contents")
	log.Println("  📁 Comments: /api/comments")
	log.Println("  📁 Ratings: /api/ratings")
	log.Println("  📁 Admin: /api/admin")
}

// getAdminDashboard は管理者ダッシュボード用の統計情報を返します
func getAdminDashboard(c echo.Context) error {
	// TODO: 実際の統計情報を取得する実装
	stats := map[string]interface{}{
		"total_users":      0,
		"total_contents":   0,
		"total_comments":   0,
		"total_ratings":    0,
		"pending_contents": 0,
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"status": "success",
		"data":   stats,
	})
}
