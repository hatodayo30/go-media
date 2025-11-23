FROM golang:1.23-alpine

# 作業ディレクトリ設定
WORKDIR /app

# 必要なパッケージをインストール
RUN apk add --no-cache git wget

# ✅ golang-migrate をインストール
RUN wget -qO- https://github.com/golang-migrate/migrate/releases/download/v4.18.1/migrate.linux-amd64.tar.gz | tar xvz -C /usr/local/bin && \
    chmod +x /usr/local/bin/migrate

# Air (ホットリロード) をインストール
RUN go install github.com/air-verse/air@latest

# go.modとgo.sumをコピーして依存関係をダウンロード
COPY go.mod go.sum ./
RUN go mod download

# ソースコードをコピー
COPY . .

# Airの設定ファイルをコピー
COPY .air.toml ./

# Air経由でアプリケーションを起動
CMD ["air", "-c", ".air.toml"]