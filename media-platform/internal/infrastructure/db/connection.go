// internal/infrastructure/database/connection.go
package db

import (
	"database/sql"
	"fmt"
	"time"

	"media-platform/configs"

	_ "github.com/lib/pq" // PostgreSQLドライバー
)

// Connect はデータベース接続を確立して返します
func Connect(config *configs.Config) (*sql.DB, error) {
	connectionString := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.DBHost, config.DBPort, config.DBUser,
		config.DBPassword, config.DBName, config.DBSSLMode,
	)

	// データベース接続の確立
	db, err := sql.Open("postgres", connectionString)
	if err != nil {
		return nil, fmt.Errorf("データベース接続の確立に失敗しました: %w", err)
	}

	// コネクションプールの設定
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// データベース接続のテスト
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("データベース接続のテストに失敗しました: %w", err)
	}

	return db, nil
}
