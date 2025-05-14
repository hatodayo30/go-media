// persistence/rating_repository_test.go
package persistence

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"media-platform/internal/domain/model"

	_ "github.com/mattn/go-sqlite3"
	"github.com/stretchr/testify/assert"
)

// テスト用データベースのセットアップ
func setupRatingDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("データベース接続の作成に失敗しました: %v", err)
	}

	// テスト用テーブルの作成
	_, err = db.Exec(`
		CREATE TABLE ratings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			value INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
			content_id INTEGER NOT NULL,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			UNIQUE(user_id, content_id)
		)
	`)
	if err != nil {
		t.Fatalf("テーブル作成に失敗しました: %v", err)
	}

	return db
}

// テスト用評価データの作成
func createTestRating(t *testing.T, db *sql.DB, userID, contentID int64, value int) *model.Rating {
	now := time.Now()
	rating := &model.Rating{
		Value:     value,
		UserID:    userID,
		ContentID: contentID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// 評価を挿入して生成されたIDを取得
	result, err := db.Exec(
		"INSERT INTO ratings (value, user_id, content_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
		rating.Value, rating.UserID, rating.ContentID, rating.CreatedAt, rating.UpdatedAt,
	)
	if err != nil {
		t.Fatalf("テスト評価の挿入に失敗しました: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		t.Fatalf("挿入されたIDの取得に失敗しました: %v", err)
	}
	rating.ID = id

	return rating
}

// FindByContentID メソッドのテスト
func TestFindByContentID(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト用の評価を複数作成
	rating1 := createTestRating(t, db, 101, 1, 4)
	rating2 := createTestRating(t, db, 102, 1, 5)
	createTestRating(t, db, 103, 2, 3) // 別のコンテンツID

	// テストケース1: 存在するコンテンツIDの評価を検索
	foundRatings, err := repo.FindByContentID(ctx, 1)

	assert.NoError(t, err)
	assert.Len(t, foundRatings, 2)
	// 返却される順序はcreated_at DESCのため、後に作成されたrating2が先になる
	assert.Equal(t, rating2.ID, foundRatings[0].ID)
	assert.Equal(t, rating1.ID, foundRatings[1].ID)

	// テストケース2: 存在するが評価がないコンテンツIDを検索
	emptyRatings, err := repo.FindByContentID(ctx, 3)

	assert.NoError(t, err)
	assert.Len(t, emptyRatings, 0)

	// テストケース3: 不正なコンテンツIDでの検索
	_, err = repo.FindByContentID(ctx, 0)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "コンテンツIDは正の整数である必要があります")
}

// FindByUserID メソッドのテスト
func TestFindByUserID(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト用の評価を複数作成
	rating1 := createTestRating(t, db, 101, 1, 4)
	rating2 := createTestRating(t, db, 101, 2, 5) // 同じユーザー、別コンテンツ
	createTestRating(t, db, 102, 1, 3)            // 別のユーザー

	// テストケース1: 存在するユーザーIDの評価を検索
	foundRatings, err := repo.FindByUserID(ctx, 101)

	assert.NoError(t, err)
	assert.Len(t, foundRatings, 2)
	// 返却される順序はcreated_at DESCのため、後に作成されたrating2が先になる
	assert.Equal(t, rating2.ID, foundRatings[0].ID)
	assert.Equal(t, rating1.ID, foundRatings[1].ID)

	// テストケース2: 存在するが評価がないユーザーIDを検索
	emptyRatings, err := repo.FindByUserID(ctx, 103)

	assert.NoError(t, err)
	assert.Len(t, emptyRatings, 0)

	// テストケース3: 不正なユーザーIDでの検索
	_, err = repo.FindByUserID(ctx, 0)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ユーザーIDは正の整数である必要があります")
}

// FindByID メソッドのテスト
func TestFindByID(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト用の評価を作成
	testRating := createTestRating(t, db, 101, 1, 4)

	// テストケース1: 存在する評価IDを検索
	foundRating, err := repo.FindByID(ctx, testRating.ID)

	assert.NoError(t, err)
	assert.NotNil(t, foundRating)
	assert.Equal(t, testRating.ID, foundRating.ID)
	assert.Equal(t, testRating.Value, foundRating.Value)
	assert.Equal(t, testRating.UserID, foundRating.UserID)
	assert.Equal(t, testRating.ContentID, foundRating.ContentID)

	// テストケース2: 存在しない評価IDを検索
	nonExistentRating, err := repo.FindByID(ctx, 999)

	assert.NoError(t, err)
	assert.Nil(t, nonExistentRating)

	// テストケース3: 不正な評価IDでの検索
	_, err = repo.FindByID(ctx, 0)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "評価IDは正の整数である必要があります")
}

