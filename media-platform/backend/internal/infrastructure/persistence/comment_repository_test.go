package persistence_test

import (
	"context"
	"database/sql"
	"media-platform/internal/domain/model"
	"media-platform/internal/infrastructure/persistence"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// テストデータベースのセットアップ
func setupCommentTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err, "Failed to open database connection")

	// テストテーブルの作成
	_, err = db.Exec(`
		CREATE TABLE comments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			body TEXT NOT NULL,
			user_id INTEGER NOT NULL,
			content_id INTEGER NOT NULL,
			parent_id INTEGER,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		)
	`)
	require.NoError(t, err, "Failed to create test table")

	return db
}

// テスト用のコメントデータを作成
func createTestComment() *model.Comment {
	now := time.Now()
	return &model.Comment{
		Body:      "テストコメント",
		UserID:    1,
		ContentID: 1,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// 返信コメントを作成
func createReplyComment(parentID int64) *model.Comment {
	comment := createTestComment()
	comment.ParentID = &parentID
	comment.Body = "返信コメント"
	return comment
}

func TestCommentRepository_Find(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// テストデータの作成
	testComment := createTestComment()
	err := repo.Create(ctx, testComment)
	require.NoError(t, err, "Failed to create test comment")
	assert.Greater(t, testComment.ID, int64(0), "Comment ID should be set after creation")

	// 正常系: 存在するコメントの取得
	t.Run("Success", func(t *testing.T) {
		comment, err := repo.Find(ctx, testComment.ID)
		require.NoError(t, err, "Error finding comment")
		assert.NotNil(t, comment, "Comment should not be nil")
		assert.Equal(t, testComment.ID, comment.ID, "Comment ID should match")
		assert.Equal(t, testComment.Body, comment.Body, "Comment body should match")
		assert.Equal(t, testComment.UserID, comment.UserID, "UserID should match")
		assert.Equal(t, testComment.ContentID, comment.ContentID, "ContentID should match")
		assert.Nil(t, comment.ParentID, "ParentID should be nil for top-level comment")
	})

	// 異常系: 存在しないIDの場合
	t.Run("NotFound", func(t *testing.T) {
		comment, err := repo.Find(ctx, 9999)
		require.NoError(t, err, "Error should be nil for non-existing comment")
		assert.Nil(t, comment, "Comment should be nil for non-existing ID")
	})
}

func TestCommentRepository_FindAll(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// テストデータの作成
	for i := 0; i < 5; i++ {
		comment := createTestComment()
		comment.Body = "コメント" + string(rune(i+48)) // 数字を文字列に変換
		err := repo.Create(ctx, comment)
		require.NoError(t, err, "Failed to create test comment")
	}

	// 返信コメントの作成
	replyComment := createReplyComment(1)
	err := repo.Create(ctx, replyComment)
	require.NoError(t, err, "Failed to create reply comment")

	// クエリの作成
	contentID := int64(1)
	limit := 10
	offset := 0
	query := &model.CommentQuery{
		ContentID: &contentID,
		Limit:     limit,
		Offset:    offset,
	}

	// 正常系: コンテンツIDによる検索
	t.Run("ByContentID", func(t *testing.T) {
		comments, err := repo.FindAll(ctx, query)
		require.NoError(t, err, "Error finding comments")
		assert.Len(t, comments, 5, "Should return 5 top-level comments")
	})

	// 親コメントのみを取得
	t.Run("TopLevelOnly", func(t *testing.T) {
		parentID := int64(0)
		query.ParentID = &parentID
		comments, err := repo.FindAll(ctx, query)
		require.NoError(t, err, "Error finding top-level comments")
		assert.Len(t, comments, 5, "Should return 5 top-level comments")
	})

	// 返信コメントのみを取得
	t.Run("RepliesOnly", func(t *testing.T) {
		parentID := int64(1)
		query.ParentID = &parentID
		comments, err := repo.FindAll(ctx, query)
		require.NoError(t, err, "Error finding reply comments")
		assert.Len(t, comments, 1, "Should return 1 reply comment")
		assert.Equal(t, "返信コメント", comments[0].Body, "Should be a reply comment")
	})

	// ページネーション
	t.Run("Pagination", func(t *testing.T) {
		query.ParentID = nil
		query.Limit = 2
		query.Offset = 0
		comments, err := repo.FindAll(ctx, query)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, comments, 2, "Should return 2 comments")

		query.Offset = 2
		comments, err = repo.FindAll(ctx, query)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, comments, 2, "Should return 2 comments")
	})
}

