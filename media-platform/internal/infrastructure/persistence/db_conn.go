package persistence

import (
	"database/sql"
)

// DBConn はデータベース接続インターフェースを提供します
type DBConn interface {
	GetDB() *sql.DB
	Close() error
}
