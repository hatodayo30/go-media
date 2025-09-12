package database

import (
	"database/sql"
)

// DBConn はデータベース接続を管理するインターフェースです
type DBConn interface {
	GetDB() *sql.DB
	Close() error
}

// sqlDBConn は*sql.DBを使用したDBConnの実装です
type sqlDBConn struct {
	db *sql.DB
}

// NewSQLDBConn は新しいsqlDBConnインスタンスを作成します
func NewSQLDBConn(db *sql.DB) DBConn {
	return &sqlDBConn{
		db: db,
	}
}

// GetDB はデータベース接続を返します
func (c *sqlDBConn) GetDB() *sql.DB {
	return c.db
}

// Close はデータベース接続を閉じます
func (c *sqlDBConn) Close() error {
	return c.db.Close()
}