func TestCommentRepository_FindByContent(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// 異なるコンテンツIDを持つコメントを作成
	for i := 1; i <= 3; i++ {
		for j := 0; j < 2; j++ {
			comment := createTestComment()
			comment.ContentID = int64(i)
			comment.Body = "コンテンツ" + string(rune(i+48)) + "のコメント"
			err := repo.Create(ctx, comment)
			require.NoError(t, err, "Failed to create test comment")
		}
	}

	// 正常系: 特定のコンテンツIDによる検索
	t.Run("Success", func(t *testing.T) {
		comments, err := repo.FindByContent(ctx, 2, 10, 0)
		require.NoError(t, err, "Error finding comments by content")
		assert.Len(t, comments, 2, "Should return 2 comments for content ID 2")
		for _, comment := range comments {
			assert.Equal(t, int64(2), comment.ContentID, "All comments should have content ID 2")
		}
	})

	// 異常系: 存在しないコンテンツID
	t.Run("NonExistingContent", func(t *testing.T) {
		comments, err := repo.FindByContent(ctx, 999, 10, 0)
		require.NoError(t, err, "Error should be nil for non-existing content")
		assert.Len(t, comments, 0, "Should return empty slice for non-existing content")
	})

	// ページネーション
	t.Run("Pagination", func(t *testing.T) {
		comments, err := repo.FindByContent(ctx, 1, 1, 0)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, comments, 1, "Should return 1 comment with limit 1")

		comments, err = repo.FindByContent(ctx, 1, 1, 1)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, comments, 1, "Should return 1 comment with limit 1 and offset 1")
	})
}

func TestCommentRepository_FindByUser(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// 異なるユーザーIDを持つコメントを作成
	for i := 1; i <= 3; i++ {
		for j := 0; j < 2; j++ {
			comment := createTestComment()
			comment.UserID = int64(i)
			comment.Body = "ユーザー" + string(rune(i+48)) + "のコメント"
			err := repo.Create(ctx, comment)
			require.NoError(t, err, "Failed to create test comment")
		}
	}

	// 正常系: 特定のユーザーIDによる検索
	t.Run("Success", func(t *testing.T) {
		comments, err := repo.FindByUser(ctx, 2, 10, 0)
		require.NoError(t, err, "Error finding comments by user")
		assert.Len(t, comments, 2, "Should return 2 comments for user ID 2")
		for _, comment := range comments {
			assert.Equal(t, int64(2), comment.UserID, "All comments should have user ID 2")
		}
	})

	// 異常系: 存在しないユーザーID
	t.Run("NonExistingUser", func(t *testing.T) {
		comments, err := repo.FindByUser(ctx, 999, 10, 0)
		require.NoError(t, err, "Error should be nil for non-existing user")
		assert.Len(t, comments, 0, "Should return empty slice for non-existing user")
	})

	// ページネーション
	t.Run("Pagination", func(t *testing.T) {
		comments, err := repo.FindByUser(ctx, 1, 1, 0)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, comments, 1, "Should return 1 comment with limit 1")

		comments, err = repo.FindByUser(ctx, 1, 1, 1)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, comments, 1, "Should return 1 comment with limit 1 and offset 1")
	})
}

