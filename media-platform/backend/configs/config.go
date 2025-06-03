// configs/config.go
package configs

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

// Config はアプリケーション全体の設定を保持する構造体
type Config struct {
	// サーバー設定
	ServerPort   int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration

	// データベース設定
	DBHost     string
	DBPort     int
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	// 認証設定
	JWTSecret     string
	JWTExpiration time.Duration

	// その他の設定
	MediaStoragePath string
	LogLevel         string
}

// NewConfig は設定を初期化して返します
func NewConfig() (*Config, error) {
	// .env ファイルを読み込む（存在する場合）
	godotenv.Load()

	config := &Config{
		// サーバー設定
		ServerPort:   getEnvAsInt("SERVER_PORT", 8081),
		ReadTimeout:  getEnvAsDuration("READ_TIMEOUT", 10*time.Second),
		WriteTimeout: getEnvAsDuration("WRITE_TIMEOUT", 10*time.Second),

		// データベース設定
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnvAsInt("DB_PORT", 5432),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "postgres"),
		DBName:     getEnv("DB_NAME", "media_platform"),
		DBSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		// 認証設定
		JWTSecret:     getEnv("JWT_SECRET", "your-256-bit-secret"),
		JWTExpiration: getEnvAsDuration("JWT_EXPIRATION", 24*time.Hour),

		// その他の設定
		MediaStoragePath: getEnv("MEDIA_STORAGE_PATH", "./uploads"),
		LogLevel:         getEnv("LOG_LEVEL", "info"),
	}

	return config, nil
}

// 環境変数を取得するヘルパー関数
func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	valueStr := getEnv(key, "")
	if value, err := time.ParseDuration(valueStr); err == nil {
		return value
	}
	return defaultValue
}
