// persistence/user_repository_test.go
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
func setupTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("データベース接続の作成に失敗しました: %v", err)
	}

	// テスト用テーブルの作成
	_, err = db.Exec(`
		CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			bio TEXT,
			avatar TEXT,
			role TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL
		)
	`)
	if err != nil {
		t.Fatalf("テーブル作成に失敗しました: %v", err)
	}

	return db
}

// テスト用ユーザーデータの作成
func createTestUser(t *testing.T, db *sql.DB) *model.User {
	now := time.Now()
	user := &model.User{
		Username:  "testuser",
		Email:     "test@example.com",
		Password:  "hashedpassword",
		Bio:       "Test bio",
		Avatar:    "test-avatar.jpg",
		Role:      "user",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// ユーザーを挿入して生成されたIDを取得
	result, err := db.Exec(
		"INSERT INTO users (username, email, password, bio, avatar, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		user.Username, user.Email, user.Password, user.Bio, user.Avatar, user.Role, user.CreatedAt, user.UpdatedAt,
	)
	if err != nil {
		t.Fatalf("テストユーザーの挿入に失敗しました: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		t.Fatalf("挿入されたIDの取得に失敗しました: %v", err)
	}
	user.ID = id

	return user
}

// Find メソッドのテスト
func TestFind(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupTestDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewUserRepository(db)
	ctx := context.Background()

	// テストケース1: 存在するユーザーを検索
	testUser := createTestUser(t, db)
	foundUser, err := repo.Find(ctx, testUser.ID)

	assert.NoError(t, err)
	assert.NotNil(t, foundUser)
	assert.Equal(t, testUser.ID, foundUser.ID)
	assert.Equal(t, testUser.Username, foundUser.Username)
	assert.Equal(t, testUser.Email, foundUser.Email)

	// テストケース2: 存在しないユーザーを検索
	nonExistentUser, err := repo.Find(ctx, 999)

	assert.NoError(t, err)
	assert.Nil(t, nonExistentUser)
}

// FindByEmail メソッドのテスト
func TestFindByEmail(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupTestDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewUserRepository(db)
	ctx := context.Background()

	// テストケース1: 存在するメールアドレスを検索
	testUser := createTestUser(t, db)
	foundUser, err := repo.FindByEmail(ctx, testUser.Email)

	assert.NoError(t, err)
	assert.NotNil(t, foundUser)
	assert.Equal(t, testUser.ID, foundUser.ID)
	assert.Equal(t, testUser.Email, foundUser.Email)

	// テストケース2: 存在しないメールアドレスを検索
	nonExistentUser, err := repo.FindByEmail(ctx, "nonexistent@example.com")

	assert.NoError(t, err)
	assert.Nil(t, nonExistentUser)
}

// FindAll メソッドのテスト
func TestFindAll(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupTestDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewUserRepository(db)
	ctx := context.Background()

	// テスト用のユーザーを複数作成
	now := time.Now()
	for i := 0; i < 5; i++ {
		_, err := db.Exec(
			"INSERT INTO users (username, email, password, bio, avatar, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			"user"+string(rune(i+48)), // user0, user1, ...
			"user"+string(rune(i+48))+"@example.com",
			"password"+string(rune(i+48)),
			"Bio "+string(rune(i+48)),
			"avatar"+string(rune(i+48))+".jpg",
			"user",
			now,
			now,
		)
		if err != nil {
			t.Fatalf("テストユーザーの挿入に失敗しました: %v", err)
		}
	}

	// テストケース1: 最初の3ユーザーを取得
	users, err := repo.FindAll(ctx, 3, 0)

	assert.NoError(t, err)
	assert.Len(t, users, 3)

	// テストケース2: 残りのユーザーを取得
	usersPage2, err := repo.FindAll(ctx, 3, 3)

	assert.NoError(t, err)
	assert.Len(t, usersPage2, 2) // 残り2ユーザー

	// テストケース3: 存在しないページ
	emptyUsers, err := repo.FindAll(ctx, 10, 10)

	assert.NoError(t, err)
	assert.Len(t, emptyUsers, 0)
}

// Create メソッドのテスト
func TestCreate(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupTestDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewUserRepository(db)
	ctx := context.Background()

	// テストユーザーデータの作成
	now := time.Now()
	newUser := &model.User{
		Username:  "newuser",
		Email:     "new@example.com",
		Password:  "hashedpassword",
		Bio:       "New user bio",
		Avatar:    "new-avatar.jpg",
		Role:      "user",
		CreatedAt: now,
		UpdatedAt: now,
	}

	// テスト実行
	err := repo.Create(ctx, newUser)

	// 検証
	assert.NoError(t, err)
	assert.Greater(t, newUser.ID, int64(0)) // IDが割り当てられているか確認

	// データベースからユーザーを取得して検証
	var savedUser model.User
	err = db.QueryRow(
		"SELECT id, username, email, password, bio, avatar, role, created_at, updated_at FROM users WHERE id = ?",
		newUser.ID,
	).Scan(
		&savedUser.ID,
		&savedUser.Username,
		&savedUser.Email,
		&savedUser.Password,
		&savedUser.Bio,
		&savedUser.Avatar,
		&savedUser.Role,
		&savedUser.CreatedAt,
		&savedUser.UpdatedAt,
	)

	assert.NoError(t, err)
	assert.Equal(t, newUser.Username, savedUser.Username)
	assert.Equal(t, newUser.Email, savedUser.Email)
}

// Update メソッドのテスト
func TestUpdate(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupTestDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewUserRepository(db)
	ctx := context.Background()

	// テストユーザーを作成
	testUser := createTestUser(t, db)

	// 更新データの設定
	testUser.Username = "updatedusername"
	testUser.Email = "updated@example.com"
	testUser.Bio = "Updated bio"
	testUser.UpdatedAt = time.Now()

	// テスト実行
	err := repo.Update(ctx, testUser)

	// 検証
	assert.NoError(t, err)

	// データベースから更新されたユーザーを取得して検証
	var updatedUser model.User
	err = db.QueryRow(
		"SELECT id, username, email, bio FROM users WHERE id = ?",
		testUser.ID,
	).Scan(
		&updatedUser.ID,
		&updatedUser.Username,
		&updatedUser.Email,
		&updatedUser.Bio,
	)

	assert.NoError(t, err)
	assert.Equal(t, "updatedusername", updatedUser.Username)
	assert.Equal(t, "updated@example.com", updatedUser.Email)
	assert.Equal(t, "Updated bio", updatedUser.Bio)

	// 存在しないユーザーの更新テスト
	nonExistentUser := &model.User{
		ID:        999,
		Username:  "nonexistent",
		Email:     "nonexistent@example.com",
		Password:  "password",
		UpdatedAt: time.Now(),
	}

	err = repo.Update(ctx, nonExistentUser)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "更新対象のユーザーが見つかりません")
}

// Delete メソッドのテスト
func TestDelete(t *testing.T) {
	// テスト用DBのセットアップ
	db := setupTestDB(t)
	defer db.Close()

	// リポジトリの作成
	repo := NewUserRepository(db)
	ctx := context.Background()

	// テストユーザーを作成
	testUser := createTestUser(t, db)

	// テスト実行
	err := repo.Delete(ctx, testUser.ID)

	// 検証
	assert.NoError(t, err)

	// 削除されたことを確認
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users WHERE id = ?", testUser.ID).Scan(&count)
	assert.NoError(t, err)
	assert.Equal(t, 0, count)

	// 存在しないユーザーの削除テスト
	err = repo.Delete(ctx, 999)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "削除対象のユーザーが見つかりません")
}
