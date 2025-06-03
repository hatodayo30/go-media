// persistence/category_repository_test.go
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
func setupCategoryTestDB(t *testing.T) *sql.DB {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatalf("データベース接続の作成に失敗しました: %v", err)
	}

	// テーブル作成のSQLを実行
	_, err = db.Exec(`
		CREATE TABLE categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			parent_id INTEGER,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (parent_id) REFERENCES categories(id)
		)
	`)
	if err != nil {
		t.Fatalf("テーブル作成に失敗しました: %v", err)
	}

	return db
}

// テスト用カテゴリデータの作成
func createTestCategory(t *testing.T, db *sql.DB, name string, description string, parentID *int64) *model.Category {
	now := time.Now()
	category := &model.Category{
		Name:        name,
		Description: description,
		ParentID:    parentID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	query := `
		INSERT INTO categories (name, description, parent_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`
	result, err := db.Exec(query, category.Name, category.Description, category.ParentID, category.CreatedAt, category.UpdatedAt)
	if err != nil {
		t.Fatalf("テストカテゴリの挿入に失敗しました: %v", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		t.Fatalf("IDの取得に失敗しました: %v", err)
	}
	category.ID = id

	return category
}

func TestCategoryRepository_FindAll(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// テストデータ作成
	createTestCategory(t, db, "Electronics", "Electronic products", nil)
	parent2ID := int64(2)
	createTestCategory(t, db, "Books", "All types of books", nil)
	createTestCategory(t, db, "Science Books", "Science related books", &parent2ID)

	// テスト実行
	categories, err := repo.FindAll(ctx)

	// 検証
	assert.NoError(t, err)
	assert.Len(t, categories, 3)
	assert.Equal(t, "Books", categories[0].Name) // アルファベット順
	assert.Equal(t, "Electronics", categories[1].Name)
	assert.Equal(t, "Science Books", categories[2].Name)

	// 親カテゴリの検証
	assert.Nil(t, categories[0].ParentID)
	assert.NotNil(t, categories[2].ParentID)
	assert.Equal(t, int64(2), *categories[2].ParentID)
}

func TestCategoryRepository_FindByID(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// テストケース1: 存在するカテゴリを検索
	testCategory := createTestCategory(t, db, "Test Category", "Test Description", nil)

	foundCategory, err := repo.FindByID(ctx, testCategory.ID)
	assert.NoError(t, err)
	assert.NotNil(t, foundCategory)
	assert.Equal(t, testCategory.ID, foundCategory.ID)
	assert.Equal(t, testCategory.Name, foundCategory.Name)
	assert.Equal(t, testCategory.Description, foundCategory.Description)

	// テストケース2: 存在しないカテゴリを検索
	nonExistentCategory, err := repo.FindByID(ctx, 999)
	assert.NoError(t, err)
	assert.Nil(t, nonExistentCategory)
}

func TestCategoryRepository_FindByName(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// テストケース1: 存在するカテゴリを検索
	testCategory := createTestCategory(t, db, "Electronics", "Electronic devices", nil)

	foundCategory, err := repo.FindByName(ctx, "Electronics")
	assert.NoError(t, err)
	assert.NotNil(t, foundCategory)
	assert.Equal(t, testCategory.ID, foundCategory.ID)
	assert.Equal(t, testCategory.Name, foundCategory.Name)

	// テストケース2: 存在しないカテゴリを検索
	nonExistentCategory, err := repo.FindByName(ctx, "NonExistent")
	assert.NoError(t, err)
	assert.Nil(t, nonExistentCategory)
}

func TestCategoryRepository_Create(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// テストケース1: 新しいルートカテゴリの作成
	newCategory := &model.Category{
		Name:        "Books",
		Description: "All kinds of books",
		ParentID:    nil,
	}

	createdCategory, err := repo.Create(ctx, newCategory)
	assert.NoError(t, err)
	assert.NotNil(t, createdCategory)
	assert.Greater(t, createdCategory.ID, int64(0))
	assert.Equal(t, "Books", createdCategory.Name)
	assert.False(t, createdCategory.CreatedAt.IsZero())
	assert.False(t, createdCategory.UpdatedAt.IsZero())

	// テストケース2: 子カテゴリの作成
	parentCategory := createTestCategory(t, db, "Electronics", "Electronic devices", nil)
	childCategory := &model.Category{
		Name:        "Smartphones",
		Description: "Mobile phones and accessories",
		ParentID:    &parentCategory.ID,
	}

	createdChildCategory, err := repo.Create(ctx, childCategory)
	assert.NoError(t, err)
	assert.Equal(t, parentCategory.ID, *createdChildCategory.ParentID)
}

func TestCategoryRepository_Update(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// テストカテゴリ作成
	testCategory := createTestCategory(t, db, "Electronics", "Old description", nil)

	// 更新データ準備
	testCategory.Name = "Consumer Electronics"
	testCategory.Description = "Updated description"

	// 更新実行
	updatedCategory, err := repo.Update(ctx, testCategory)
	assert.NoError(t, err)
	assert.NotNil(t, updatedCategory)
	assert.Equal(t, "Consumer Electronics", updatedCategory.Name)
	assert.Equal(t, "Updated description", updatedCategory.Description)
	assert.NotEqual(t, testCategory.CreatedAt, updatedCategory.UpdatedAt)

	// 存在しないカテゴリの更新
	nonExistentCategory := &model.Category{
		ID:          999,
		Name:        "NonExistent",
		Description: "This should fail",
	}
	_, err = repo.Update(ctx, nonExistentCategory)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "カテゴリが見つかりません")
}

func TestCategoryRepository_Delete(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// テストカテゴリ作成
	testCategory := createTestCategory(t, db, "Temporary", "Will be deleted", nil)

	// 削除実行
	err := repo.Delete(ctx, testCategory.ID)
	assert.NoError(t, err)

	// 削除確認
	deletedCategory, err := repo.FindByID(ctx, testCategory.ID)
	assert.NoError(t, err)
	assert.Nil(t, deletedCategory)

	// 存在しないカテゴリの削除
	err = repo.Delete(ctx, 999)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "カテゴリが見つかりません")
}

