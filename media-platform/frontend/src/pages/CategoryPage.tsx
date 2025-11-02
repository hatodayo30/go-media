import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { Content, Category } from "../types";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const CategoryPage: React.FC = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contents, setContents] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // カテゴリアイコンマッピング
  const getCategoryIcon = (name: string): string => {
    const icons: Record<string, string> = {
      音楽: "🎵",
      アニメ: "📺",
      漫画: "📚",
      映画: "🎬",
      ゲーム: "🎮",
    };
    return icons[name] || "📁";
  };

  // カテゴリ情報を取得
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error("カテゴリの取得に失敗:", err);
      }
    };
    fetchCategories();
  }, []);

  // カテゴリに基づいてコンテンツを取得
  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true);
      setError(null);

      try {
        const category = categories.find((c) => c.name === categoryName);

        if (!category && categories.length > 0) {
          setError("指定されたカテゴリが見つかりません");
          setLoading(false);
          return;
        }

        if (category) {
          const response = await api.getContentsByCategory(
            category.id.toString()
          );

          if (response.success && response.data) {
            // 公開済みのコンテンツのみフィルタリング
            const publishedContents = response.data.filter(
              (content) => content.status === "published"
            );
            setContents(publishedContents);
          } else {
            setError(response.message || "コンテンツの取得に失敗しました");
          }
        }
      } catch (err) {
        console.error("コンテンツの取得エラー:", err);
        setError("コンテンツの取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    if (categories.length > 0) {
      fetchContents();
    }
  }, [categoryName, categories]);

  // 検索フィルタリング
  const filteredContents = contents.filter((content) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      content.title?.toLowerCase().includes(query) ||
      content.work_title?.toLowerCase().includes(query) ||
      content.body?.toLowerCase().includes(query) ||
      content.artist_name?.toLowerCase().includes(query) ||
      content.genre?.toLowerCase().includes(query)
    );
  });

  if (!categoryName) {
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
            <p
              style={{
                fontSize: "1.25rem",
                color: "#6b7280",
                marginBottom: "1rem",
              }}
            >
              カテゴリが指定されていません
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
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, backgroundColor: "#f9fafb", overflow: "auto" }}>
        {/* ヘッダー */}
        <header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e5e7eb",
            padding: "1rem 2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* カテゴリタイトル */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "2rem" }}>
                {getCategoryIcon(categoryName)}
              </span>
              <h1
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  margin: 0,
                }}
              >
                {categoryName}
              </h1>
            </div>

            {/* ユーザー情報 */}
            {user && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                <span>👤 {user.username}</span>
              </div>
            )}
          </div>

          {/* 検索バー */}
          <div style={{ marginTop: "1rem" }}>
            <input
              type="text"
              placeholder="タイトル、作品名、本文、アーティスト、ジャンルで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                maxWidth: "600px",
                padding: "0.75rem 1rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
                boxSizing: "border-box",
              }}
            />
          </div>
        </header>

        {/* メインコンテンツ */}
        <main style={{ padding: "2rem" }}>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "#6b7280",
              }}
            >
              <p style={{ fontSize: "1.125rem" }}>📥 読み込み中...</p>
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
              <p style={{ color: "#ef4444", fontSize: "1.125rem" }}>{error}</p>
              <button
                onClick={() => navigate("/dashboard")}
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                ダッシュボードに戻る
              </button>
            </div>
          ) : filteredContents.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
              <h3 style={{ color: "#6b7280", marginBottom: "0.5rem" }}>
                {searchQuery ? "検索結果がありません" : "まだ投稿がありません"}
              </h3>
              <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                {searchQuery
                  ? "別のキーワードで検索してみてください"
                  : "最初の投稿を作成しましょう！"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate("/create")}
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  ➕ 新規投稿
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 検索結果の表示 */}
              {searchQuery && (
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#dbeafe",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    color: "#1e40af",
                  }}
                >
                  🔍 検索結果: {filteredContents.length}件
                </div>
              )}

              {/* コンテンツグリッド */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {filteredContents.map((content) => (
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
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0, 0, 0, 0.15)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 1px 3px rgba(0, 0, 0, 0.1)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
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

                      {/* 作品タイトル */}
                      {content.work_title && (
                        <p
                          style={{
                            margin: "0 0 0.5rem 0",
                            fontSize: "0.875rem",
                            color: "#3b82f6",
                            fontWeight: "500",
                          }}
                        >
                          📖 {content.work_title}
                        </p>
                      )}

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
                        <span>👁️ {content.view_count}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CategoryPage;
