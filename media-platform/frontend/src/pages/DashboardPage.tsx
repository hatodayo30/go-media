import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { User, Content, Category } from "../types";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  // おすすめ度のバッジカラー
  const getRecommendationColor = useCallback((level: string) => {
    const colors: Record<string, string> = {
      必見: "#fee2e2",
      おすすめ: "#dbeafe",
      普通: "#f3f4f6",
      イマイチ: "#e5e7eb",
    };
    return colors[level] || "#f3f4f6";
  }, []);

  const getRecommendationTextColor = useCallback((level: string) => {
    const colors: Record<string, string> = {
      必見: "#dc2626",
      おすすめ: "#1d4ed8",
      普通: "#6b7280",
      イマイチ: "#374151",
    };
    return colors[level] || "#374151";
  }, []);

  // 認証チェック
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return false;
    }
    return true;
  }, [navigate]);

  // ユーザー情報取得
  const fetchUser = useCallback(async () => {
    try {
      const response = await api.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        throw new Error(response.message || "ユーザー情報の取得に失敗しました");
      }
    } catch (error: any) {
      console.error("❌ ユーザー情報取得エラー:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError("ユーザー情報の取得に失敗しました");
      }
    }
  }, [navigate]);

  // コンテンツ取得
  const fetchContents = useCallback(async (categoryId?: number | null) => {
    try {
      let response;
      if (categoryId) {
        response = await api.getContentsByCategory(categoryId.toString());
      } else {
        response = await api.getPublishedContents();
      }

      if (response.success && response.data) {
        setContents(response.data);
      } else {
        setContents([]);
        setError(response.message || "コンテンツの取得に失敗しました");
      }
    } catch (error: any) {
      console.error("❌ コンテンツ取得エラー:", error);
      setContents([]);
      setError("コンテンツの取得に失敗しました");
    }
  }, []);

  // カテゴリ取得
  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        setCategories([]);
        setError(response.message || "カテゴリの取得に失敗しました");
      }
    } catch (error: any) {
      console.error("❌ カテゴリ取得エラー:", error);
      setCategories([]);
      setError("カテゴリの取得に失敗しました");
    }
  }, []);

  // 初期データ取得
  const fetchUserAndData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!checkAuthentication()) return;

      await Promise.all([fetchUser(), fetchContents(), fetchCategories()]);
    } catch (error: any) {
      console.error("❌ データ取得エラー:", error);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [checkAuthentication, fetchUser, fetchContents, fetchCategories]);

  // カテゴリフィルター
  const handleCategoryFilter = useCallback(
    async (categoryId: number | null) => {
      setSelectedCategory(categoryId);
      setError(null);
      await fetchContents(categoryId);
    },
    [fetchContents]
  );

  // 検索
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, navigate]
  );

  // ログアウト
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  // コンテンツカードのレンダリング
  const renderContentCard = useCallback(
    (content: Content) => (
      <Link
        key={content.id}
        to={`/contents/${content.id}`}
        style={{
          textDecoration: "none",
          color: "inherit",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s",
            cursor: "pointer",
            border: "1px solid #e5e7eb",
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
            e.currentTarget.style.transform = "translateY(-4px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {/* カテゴリアイコン */}
          <div
            style={{
              fontSize: "3rem",
              textAlign: "center",
              marginBottom: "1rem",
            }}
          >
            {getCategoryIcon(content.type || content.category?.name || "")}
          </div>

          {/* 作品名 */}
          {content.work_title && (
            <div
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                marginBottom: "0.5rem",
                fontWeight: "500",
                textAlign: "center",
              }}
            >
              📖 {content.work_title}
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
              textAlign: "center",
            }}
          >
            {content.title}
          </h3>

          {/* 評価（星） */}
          {content.rating && (
            <div
              style={{
                marginBottom: "0.75rem",
                textAlign: "center",
                fontSize: "1.25rem",
              }}
            >
              {"⭐".repeat(Math.round(content.rating))}
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginLeft: "0.5rem",
                }}
              >
                {content.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* おすすめ度 */}
          {content.recommendation_level && (
            <div
              style={{
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  backgroundColor: getRecommendationColor(
                    content.recommendation_level
                  ),
                  color: getRecommendationTextColor(
                    content.recommendation_level
                  ),
                }}
              >
                {content.recommendation_level === "必見" && "🔥 "}
                {content.recommendation_level === "おすすめ" && "👍 "}
                {content.recommendation_level === "普通" && "😐 "}
                {content.recommendation_level === "イマイチ" && "👎 "}
                {content.recommendation_level}
              </span>
            </div>
          )}

          {/* タグ */}
          {content.tags && content.tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                justifyContent: "center",
                marginBottom: "0.75rem",
              }}
            >
              {content.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  #{tag}
                </span>
              ))}
              {content.tags.length > 3 && (
                <span
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  +{content.tags.length - 3}
                </span>
              )}
            </div>
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
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              flex: 1,
            }}
          >
            {content.body.substring(0, 80)}...
          </p>

          {/* メタ情報 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "#9ca3af",
              borderTop: "1px solid #f3f4f6",
              paddingTop: "0.75rem",
            }}
          >
            <span style={{ fontWeight: "500" }}>
              ✍️ {content.author?.username || "不明"}
            </span>
            <span>👁️ {content.view_count}</span>
          </div>
        </div>
      </Link>
    ),
    [getCategoryIcon, getRecommendationColor, getRecommendationTextColor]
  );

  useEffect(() => {
    fetchUserAndData();
  }, [fetchUserAndData]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ fontSize: "1.25rem", color: "#6b7280" }}>
            読み込み中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* エラー表示 */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "1rem",
            textAlign: "center",
            fontSize: "0.875rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ヘッダー */}
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem 0",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1rem",
          }}
        >
          {/* トップヘッダー */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/dashboard"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.75rem",
                  fontWeight: "bold",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                🎯 趣味投稿プラットフォーム
              </h1>
            </Link>

            {/* 検索バー */}
            <div style={{ flex: 1, maxWidth: "400px" }}>
              <form
                onSubmit={handleSearchSubmit}
                style={{ display: "flex", gap: "0.5rem" }}
              >
                <input
                  type="text"
                  placeholder="作品名、感想を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                  }}
                >
                  🔍
                </button>
              </form>
            </div>

            {/* ユーザー情報 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                👋 {user?.username}さん
              </span>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                🚪 ログアウト
              </button>
            </div>
          </div>

          {/* ナビゲーション */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/create"
              style={{
                padding: "0.75rem 1.5rem",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                boxShadow: "0 2px 4px rgba(102, 126, 234, 0.4)",
              }}
            >
              ✨ おすすめを投稿
            </Link>
            <Link
              to="/drafts"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#f59e0b",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              📝 下書き
            </Link>
            <Link
              to="/profile"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              👤 プロフィール
            </Link>
          </div>
        </div>
      </header>

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem 1rem",
          display: "flex",
          gap: "2rem",
        }}
      >
        {/* サイドバー */}
        <aside style={{ width: "250px", flexShrink: 0 }}>
          {/* カテゴリフィルター */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1.125rem",
                fontWeight: "600",
              }}
            >
              🎯 カテゴリ
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => handleCategoryFilter(null)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.75rem",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor:
                      selectedCategory === null ? "#dbeafe" : "transparent",
                    color: selectedCategory === null ? "#1d4ed8" : "#374151",
                    fontWeight: selectedCategory === null ? "600" : "400",
                    transition: "all 0.2s",
                  }}
                >
                  🏠 すべて
                </button>
              </li>
              {categories.map((category) => (
                <li key={category.id} style={{ marginBottom: "0.5rem" }}>
                  <button
                    onClick={() => handleCategoryFilter(category.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "0.75rem",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      backgroundColor:
                        selectedCategory === category.id
                          ? "#dbeafe"
                          : "transparent",
                      color:
                        selectedCategory === category.id
                          ? "#1d4ed8"
                          : "#374151",
                      fontWeight:
                        selectedCategory === category.id ? "600" : "400",
                      transition: "all 0.2s",
                    }}
                  >
                    {getCategoryIcon(category.name)} {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 統計 */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1.125rem",
                fontWeight: "600",
              }}
            >
              📊 統計
            </h3>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              <div style={{ marginBottom: "0.5rem" }}>
                📝 投稿数: {contents.length}件
              </div>
              <div>🏷️ カテゴリ: {categories.length}件</div>
            </div>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main style={{ flex: 1 }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1.875rem",
                fontWeight: "bold",
              }}
            >
              {selectedCategory
                ? `${getCategoryIcon(
                    categories.find((c) => c.id === selectedCategory)?.name ||
                      ""
                  )} ${categories.find((c) => c.id === selectedCategory)?.name}`
                : "🌟 みんなのおすすめ"}
            </h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              {contents.length}件の投稿
            </p>
          </div>

          {/* コンテンツ一覧 */}
          {contents.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {contents.map(renderContentCard)}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                backgroundColor: "white",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📝</div>
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  color: "#6b7280",
                  fontSize: "1.25rem",
                }}
              >
                まだ投稿がありません
              </h3>
              <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
                あなたのお気に入りの作品を共有しましょう！
              </p>
              <Link
                to="/create"
                style={{
                  display: "inline-block",
                  padding: "1rem 2rem",
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                }}
              >
                ✨ 最初の投稿を作成
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
