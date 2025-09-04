package http

import (
	"log"
	"net/http"

	"media-platform/internal/application/service"
	"media-platform/internal/controller/middleware"
	"media-platform/internal/infrastructure/repository"
	"media-platform/internal/presentation/presenter"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
)

// SetupRouter はEcho APIルーターを設定します
func SetupRouter(e *echo.Echo, dbConn repository.DBConn, jwtConfig *middleware.JWTConfig) {
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
func setupDependencies(e *echo.Echo, dbConn repository.DBConn, jwtConfig *middleware.JWTConfig) {
	// Repository層の初期化
	userRepo := repository.NewUserRepository(dbConn.GetDB())
	categoryRepo := repository.NewCategoryRepository(dbConn.GetDB())
	contentRepo := repository.NewContentRepository(dbConn.GetDB())
	commentRepo := repository.NewCommentRepository(dbConn.GetDB())
	ratingRepo := repository.NewRatingRepository(dbConn.GetDB())

	// Presenter層の初期化
	userPresenter := presenter.NewUserPresenter()
	categoryPresenter := presenter.NewCategoryPresenter()
	contentPresenter := presenter.NewContentPresenter()
	// commentPresenter := presenter.NewCommentPresenter()
	// ratingPresenter := presenter.NewRatingPresenter()

	// Service層の初期化
	userService := service.NewUserService(userRepo, userPresenter)
	categoryService := service.NewCategoryService(categoryRepo, categoryPresenter)
	contentService := service.NewContentService(contentRepo, categoryRepo, userRepo, contentPresenter)
	// commentService := service.NewCommentService(commentRepo, contentRepo, userRepo, commentPresenter)
	// ratingService := service.NewRatingService(ratingRepo, contentRepo, ratingPresenter)

	// Controller層の初期化
	userController := NewUserController(userService)
	categoryController := NewCategoryController(categoryService)
	contentController := NewContentController(contentService)
	// commentController := NewCommentController(commentService)
	// ratingController := NewRatingController(ratingService)

	// ミドルウェアの設定
	authMiddleware := jwtConfig.AuthMiddleware()
	adminMiddleware := middleware.AdminMiddleware()

	// APIグループ
	api := e.Group("/api")

	// ユーザーAPI
	userRoutes := api.Group("/users")
	{
		userRoutes.POST("/register", userController.Register)
		userRoutes.POST("/login", userController.Login)
		userRoutes.GET("/me", userController.GetCurrentUser, authMiddleware)
		userRoutes.PUT("/me", userController.UpdateCurrentUser, authMiddleware)
		userRoutes.GET("/public", userController.GetPublicUsers, authMiddleware)
		userRoutes.GET("", userController.GetAllUsers, authMiddleware, adminMiddleware)
		userRoutes.GET("/:id", userController.GetUser, authMiddleware, adminMiddleware)
		userRoutes.PUT("/:id", userController.UpdateUserByAdmin, authMiddleware, adminMiddleware)
		userRoutes.DELETE("/:id", userController.DeleteUser, authMiddleware, adminMiddleware)

		// 評価関連（将来実装）
		// userRoutes.GET("/:id/ratings", ratingController.GetRatingsByUserID)
	}

	// カテゴリAPI
	categoryRoutes := api.Group("/categories")
	{
		categoryRoutes.GET("", categoryController.GetCategories)
		categoryRoutes.GET("/:id", categoryController.GetCategory)
		categoryRoutes.POST("", categoryController.CreateCategory, authMiddleware, adminMiddleware)
		categoryRoutes.PUT("/:id", categoryController.UpdateCategory, authMiddleware, adminMiddleware)
		categoryRoutes.DELETE("/:id", categoryController.DeleteCategory, authMiddleware, adminMiddleware)
	}

	// コンテンツAPI
	contentRoutes := api.Group("/contents")
	{
		contentRoutes.GET("", contentController.GetContents)
		contentRoutes.GET("/published", contentController.GetPublishedContents)
		contentRoutes.GET("/trending", contentController.GetTrendingContents)
		contentRoutes.GET("/search", contentController.SearchContents)
		contentRoutes.GET("/author/:authorId", contentController.GetContentsByAuthor)
		contentRoutes.GET("/category/:categoryId", contentController.GetContentsByCategory)
		
		// コメント関連（将来実装）
		// contentRoutes.GET("/:id/comments", commentController.GetCommentsByContent)
		
		// 評価関連（将来実装）
		// contentRoutes.GET("/:id/ratings", ratingController.GetRatingsByContentID)
		// contentRoutes.GET("/:id/ratings/average", ratingController.GetAverageRatingByContentID)

		contentRoutes.GET("/:id", contentController.GetContent)
		contentRoutes.POST("", contentController.CreateContent, authMiddleware)
		contentRoutes.PUT("/:id", contentController.UpdateContent, authMiddleware)
		contentRoutes.PATCH("/:id/status", contentController.UpdateContentStatus, authMiddleware)
		contentRoutes.DELETE("/:id", contentController.DeleteContent, authMiddleware)
	}

	// コメントAPI（将来実装）
	// commentRoutes := api.Group("/comments")
	// {
	// 	commentRoutes.GET("/parent/:parentId/replies", commentController.GetReplies)
	// 	commentRoutes.GET("/:id", commentController.GetCommentByID)
	// 	commentRoutes.POST("", commentController.CreateComment, authMiddleware)
	// 	commentRoutes.PUT("/:id", commentController.UpdateComment, authMiddleware)
	// 	commentRoutes.DELETE("/:id", commentController.DeleteComment, authMiddleware)
	// }

	// 評価API（将来実装）
	// ratingRoutes := api.Group("/ratings")
	// {
	// 	ratingRoutes.POST("", ratingController.CreateRating, authMiddleware)
	// 	ratingRoutes.DELETE("/:id", ratingController.DeleteRating, authMiddleware)
	// }