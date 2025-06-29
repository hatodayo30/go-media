import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Content, ApiResponse, FollowingFeedApiResponse } from "../types";

interface FollowingFeedProps {
  currentUserId: number;
}

// エラー型の定義
interface ApiError {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const FollowingFeed: React.FC<FollowingFeedProps> = ({ currentUserId }) => {
  const [feedContents, setFeedContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // useCallbackでfetchFollowingFeedをメモ化
  const fetchFollowingFeed = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        if (pageNum === 1) {
          setLoading(true);
          setError(null);
          console.log("📡 フィード初回読み込み開始");
        } else {
          setLoadingMore(true);
          console.log(`📡 フィード追加読み込み: ページ ${pageNum}`);
        }

        const response: ApiResponse<FollowingFeedApiResponse> =
          await api.getFollowingFeed(currentUserId, {
            page: pageNum,
            limit: 10,
          });

        if (response.success && response.data) {
          // FollowingFeedApiResponse構造に対応した型安全な処理
          let newContents: Content[] = [];

          if (response.data.feed && Array.isArray(response.data.feed)) {
            // FollowingFeedApiResponse構造の場合: { feed: Content[] }
            newContents = response.data.feed;
          } else {
            console.warn("⚠️ 予期しないフィードデータ構造:", response.data);
            newContents = [];
          }

          console.log(`✅ フィード取得成功: ${newContents.length}件`);

          if (append) {
            setFeedContents((prev) => [...prev, ...newContents]);
          } else {
            setFeedContents(newContents);
          }

          setHasMore(newContents.length === 10);
          setPage(pageNum);
        } else {
          throw new Error(response.message || "フィードの取得に失敗しました");
        }
      } catch (error) {
        console.error("❌ フォロー中フィードの取得に失敗:", error);
        const apiError = error as ApiError;
        const errorMessage =
          apiError.message || "フィードの読み込みに失敗しました";
        setError(errorMessage);

        if (pageNum === 1) {
          setFeedContents([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [currentUserId]
  );

  // useCallbackでloadMoreをメモ化
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      console.log("📄 さらに読み込み実行");
      fetchFollowingFeed(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchFollowingFeed]);

  // useCallbackでrefreshFeedをメモ化
  const refreshFeed = useCallback(() => {
    console.log("🔄 フィード再読み込み");
    fetchFollowingFeed(1, false);
  }, [fetchFollowingFeed]);

  // useCallbackでformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // useCallbackでhandleCardHoverをメモ化
  const handleCardHover = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, isEnter: boolean) => {
      const target = e.currentTarget;
      if (isEnter) {
        target.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
        target.style.transform = "translateY(-2px)";
      } else {
        target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
        target.style.transform = "translateY(0)";
      }
    },
    []
  );

  // useCallbackでhandleTitleHoverをメモ化
  const handleTitleHover = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, isEnter: boolean) => {
      const target = e.currentTarget;
      target.style.color = isEnter ? "#3b82f6" : "inherit";
    },
    []
  );

  // useCallbackでhandleButtonHoverをメモ化
  const handleButtonHover = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, isEnter: boolean) => {
      const target = e.currentTarget;
      target.style.backgroundColor = isEnter ? "#2563eb" : "#3b82f6";
    },
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
        onMouseEnter={(e) => handleCardHover(e, true)}
        onMouseLeave={(e) => handleCardHover(e, false)}
      >
        {/* ヘッダー情報 */}
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
          <Link
            to={`/contents/${content.id}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => handleTitleHover(e, true)}
            onMouseLeave={(e) => handleTitleHover(e, false)}
          >
            {content.title}
          </Link>
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
          }}
        >
          {content.body.substring(0, 120)}...
        </p>

        {/* フッター情報 */}
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
      </div>
    ),
    [handleCardHover, handleTitleHover, formatDate]
  );

  // useMemoでemptyStateContentをメモ化
  const emptyStateContent = useMemo(() => {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏠</div>
        <h3
          style={{
            margin: "0 0 1rem 0",
            color: "#6b7280",
            fontSize: "1.25rem",
          }}
        >
          フォロー中のユーザーの投稿がありません
        </h3>
        <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
          ユーザーをフォローして、フィードを充実させましょう！
        </p>
        <Link
          to="/users"
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
          onMouseEnter={(e) => handleButtonHover(e, true)}
          onMouseLeave={(e) => handleButtonHover(e, false)}
        >
          👥 ユーザーを探す
        </Link>
      </div>
    );
  }, [handleButtonHover]);

  // useMemoでloadingStateContentをメモ化
  const loadingStateContent = useMemo(() => {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
        <p style={{ color: "#6b7280", margin: 0 }}>フィードを読み込み中...</p>
      </div>
    );
  }, []);

  // useMemoでerrorStateContentをメモ化
  const errorStateContent = useMemo(() => {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #fecaca",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
        <h3
          style={{
            margin: "0 0 1rem 0",
            color: "#dc2626",
            fontSize: "1.25rem",
          }}
        >
          フィードの読み込みに失敗しました
        </h3>
        <p style={{ margin: "0 0 2rem 0", color: "#6b7280" }}>{error}</p>
        <button
          onClick={refreshFeed}
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "1rem 2rem",
            borderRadius: "8px",
            border: "none",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#2563eb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#3b82f6";
          }}
        >
          🔄 再読み込み
        </button>
      </div>
    );
  }, [error, refreshFeed]);

  useEffect(() => {
    fetchFollowingFeed(1, false);
  }, [fetchFollowingFeed]);

  if (loading) {
    return loadingStateContent;
  }

  if (error) {
    return errorStateContent;
  }

  return (
    <div style={{ minHeight: "400px" }}>
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.875rem",
            fontWeight: "bold",
            color: "#1f2937",
          }}
        >
          🏠 フォロー中のフィード
        </h2>
        <button
          onClick={refreshFeed}
          disabled={loading}
          style={{
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            fontSize: "0.875rem",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          🔄 更新
        </button>
      </div>

      {/* コンテンツ表示 */}
      {feedContents.length === 0 ? (
        emptyStateContent
      ) : (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            {feedContents.map(renderContentCard)}
          </div>

          {/* さらに読み込みボタン */}
          {hasMore && (
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "1rem 2rem",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: loadingMore ? "not-allowed" : "pointer",
                  opacity: loadingMore ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!loadingMore) {
                    e.currentTarget.style.backgroundColor = "#2563eb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loadingMore) {
                    e.currentTarget.style.backgroundColor = "#3b82f6";
                  }
                }}
              >
                {loadingMore ? "📥 読み込み中..." : "📄 さらに読み込む"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FollowingFeed;