func TestCommentRepository_FindReplies(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// 親コメントの作成
	parentComment := createTestComment()
	err := repo.Create(ctx, parentComment)
	require.NoError(t, err, "Failed to create parent comment")

	// 返信コメントの作成
	for i := 0; i < 3; i++ {
		reply := createReplyComment(parentComment.ID)
		reply.Body = "返信" + string(rune(i+48))
		err := repo.Create(ctx, reply)
		require.NoError(t, err, "Failed to create reply comment")
	}

	// 別の親コメントの作成
	anotherParent := createTestComment()
	err = repo.Create(ctx, anotherParent)
	require.NoError(t, err, "Failed to create another parent comment")

	// 別の返信コメントの作成
	reply := createReplyComment(anotherParent.ID)
	err = repo.Create(ctx, reply)
	require.NoError(t, err, "Failed to create reply for another parent")

	// 正常系: 特定の親コメントに対する返信の検索
	t.Run("Success", func(t *testing.T) {
		replies, err := repo.FindReplies(ctx, parentComment.ID, 10, 0)
		require.NoError(t, err, "Error finding replies")
		assert.Len(t, replies, 3, "Should return 3 replies for parent comment")
		for _, reply := range replies {
			assert.NotNil(t, reply.ParentID, "Reply should have parent ID")
			assert.Equal(t, parentComment.ID, *reply.ParentID, "ParentID should match")
		}
	})

	// 異常系: 存在しない親コメントID
	t.Run("NonExistingParent", func(t *testing.T) {
		replies, err := repo.FindReplies(ctx, 999, 10, 0)
		require.NoError(t, err, "Error should be nil for non-existing parent")
		assert.Len(t, replies, 0, "Should return empty slice for non-existing parent")
	})

	// ページネーション
	t.Run("Pagination", func(t *testing.T) {
		replies, err := repo.FindReplies(ctx, parentComment.ID, 1, 0)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, replies, 1, "Should return 1 reply with limit 1")

		replies, err = repo.FindReplies(ctx, parentComment.ID, 1, 1)
		require.NoError(t, err, "Error with pagination")
		assert.Len(t, replies, 1, "Should return 1 reply with limit 1 and offset 1")
	})
}

func TestCommentRepository_Create(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// 正常系: 通常コメントの作成
	t.Run("NormalComment", func(t *testing.T) {
		comment := createTestComment()
		err := repo.Create(ctx, comment)
		require.NoError(t, err, "Failed to create comment")
		assert.Greater(t, comment.ID, int64(0), "Comment ID should be set")
		assert.False(t, comment.CreatedAt.IsZero(), "CreatedAt should be set")
		assert.False(t, comment.UpdatedAt.IsZero(), "UpdatedAt should be set")
	})

	// 正常系: 返信コメントの作成
	t.Run("ReplyComment", func(t *testing.T) {
		// 親コメントの作成
		parent := createTestComment()
		err := repo.Create(ctx, parent)
		require.NoError(t, err, "Failed to create parent comment")

		// 返信コメントの作成
		reply := createReplyComment(parent.ID)
		err = repo.Create(ctx, reply)
		require.NoError(t, err, "Failed to create reply comment")
		assert.Greater(t, reply.ID, int64(0), "Reply ID should be set")
		assert.NotNil(t, reply.ParentID, "ParentID should not be nil")
		assert.Equal(t, parent.ID, *reply.ParentID, "ParentID should match parent ID")
	})

	// 異常系: 必要なフィールドが不足
	t.Run("MissingRequiredFields", func(t *testing.T) {
		invalidComment := &model.Comment{
			// Bodyが空、UserIDとContentIDが0
		}
		err := repo.Create(ctx, invalidComment)
		assert.Error(t, err, "Should fail with missing required fields")
	})
}

func TestCommentRepository_Update(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// テストコメントの作成
	comment := createTestComment()
	err := repo.Create(ctx, comment)
	require.NoError(t, err, "Failed to create test comment")
	originalUpdatedAt := comment.UpdatedAt

	// 正常系: コメントの更新
	t.Run("Success", func(t *testing.T) {
		// 一時停止して時間差を作る
		time.Sleep(time.Millisecond * 10)

		// 更新
		comment.Body = "更新されたコメント"
		err := repo.Update(ctx, comment)
		require.NoError(t, err, "Failed to update comment")

		// 更新後のコメントを取得して確認
		updatedComment, err := repo.Find(ctx, comment.ID)
		require.NoError(t, err, "Failed to find updated comment")
		assert.Equal(t, "更新されたコメント", updatedComment.Body, "Body should be updated")
		assert.True(t, updatedComment.UpdatedAt.After(originalUpdatedAt), "UpdatedAt should be later")
	})

	// 異常系: 存在しないIDの更新
	t.Run("NonExistingID", func(t *testing.T) {
		nonExistingComment := &model.Comment{
			ID:   9999,
			Body: "存在しないコメント",
		}
		err := repo.Update(ctx, nonExistingComment)
		assert.Error(t, err, "Should return error for non-existing ID")
		assert.Contains(t, err.Error(), "コメントが見つかりません", "Error message should indicate comment not found")
	})
}

