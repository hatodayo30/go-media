// pkg/logger/logger.go
package logger

import (
	"os"
	"time"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Logger はアプリケーション全体で使用するロギングインターフェースを提供します
type Logger struct {
	logger *zap.SugaredLogger
}

// NewLogger は新しいLoggerインスタンスを作成します
func NewLogger() *Logger {
	// ログレベルの設定
	logLevel := getLogLevel()

	// エンコーダーの設定
	encoderConfig := zapcore.EncoderConfig{
		TimeKey:        "time",
		LevelKey:       "level",
		NameKey:        "logger",
		CallerKey:      "caller",
		MessageKey:     "msg",
		StacktraceKey:  "stacktrace",
		LineEnding:     zapcore.DefaultLineEnding,
		EncodeLevel:    zapcore.CapitalLevelEncoder,
		EncodeTime:     zapcore.ISO8601TimeEncoder,
		EncodeDuration: zapcore.StringDurationEncoder,
		EncodeCaller:   zapcore.ShortCallerEncoder,
	}

	// 出力先の設定
	stdout := zapcore.AddSync(os.Stdout)

	// コア設定
	core := zapcore.NewCore(
		zapcore.NewJSONEncoder(encoderConfig),
		stdout,
		logLevel,
	)

	// ロガーの作成
	logger := zap.New(
		core,
		zap.AddCaller(),
		zap.AddCallerSkip(1),
		zap.AddStacktrace(zapcore.ErrorLevel),
	)

	return &Logger{
		logger: logger.Sugar(),
	}
}

// getLogLevel は環境変数からログレベルを取得します
func getLogLevel() zapcore.Level {
	levelStr := os.Getenv("LOG_LEVEL")
	switch levelStr {
	case "debug":
		return zapcore.DebugLevel
	case "info":
		return zapcore.InfoLevel
	case "warn":
		return zapcore.WarnLevel
	case "error":
		return zapcore.ErrorLevel
	default:
		return zapcore.InfoLevel // デフォルトはinfo
	}
}

// Info はInfoレベルのログを出力します
func (l *Logger) Info(msg string, args ...interface{}) {
	l.logger.Infow(msg, args...)
}

// Debug はDebugレベルのログを出力します
func (l *Logger) Debug(msg string, args ...interface{}) {
	l.logger.Debugw(msg, args...)
}

// Warn はWarnレベルのログを出力します
func (l *Logger) Warn(msg string, args ...interface{}) {
	l.logger.Warnw(msg, args...)
}

// Error はErrorレベルのログを出力します
func (l *Logger) Error(msg string, args ...interface{}) {
	l.logger.Errorw(msg, args...)
}

// Fatal はFatalレベルのログを出力し、プログラムを終了します
func (l *Logger) Fatal(msg string, args ...interface{}) {
	l.logger.Fatalw(msg, args...)
}

// WithField はフィールドを追加した新しいロガーを返します
func (l *Logger) WithField(key string, value interface{}) *Logger {
	return &Logger{
		logger: l.logger.With(key, value),
	}
}

// WithFields は複数のフィールドを追加した新しいロガーを返します
func (l *Logger) WithFields(fields map[string]interface{}) *Logger {
	// フィールドを平坦化
	args := make([]interface{}, 0, len(fields)*2)
	for k, v := range fields {
		args = append(args, k, v)
	}

	return &Logger{
		logger: l.logger.With(args...),
	}
}

// WithError はエラーフィールドを追加した新しいロガーを返します
func (l *Logger) WithError(err error) *Logger {
	return &Logger{
		logger: l.logger.With("error", err.Error()),
	}
}

// WithTime は時間フィールドを追加した新しいロガーを返します
func (l *Logger) WithTime(t time.Time) *Logger {
	return &Logger{
		logger: l.logger.With("timestamp", t.Format(time.RFC3339)),
	}
}
