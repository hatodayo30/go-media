package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq" // PostgreSQLドライバー
)

// DBConn はデータベース接続インターフェースを提供します
type DBConn interface {
	GetDB() *sql.DB
	Close() error
}

// PostgresConn はPostgreSQLデータベース接続の構造体です
type PostgresConn struct {
	db *sql.DB
}

// NewConnection はデータベース接続を作成します
func NewConnection() (DBConn, error) {
	// 環境変数から接続情報を取得
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "password")
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbName := getEnv("DB_NAME", "media_platform")
	sslMode := getEnv("DB_SSLMODE", "disable")

	// 接続文字列の作成
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, sslMode,
	)

	// データベースに接続
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("データベース接続のオープンに失敗しました: %w", err)
	}

	// 接続テスト
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("データベース接続の確認に失敗しました: %w", err)
	}

	// 接続プールの設定
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	return &PostgresConn{db: db}, nil
}

// GetDB は*sql.DBインスタンスを返します
func (p *PostgresConn) GetDB() *sql.DB {
	return p.db
}

// Close はデータベース接続を閉じます
func (p *PostgresConn) Close() error {
	return p.db.Close()
}

// getEnv は環境変数の値を取得し、設定されていない場合はデフォルト値を返します
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