func TestCommentRepository_Delete(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// テストコメントの作成
	comment := createTestComment()
	err := repo.Create(ctx, comment)
	require.NoError(t, err, "Failed to create test comment")

	// 正常系: コメントの削除
	t.Run("Success", func(t *testing.T) {
		err := repo.Delete(ctx, comment.ID)
		require.NoError(t, err, "Failed to delete comment")

		// 削除されたことを確認
		deletedComment, err := repo.Find(ctx, comment.ID)
		require.NoError(t, err, "Error finding deleted comment")
		assert.Nil(t, deletedComment, "Comment should be nil after deletion")
	})

	// 異常系: 存在しないIDの削除
	t.Run("NonExistingID", func(t *testing.T) {
		err := repo.Delete(ctx, 9999)
		assert.Error(t, err, "Should return error for non-existing ID")
		assert.Contains(t, err.Error(), "コメントが見つかりません", "Error message should indicate comment not found")
	})
}

func TestCommentRepository_CountByContent(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// 異なるコンテンツIDを持つコメントを作成
	contentID := int64(42)
	for i := 0; i < 5; i++ {
		comment := createTestComment()
		comment.ContentID = contentID
		err := repo.Create(ctx, comment)
		require.NoError(t, err, "Failed to create test comment")
	}

	// 別のコンテンツIDを持つコメントを作成
	otherComment := createTestComment()
	otherComment.ContentID = 100
	err := repo.Create(ctx, otherComment)
	require.NoError(t, err, "Failed to create other comment")

	// 正常系: コンテンツIDによるカウント
	t.Run("Success", func(t *testing.T) {
		count, err := repo.CountByContent(ctx, contentID)
		require.NoError(t, err, "Error counting comments by content")
		assert.Equal(t, 5, count, "Should count 5 comments for content ID 42")
	})

	// 異常系: 存在しないコンテンツID
	t.Run("NonExistingContent", func(t *testing.T) {
		count, err := repo.CountByContent(ctx, 999)
		require.NoError(t, err, "Error should be nil for non-existing content")
		assert.Equal(t, 0, count, "Should count 0 comments for non-existing content")
	})
}

func TestCommentRepository_CountByUser(t *testing.T) {
	db := setupCommentTestDB(t)
	defer db.Close()

	repo := persistence.NewCommentRepository(db)
	ctx := context.Background()

	// 特定のユーザーIDを持つコメントを作成
	userID := int64(123)
	for i := 0; i < 3; i++ {
		comment := createTestComment()
		comment.UserID = userID
		err := repo.Create(ctx, comment)
		require.NoError(t, err, "Failed to create test comment")
	}

	// 別のユーザーIDを持つコメントを作成
	otherComment := createTestComment()
	otherComment.UserID = 456
	err := repo.Create(ctx, otherComment)
	require.NoError(t, err, "Failed to create other comment")

	// 正常系: ユーザーIDによるカウント
	t.Run("Success", func(t *testing.T) {
		count, err := repo.CountByUser(ctx, userID)
		require.NoError(t, err, "Error counting comments by user")
		assert.Equal(t, 3, count, "Should count 3 comments for user ID 123")
	})

	// 異常系: 存在しないユーザーID
	t.Run("NonExistingUser", func(t *testing.T) {
		count, err := repo.CountByUser(ctx, 999)
		require.NoError(t, err, "Error should be nil for non-existing user")
		assert.Equal(t, 0, count, "Should count 0 comments for non-existing user")
	})
}
