# ===============================================
# Backend用 Makefile (マイグレーション管理)
# ===============================================

# データベース接続情報
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=media_platform
DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=disable

# Docker環境用のDB URL
DOCKER_DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@postgres:$(DB_PORT)/$(DB_NAME)?sslmode=disable

# マイグレーションディレクトリ
MIGRATIONS_PATH=./migrations

.PHONY: help migrate-up migrate-down migrate-force migrate-version migrate-create migrate-drop db-reset

# ===============================================
# ヘルプ
# ===============================================
help: ## ヘルプを表示
	@echo "=============================================="
	@echo "📦 Backend マイグレーション管理"
	@echo "=============================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ===============================================
# マイグレーション管理
# ===============================================
migrate-up: ## マイグレーションを適用
	@echo "🚀 マイグレーションを適用中..."
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" up
	@echo "✅ マイグレーション完了"

migrate-down: ## 最新のマイグレーションを1つ戻す
	@echo "⏪ マイグレーションを1つ戻します..."
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down 1
	@echo "✅ ロールバック完了"

migrate-force: ## マイグレーションのバージョンを強制設定 (make migrate-force VERSION=1)
	@echo "🔧 マイグレーションバージョンを $(VERSION) に設定中..."
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" force $(VERSION)
	@echo "✅ バージョン設定完了"

migrate-version: ## 現在のマイグレーションバージョンを表示
	@echo "📌 現在のマイグレーションバージョン:"
	@migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" version

migrate-create: ## 新しいマイグレーションを作成 (make migrate-create NAME=add_table)
	@echo "📝 新しいマイグレーションを作成: $(NAME)"
	migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $(NAME)
	@echo "✅ マイグレーションファイルを作成しました"

migrate-drop: ## すべてのテーブルを削除 (⚠️ 注意: 本番環境では使用禁止)
	@echo "⚠️  警告: すべてのテーブルを削除します"
	@read -p "本当に削除しますか? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" drop -f; \
		echo "✅ すべてのテーブルを削除しました"; \
	else \
		echo "❌ キャンセルしました"; \
	fi

db-reset: migrate-drop migrate-up ## データベースをリセット (削除 → 再構築)

# ===============================================
# Docker環境用マイグレーション
# ===============================================
docker-migrate-up: ## Docker環境でマイグレーションを適用
	@echo "🐳 Docker環境でマイグレーションを適用中..."
	docker compose exec api migrate -path /app/migrations -database "$(DOCKER_DB_URL)" up
	@echo "✅ マイグレーション完了"

docker-migrate-down: ## Docker環境でマイグレーションを1つ戻す
	@echo "🐳 Docker環境でマイグレーションを戻します..."
	docker compose exec api migrate -path /app/migrations -database "$(DOCKER_DB_URL)" down 1
	@echo "✅ ロールバック完了"

docker-migrate-version: ## Docker環境のマイグレーションバージョンを表示
	@echo "🐳 Docker環境のマイグレーションバージョン:"
	@docker compose exec api migrate -path /app/migrations -database "$(DOCKER_DB_URL)" version