func TestCategoryRepository_CheckCircularReference(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// カテゴリツリー作成: A -> B -> C
	categoryA := createTestCategory(t, db, "A", "Category A", nil)
	categoryB := createTestCategory(t, db, "B", "Category B", &categoryA.ID)
	categoryC := createTestCategory(t, db, "C", "Category C", &categoryB.ID)

	// 循環参照のチェック（A -> B -> C -> A は循環参照）
	hasCircularRef, err := repo.CheckCircularReference(ctx, categoryA.ID, categoryC.ID)
	assert.NoError(t, err)
	assert.True(t, hasCircularRef) // 循環参照が検出されるはず

	// 非循環参照のチェック（A -> D は循環参照ではない）
	categoryD := createTestCategory(t, db, "D", "Category D", nil)
	hasCircularRef, err = repo.CheckCircularReference(ctx, categoryA.ID, categoryD.ID)
	assert.NoError(t, err)
	assert.False(t, hasCircularRef) // 循環参照は検出されないはず

	// 自己参照のチェック
	hasCircularRef, err = repo.CheckCircularReference(ctx, categoryA.ID, categoryA.ID)
	assert.NoError(t, err)
	assert.True(t, hasCircularRef) // 自己参照は循環参照
}

func TestCategoryRepository_ParentIDHandling(t *testing.T) {
	db := setupCategoryTestDB(t)
	defer db.Close()

	repo := NewCategoryRepository(db)
	ctx := context.Background()

	// NULLの親IDを持つカテゴリ作成
	rootCategory := &model.Category{
		Name:        "Root",
		Description: "Root category",
		ParentID:    nil,
	}

	createdRoot, err := repo.Create(ctx, rootCategory)
	assert.NoError(t, err)
	assert.Nil(t, createdRoot.ParentID)

	// 子カテゴリを作成して、親IDを更新
	childCategory := &model.Category{
		Name:        "Child",
		Description: "Child category",
		ParentID:    &createdRoot.ID,
	}

	createdChild, err := repo.Create(ctx, childCategory)
	assert.NoError(t, err)
	assert.NotNil(t, createdChild.ParentID)
	assert.Equal(t, createdRoot.ID, *createdChild.ParentID)

	// 子カテゴリをルートカテゴリに変更（親IDをNULLに）
	createdChild.ParentID = nil
	updatedChild, err := repo.Update(ctx, createdChild)
	assert.NoError(t, err)
	assert.Nil(t, updatedChild.ParentID)
}
