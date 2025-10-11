package router

import (
	"log"
	"net/http"

	"media-platform/internal/adapter/controller"
	"media-platform/internal/adapter/middleware"
	"media-platform/internal/adapter/presenter"
	"media-platform/internal/adapter/repository"
	"media-platform/internal/infrastructure/database"
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

	log.Println("✅ Echo API server configured with Clean Architecture")
	log.Println("🌐 CORS enabled for:")
	log.Println("  - http://localhost:3000")
	log.Println("  - http://localhost:3001")
	log.Println("  - http://localhost:3002")
}

// setupDependencies は依存関係を初期化し、ルートを設定します
func setupDependencies(e *echo.Echo, dbConn database.DBConn, jwtConfig *middleware.JWTConfig) {
	// Repository層の初期化（Infrastructure Layer）
	userRepo := repository.NewUserRepository(dbConn.GetDB())
	categoryRepo := repository.NewCategoryRepository(dbConn.GetDB())
	contentRepo := repository.NewContentRepository(dbConn.GetDB())
	commentRepo := repository.NewCommentRepository(dbConn.GetDB())
	ratingRepo := repository.NewRatingRepository(dbConn.GetDB())

	// Presenter層の初期化（Adapter Layer）
	userPresenter := presenter.NewUserPresenter()
	categoryPresenter := presenter.NewCategoryPresenter()
	contentPresenter := presenter.NewContentPresenter()
	commentPresenter := presenter.NewCommentPresenter()
	ratingPresenter := presenter.NewRatingPresenter()

	// Service層の初期化（Use Case Layer - Clean Architecture対応）
	// ✅ Presenterへの依存を除去し、純粋なビジネスロジック層として実装
	userService := service.NewUserService(userRepo, nil) // tokenGeneratorは後で実装
	categoryService := service.NewCategoryService(categoryRepo)
	contentService := service.NewContentService(contentRepo, categoryRepo, userRepo)
	commentService := service.NewCommentService(commentRepo, contentRepo, userRepo)
	ratingService := service.NewRatingService(ratingRepo, contentRepo, userRepo)

	// Controller層の初期化（Adapter Layer）
	// ✅ ControllerはServiceとPresenterの両方を受け取り、適切に依存関係を管理
	userController := controller.NewUserController(userService, userPresenter)
	categoryController := controller.NewCategoryController(categoryService, categoryPresenter)
	contentController := controller.NewContentController(contentService, contentPresenter)
	commentController := controller.NewCommentController(commentService, commentPresenter)
	ratingController := controller.NewRatingController(ratingService, ratingPresenter)

	// ミドルウェアの設定
	authMiddleware := jwtConfig.AuthMiddleware()
	adminMiddleware := middleware.AdminMiddleware()

	// APIグループ設定
	api := e.Group("/api")

	// ========== ユーザーAPI ==========
	userRoutes := api.Group("/users")
	{
		// 認証不要エンドポイント
		userRoutes.POST("/register", userController.Register)
		userRoutes.POST("/login", userController.Login)
		userRoutes.GET("/public", userController.GetPublicUsers)

		// 認証必要エンドポイント
		userRoutes.GET("/me", userController.GetCurrentUser, authMiddleware)
		userRoutes.PUT("/me", userController.UpdateCurrentUser, authMiddleware)

		// 管理者限定エンドポイント
		userRoutes.GET("", userController.GetAllUsers, authMiddleware, adminMiddleware)
		userRoutes.GET("/:id", userController.GetUser, authMiddleware, adminMiddleware)
		userRoutes.PUT("/:id", userController.UpdateUserByAdmin, authMiddleware, adminMiddleware)
		userRoutes.DELETE("/:id", userController.DeleteUser, authMiddleware, adminMiddleware)

		// ユーザー関連の評価履歴
		userRoutes.GET("/:userId/ratings", ratingController.GetRatingsByUserID, authMiddleware)
		userRoutes.GET("/:userId/liked-contents", ratingController.GetUserLikedContents, authMiddleware)
	}

	// ========== カテゴリAPI ==========
	categoryRoutes := api.Group("/categories")
	{
		// 認証不要エンドポイント
		categoryRoutes.GET("", categoryController.GetCategories)
		categoryRoutes.GET("/:id", categoryController.GetCategory)

		// 管理者限定エンドポイント
		categoryRoutes.POST("", categoryController.CreateCategory, authMiddleware, adminMiddleware)
		categoryRoutes.PUT("/:id", categoryController.UpdateCategory, authMiddleware, adminMiddleware)
		categoryRoutes.DELETE("/:id", categoryController.DeleteCategory, authMiddleware, adminMiddleware)
	}

	// ========== コンテンツAPI ==========
	contentRoutes := api.Group("/contents")
	{
		// 認証不要エンドポイント（公開コンテンツ）
		contentRoutes.GET("", contentController.GetContents)
		contentRoutes.GET("/published", contentController.GetPublishedContents)
		contentRoutes.GET("/trending", contentController.GetTrendingContents)
		contentRoutes.GET("/search", contentController.SearchContents)
		contentRoutes.GET("/author/:authorId", contentController.GetContentsByAuthor)
		contentRoutes.GET("/category/:categoryId", contentController.GetContentsByCategory)
		contentRoutes.GET("/:id", contentController.GetContent)

		// コメント関連（コンテンツに紐づく）
		contentRoutes.GET("/:contentId/comments", commentController.GetCommentsByContent)

		// 評価関連（コンテンツに紐づく）
		contentRoutes.GET("/:contentId/ratings", ratingController.GetRatingsByContentID)
		contentRoutes.GET("/:contentId/ratings/stats", ratingController.GetGoodStatsByContentID)
		contentRoutes.GET("/:contentId/ratings/user-status", ratingController.GetUserRatingStatus, authMiddleware)

		// 認証必要エンドポイント
		contentRoutes.POST("", contentController.CreateContent, authMiddleware)
		contentRoutes.PUT("/:id", contentController.UpdateContent, authMiddleware)
		contentRoutes.PATCH("/:id/status", contentController.UpdateContentStatus, authMiddleware)
		contentRoutes.DELETE("/:id", contentController.DeleteContent, authMiddleware)
	}

	// ========== コメントAPI ==========
	commentRoutes := api.Group("/comments")
	{
		// 認証不要エンドポイント（公開コメント）
		commentRoutes.GET("/:id", commentController.GetComment)
		commentRoutes.GET("/parent/:parentId/replies", commentController.GetReplies)

		// 認証必要エンドポイント
		commentRoutes.POST("", commentController.CreateComment, authMiddleware)
		commentRoutes.PUT("/:id", commentController.UpdateComment, authMiddleware)
		commentRoutes.DELETE("/:id", commentController.DeleteComment, authMiddleware)
	}

	// ========== 評価API（いいね機能） ==========
	ratingRoutes := api.Group("/ratings")
	{
		// 認証必要エンドポイント
		ratingRoutes.POST("/create-or-update", ratingController.CreateRating, authMiddleware)
		ratingRoutes.DELETE("/:id", ratingController.DeleteRating, authMiddleware)

		// 認証不要エンドポイント（統計情報）
		ratingRoutes.GET("/top-contents", ratingController.GetTopRatedContents)
		ratingRoutes.POST("/bulk-stats", ratingController.GetBulkRatingStats)

		// いいねトグル機能
		ratingRoutes.POST("/toggle/:contentId", ratingController.ToggleLike, authMiddleware)
	}

	// ========== 管理者API ==========
	adminRoutes := api.Group("/admin", authMiddleware, adminMiddleware)
	{
		// ユーザー管理
		adminRoutes.GET("/users", userController.GetAllUsers)

		// TODO: 将来的に必要に応じて以下の機能を実装
		// - ユーザー統計: GET /users/stats
		// - コンテンツモデレーション: GET /contents/pending
		// - コンテンツ承認/却下: POST /contents/:id/approve, POST /contents/:id/reject
		// - ダッシュボード統計: GET /stats/dashboard
	}

	// 設定完了ログ
	log.Println("✅ All routes configured with Clean Architecture:")
	log.Println("  📁 Users: /api/users")
	log.Println("  📁 Categories: /api/categories")
	log.Println("  📁 Contents: /api/contents")
	log.Println("  📁 Comments: /api/comments")
	log.Println("  📁 Ratings: /api/ratings")
	log.Println("  📁 Admin: /api/admin")
	log.Println("  🏥 Health: /health")
}