// FindByUserAndContentID メソッドのテスト
func TestFindByUserAndContentID(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト用の評価を作成
	testRating := createTestRating(t, db, 101, 1, 4)

	// テストケース1: 存在するユーザーとコンテンツの組み合わせを検索
	foundRating, err := repo.FindByUserAndContentID(ctx, testRating.UserID, testRating.ContentID)

	assert.NoError(t, err)
	assert.NotNil(t, foundRating)
	assert.Equal(t, testRating.ID, foundRating.ID)
	assert.Equal(t, testRating.Value, foundRating.Value)

	// テストケース2: 存在しない組み合わせを検索
	nonExistentRating, err := repo.FindByUserAndContentID(ctx, 999, 999)

	assert.NoError(t, err)
	assert.Nil(t, nonExistentRating)

	// テストケース3: 不正なユーザーIDでの検索
	_, err = repo.FindByUserAndContentID(ctx, 0, 1)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ユーザーIDは正の整数である必要があります")

	// テストケース4: 不正なコンテンツIDでの検索
	_, err = repo.FindByUserAndContentID(ctx, 101, 0)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "コンテンツIDは正の整数である必要があります")
}

// Create メソッドのテスト
func TestRatingCreate(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト評価データの作成
	newRating := &model.Rating{
		Value:     5,
		UserID:    201,
		ContentID: 2,
	}

	// テスト実行
	err := repo.Create(ctx, newRating)

	// 検証
	assert.NoError(t, err)
	assert.Greater(t, newRating.ID, int64(0)) // IDが割り当てられているか確認
	assert.NotZero(t, newRating.CreatedAt)    // 作成日時が設定されているか確認
	assert.NotZero(t, newRating.UpdatedAt)    // 更新日時が設定されているか確認

	// データベースから評価を取得して検証
	var savedRating model.Rating
	err = db.QueryRow(
		"SELECT id, value, user_id, content_id, created_at, updated_at FROM ratings WHERE id = ?",
		newRating.ID,
	).Scan(
		&savedRating.ID,
		&savedRating.Value,
		&savedRating.UserID,
		&savedRating.ContentID,
		&savedRating.CreatedAt,
		&savedRating.UpdatedAt,
	)

	assert.NoError(t, err)
	assert.Equal(t, newRating.Value, savedRating.Value)
	assert.Equal(t, newRating.UserID, savedRating.UserID)
	assert.Equal(t, newRating.ContentID, savedRating.ContentID)

	// バリデーションエラーのテスト: 不正な評価値
	invalidRating := &model.Rating{
		Value:     6, // 1-5の範囲外
		UserID:    201,
		ContentID: 3,
	}

	err = repo.Create(ctx, invalidRating)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "評価値は1から5の間で設定してください")

	// 重複エラーのテスト: 同じユーザーが同じコンテンツに再評価
	duplicateRating := &model.Rating{
		Value:     4,
		UserID:    201,
		ContentID: 2, // 既に評価済み
	}

	err = repo.Create(ctx, duplicateRating)
	assert.Error(t, err)
	// SQLiteではPostgreSQLと異なるエラーメッセージになるため、一部を検証
	assert.Contains(t, err.Error(), "UNIQUE constraint failed")
}

