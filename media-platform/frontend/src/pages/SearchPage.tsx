import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";

// 型定義
interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  role: string;
}

interface Content {
  id: number;
  title: string;
  body: string;
  type: string;
  author?: User;
  category?: any;
  status: string;
  view_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface SearchFilters {
  query: string;
  category_id?: number;
  author_id?: number;
  date_range?: { start: string; end: string };
  sort_by?: "date" | "popularity" | "rating";
}

const SearchPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    category_id: undefined,
    author_id: undefined,
    date_range: undefined,
    sort_by: "date",
  });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();

    // URLクエリパラメータから検索条件を取得
    const urlParams = new URLSearchParams(location.search);
    const query = urlParams.get("q");
    if (query) {
      setFilters((prev) => ({ ...prev, query }));
      performSearch({ ...filters, query });
    }
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const [userRes, categoriesRes, authorsRes] = await Promise.all([
        api.getCurrentUser(),
        api.getCategories(),
        api.getUsers(), // 著者リスト取得用のAPI（実装が必要）
      ]);

      setUser(userRes.data || userRes);
      setCategories(
        categoriesRes.data?.categories ||
          categoriesRes.categories ||
          categoriesRes ||
          []
      );
      setAuthors(
        authorsRes.data?.users || authorsRes.users || authorsRes || []
      );
    } catch (error) {
      console.error("初期データの取得に失敗しました:", error);
      if ((error as any)?.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
  };

  const performSearch = async (searchFilters: SearchFilters) => {
    if (!searchFilters.query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);

      // APIパラメータを構築
      const params: any = {
        q: searchFilters.query,
        sort_by: searchFilters.sort_by || "date",
      };

      if (searchFilters.category_id) {
        params.category_id = searchFilters.category_id;
      }
      if (searchFilters.author_id) {
        params.author_id = searchFilters.author_id;
      }
      if (searchFilters.date_range) {
        params.date_start = searchFilters.date_range.start;
        params.date_end = searchFilters.date_range.end;
      }

      // 拡張された検索APIを使用（実装が必要）
      const response = await api.searchContents(params);
      setSearchResults(
        response.data?.contents || response.contents || response || []
      );

      // URLを更新
      const urlParams = new URLSearchParams();
      urlParams.set("q", searchFilters.query);
      if (searchFilters.category_id)
        urlParams.set("category", searchFilters.category_id.toString());
      if (searchFilters.author_id)
        urlParams.set("author", searchFilters.author_id.toString());
      if (searchFilters.sort_by) urlParams.set("sort", searchFilters.sort_by);

      navigate(`/search?${urlParams.toString()}`, { replace: true });
    } catch (error) {
      console.error("検索エラー:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(filters);
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // リアルタイム検索（クエリがある場合）
    if (newFilters.query.trim()) {
      performSearch(newFilters);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const clearFilters = () => {
    setFilters({
      query: "",
      category_id: undefined,
      author_id: undefined,
      date_range: undefined,
      sort_by: "date",
    });
    setSearchResults([]);
    navigate("/search", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
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
                  style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}
                >
                  メディアプラットフォーム
                </h1>
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                こんにちは、{user?.username}さん
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
                ログアウト
              </button>
            </div>
          </div>

          {/* ナビゲーション */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              to="/dashboard"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#6b7280",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              🏠 ダッシュボード
            </Link>
            <Link
              to="/create"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              ✏️ 新規投稿
            </Link>
            <Link
              to="/my-posts"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#8b5cf6",
                color: "white",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              📄 マイ投稿
            </Link>
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
          <h2
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1.875rem",
              fontWeight: "bold",
            }}
          >
            🔍 コンテンツ検索
          </h2>

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
              }}
            >
              <input
                type="text"
                placeholder="記事のタイトルや内容を検索..."
                value={filters.query}
                onChange={(e) => handleFilterChange("query", e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "500",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "検索中..." : "🔍 検索"}
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                style={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                🔧 フィルター
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
                    }}
                  >
                    📁 カテゴリ
                  </label>
                  <select
                    value={filters.category_id || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "category_id",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
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
                    }}
                  >
                    ✍️ 著者
                  </label>
                  <select
                    value={filters.author_id || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "author_id",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
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

                {/* ソート */}
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "0.5rem",
                      fontSize: "0.875rem",
                      fontWeight: "500",
                    }}
                  >
                    📊 並び順
                  </label>
                  <select
                    value={filters.sort_by || "date"}
                    onChange={(e) =>
                      handleFilterChange(
                        "sort_by",
                        e.target.value as "date" | "popularity" | "rating"
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                    }}
                  >
                    <option value="date">新着順</option>
                    <option value="popularity">人気順</option>
                    <option value="rating">評価順</option>
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
                    }}
                  >
                    🗑️ クリア
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* 検索結果 */}
        <div>
          {filters.query && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                「{filters.query}」の検索結果: {searchResults.length}件
              </p>
            </div>
          )}

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
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔍</div>
              <p>検索中...</p>
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
                    transition: "all 0.2s",
                    cursor: "pointer",
                    border: "1px solid #e5e7eb",
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
                      📅{" "}
                      {new Date(content.created_at).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : filters.query ? (
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
                検索結果が見つかりませんでした
              </h3>
              <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
                別のキーワードで検索してみるか、フィルターを調整してください。
              </p>
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
              <p style={{ margin: 0, color: "#9ca3af" }}>
                記事のタイトルや内容で検索できます。フィルターで絞り込みも可能です。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
