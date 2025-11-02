import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { User, Content, Category } from "../types";
import Sidebar from "../components/Sidebar";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // カテゴリアイコンのマッピング
  const getCategoryIcon = useCallback((categoryName: string) => {
    const icons: Record<string, string> = {
      音楽: "🎵",
      アニメ: "📺",
      漫画: "📚",
      映画: "🎬",
      ゲーム: "🎮",
    };
    return icons[categoryName] || "📁";
  }, []);

  // 初期データの取得
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // ユーザー情報を取得
        const userResponse = await api.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
        }

        // カテゴリを取得
        const categoriesResponse = await api.getCategories();
        if (categoriesResponse.success && categoriesResponse.data) {
          setCategories(categoriesResponse.data);
        }

        // 公開コンテンツを取得
        const contentsResponse = await api.getPublishedContents();
        if (contentsResponse.success && contentsResponse.data) {
          setContents(contentsResponse.data);
        }
      } catch (err) {
        console.error("データの取得に失敗:", err);
        setError("データの取得中にエラーが発生しました");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // カテゴリページに遷移
  const handleCategoryClick = (categoryName: string) => {
    navigate(`/category/${categoryName}`);
  };

  // すべてのコンテンツを表示
  const handleAllCategoriesClick = () => {
    navigate("/dashboard"); // 現在のページをリロード
    window.location.reload();
  };

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, backgroundColor: "#f9fafb", overflow: "auto" }}>
        {/* メインコンテンツ */}
        <main style={{ flex: 1, backgroundColor: "#ffffff" }}>
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
              {/* タイトルスペース */}
              <div style={{ height: "1.5rem" }}></div>

              {/* ユーザー情報 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  {user?.username || "ゲスト"}
                </span>
              </div>
            </div>
          </header>

          {/* エラーメッセージ */}
          {error && (
            <div
              style={{
                margin: "1.5rem 2rem",
                padding: "1rem",
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#991b1b",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* カテゴリセクション */}
          <div style={{ padding: "2rem" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ color: "#6b7280" }}>読み込み中...</p>
              </div>
            ) : (
              <>
                {/* カテゴリタイトル */}
                <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "600",
                      color: "#1f2937",
                    }}
                  >
                    ⭐ カテゴリから探す
                  </h2>
                </div>

                {/* カテゴリカードグリッド */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "1.5rem",
                    maxWidth: "900px",
                    margin: "0 auto",
                  }}
                >
                  {/* 音楽 */}
                  <button
                    onClick={() => handleCategoryClick("音楽")}
                    style={{
                      backgroundColor: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "2rem 1rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                      🎵
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      音楽
                    </div>
                  </button>

                  {/* ゲーム */}
                  <button
                    onClick={() => handleCategoryClick("ゲーム")}
                    style={{
                      backgroundColor: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "2rem 1rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                      🎮
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      ゲーム
                    </div>
                  </button>

                  {/* 映画 */}
                  <button
                    onClick={() => handleCategoryClick("映画")}
                    style={{
                      backgroundColor: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "2rem 1rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                      🎬
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      映画
                    </div>
                  </button>

                  {/* アニメ */}
                  <button
                    onClick={() => handleCategoryClick("アニメ")}
                    style={{
                      backgroundColor: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "2rem 1rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                      📺
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      アニメ
                    </div>
                  </button>

                  {/* 漫画 */}
                  <button
                    onClick={() => handleCategoryClick("漫画")}
                    style={{
                      backgroundColor: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "2rem 1rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                      📚
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      漫画
                    </div>
                  </button>

                  {/* すべて */}
                  <button
                    onClick={handleAllCategoriesClick}
                    style={{
                      backgroundColor: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "2rem 1rem",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#3b82f6";
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#e5e7eb";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                      🏠
                    </div>
                    <div
                      style={{
                        fontSize: "1rem",
                        fontWeight: "600",
                        color: "#1f2937",
                      }}
                    >
                      すべて
                    </div>
                  </button>
                </div>

                {/* 投稿セクション */}
                <div style={{ marginTop: "3rem" }}>
                  {contents.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "1.5rem",
                      }}
                    >
                      {contents.slice(0, 6).map((content) => (
                        <div
                          key={content.id}
                          onClick={() => navigate(`/contents/${content.id}`)}
                          style={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-4px)";
                            e.currentTarget.style.boxShadow =
                              "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          {/* カテゴリバッジ */}
                          <div style={{ marginBottom: "0.75rem" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.25rem 0.75rem",
                                backgroundColor: "#dbeafe",
                                color: "#1e40af",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "500",
                              }}
                            >
                              {getCategoryIcon(content.type)} {content.type}
                            </span>
                          </div>

                          {/* タイトル */}
                          <h3
                            style={{
                              fontSize: "1.125rem",
                              fontWeight: "600",
                              color: "#1f2937",
                              marginBottom: "0.75rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {content.title}
                          </h3>

                          {/* 作品名 */}
                          {content.work_title && (
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "#6b7280",
                                marginBottom: "0.5rem",
                              }}
                            >
                              作品: {content.work_title}
                            </p>
                          )}

                          {/* 本文プレビュー */}
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: "#4b5563",
                              marginBottom: "1rem",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              lineHeight: "1.5",
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
                              fontSize: "0.75rem",
                              color: "#9ca3af",
                            }}
                          >
                            <span>{content.author?.username || "匿名"}</span>
                            <span>
                              {new Date(content.created_at).toLocaleDateString(
                                "ja-JP"
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
