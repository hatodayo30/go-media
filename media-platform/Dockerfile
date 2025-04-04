FROM golang:1.23.4-alpine AS builder

WORKDIR /app

# 依存関係のコピーとダウンロード
COPY go.mod go.sum ./
RUN go mod download

# ソースコードのコピー
COPY . .

# アプリケーションのビルド
RUN CGO_ENABLED=0 GOOS=linux go build -o api-server ./cmd/api/main.go

# 最終イメージの作成
FROM alpine:latest

WORKDIR /app

# timezoneデータとCA証明書の追加
RUN apk --no-cache add tzdata ca-certificates

# ビルドしたバイナリをコピー
COPY --from=builder /app/api-server .

# データベース初期化スクリプトをコピー
COPY scripts/init.sql /app/scripts/

# 必要なディレクトリの作成
RUN mkdir -p /app/uploads

# 実行ユーザーの設定
RUN adduser -D appuser
USER appuser

# アプリケーションの実行
CMD ["./api-server"]