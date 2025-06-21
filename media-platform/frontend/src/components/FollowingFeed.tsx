import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Content, ApiResponse } from "../types";

interface FollowingFeedProps {
  currentUserId: number;
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

        const response: ApiResponse<Content[]> = await api.getFollowingFeed(
          currentUserId,
          {
            page: pageNum,
            limit: 10,
          }
        );

        if (response.success && response.data) {
          const newContents = response.data;
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
      } catch (error: any) {
        console.error("❌ フォロー中フィードの取得に失敗:", error);
        setError(error.message || "フィードの読み込みに失敗しました");

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
    (content: Content) => {
      const authorInitial =
        content.author?.username?.charAt(0).toUpperCase() || "?";
      const authorName = content.author?.username || "不明";
      const categoryName = content.category?.name;
      const truncatedBody =
        content.body.length > 200
          ? `${content.body.substring(0, 200)}...`
          : content.body;

      return (
        <div
          key={content.id}
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "1.5rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s",
            border: "1px solid #e5e7eb",
          }}
          onMouseEnter={(e) => handleCardHover(e, true)}
          onMouseLeave={(e) => handleCardHover(e, false)}
        >
          {/* 投稿者情報 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1rem",
              padding: "0.75rem",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                marginRight: "0.75rem",
              }}
            >
              {authorInitial}
            </div>
            <div style={{ flex: 1 }}>
              <Link
                to={`/users/${content.author?.id}`}
                style={{
                  textDecoration: "none",
                  color: "#1f2937",
                  fontWeight: "500",
                  fontSize: "0.875rem",
                }}
              >
                👤 {authorName}
              </Link>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginTop: "0.25rem",
                }}
              >
                📅 {formatDate(content.created_at)}
              </div>
            </div>
            {categoryName && (
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
                📁 {categoryName}
              </span>
            )}
          </div>

          {/* 投稿内容 */}
          <div>
            <h3
              style={{
                margin: "0 0 0.75rem 0",
                fontSize: "1.25rem",
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

            <p
              style={{
                margin: "0 0 1rem 0",
                color: "#6b7280",
                fontSize: "0.875rem",
                lineHeight: "1.6",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 4,
                WebkitBoxOrient: "vertical",
              }}
            >
              {truncatedBody}
            </p>
          </div>

          {/* フッター */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "1rem",
              borderTop: "1px solid #f3f4f6",
              fontSize: "0.75rem",
              color: "#6b7280",
            }}
          >
            <div style={{ display: "flex", gap: "1rem" }}>
              <span>👁️ {content.view_count} 回閲覧</span>
              <span>📝 {content.type}</span>
            </div>
            <Link
              to={`/contents/${content.id}`}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.75rem",
                fontWeight: "500",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
            >
              📖 続きを読む
            </Link>
          </div>
        </div>
      );
    },
    [formatDate, handleCardHover, handleTitleHover, handleButtonHover]
  );

  // useMemoでloadMoreButtonStyleをメモ化
  const loadMoreButtonStyle = useMemo(
    () => ({
      backgroundColor: loadingMore ? "#6b7280" : "#3b82f6",
      color: "white",
      border: "none",
      padding: "1rem 2rem",
      borderRadius: "8px",
      cursor: loadingMore ? "not-allowed" : "pointer",
      fontSize: "0.875rem",
      fontWeight: "500",
      opacity: loadingMore ? 0.7 : 1,
    }),
    [loadingMore]
  );

  // useCallbackでrenderLoadingをメモ化
  const renderLoading = useCallback(
    () => (
      <div
        style={{
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📡</div>
          <div>フィードを読み込み中...</div>
        </div>
      </div>
    ),
    []
  );

  // useCallbackでrenderErrorをメモ化
  const renderError = useCallback(
    () => (
      <div
        style={{
          padding: "2rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
        <div style={{ color: "#ef4444", marginBottom: "1rem" }}>{error}</div>
        <button
          onClick={refreshFeed}
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            padding: "0.75rem 1.5rem",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          🔄 再読み込み
        </button>
      </div>
    ),
    [error, refreshFeed]
  );

  // useCallbackでrenderEmptyFeedをメモ化
  const renderEmptyFeed = useCallback(
    () => (
      <div
        style={{
          textAlign: "center",
          padding: "4rem 2rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📭</div>
        <h3
          style={{
            margin: "0 0 1rem 0",
            color: "#6b7280",
            fontSize: "1.25rem",
          }}
        >
          フィードが空です
        </h3>
        <p style={{ margin: "0 0 2rem 0", color: "#9ca3af" }}>
          興味のあるユーザーをフォローして、
          <br />
          投稿をフィードで確認しましょう！
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
        >
          👥 ユーザーを探す
        </Link>
      </div>
    ),
    []
  );

  useEffect(() => {
    fetchFollowingFeed(1);
  }, [fetchFollowingFeed]);

  if (loading) {
    return renderLoading();
  }

  if (error) {
    return renderError();
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          padding: "1rem",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>
          📡 フォロー中のフィード
        </h2>
        <button
          onClick={refreshFeed}
          disabled={loading || loadingMore}
          style={{
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            cursor: loading || loadingMore ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            opacity: loading || loadingMore ? 0.7 : 1,
          }}
        >
          🔄 更新
        </button>
      </div>

      {/* フィードコンテンツ */}
      {feedContents.length > 0 ? (
        <div>
          <div
            style={{
              display: "grid",
              gap: "1.5rem",
            }}
          >
            {feedContents.map(renderContentCard)}
          </div>

          {/* さらに読み込みボタン */}
          {hasMore && (
            <div
              style={{
                textAlign: "center",
                marginTop: "2rem",
              }}
            >
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={loadMoreButtonStyle}
              >
                {loadingMore ? "📡 読み込み中..." : "📄 さらに読み込む"}
              </button>
            </div>
          )}

          {/* デバッグ情報（開発時のみ） */}
          {process.env.NODE_ENV === "development" && (
            <div
              style={{
                marginTop: "2rem",
                padding: "1rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "8px",
                fontSize: "0.75rem",
                color: "#6b7280",
              }}
            >
              <div>現在のページ: {page}</div>
              <div>コンテンツ数: {feedContents.length}</div>
              <div>さらに読み込み可能: {hasMore ? "はい" : "いいえ"}</div>
              <div>ユーザーID: {currentUserId}</div>
            </div>
          )}
        </div>
      ) : (
        renderEmptyFeed()
      )}
    </div>
  );
};

export default FollowingFeed;
