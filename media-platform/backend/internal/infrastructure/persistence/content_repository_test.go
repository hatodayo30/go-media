package persistence_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"media-platform/internal/domain/model"
	"media-platform/internal/infrastructure/persistence"
)

func setupContentTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	require.NoError(t, err)

	// テスト用のテーブルを作成
	_, err = db.Exec(`
		CREATE TABLE contents (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			body TEXT NOT NULL,
			type TEXT NOT NULL,
			author_id INTEGER NOT NULL,
			category_id INTEGER NOT NULL,
			status TEXT NOT NULL,
			view_count INTEGER NOT NULL DEFAULT 0,
			published_at TIMESTAMP NULL,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		)
	`)
	require.NoError(t, err)

	return db
}

func insertTestContent(t *testing.T, db *sql.DB) {
	now := time.Now()
	publishedTime := now.Add(-24 * time.Hour)

	_, err := db.Exec(`
		INSERT INTO contents 
		(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"テスト記事", "これはテスト記事の本文です", "article", 1, 2, "published", 100, publishedTime, now, now)

	require.NoError(t, err)
}

func TestContentRepositoryImpl_Find(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	insertTestContent(t, db)

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// 正常系: 存在するコンテンツの取得
	content, err := repo.Find(ctx, 1)
	require.NoError(t, err)
	assert.NotNil(t, content)
	assert.Equal(t, "テスト記事", content.Title)
	assert.Equal(t, "これはテスト記事の本文です", content.Body)
	assert.Equal(t, "article", content.Type)
	assert.Equal(t, int64(1), content.AuthorID)
	assert.Equal(t, int64(2), content.CategoryID)
	assert.Equal(t, "published", content.Status)
	assert.Equal(t, int(100), content.ViewCount)
	assert.NotNil(t, content.PublishedAt)

	// 異常系: 存在しないコンテンツの取得
	content, err = repo.Find(ctx, 999)
	require.NoError(t, err)
	assert.Nil(t, content)
}

func TestContentRepositoryImpl_FindAll(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	// 複数のテストデータを挿入
	now := time.Now()
	for i := 0; i < 5; i++ {
		_, err := db.Exec(`
			INSERT INTO contents 
			(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			"テスト記事"+string(rune(i+48)), "本文"+string(rune(i+48)), "article", i%2+1, 2, "published", i*10, now.Add(-time.Duration(i)*time.Hour), now, now)
		require.NoError(t, err)
	}

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// クエリ設定
	authorID := int64(1)
	query := &model.ContentQuery{
		AuthorID: &authorID,
		Limit:    10,
		Offset:   0,
	}

	// 著者IDでフィルタリング
	contents, err := repo.FindAll(ctx, query)
	require.NoError(t, err)
	assert.Equal(t, 3, len(contents)) // 著者ID=1のコンテンツは3つ
	for _, content := range contents {
		assert.Equal(t, int64(1), content.AuthorID)
	}

	// カウント確認
	count, err := repo.CountAll(ctx, query)
	require.NoError(t, err)
	assert.Equal(t, 3, count)
}

func TestContentRepositoryImpl_Create(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// 新規コンテンツの作成
	newContent := &model.Content{
		Title:      "新規記事",
		Body:       "新規記事の本文です",
		Type:       "article",
		AuthorID:   1,
		CategoryID: 3,
		Status:     "draft",
		ViewCount:  0,
	}

	err := repo.Create(ctx, newContent)
	require.NoError(t, err)
	assert.Equal(t, int64(1), newContent.ID) // 自動採番で1が割り当てられる

	// DBから取得して確認
	createdContent, err := repo.Find(ctx, newContent.ID)
	require.NoError(t, err)
	assert.Equal(t, "新規記事", createdContent.Title)
	assert.Equal(t, "draft", createdContent.Status)
	assert.Nil(t, createdContent.PublishedAt) // 下書きなので公開日時はnull
}

