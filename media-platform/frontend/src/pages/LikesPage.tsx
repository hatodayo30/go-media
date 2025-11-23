import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { Content, Rating } from "../types";
import Sidebar from "../components/Sidebar";

const LikesPage: React.FC = () => {
  const navigate = useNavigate();
  const [likedContents, setLikedContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // いいねした投稿を取得
  const fetchLikedContents = useCallback(async (userId: number) => {
    try {
      setLoading(true);
      setError(null);
      console.log("❤️ いいねした投稿を取得中...");

      // ユーザーの評価を取得
      const ratingsResponse = await api.getRatingsByUser(userId.toString());

      if (ratingsResponse.success && ratingsResponse.data) {
        // 評価が1（いいね）のものだけをフィルタリング
        const likedRatings = ratingsResponse.data.filter(
          (rating: Rating) => rating.value === 1
        );

        console.log(`✅ いいね数: ${likedRatings.length}件`);

        if (likedRatings.length === 0) {
          setLikedContents([]);
          setLoading(false);
          return;
        }

        // 各いいねした投稿の詳細を取得
        const contentPromises = likedRatings.map(async (rating: Rating) => {
          try {
            const contentResponse = await api.getContentById(
              rating.content_id.toString()
            );
            if (contentResponse.success && contentResponse.data) {
              return contentResponse.data;
            }
            return null;
          } catch (error) {
            console.error(
              `コンテンツ ${rating.content_id} の取得エラー:`,
              error
            );
            return null;
          }
        });

        const contents = await Promise.all(contentPromises);
        const validContents = contents.filter(
          (content): content is Content => content !== null
        );

        setLikedContents(validContents);
        console.log(`✅ 投稿詳細取得完了: ${validContents.length}件`);
      } else {
        throw new Error(
          ratingsResponse.message || "いいねした投稿の取得に失敗しました"
        );
      }
    } catch (err: any) {
      console.error("❌ いいねした投稿の取得エラー:", err);
      setError(err.message || "いいねした投稿の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 認証チェックとユーザーIDの取得
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        console.log("❌ 認証なし、ログインページへリダイレクト");
        navigate("/login");
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          setCurrentUserId(user.id);
          fetchLikedContents(user.id);
          console.log("✅ ユーザーID取得:", user.id);
        } else {
          console.error("❌ ユーザーIDが見つかりません");
          navigate("/login");
        }
      } catch (error) {
        console.error("❌ ユーザー情報の解析エラー:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate, fetchLikedContents]);

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
            <p style={{ fontSize: "1.125rem", color: "#6b7280" }}>
              いいねした投稿を読み込み中...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          backgroundColor: "#f9fafb",
          overflow: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          {/* ページヘッダー */}
          <div
            style={{
              marginBottom: "2rem",
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                margin: "0 0 0.5rem 0",
                color: "#1f2937",
              }}
            >
              ❤️ いいねした投稿
            </h1>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "0.875rem",
              }}
            >
              あなたがいいねした投稿一覧
              {likedContents.length > 0 && ` • ${likedContents.length}件`}
            </p>
          </div>

          {/* エラー表示 */}
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                border: "1px solid #ef4444",
                color: "#dc2626",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* コンテンツ表示 */}
          {likedContents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>💔</div>
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  color: "#6b7280",
                  fontSize: "1.25rem",
                }}
              >
                まだいいねした投稿がありません
              </h3>
              <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
                気に入った投稿にいいねしてみましょう！
              </p>
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "500",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                }}
              >
                🏠 ホームへ
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {likedContents.map((content) => (
                <Link
                  key={content.id}
                  to={`/contents/${content.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      padding: "1.5rem",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      transition: "all 0.2s",
                      cursor: "pointer",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      border: "2px solid #fecaca",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(0, 0, 0, 0.15)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.borderColor = "#ef4444";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 1px 3px rgba(0, 0, 0, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "#fecaca";
                    }}
                  >
                    {/* いいねバッジ */}
                    <div
                      style={{
                        display: "inline-block",
                        alignSelf: "flex-start",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: "500",
                        marginBottom: "0.75rem",
                      }}
                    >
                      ❤️ いいね済み
                    </div>

                    {/* カテゴリ */}
                    {content.category && (
                      <div
                        style={{
                          display: "inline-block",
                          alignSelf: "flex-start",
                          backgroundColor: "#dbeafe",
                          color: "#1d4ed8",
                          padding: "0.25rem 0.75rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          marginBottom: "0.75rem",
                        }}
                      >
                        📁 {content.category.name}
                      </div>
                    )}

                    {/* タイトル */}
                    <h3
                      style={{
                        margin: "0 0 0.75rem 0",
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#1f2937",
                        lineHeight: "1.4",
                      }}
                    >
                      {content.title}
                    </h3>

                    {/* 本文プレビュー */}
                    <p
                      style={{
                        margin: "0 0 1rem 0",
                        color: "#6b7280",
                        fontSize: "0.875rem",
                        lineHeight: "1.5",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        flex: 1,
                      }}
                    >
                      {content.body}
                    </p>

                    {/* メタ情報 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: "0.75rem",
                        borderTop: "1px solid #f3f4f6",
                        fontSize: "0.75rem",
                        color: "#9ca3af",
                      }}
                    >
                      <span>✍️ {content.author?.username || "不明"}</span>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        <span>👁️ {content.view_count}</span>
                        <span>📅 {formatDate(content.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LikesPage;
