# ========================================
# Stage 1: Builder
# ========================================
FROM golang:1.23.9-alpine AS builder

# 作業ディレクトリの設定
WORKDIR /app

# 必要なパッケージのインストール
RUN apk add --no-cache git ca-certificates tzdata

# 依存関係のコピーとダウンロード
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# ソースコードのコピー
COPY . .

# アプリケーションのビルド
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o api-server \
    ./cmd/api/main.go

# ========================================
# Stage 2: Runner
# ========================================
FROM alpine:latest

# 作業ディレクトリの設定
WORKDIR /app

# 必要なパッケージのインストール
RUN apk add --no-cache ca-certificates tzdata wget

# タイムゾーンの設定（オプション）
ENV TZ=Asia/Tokyo

# ビルドしたバイナリをコピー
COPY --from=builder /app/api-server .

# スクリプトファイルをコピー
COPY --from=builder /app/scripts/init.sql /app/scripts/

# 必要なディレクトリの作成
RUN mkdir -p /app/uploads

# 非rootユーザーの作成と権限設定
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1000 -G appgroup appuser && \
    chown -R appuser:appgroup /app

# 非rootユーザーに切り替え
USER appuser

# ポートの公開
EXPOSE 8082

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider --method=GET http://localhost:8082/health || exit 1

# アプリケーションの実行
CMD ["./api-server"]