.PHONY: build run clean docker-build docker-up docker-down docker-logs psql help

# 変数定義
APP_NAME = media-platform
DOCKER_COMPOSE = docker compose

# デフォルトのターゲット
all: help

# ヘルプ
help:
	@echo "使用可能なコマンド:"
	@echo "  make build         - アプリケーションをビルドする"
	@echo "  make run           - ローカルでアプリケーションを実行する"
	@echo "  make clean         - ビルドファイルを削除する"
	@echo "  make docker-build  - Dockerイメージをビルドする"
	@echo "  make docker-up     - Docker Composeでサービスを起動する"
	@echo "  make docker-down   - Docker Composeでサービスを停止する"
	@echo "  make docker-logs   - Docker Composeのログを表示する"
	@echo "  make psql          - PostgreSQLにアクセスする"

# ローカルビルド
build:
	go build -o bin/$(APP_NAME) ./cmd/api/main.go

# ローカル実行
run:
	go run ./cmd/api/main.go

# ビルドファイル削除
clean:
	rm -rf bin/$(APP_NAME)

# Dockerイメージビルド
docker-build:
	$(DOCKER_COMPOSE) build

# Docker Compose起動
docker-up:
	$(DOCKER_COMPOSE) up -d

# Docker Compose停止
docker-down:
	$(DOCKER_COMPOSE) down

# Docker Composeログ表示
docker-logs:
	$(DOCKER_COMPOSE) logs -f

# PostgreSQLへの直接アクセス
psql:
	$(DOCKER_COMPOSE) exec postgres psql -U postgres -d media_platform

# データベースリセット（開発用）
db-reset:
	$(DOCKER_COMPOSE) down -v
	$(DOCKER_COMPOSE) up -d postgres