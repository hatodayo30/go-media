# go-media

# メディアプラットフォーム

メディアコンテンツ（記事、動画、画像）を管理するプラットフォームのバックエンド API サーバー

## 技術スタック

- **言語**: Go
- **データベース**: PostgreSQL
- **コンテナ化**: Docker, Docker Compose

## プロジェクト構造

```
media-platform/
├── cmd/
│   └── api/
│       └── main.go        # アプリケーションのエントリーポイント
├── configs/
│   └── config.go          # 設定情報
├── internal/
│   ├── domain/            # ドメイン層
│   ├── infrastructure/    # インフラ層
│   ├── usecase/           # ユースケース層
│   └── interfaces/        # インターフェース層
├── scripts/
│   └── init.sql           # データベース初期化スクリプト
├── pkg/                   # 共通パッケージ
├── docker-compose.yml     # Docker Compose設定
├── Dockerfile             # APIサーバービルド用
├── Makefile               # 便利なコマンド集
├── go.mod                 # Goモジュール定義
└── go.sum                 # 依存関係のチェックサム
```

## セットアップと実行方法

### 前提条件

- Docker と Docker Compose がインストールされていること
- Make コマンドが使用可能であること（オプション）

### 環境変数

`docker-compose.yml` ファイル内で以下の環境変数を設定するか、`.env` ファイルを作成してください:

- `SERVER_PORT`: API サーバーのポート番号
- `DB_HOST`: データベースホスト名
- `DB_PORT`: データベースポート
- `DB_USER`: データベースユーザー名
- `DB_PASSWORD`: データベースパスワード
- `DB_NAME`: データベース名
- `DB_SSL_MODE`: SSL モード
- `JWT_SECRET`: JWT 認証用シークレットキー
- `JWT_EXPIRATION`: JWT トークンの有効期限
- `LOG_LEVEL`: ログレベル

### データベーススキーマ

データベーススキーマは `scripts/init.sql` ファイルで定義されています。PostgreSQL コンテナの初回起動時に自動的に適用されます。スキーマを変更する場合は、このファイルを編集してからコンテナを再起動する必要があります。

### 起動方法

Makefile を使用する場合:

```bash
# Docker イメージをビルドする
make docker-build

# サービスを起動する
make docker-up

# ログを確認する
make docker-logs
```

Makefile を使用しない場合:

```bash
# Docker イメージをビルドする
docker compose build

# サービスを起動する
docker compose up -d

# ログを確認する
docker compose logs -f
```

### アクセス方法

- **API サーバー**: http://localhost:8080
- **pgAdmin**: http://localhost:5050 (Email: admin@example.com, Password: admin)

## データベース接続情報 (pgAdmin 用)

- **ホスト名**: postgres
- **ポート**: 5432
- **ユーザー名**: postgres
- **パスワード**: postgres
- **データベース名**: media_platform

## データベース管理

以下のコマンドを使用してデータベースに直接アクセスできます:

```bash
# PostgreSQLコンソールにアクセス
make psql

# または
docker compose exec postgres psql -U postgres -d media_platform
```

データベースをリセットする（すべてのデータを削除）:

```bash
make db-reset
```

## カスタマイズ方法

- **ポート変更**: `docker-compose.yml` の `ports` セクションで変更可能
- **データベース設定**: `docker-compose.yml` の `environment` セクションで変更可能
- **スキーマ変更**: `scripts/init.sql` ファイルを編集し、コンテナを再起動
- **ボリューム**: 永続データは Docker ボリュームに保存されます

## 開発フロー

1. コードを変更する
2. 必要に応じて `scripts/init.sql` を更新（スキーマ変更の場合）
3. `make docker-build` でイメージを再ビルド
4. `make docker-up` でサービスを再起動

## API ドキュメント

API ドキュメントは `/api/docs` エンドポイントで確認できます（Swagger UI を実装する場合）。

media-platform/
├── templates/
│ ├── index.html # ホームページ
│ ├── login.html # ログインページ
│ ├── register.html # 登録ページ
│ ├── profile.html # ユーザープロフィール
│ ├── content/
│ │ ├── list.html # コンテンツ一覧
│ │ ├── single.html # 単一コンテンツ表示
│ │ ├── create.html # コンテンツ作成
│ │ └── edit.html # コンテンツ編集
│ └── partials/ # 再利用可能なパーツ
│ ├── header.html # ヘッダー
│ ├── footer.html # フッター
│ └── sidebar.html # サイドバー
│
├── static/
│ ├── css/
│ │ ├── style.css # メインスタイル
│ │ ├── auth.css # 認証関連スタイル
│ │ └── content.css # コンテンツ関連スタイル
│ ├── js/
│ │ ├── main.js # メインスクリプト
│ │ ├── auth.js # 認証関連スクリプト
│ │ └── content.js # コンテンツ関連スクリプト
│ └── images/ # イメージファイル

フォロー機能を最優先で完成（フロントが待機状態）
いいね機能 - フォロー機能と似た構造
通知機能 - フォロー・いいねイベント通知
ブックマーク機能 - 比較的シンプル
タグ機能 - コンテンツ検索の拡張