func TestContentRepositoryImpl_Update(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	insertTestContent(t, db)

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// 既存コンテンツの取得
	content, err := repo.Find(ctx, 1)
	require.NoError(t, err)

	// コンテンツの更新
	content.Title = "更新後のタイトル"
	content.Body = "更新後の本文"
	content.Status = "draft" // 公開から下書きに変更

	err = repo.Update(ctx, content)
	require.NoError(t, err)

	// 更新後のコンテンツを取得して確認
	updatedContent, err := repo.Find(ctx, 1)
	require.NoError(t, err)
	assert.Equal(t, "更新後のタイトル", updatedContent.Title)
	assert.Equal(t, "更新後の本文", updatedContent.Body)
	assert.Equal(t, "draft", updatedContent.Status)
	assert.NotNil(t, updatedContent.PublishedAt) // 公開日時は保持される
}

func TestContentRepositoryImpl_Delete(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	insertTestContent(t, db)

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// 削除前の確認
	content, err := repo.Find(ctx, 1)
	require.NoError(t, err)
	assert.NotNil(t, content)

	// コンテンツの削除
	err = repo.Delete(ctx, 1)
	require.NoError(t, err)

	// 削除後の確認
	content, err = repo.Find(ctx, 1)
	require.NoError(t, err)
	assert.Nil(t, content) // 削除されているのでnilが返る

	// 存在しないコンテンツの削除
	err = repo.Delete(ctx, 999)
	assert.Error(t, err) // エラーが返る
	assert.Contains(t, err.Error(), "コンテンツが見つかりません")
}

func TestContentRepositoryImpl_IncrementViewCount(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	insertTestContent(t, db)

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// 初期閲覧数の確認
	content, err := repo.Find(ctx, 1)
	require.NoError(t, err)
	assert.Equal(t, 100, content.ViewCount)

	// 閲覧数のインクリメント
	err = repo.IncrementViewCount(ctx, 1)
	require.NoError(t, err)

	// インクリメント後の確認
	updatedContent, err := repo.Find(ctx, 1)
	require.NoError(t, err)
	assert.Equal(t, 101, updatedContent.ViewCount)
}

