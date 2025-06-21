import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type {
  User,
  Content,
  Category,
  SearchParams,
  ApiResponse,
} from "../types";

interface SearchFilters {
  query: string;
  category_id?: number;
  author_id?: number;
  type?: string;
  sort_by?: "date" | "popularity" | "rating";
}

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category_id: undefined,
    author_id: undefined,
    type: undefined,
    sort_by: "date",
  });

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

  // useCallbackでfetchInitialDataをメモ化
  const fetchInitialData = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError("");

      // 認証チェック
      if (!checkAuthentication()) {
        return;
      }

      console.log("📥 初期データを取得中...");

      const [userResponse, categoriesResponse, authorsResponse] =
        await Promise.all([
          api.getCurrentUser(),
          api.getCategories(),
          api.getUsers(),
        ]);

      console.log("👤 ユーザーレスポンス:", userResponse);
      console.log("📁 カテゴリレスポンス:", categoriesResponse);
      console.log("✍️ 著者レスポンス:", authorsResponse);

      // ユーザー情報の設定
      if (userResponse.success && userResponse.data) {
        setUser(userResponse.data);
        console.log("✅ ユーザー設定完了:", userResponse.data.username);
      } else {
        throw new Error(
          userResponse.message || "ユーザー情報の取得に失敗しました"
        );
      }

      // カテゴリ情報の設定
      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
        console.log(
          "✅ カテゴリ設定完了:",
          categoriesResponse.data.length,
          "件"
        );
      } else {
        console.warn("⚠️ カテゴリ取得失敗:", categoriesResponse.message);
        setCategories([]);
      }

      // 著者情報の設定
      if (authorsResponse.success && authorsResponse.data) {
        setAuthors(authorsResponse.data);
        console.log("✅ 著者設定完了:", authorsResponse.data.length, "件");
      } else {
        console.warn("⚠️ 著者取得失敗:", authorsResponse.message);
        setAuthors([]);
      }
    } catch (err: any) {
      console.error("❌ 初期データ取得エラー:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      setError(err.message || "初期データの取得に失敗しました");
    } finally {
      setInitialLoading(false);
    }
  }, [checkAuthentication, navigate]);

  // useCallbackでperformSearchをメモ化
  const performSearch = useCallback(
    async (searchFilters: SearchFilters) => {
      if (!searchFilters.query.trim()) {
        setSearchResults([]);
        return;
      }

      try {
        setLoading(true);
        setError("");

        console.log("🔍 検索実行中:", searchFilters);

        // SearchParams型に対応したパラメータを構築
        const params: SearchParams = {
          q: searchFilters.query.trim(),
          page: 1,
          limit: 20,
        };

        if (searchFilters.category_id) {
          params.category_id = searchFilters.category_id;
        }
        if (searchFilters.author_id) {
          params.author_id = searchFilters.author_id;
        }
        if (searchFilters.type) {
          params.type = searchFilters.type;
        }

        const response: ApiResponse<Content[]> = await api.searchContents(
          params
        );
        console.log("📥 検索レスポンス:", response);

        if (response.success && response.data) {
          setSearchResults(response.data);
          console.log(`✅ 検索完了: ${response.data.length}件の結果`);
        } else {
          throw new Error(response.message || "検索に失敗しました");
        }

        // URLを更新
        const urlParams = new URLSearchParams();
        urlParams.set("q", searchFilters.query);
        if (searchFilters.category_id) {
          urlParams.set("category", searchFilters.category_id.toString());
        }
        if (searchFilters.author_id) {
          urlParams.set("author", searchFilters.author_id.toString());
        }
        if (searchFilters.type) {
          urlParams.set("type", searchFilters.type);
        }
        if (searchFilters.sort_by && searchFilters.sort_by !== "date") {
          urlParams.set("sort", searchFilters.sort_by);
        }

        navigate(`/search?${urlParams.toString()}`, { replace: true });
      } catch (err: any) {
        console.error("❌ 検索エラー:", err);
        setError(err.message || "検索に失敗しました");
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // useCallbackでhandleSearchをメモ化
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      performSearch(filters);
    },
    [filters, performSearch]
  );

  // useCallbackでhandleFilterChangeをメモ化
  const handleFilterChange = useCallback(
    (key: keyof SearchFilters, value: any) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      setError("");

      // リアルタイム検索（クエリがある場合）
      if (newFilters.query.trim()) {
        performSearch(newFilters);
      }
    },
    [filters, performSearch]
  );

  // useCallbackでhandleLogoutをメモ化
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  // useCallbackでclearFiltersをメモ化
  const clearFilters = useCallback(() => {
    const clearedFilters: SearchFilters = {
      query: "",
      category_id: undefined,
      author_id: undefined,
      type: undefined,
      sort_by: "date",
    };
    setFilters(clearedFilters);
    setSearchResults([]);
    setError("");
    navigate("/search", { replace: true });
  }, [navigate]);

  // useCallbackでtoggleFiltersをメモ化
  const toggleFilters = useCallback(() => {
    setShowFilters((prev) => !prev);
  }, []);

  // useCallbackで個別のフィルター変更ハンドラーをメモ化
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilterChange("query", e.target.value);
    },
    [handleFilterChange]
  );

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleFilterChange(
        "category_id",
        e.target.value ? parseInt(e.target.value) : undefined
      );
    },
    [handleFilterChange]
  );

  const handleAuthorChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleFilterChange(
        "author_id",
        e.target.value ? parseInt(e.target.value) : undefined
      );
    },
    [handleFilterChange]
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleFilterChange("type", e.target.value || undefined);
    },
    [handleFilterChange]
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      handleFilterChange(
        "sort_by",
        e.target.value as "date" | "popularity" | "rating"
      );
    },
    [handleFilterChange]
  );

  // useCallbackでカードマウスイベントをメモ化
  const handleCardMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
      e.currentTarget.style.transform = "translateY(-4px)";
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

  // useCallbackでformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  // useMemoで検索統計をメモ化
  const searchStats = useMemo(
    () => ({
      totalResults: searchResults.length,
      hasQuery: filters.query.trim() !== "",
      hasFilters: filters.category_id || filters.author_id || filters.type,
      isFiltered:
        filters.category_id ||
        filters.author_id ||
        filters.type ||
        filters.sort_by !== "date",
    }),
    [searchResults.length, filters]
  );

  // useMemoでナビゲーションリンクをメモ化
  const navigationLinks = useMemo(
    () => [
      {
        to: "/dashboard",
        label: "🏠 ダッシュボード",
        color: "#6b7280",
      },
      {
        to: "/create",
        label: "✏️ 新規投稿",
        color: "#3b82f6",
      },
      {
        to: "/my-posts",
        label: "📄 マイ投稿",
        color: "#8b5cf6",
      },
    ],
    []
  );

  // useMemoでコンテンツタイプオプションをメモ化
  const contentTypes = useMemo(
    () => [
      { value: "", label: "すべてのタイプ" },
      { value: "article", label: "記事" },
      { value: "blog", label: "ブログ" },
      { value: "news", label: "ニュース" },
      { value: "tutorial", label: "チュートリアル" },
    ],
    []
  );

  // URLクエリパラメータの処理
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const query = urlParams.get("q");
    const category = urlParams.get("category");
    const author = urlParams.get("author");
    const type = urlParams.get("type");
    const sort = urlParams.get("sort");

    if (query || category || author || type || sort) {
      const newFilters: SearchFilters = {
        query: query || "",
        category_id: category ? parseInt(category) : undefined,
        author_id: author ? parseInt(author) : undefined,
        type: type || undefined,
        sort_by: (sort as "date" | "popularity" | "rating") || "date",
      };

      setFilters(newFilters);

      if (query) {
        performSearch(newFilters);
      }
    }
  }, [location.search, performSearch]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (initialLoading) {
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
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔍</div>
          <div>検索機能を読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* ヘッダー */}
      <header
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid #e5e7eb",
          padding: "1rem 0",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <Link
                to="/dashboard"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#374151",
                  }}
                >
                  📚 メディアプラットフォーム
                </h1>
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                こんにちは、{user?.username || "ゲスト"}さん
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
                  fontWeight: "500",
                }}
              >
                🚪 ログアウト
              </button>
            </div>
          </div>

          {/* ナビゲーション */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
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
                  transition: "background-color 0.2s",
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
        }}
      >
        {/* 検索ヘッダー */}
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1.875rem",
                fontWeight: "bold",
                color: "#374151",
              }}
            >
              🔍 コンテンツ検索
            </h2>
            {searchStats.hasQuery && (
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {searchStats.totalResults}件の結果
                {searchStats.isFiltered && " (フィルター適用中)"}
              </div>
            )}
          </div>

          {/* 検索統計 */}
          {(searchStats.hasQuery || searchStats.hasFilters) && (
            <div
              style={{
                backgroundColor: "white",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "1rem",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#3b82f6",
                    }}
                  >
                    {searchStats.totalResults}
                  </div>
                  <div>🔍 検索結果</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: categories.length > 0 ? "#10b981" : "#6b7280",
                    }}
                  >
                    {categories.length}
                  </div>
                  <div>📁 カテゴリ</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: authors.length > 0 ? "#8b5cf6" : "#6b7280",
                    }}
                  >
                    {authors.length}
                  </div>
                  <div>✍️ 著者</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: searchStats.isFiltered ? "#f59e0b" : "#6b7280",
                    }}
                  >
                    {searchStats.isFiltered ? "🔧" : "📋"}
                  </div>
                  <div>
                    {searchStats.isFiltered ? "フィルター中" : "フィルターなし"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 検索フォーム */}
          <form
            onSubmit={handleSearch}
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                placeholder="記事のタイトルや内容を検索..."
                value={filters.query}
                onChange={handleQueryChange}
                style={{
                  flex: 1,
                  minWidth: "300px",
                  padding: "0.75rem 1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#3b82f6";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#6b7280" : "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "6px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "500",
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {loading ? "🔄 検索中..." : "🔍 検索"}
              </button>
              <button
                type="button"
                onClick={toggleFilters}
                style={{
                  backgroundColor: showFilters ? "#8b5cf6" : "#6b7280",
                  color: "white",
                  border: "none",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  transition: "background-color 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                🔧 フィルター {showFilters ? "▲" : "▼"}
              </button>
            </div>

            {/* 詳細フィルター */}
            {showFilters && (
              <div
                style={{
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: "1rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                }}
              >
                {/* カテゴリフィルター */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    📁 カテゴリ
                  </label>
                  <select
                    value={filters.category_id || ""}
                    onChange={handleCategoryChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="">すべてのカテゴリ</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 著者フィルター */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    ✍️ 著者
                  </label>
                  <select
                    value={filters.author_id || ""}
                    onChange={handleAuthorChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="">すべての著者</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.username}
                      </option>
                    ))}
                  </select>
                </div>

                {/* タイプフィルター */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    📝 タイプ
                  </label>
                  <select
                    value={filters.type || ""}
                    onChange={handleTypeChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      backgroundColor: "white",
                    }}
                  >
                    {contentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ソート */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#374151",
                    }}
                  >
                    📊 並び順
                  </label>
                  <select
                    value={filters.sort_by || "date"}
                    onChange={handleSortChange}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      backgroundColor: "white",
                    }}
                  >
                    <option value="date">📅 新着順</option>
                    <option value="popularity">🔥 人気順</option>
                    <option value="rating">⭐ 評価順</option>
                  </select>
                </div>

                {/* フィルタークリア */}
                <div style={{ display: "flex", alignItems: "end" }}>
                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      width: "100%",
                      transition: "background-color 0.2s",
                    }}
                  >
                    🗑️ クリア
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* エラー表示 */}
        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              border: "1px solid #fca5a5",
              color: "#dc2626",
              padding: "1rem",
              borderRadius: "6px",
              marginBottom: "1rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* 検索結果 */}
        <div>
          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#374151" }}>
                検索中...
              </h3>
              <p style={{ margin: 0, color: "#6b7280" }}>
                「{filters.query}」を検索しています
              </p>
            </div>
          ) : searchResults.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {searchResults.map((content) => (
                <div
                  key={content.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    padding: "1.5rem",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                    transition: "all 0.3s ease",
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
                      👁️ {content.view_count.toLocaleString()}
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
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#3b82f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "inherit";
                      }}
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
                    {content.body.substring(0, 120)}
                    {content.body.length > 120 && "..."}
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
                    <span>📅 {formatDate(content.created_at)}</span>
                  </div>

                  {/* コンテンツの追加情報 */}
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {content.type && (
                      <span
                        style={{
                          backgroundColor: "#f0fdf4",
                          color: "#16a34a",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "4px",
                        }}
                      >
                        📝 {content.type}
                      </span>
                    )}
                    <span
                      style={{
                        backgroundColor:
                          content.status === "published"
                            ? "#dcfce7"
                            : "#fef3c7",
                        color:
                          content.status === "published"
                            ? "#15803d"
                            : "#92400e",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "4px",
                      }}
                    >
                      {content.status === "published"
                        ? "🚀 公開中"
                        : "📝 下書き"}
                    </span>
                    <span
                      style={{
                        backgroundColor: "#f3f4f6",
                        color: "#6b7280",
                        padding: "0.125rem 0.5rem",
                        borderRadius: "4px",
                      }}
                    >
                      📊 {content.body.length.toLocaleString()}文字
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : searchStats.hasQuery ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 2rem",
                backgroundColor: "white",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  color: "#6b7280",
                  fontSize: "1.25rem",
                }}
              >
                「{filters.query}」の検索結果が見つかりませんでした
              </h3>
              <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
                別のキーワードで検索してみるか、フィルターを調整してください。
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={clearFilters}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "1rem 2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "500",
                  }}
                >
                  🗑️ 検索条件をクリア
                </button>
                <button
                  onClick={toggleFilters}
                  style={{
                    backgroundColor: "#8b5cf6",
                    color: "white",
                    border: "none",
                    padding: "1rem 2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "500",
                  }}
                >
                  🔧 フィルターを調整
                </button>
              </div>
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
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
              <h3
                style={{
                  margin: "0 0 1rem 0",
                  color: "#6b7280",
                  fontSize: "1.25rem",
                }}
              >
                検索キーワードを入力してください
              </h3>
              <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
                記事のタイトルや内容で検索できます。フィルターで絞り込みも可能です。
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  marginTop: "2rem",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    📁
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {categories.length}個のカテゴリ
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    ✍️
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {authors.length}人の著者
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    🔧
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    詳細フィルター
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ローディング表示 */}
      {loading && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            backgroundColor: "#1f2937",
            color: "white",
            padding: "1rem",
            borderRadius: "8px",
            fontSize: "0.875rem",
            zIndex: 1000,
          }}
        >
          🔍 検索中...
        </div>
      )}
    </div>
  );
};

export default SearchPage;
