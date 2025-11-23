.PHONY: build run clean docker-build docker-up docker-down docker-logs psql help migrate-up migrate-down db-reset

# 変数定義
APP_NAME = media-platform
# ✅ 修正: docker-compose (ハイフン付き) に変更
DOCKER_COMPOSE = docker-compose

# デフォルトのターゲット
all: help

# ===============================================
# ヘルプ
# ===============================================
help:
	@echo "=============================================="
	@echo "🚀 Media Platform - 開発コマンド"
	@echo "=============================================="
	@echo ""
	@echo "📦 Docker管理:"
	@echo "  make docker-build    - Dockerイメージをビルド"
	@echo "  make docker-up       - すべてのサービスを起動"
	@echo "  make docker-down     - すべてのサービスを停止"
	@echo "  make docker-logs     - ログを表示"
	@echo "  make docker-restart  - サービスを再起動"
	@echo ""
	@echo "🗄️  データベース管理:"
	@echo "  make psql            - PostgreSQLにアクセス"
	@echo "  make migrate-up      - マイグレーションを適用"
	@echo "  make migrate-down    - マイグレーションを1つ戻す"
	@echo "  make migrate-version - マイグレーションバージョン表示"
	@echo "  make db-reset        - データベースをリセット"
	@echo ""
	@echo "🔧 ローカル開発:"
	@echo "  make build           - ローカルビルド"
	@echo "  make run             - ローカル実行"
	@echo "  make clean           - ビルドファイル削除"
	@echo ""
	@echo "=============================================="

# ===============================================
# Docker管理
# ===============================================
docker-build:
	@echo "🔨 Dockerイメージをビルド中..."
	$(DOCKER_COMPOSE) build
	@echo "✅ ビルド完了"

docker-up:
	@echo "🚀 すべてのサービスを起動中..."
	$(DOCKER_COMPOSE) up -d
	@echo "✅ サービスが起動しました"
	@echo "📍 Frontend: http://localhost:3000"
	@echo "📍 Backend:  http://localhost:8082"

docker-down:
	@echo "🛑 すべてのサービスを停止中..."
	$(DOCKER_COMPOSE) down
	@echo "✅ サービスが停止しました"

docker-logs:
	@echo "📋 ログを表示中..."
	$(DOCKER_COMPOSE) logs -f

docker-restart:
	@echo "🔄 サービスを再起動中..."
	$(DOCKER_COMPOSE) restart
	@echo "✅ 再起動完了"

# ===============================================
# データベース管理
# ===============================================
psql:
	@echo "🔌 PostgreSQLに接続中..."
	$(DOCKER_COMPOSE) exec postgres psql -U postgres -d media_platform

migrate-up:
	@echo "🚀 マイグレーションを適用中..."
	$(DOCKER_COMPOSE) exec api migrate -path /app/migrations -database "postgres://postgres:postgres@postgres:5432/media_platform?sslmode=disable" up
	@echo "✅ マイグレーション完了"

migrate-down:
	@echo "⏪ マイグレーションを1つ戻します..."
	$(DOCKER_COMPOSE) exec api migrate -path /app/migrations -database "postgres://postgres:postgres@postgres:5432/media_platform?sslmode=disable" down 1
	@echo "✅ ロールバック完了"

migrate-version:
	@echo "📌 現在のマイグレーションバージョン:"
	@$(DOCKER_COMPOSE) exec api migrate -path /app/migrations -database "postgres://postgres:postgres@postgres:5432/media_platform?sslmode=disable" version

db-reset:
	@echo "⚠️  データベースをリセット中..."
	$(DOCKER_COMPOSE) down -v
	$(DOCKER_COMPOSE) up -d postgres
	@echo "⏳ PostgreSQLの起動を待機中..."
	@sleep 5
	@make migrate-up
	@echo "✅ データベースのリセット完了"

# ===============================================
# ローカル開発
# ===============================================
build:
	@echo "🔨 アプリケーションをビルド中..."
	cd backend && go build -o bin/$(APP_NAME) ./cmd/api/main.go
	@echo "✅ ビルド完了"

run:
	@echo "🚀 アプリケーションを実行中..."
	cd backend && go run ./cmd/api/main.go

clean:
	@echo "🧹 ビルドファイルを削除中..."
	rm -rf backend/bin/$(APP_NAME)
	@echo "✅ 削除完了"