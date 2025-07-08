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

  // useCallbackで認証チェックをメモ化
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("❌ 認証なし、ログインページへリダイレクト");
      navigate("/login");
      return false;
    }
    return true;
  }, [navigate]);

  // useCallbackでユーザー情報取得をメモ化
  const fetchUser = useCallback(async () => {
    try {
      console.log("👤 ユーザー情報取得開始");
      const response = await api.getCurrentUser();

      if (response.success && response.data) {
        setUser(response.data);
        console.log("✅ ユーザー情報取得成功:", response.data.username);
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

  // useCallbackでコンテンツ取得をメモ化
  const fetchContents = useCallback(async (categoryId?: number | null) => {
    try {
      console.log(
        "📄 コンテンツ取得開始:",
        categoryId ? `カテゴリ${categoryId}` : "全て"
      );

      let response;
      if (categoryId) {
        response = await api.getContentsByCategory(categoryId.toString());
      } else {
        response = await api.getPublishedContents();
      }

      if (response.success && response.data) {
        setContents(response.data);
        console.log(`✅ コンテンツ取得成功: ${response.data.length}件`);
      } else {
        console.error("❌ コンテンツ取得失敗:", response);
        setContents([]);
        setError(response.message || "コンテンツの取得に失敗しました");
      }
    } catch (error: any) {
      console.error("❌ コンテンツ取得エラー:", error);
      setContents([]);
      setError("コンテンツの取得に失敗しました");
    }
  }, []);

  // useCallbackでカテゴリ取得をメモ化
  const fetchCategories = useCallback(async () => {
    try {
      console.log("📂 カテゴリ取得開始");
      const response = await api.getCategories();

      if (response.success && response.data) {
        setCategories(response.data);
        console.log(`✅ カテゴリ取得成功: ${response.data.length}件`);
      } else {
        console.error("❌ カテゴリ取得失敗:", response);
        setCategories([]);
        setError(response.message || "カテゴリの取得に失敗しました");
      }
    } catch (error: any) {
      console.error("❌ カテゴリ取得エラー:", error);
      setCategories([]);
      setError("カテゴリの取得に失敗しました");
    }
  }, []);

  // useCallbackで初期データ取得をメモ化
  const fetchUserAndData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 認証チェック
      if (!checkAuthentication()) {
        return;
      }

      // 並列でデータ取得
      await Promise.all([fetchUser(), fetchContents(), fetchCategories()]);

      console.log("✅ 全データ取得完了");
    } catch (error: any) {
      console.error("❌ データ取得エラー:", error);
      setError("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [checkAuthentication, fetchUser, fetchContents, fetchCategories]);

  // useCallbackでカテゴリフィルターをメモ化
  const handleCategoryFilter = useCallback(
    async (categoryId: number | null) => {
      try {
        console.log("🔍 カテゴリフィルター:", categoryId);
        setSelectedCategory(categoryId);
        setError(null);
        await fetchContents(categoryId);
      } catch (error: any) {
        console.error("❌ カテゴリフィルターエラー:", error);
        setError("フィルターの適用に失敗しました");
      }
    },
    [fetchContents]
  );

  // useCallbackで検索フォーム送信をメモ化
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        console.log("🔍 検索実行:", searchQuery.trim());
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, navigate]
  );

  // useCallbackでログアウトをメモ化
  const handleLogout = useCallback(() => {
    console.log("🚪 ログアウト実行");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  // useCallbackで検索入力変更をメモ化
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  // useCallbackでマウスイベントハンドラーをメモ化
  const handleCardMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
      e.currentTarget.style.transform = "translateY(-2px)";
    },
    []
  );

  const handleCardMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
      e.currentTarget.style.transform = "translateY(0)";
    },
    []
  );

  const handleLinkMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.color = "#3b82f6";
    },
    []
  );

  const handleLinkMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.color = "inherit";
    },
    []
  );

  // useCallbackでカテゴリボタンスタイルをメモ化
  const getCategoryButtonStyle = useCallback(
    (isSelected: boolean) => ({
      width: "100%",
      textAlign: "left" as const,
      padding: "0.75rem",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      backgroundColor: isSelected ? "#dbeafe" : "transparent",
      color: isSelected ? "#1d4ed8" : "#374151",
      fontWeight: isSelected ? "600" : "400",
      transition: "all 0.2s",
    }),
    []
  );

  // useCallbackでrenderContentCardをメモ化
  const renderContentCard = useCallback(
    (content: Content) => (
      <div
        key={content.id}
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "1.5rem",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s",
          cursor: "pointer",
          border: "1px solid #e5e7eb",
        }}
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              backgroundColor: "#dbeafe",
              color: "#1d4ed8",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontWeight: "500",
            }}
          >
            📁 {content.category?.name || "カテゴリなし"}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              backgroundColor: "#f3f4f6",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
            }}
          >
            👁️ {content.view_count}
          </span>
        </div>

        <h3
          style={{
            margin: "0 0 0.75rem 0",
            fontSize: "1.125rem",
            fontWeight: "600",
            color: "#1f2937",
            lineHeight: "1.4",
          }}
        >
          <Link
            to={`/contents/${content.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              transition: "color 0.2s",
            }}
            onMouseEnter={handleLinkMouseEnter}
            onMouseLeave={handleLinkMouseLeave}
          >
            {content.title}
          </Link>
        </h3>

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
          }}
        >
          {content.body.substring(0, 120)}...
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "0.75rem",
            color: "#6b7280",
            borderTop: "1px solid #f3f4f6",
            paddingTop: "0.75rem",
          }}
        >
          <span style={{ fontWeight: "500" }}>
            ✍️ {content.author?.username || "不明"}
          </span>
          <span>
            📅 {new Date(content.created_at).toLocaleDateString("ja-JP")}
          </span>
        </div>
      </div>
    ),
    [
      handleCardMouseEnter,
      handleCardMouseLeave,
      handleLinkMouseEnter,
      handleLinkMouseLeave,
    ]
  );

  // useMemoで統計データをメモ化
  const stats = useMemo(
    () => ({
      contentsCount: contents.length,
      categoriesCount: categories.length,
      userRole: user?.role || "未設定",
    }),
    [contents.length, categories.length, user?.role]
  );

  // useMemoでヘッダータイトルをメモ化
  const headerTitle = useMemo(() => {
    if (selectedCategory) {
      const category = categories.find((c) => c.id === selectedCategory);
      return `📁 ${category?.name || "不明なカテゴリ"}`;
    }
    return "🏠 すべてのコンテンツ";
  }, [selectedCategory, categories]);

  // useMemoでナビゲーションリンクをメモ化
  const navigationLinks = useMemo(
    () => [
      { to: "/create", label: "✏️ 新規投稿", color: "#3b82f6" },
      { to: "/drafts", label: "📝 下書き一覧", color: "#f59e0b" },
      { to: "/my-posts", label: "📄 マイ投稿", color: "#8b5cf6" },
      { to: "/profile", label: "👤 プロフィール", color: "#6b7280" },
      { to: "/search", label: "🔍 検索", color: "#10b981" },
    ],
    []
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
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div>読み込み中...</div>
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
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>
                📰 メディアプラットフォーム
              </h1>
            </div>

            {/* 検索バー */}
            <div style={{ flex: 1, maxWidth: "400px" }}>
              <form
                onSubmit={handleSearchSubmit}
                style={{ display: "flex", gap: "0.5rem" }}
              >
                <input
                  type="text"
                  placeholder="記事を検索..."
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  style={{
                    flex: 1,
                    padding: "0.5rem 1rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
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
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  🔍
                </button>
                <Link
                  to="/search"
                  style={{
                    backgroundColor: "#6b7280",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  詳細検索
                </Link>
              </form>
            </div>

            {/* ユーザー情報 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                こんにちは、{user?.username}さん ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                🚪 ログアウト
              </button>
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            {navigationLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: link.color,
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {link.label}
              </Link>
            ))}
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
              borderRadius: "8px",
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
              📂 カテゴリ
            </h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li style={{ marginBottom: "0.5rem" }}>
                <button
                  onClick={() => handleCategoryFilter(null)}
                  style={getCategoryButtonStyle(selectedCategory === null)}
                >
                  🏠 すべて
                </button>
              </li>
              {categories.map((category) => (
                <li key={category.id} style={{ marginBottom: "0.5rem" }}>
                  <button
                    onClick={() => handleCategoryFilter(category.id)}
                    style={getCategoryButtonStyle(
                      selectedCategory === category.id
                    )}
                  >
                    📁 {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 統計情報 */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              marginTop: "1rem",
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
                📝 公開記事: {stats.contentsCount}件
              </div>
              <div style={{ marginBottom: "0.5rem" }}>
                🏷️ カテゴリ: {stats.categoriesCount}件
              </div>
              <div>👤 ログイン: {stats.userRole}</div>
            </div>
          </div>

          {/* 検索ヒント */}
          <div
            style={{
              backgroundColor: "#fef3c7",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1rem",
              border: "1px solid #fcd34d",
            }}
          >
            <h4
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#92400e",
              }}
            >
              💡 検索のヒント
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: "#92400e",
                lineHeight: "1.4",
              }}
            >
              上部の検索バーから素早く検索、「詳細検索」でフィルターを使用できます。
            </p>
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
              {headerTitle}
            </h2>
            <p style={{ margin: 0, color: "#6b7280" }}>
              {contents.length}件のコンテンツが見つかりました
            </p>
          </div>

          {/* コンテンツ一覧 */}
          {contents.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
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
                borderRadius: "8px",
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
                {selectedCategory
                  ? "このカテゴリにはまだコンテンツがありません"
                  : "コンテンツが見つかりませんでした"}
              </h3>
              <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
                新しいコンテンツを作成して、プラットフォームを充実させましょう！
              </p>
              <Link
                to="/create"
                style={{
                  display: "inline-block",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontSize: "1rem",
                  fontWeight: "500",
                }}
              >
                ✏️ 最初のコンテンツを作成
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
