import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  // useCallbackでナビゲーション関数をメモ化
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // useMemoで推奨ページリンクをメモ化
  const recommendedPages = useMemo(
    () => [
      {
        to: "/dashboard",
        icon: "🏠",
        title: "ダッシュボード",
        description: "メインページに戻る",
        color: "#3b82f6",
      },
      {
        to: "/search",
        icon: "🔍",
        title: "検索",
        description: "コンテンツを検索する",
        color: "#10b981",
      },
      {
        to: "/create",
        icon: "✏️",
        title: "新規投稿",
        description: "新しい記事を作成する",
        color: "#f59e0b",
      },
      {
        to: "/profile",
        icon: "👤",
        title: "プロフィール",
        description: "アカウント設定を確認",
        color: "#8b5cf6",
      },
    ],
    []
  );

  // useCallbackでカードのマウスイベントをメモ化
  const handleCardMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.transform = "translateY(-4px)";
      e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.15)";
    },
    []
  );

  const handleCardMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    },
    []
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* メインエラー表示 */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "3rem 2rem",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
            marginBottom: "2rem",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* 404アニメーション風のスタイル */}
          <div
            style={{
              fontSize: "8rem",
              fontWeight: "bold",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "1rem",
              lineHeight: "1",
            }}
          >
            404
          </div>

          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
            }}
          >
            🔍❌
          </div>

          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#374151",
              marginBottom: "1rem",
            }}
          >
            ページが見つかりません
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "#6b7280",
              marginBottom: "2rem",
              lineHeight: "1.6",
            }}
          >
            お探しのページは削除されたか、
            <br />
            URLが間違っている可能性があります。
          </p>

          {/* アクションボタン */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "2rem",
            }}
          >
            <button
              onClick={handleGoBack}
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#4b5563";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#6b7280";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ⬅️ 前のページに戻る
            </button>

            <button
              onClick={handleGoHome}
              style={{
                padding: "1rem 2rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              🏠 ダッシュボードへ
            </button>
          </div>

          {/* 現在のURL表示 */}
          <div
            style={{
              backgroundColor: "#f3f4f6",
              padding: "1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              color: "#6b7280",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            <strong>アクセスしたURL:</strong> {window.location.pathname}
          </div>
        </div>

        {/* 推奨ページ */}
        <div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "1.5rem",
            }}
          >
            💡 こちらのページはいかがですか？
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "1rem",
            }}
          >
            {recommendedPages.map((page) => (
              <Link
                key={page.to}
                to={page.to}
                style={{
                  display: "block",
                  backgroundColor: "white",
                  padding: "1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "all 0.3s ease",
                  border: "1px solid #e5e7eb",
                }}
                onMouseEnter={handleCardMouseEnter}
                onMouseLeave={handleCardMouseLeave}
              >
                <div
                  style={{
                    fontSize: "2.5rem",
                    marginBottom: "0.75rem",
                    color: page.color,
                  }}
                >
                  {page.icon}
                </div>
                <h3
                  style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  {page.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    lineHeight: "1.5",
                  }}
                >
                  {page.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* フッター情報 */}
        <div
          style={{
            marginTop: "3rem",
            padding: "1.5rem",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "1rem",
            }}
          >
            🆘 お困りですか？
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              fontSize: "0.875rem",
              color: "#6b7280",
              textAlign: "left",
            }}
          >
            <div>
              <strong style={{ color: "#374151" }}>
                🔗 リンクが正しくない場合:
              </strong>
              <br />
              URLを再確認するか、サイト内検索をご利用ください
            </div>
            <div>
              <strong style={{ color: "#374151" }}>
                📱 モバイルからアクセス:
              </strong>
              <br />
              ページの読み込みに時間がかかる場合があります
            </div>
            <div>
              <strong style={{ color: "#374151" }}>🔄 キャッシュの問題:</strong>
              <br />
              ブラウザを更新（F5キー）してみてください
            </div>
          </div>
        </div>

        {/* デバッグ情報（開発環境のみ） */}
        {process.env.NODE_ENV === "development" && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              backgroundColor: "#fef3c7",
              borderRadius: "8px",
              border: "1px solid #fcd34d",
              fontSize: "0.75rem",
              color: "#92400e",
              textAlign: "left",
            }}
          >
            <strong>🔧 開発者情報:</strong>
            <br />
            <code>
              User Agent: {navigator.userAgent}
              <br />
              Referrer: {document.referrer || "直接アクセス"}
              <br />
              Timestamp: {new Date().toISOString()}
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFoundPage;