func TestContentRepositoryImpl_FindByAuthor(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	// 複数の著者のテストデータを挿入
	now := time.Now()
	for i := 0; i < 5; i++ {
		authorID := i%2 + 1 // 1または2の著者ID
		_, err := db.Exec(`
			INSERT INTO contents 
			(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			"著者"+string(rune(authorID+48))+"の記事", "本文", "article", authorID, 2, "published", i*10, now.Add(-time.Duration(i)*time.Hour), now, now)
		require.NoError(t, err)
	}

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// 著者1のコンテンツ取得
	contents, err := repo.FindByAuthor(ctx, 1, 10, 0)
	require.NoError(t, err)
	assert.Equal(t, 3, len(contents)) // 著者1のコンテンツは3つ
	for _, content := range contents {
		assert.Equal(t, int64(1), content.AuthorID)
	}

	// 著者2のコンテンツ取得
	contents, err = repo.FindByAuthor(ctx, 2, 10, 0)
	require.NoError(t, err)
	assert.Equal(t, 2, len(contents)) // 著者2のコンテンツは2つ
	for _, content := range contents {
		assert.Equal(t, int64(2), content.AuthorID)
	}
}

func TestContentRepositoryImpl_FindByCategory(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	// 複数のカテゴリのテストデータを挿入
	now := time.Now()
	publishedTime := now.Add(-24 * time.Hour)

	for i := 0; i < 5; i++ {
		categoryID := i%2 + 1 // 1または2のカテゴリID
		status := "published"
		if i == 4 {
			status = "draft" // 1つは下書き状態
		}

		_, err := db.Exec(`
			INSERT INTO contents 
			(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			"カテゴリ"+string(rune(categoryID+48))+"の記事", "本文", "article", 1, categoryID, status, i*10, publishedTime, now, now)
		require.NoError(t, err)
	}

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// カテゴリ1のコンテンツ取得（公開済みのみ）
	contents, err := repo.FindByCategory(ctx, 1, 10, 0)
	require.NoError(t, err)
	assert.Equal(t, 2, len(contents)) // カテゴリ1の公開記事は2つ
	for _, content := range contents {
		assert.Equal(t, int64(1), content.CategoryID)
		assert.Equal(t, "published", content.Status)
	}
}

func TestContentRepositoryImpl_Search(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	// 検索用のテストデータを挿入
	now := time.Now()
	publishedTime := now.Add(-24 * time.Hour)

	_, err := db.Exec(`
		INSERT INTO contents 
		(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"Goプログラミング入門", "Go言語でのプログラミングの基礎を解説します。", "article", 1, 1, "published", 100, publishedTime, now, now)
	require.NoError(t, err)

	_, err = db.Exec(`
		INSERT INTO contents 
		(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"Pythonでデータ分析", "Pythonを使ったデータ分析の手法について解説します。", "article", 1, 1, "published", 50, publishedTime, now, now)
	require.NoError(t, err)

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// キーワード「Go」で検索
	contents, err := repo.Search(ctx, "Go", 10, 0)
	require.NoError(t, err)
	assert.Equal(t, 1, len(contents))
	assert.Contains(t, contents[0].Title, "Go")

	// キーワード「プログラミング」で検索
	contents, err = repo.Search(ctx, "プログラミング", 10, 0)
	require.NoError(t, err)
	assert.Equal(t, 1, len(contents))
	assert.Contains(t, contents[0].Body, "プログラミング")

	// 存在しないキーワードで検索
	contents, err = repo.Search(ctx, "JavaScript", 10, 0)
	require.NoError(t, err)
	assert.Equal(t, 0, len(contents))
}

func TestContentRepositoryImpl_FindPublished(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	// 公開状態と下書き状態のテストデータを挿入
	now := time.Now()
	publishedTime := now.Add(-24 * time.Hour)
	futureTime := now.Add(24 * time.Hour) // 未来の公開日

	// 通常の公開記事
	_, err := db.Exec(`
		INSERT INTO contents 
		(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"公開記事1", "本文", "article", 1, 1, "published", 100, publishedTime, now, now)
	require.NoError(t, err)

	// 下書き記事
	_, err = db.Exec(`
		INSERT INTO contents 
		(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"下書き記事", "本文", "article", 1, 1, "draft", 0, nil, now, now)
	require.NoError(t, err)

	// 未来の公開日の記事
	_, err = db.Exec(`
		INSERT INTO contents 
		(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"予約公開記事", "本文", "article", 1, 1, "published", 0, futureTime, now, now)
	require.NoError(t, err)

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// 公開済みのコンテンツ取得
	contents, err := repo.FindPublished(ctx, 10, 0)
	require.NoError(t, err)
	assert.Equal(t, 1, len(contents)) // 現在公開中の記事は1つだけ
	assert.Equal(t, "公開記事1", contents[0].Title)
}

func TestContentRepositoryImpl_FindTrending(t *testing.T) {
	db := setupContentTestDB(t)
	defer db.Close()

	// 異なる閲覧数のテストデータを挿入
	now := time.Now()
	publishedTime := now.Add(-24 * time.Hour)

	viewCounts := []int{50, 200, 30, 150, 100}
	for i, count := range viewCounts {
		_, err := db.Exec(`
			INSERT INTO contents 
			(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
			"記事"+string(rune(i+48)), "本文", "article", 1, 1, "published", count, publishedTime, now, now)
		require.NoError(t, err)
	}

	// 1つは下書き状態の高閲覧数記事を追加
	_, err := db.Exec(`
		INSERT INTO contents 
		(title, body, type, author_id, category_id, status, view_count, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		"下書き人気記事", "本文", "article", 1, 1, "draft", 300, nil, now, now)
	require.NoError(t, err)

	repo := persistence.NewContentRepository(db)
	ctx := context.Background()

	// トレンド記事の取得（上位3件）
	contents, err := repo.FindTrending(ctx, 3)
	require.NoError(t, err)
	assert.Equal(t, 3, len(contents))

	// 閲覧数の降順になっていることを確認
	assert.Equal(t, 200, contents[0].ViewCount)
	assert.Equal(t, 150, contents[1].ViewCount)
	assert.Equal(t, 100, contents[2].ViewCount)
}
