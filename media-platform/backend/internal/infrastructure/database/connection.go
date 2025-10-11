package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	_ "github.com/lib/pq" // PostgreSQLドライバー
)

// DBConn はデータベース接続インターフェースを提供します
type DBConn interface {
	GetDB() *sql.DB
	Close() error
}

// postgresConn はPostgreSQLデータベース接続の構造体です
type postgresConn struct {
	db *sql.DB
}

// Config はデータベース接続設定を保持します
type Config struct {
	Host            string
	Port            string
	User            string
	Password        string
	DBName          string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// LoadConfigFromEnv は環境変数から設定を読み込みます
func LoadConfigFromEnv() *Config {
	maxOpenConns, _ := strconv.Atoi(getEnv("DB_MAX_OPEN_CONNS", "25"))
	maxIdleConns, _ := strconv.Atoi(getEnv("DB_MAX_IDLE_CONNS", "5"))
	connMaxLifetime, _ := time.ParseDuration(getEnv("DB_CONN_MAX_LIFETIME", "5m"))

	return &Config{
		Host:            getEnv("DB_HOST", "localhost"),
		Port:            getEnv("DB_PORT", "5432"),
		User:            getEnv("DB_USER", "postgres"),
		Password:        getEnv("DB_PASSWORD", "password"),
		DBName:          getEnv("DB_NAME", "media_platform"),
		SSLMode:         getEnv("DB_SSLMODE", "disable"),
		MaxOpenConns:    maxOpenConns,
		MaxIdleConns:    maxIdleConns,
		ConnMaxLifetime: connMaxLifetime,
	}
}

// NewConnection はデータベース接続を作成します
func NewConnection() (DBConn, error) {
	config := LoadConfigFromEnv()
	return NewConnectionWithConfig(config)
}

// NewConnectionWithConfig は設定を指定してデータベース接続を作成します
func NewConnectionWithConfig(config *Config) (DBConn, error) {
	// 接続文字列の作成
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode,
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
	db.SetMaxOpenConns(config.MaxOpenConns)
	db.SetMaxIdleConns(config.MaxIdleConns)
	db.SetConnMaxLifetime(config.ConnMaxLifetime)

	log.Printf("✅ Database connected successfully: %s:%s/%s", config.Host, config.Port, config.DBName)
	log.Printf("📊 Connection pool: MaxOpen=%d, MaxIdle=%d, MaxLifetime=%v",
		config.MaxOpenConns, config.MaxIdleConns, config.ConnMaxLifetime)

	return &postgresConn{db: db}, nil
}

// GetDB は*sql.DBインスタンスを返します
func (p *postgresConn) GetDB() *sql.DB {
	return p.db
}

// Close はデータベース接続を閉じます
func (p *postgresConn) Close() error {
	if p.db != nil {
		log.Println("🔌 Closing database connection...")
		return p.db.Close()
	}
	return nil
}

// getEnv は環境変数の値を取得し、設定されていない場合はデフォルト値を返します
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
