package api

import (
	"media-platform/internal/infrastructure/persistence"
	"media-platform/internal/usecase"

	"github.com/gin-gonic/gin"
)

// SetupRouter はAPIルーターを設定します
func SetupRouter(router *gin.Engine, db persistence.DBConn, jwtConfig *JWTConfig) {
	// ミドルウェアの設定
	authMiddleware := jwtConfig.AuthMiddleware()
	adminMiddleware := RoleMiddleware([]string{"admin"})

	// ユーザーAPI（既存）
	userRepo := persistence.NewUserRepository(db.GetDB())
	userUseCase := usecase.NewUserUseCase(userRepo)
	userHandler := NewUserHandler(userUseCase)

	userRoutes := router.Group("/api/users")
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

	// カテゴリAPI（新規追加）
	categoryRepo := persistence.NewCategoryRepository(db.GetDB())
	categoryUseCase := usecase.NewCategoryUseCase(categoryRepo)
	categoryHandler := NewCategoryHandler(categoryUseCase)

	categoryRoutes := router.Group("/api/categories")
	{
		// 認証不要のエンドポイント
		categoryRoutes.GET("", categoryHandler.GetAllCategories)
		categoryRoutes.GET("/:id", categoryHandler.GetCategoryByID)

		// 管理者のみのエンドポイント
		categoryRoutes.POST("", authMiddleware, adminMiddleware, categoryHandler.CreateCategory)
		categoryRoutes.PUT("/:id", authMiddleware, adminMiddleware, categoryHandler.UpdateCategory)
		categoryRoutes.DELETE("/:id", authMiddleware, adminMiddleware, categoryHandler.DeleteCategory)
	}

	//コンテンツAPI
	contentRepo := persistence.NewContentRepository(db.GetDB())
	contentUseCase := usecase.NewContentUseCase(contentRepo, categoryRepo, userRepo)
	contentHandler := NewContentHandler(contentUseCase)

	contentRoutes := router.Group("/api/contents")

	// 認証不要のエンドポイント（読み取り系）
	contentRoutes.GET("", contentHandler.GetContents)                                // すべてのコンテンツ取得（フィルタ可能）
	contentRoutes.GET("/published", contentHandler.GetPublishedContents)             // 公開済みコンテンツのみ取得
	contentRoutes.GET("/trending", contentHandler.GetTrendingContents)               // 人気のコンテンツ取得
	contentRoutes.GET("/search", contentHandler.SearchContents)                      // コンテンツ検索
	contentRoutes.GET("/author/:authorId", contentHandler.GetContentsByAuthor)       // 著者別コンテンツ取得
	contentRoutes.GET("/category/:categoryId", contentHandler.GetContentsByCategory) // カテゴリ別コンテンツ取得
	contentRoutes.GET("/:id", contentHandler.GetContentByID)                         // 特定のコンテンツ取得

	// 認証が必要なエンドポイント（書き込み系）
	contentRoutes.POST("", authMiddleware, contentHandler.CreateContent)                   // コンテンツ作成
	contentRoutes.PUT("/:id", authMiddleware, contentHandler.UpdateContent)                // コンテンツ更新
	contentRoutes.PATCH("/:id/status", authMiddleware, contentHandler.UpdateContentStatus) // ステータス更新
	contentRoutes.DELETE("/:id", authMiddleware, contentHandler.DeleteContent)             // コンテンツ削除

	// コメントAPI（新規追加）
	commentRepo := persistence.NewCommentRepository(db.GetDB())
	commentUseCase := usecase.NewCommentUseCase(commentRepo, contentRepo, userRepo)
	commentHandler := NewCommentHandler(commentUseCase)

	commentRoutes := router.Group("/api/comments")
	{
		// 認証不要のエンドポイント
		commentRoutes.GET("/parent/:parentId/replies", commentHandler.GetReplies) // コメント返信取得
		commentRoutes.GET("/:id", commentHandler.GetCommentByID)                  // 特定のコメント取得

		// 認証が必要なエンドポイント
		commentRoutes.POST("", authMiddleware, commentHandler.CreateComment)       // コメント作成
		commentRoutes.PUT("/:id", authMiddleware, commentHandler.UpdateComment)    // コメント編集
		commentRoutes.DELETE("/:id", authMiddleware, commentHandler.DeleteComment) // コメント削除
	}

	// 評価API
	ratingRepo := persistence.NewRatingRepository(db.GetDB())
	ratingUseCase := usecase.NewRatingUseCase(ratingRepo, contentRepo)
	ratingHandler := NewRatingHandler(ratingUseCase)

	// 評価管理API - パラメーター名を :id に統一
	router.GET("/api/contents/:id/ratings", ratingHandler.GetRatingsByContentID)              // コンテンツに対する評価一覧
	router.GET("/api/contents/:id/rating/average", ratingHandler.GetAverageRatingByContentID) // コンテンツの平均評価
	router.GET("/api/users/:id/ratings", ratingHandler.GetRatingsByUserID)                    // ユーザーが投稿した評価一覧
	router.POST("/api/ratings", authMiddleware, ratingHandler.CreateOrUpdateRating)           // 評価の投稿/更新
	router.DELETE("/api/ratings/:id", authMiddleware, ratingHandler.DeleteRating)             // 評価の削除

	// ヘルスチェックエンドポイント
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// フロントエンドルートの設定
	setupFrontendRoutes(router, authMiddleware)
}

// setupFrontendRoutes フロントエンドルートを設定
func setupFrontendRoutes(router *gin.Engine, authMiddleware gin.HandlerFunc) {
	// ホームページ
	router.GET("/", func(c *gin.Context) {
		c.HTML(200, "index.html", gin.H{
			"title": "メディアプラットフォーム",
		})
	})

	// 認証ページ
	router.GET("/login", func(c *gin.Context) {
		c.HTML(200, "login.html", gin.H{
			"title": "ログイン",
		})
	})

	router.GET("/register", func(c *gin.Context) {
		c.HTML(200, "register.html", gin.H{
			"title": "アカウント登録",
		})
	})

	// プロフィールページ（認証必須）
	router.GET("/profile", authMiddleware, func(c *gin.Context) {
		c.HTML(200, "profile.html", gin.H{
			"title": "マイプロフィール",
		})
	})

	// コンテンツ関連ページ
	router.GET("/contents", func(c *gin.Context) {
		c.HTML(200, "contents.html", gin.H{
			"title": "コンテンツ一覧",
		})
	})

	// より具体的なルートを先に定義
	router.GET("/contents/create", authMiddleware, func(c *gin.Context) {
		c.HTML(200, "content-create.html", gin.H{
			"title": "コンテンツ作成",
		})
	})

	router.GET("/contents/:id", func(c *gin.Context) {
		contentID := c.Param("id")
		c.HTML(200, "content-detail.html", gin.H{
			"title":     "コンテンツ詳細",
			"contentID": contentID,
		})
	})

	router.GET("/contents/:id/edit", authMiddleware, func(c *gin.Context) {
		contentID := c.Param("id")
		c.HTML(200, "content-edit.html", gin.H{
			"title":     "コンテンツ編集",
			"contentID": contentID,
		})
	})
}