// Update メソッドのテスト
func TestRatingUpdate(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト評価を作成
	testRating := createTestRating(t, db, 101, 1, 3)

	// 更新用データの設定
	updatedRating := &model.Rating{
		ID:        testRating.ID,
		Value:     5, // 値を変更
		UserID:    testRating.UserID,
		ContentID: testRating.ContentID,
	}

	// テスト実行
	err := repo.Update(ctx, updatedRating)

	// 検証
	assert.NoError(t, err)
	assert.NotZero(t, updatedRating.UpdatedAt) // 更新日時が設定されているか確認

	// データベースから更新された評価を取得して検証
	var fetchedRating model.Rating
	err = db.QueryRow(
		"SELECT id, value, updated_at FROM ratings WHERE id = ?",
		testRating.ID,
	).Scan(
		&fetchedRating.ID,
		&fetchedRating.Value,
		&fetchedRating.UpdatedAt,
	)

	assert.NoError(t, err)
	assert.Equal(t, 5, fetchedRating.Value) // 値が更新されているか確認

	// バリデーションエラーのテスト: 不正な評価値
	invalidRating := &model.Rating{
		ID:    testRating.ID,
		Value: 0, // 1-5の範囲外
	}

	err = repo.Update(ctx, invalidRating)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "評価値は1から5の間で設定してください")

	// 存在しない評価の更新テスト
	nonExistentRating := &model.Rating{
		ID:    999,
		Value: 4,
	}

	err = repo.Update(ctx, nonExistentRating)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "更新対象の評価が見つかりません")
}

// Delete メソッドのテスト
func TesRatingtDelete(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト評価を作成
	testRating := createTestRating(t, db, 101, 1, 4)

	// テスト実行
	err := repo.Delete(ctx, testRating.ID)

	// 検証
	assert.NoError(t, err)

	// 削除されたことを確認
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM ratings WHERE id = ?", testRating.ID).Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 0, count)

	// 存在しない評価の削除テスト
	err = repo.Delete(ctx, 999)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "削除対象の評価が見つかりません")

	// 不正なIDでの削除テスト
	err = repo.Delete(ctx, 0)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "評価IDは正の整数である必要があります")
}

// GetAverageByContentID メソッドのテスト
func TestGetAverageByContentID(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupRatingDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewRatingRepository(db)
	ctx := context.Background()

	// テスト用の評価を複数作成
	createTestRating(t, db, 101, 1, 4)
	createTestRating(t, db, 102, 1, 5)
	createTestRating(t, db, 103, 2, 3)

	// テストケース1: 複数の評価がある場合の平均
	avgRating, err := repo.GetAverageByContentID(ctx, 1)

	assert.NoError(t, err)
	assert.NotNil(t, avgRating)
	assert.Equal(t, int64(1), avgRating.ContentID)
	assert.Equal(t, 4.5, avgRating.Average) // (4+5)/2
	assert.Equal(t, 2, avgRating.Count)

	// テストケース2: 1つの評価しかない場合の平均
	avg2, err := repo.GetAverageByContentID(ctx, 2)

	assert.NoError(t, err)
	assert.Equal(t, int64(2), avg2.ContentID)
	assert.Equal(t, 3.0, avg2.Average)
	assert.Equal(t, 1, avg2.Count)

	// テストケース3: 評価がない場合の平均
	avg3, err := repo.GetAverageByContentID(ctx, 3)

	assert.NoError(t, err)
	assert.Equal(t, int64(3), avg3.ContentID)
	assert.Equal(t, 0.0, avg3.Average)
	assert.Equal(t, 0, avg3.Count)

	// テストケース4: 不正なコンテンツIDでの検索
	_, err = repo.GetAverageByContentID(ctx, 0)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "コンテンツIDは正の整数である必要があります")
}
