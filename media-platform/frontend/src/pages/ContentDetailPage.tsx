import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Content, Comment } from "../types";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../components/Sidebar";

const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [content, setContent] = useState<Content | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [likeCount, setLikeCount] = useState<number>(0);

  // カテゴリアイコン
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

  const getCategorySlug = useCallback((categoryName: string): string => {
    const slugMap: Record<string, string> = {
      音楽: "music",
      アニメ: "anime",
      漫画: "manga",
      映画: "movie",
      ゲーム: "game",
    };
    return slugMap[categoryName] || categoryName.toLowerCase();
  }, []);

  const fetchLikeCount = useCallback(async () => {
    if (!id) return;

    try {
      const response = await api.getAverageRating(id);
      if (response.success && response.data) {
        setLikeCount(response.data.like_count);
      }
    } catch (err: any) {
      console.error("❌ いいね数取得エラー:", err);
      setLikeCount(0);
    }
  }, [id]);

  // コンテンツ取得
  const fetchContent = useCallback(async () => {
    if (!id) {
      setError("コンテンツIDが指定されていません");
      setLoading(false);
      return;
    }

    try {
      const response = await api.getContentById(id);
      if (response.success && response.data) {
        setContent(response.data);
      } else {
        setError(response.message || "コンテンツの取得に失敗しました");
      }
    } catch (err: any) {
      console.error("❌ コンテンツ取得エラー:", err);
      setError("コンテンツの取得中にエラーが発生しました");
    }
  }, [id]);

  // コメント取得
  const fetchComments = useCallback(async () => {
    if (!id) return;

    try {
      const response = await api.getCommentsByContentId(id);
      if (response.success && response.data) {
        setComments(response.data);
      } else {
        setComments([]);
      }
    } catch (err: any) {
      console.error("❌ コメント取得エラー:", err);
      setComments([]);
    }
  }, [id]);

  // ユーザー評価取得
  const fetchUserRating = useCallback(async () => {
    if (!id || !currentUser) return;

    try {
      const response = await api.getRatingsByUser(currentUser.id.toString());
      if (response.success && response.data) {
        const contentRating = response.data.find(
          (rating) => rating.content_id === parseInt(id)
        );
        setUserRating(contentRating ? contentRating.value : null);
      }
    } catch (err: any) {
      console.error("❌ 評価取得エラー:", err);
      setUserRating(null);
    }
  }, [id, currentUser]);

  // データ読み込み
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        fetchContent(),
        fetchComments(),
        fetchUserRating(),
        fetchLikeCount(),
      ]);
    } catch (error) {
      console.error("❌ データ読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchContent, fetchComments, fetchUserRating, fetchLikeCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // コメント投稿
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!commentText.trim() || !id || !currentUser) return;

      setIsSubmittingComment(true);

      try {
        const response = await api.createComment({
          body: commentText.trim(),
          content_id: parseInt(id),
        });

        if (response.success && response.data) {
          // 新しいコメントを先頭に追加
          setComments((prev) => [response.data!, ...prev]);
          setCommentText("");
        } else {
          alert(response.message || "コメントの投稿に失敗しました");
        }
      } catch (err: any) {
        console.error("❌ コメント投稿エラー:", err);
        alert("コメントの投稿中にエラーが発生しました");
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [commentText, id, currentUser]
  );

  // 評価更新
  const handleRating = useCallback(
    async (rating: number) => {
      if (!id || !currentUser) return;

      try {
        const response = await api.createOrUpdateRating(parseInt(id), rating);
        if (response.success) {
          if (response.data === null) {
            setUserRating(null);
          } else {
            setUserRating(rating);
          }
          // ✅ いいね数を再取得
          await fetchLikeCount();
        } else {
          alert(response.message || "評価の更新に失敗しました");
        }
      } catch (err: any) {
        console.error("❌ 評価更新エラー:", err);
        alert("評価の更新中にエラーが発生しました");
      }
    },
    [id, currentUser, fetchLikeCount]
  );

  // 日付フォーマット (相対時間)
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "たった今";
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString("ja-JP", {
      month: "numeric",
      day: "numeric",
    });
  }, []);

  // コメントを新しい順にソート
  const sortedComments = [...comments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#f5f6fa",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ fontSize: "1.25rem", color: "#7f8c8d" }}>
            読み込み中...
          </div>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div
        style={{
          maxWidth: "800px",
          margin: "2rem auto",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>😢</div>
        <h2 style={{ marginBottom: "1rem", color: "#2c3e50" }}>
          投稿が見つかりません
        </h2>
        <p style={{ color: "#7f8c8d", marginBottom: "2rem" }}>
          {error || "この投稿は削除されたか、存在しません"}
        </p>
        <Link
          to="/dashboard"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#3498db",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: "500",
          }}
        >
          ← ホームに戻る
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, backgroundColor: "#f5f6fa", overflow: "auto" }}>
        {/* ヘッダー */}
        <header
          style={{
            backgroundColor: "white",
            borderBottom: "1px solid #e8eaed",
            padding: "1rem 0",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "800px",
              margin: "0 auto",
              padding: "0 1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Link
              to={
                content.type
                  ? `/categories/${getCategorySlug(content.type)}`
                  : "/dashboard"
              }
              style={{
                color: "#5a6c7d",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              ← {content.type || "カテゴリ"}に戻る
            </Link>
            {currentUser && content.author_id === currentUser.id && (
              <Link
                to={`/contents/${id}/edit`}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#3498db",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
              >
                ✏️ 編集
              </Link>
            )}
          </div>
        </header>

        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "0 1rem 2rem",
          }}
        >
          {/* 記事本体 */}
          <article
            style={{
              backgroundColor: "white",
              padding: "2.5rem",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              marginBottom: "2rem",
            }}
          >
            {/* カテゴリバッジ */}
            <div style={{ marginBottom: "1rem" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#e8f4fd",
                  color: "#1e40af",
                  borderRadius: "20px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                {getCategoryIcon(content.type || content.category?.name || "")}
                {content.type || content.category?.name}
              </span>
              {content.genre && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    borderRadius: "20px",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    marginLeft: "0.5rem",
                  }}
                >
                  🎭 {content.genre}
                </span>
              )}
            </div>

            {/* タイトル */}
            <h1
              style={{
                margin: "0 0 1rem 0",
                fontSize: "2rem",
                fontWeight: "700",
                color: "#2c3e50",
                lineHeight: "1.3",
              }}
            >
              {content.title}
            </h1>

            {/* メタ情報 */}
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                marginBottom: "1.5rem",
                paddingBottom: "1.5rem",
                borderBottom: "1px solid #e8eaed",
                fontSize: "0.875rem",
                color: "#7f8c8d",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                👤 {content.author?.username || "匿名"}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                📅{" "}
                {new Date(content.created_at).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                👁️ {content.view_count.toLocaleString()}
              </span>
            </div>

            {/* 本文 */}
            <div
              style={{
                lineHeight: "1.8",
                color: "#2c3e50",
                fontSize: "1.0625rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {content.body}
            </div>
          </article>

          {/* 評価セクション */}
          {currentUser && (
            <div
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                marginBottom: "2rem",
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
                <h3
                  style={{
                    margin: 0,
                    color: "#2c3e50",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                  }}
                >
                  👍 この投稿を評価
                </h3>
                {/* ✅ いいね数を表示 */}
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: "#7f8c8d",
                    fontWeight: "500",
                  }}
                >
                  ❤️ {likeCount} いいね
                </span>
              </div>
              <button
                onClick={() => handleRating(1)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: userRating === 1 ? "#27ae60" : "#ecf0f1",
                  color: userRating === 1 ? "white" : "#2c3e50",
                  border: "2px solid",
                  borderColor: userRating === 1 ? "#27ae60" : "#bdc3c7",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "1rem",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (userRating !== 1) {
                    e.currentTarget.style.borderColor = "#27ae60";
                    e.currentTarget.style.backgroundColor = "#d5f4e6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (userRating !== 1) {
                    e.currentTarget.style.borderColor = "#bdc3c7";
                    e.currentTarget.style.backgroundColor = "#ecf0f1";
                  }
                }}
              >
                👍 いいね!
              </button>
            </div>
          )}

          {/* コメントセクション */}
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <h3
              style={{
                margin: "0 0 1.5rem 0",
                color: "#2c3e50",
                fontSize: "1.25rem",
                fontWeight: "600",
              }}
            >
              💬 コメント ({comments.length})
            </h3>

            {/* コメント投稿フォーム */}
            {currentUser ? (
              <form
                onSubmit={handleCommentSubmit}
                style={{ marginBottom: "2rem" }}
              >
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="感想を共有しましょう..."
                  style={{
                    width: "100%",
                    minHeight: "100px",
                    padding: "0.75rem",
                    border: "2px solid #e8eaed",
                    borderRadius: "8px",
                    resize: "vertical",
                    fontSize: "0.9375rem",
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3498db";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e8eaed";
                  }}
                />
                <div style={{ marginTop: "1rem", textAlign: "right" }}>
                  <button
                    type="submit"
                    disabled={!commentText.trim() || isSubmittingComment}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor:
                        !commentText.trim() || isSubmittingComment
                          ? "#95a5a6"
                          : "#3498db",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor:
                        !commentText.trim() || isSubmittingComment
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "600",
                      fontSize: "0.9375rem",
                      transition: "background-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (commentText.trim() && !isSubmittingComment) {
                        e.currentTarget.style.backgroundColor = "#2980b9";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (commentText.trim() && !isSubmittingComment) {
                        e.currentTarget.style.backgroundColor = "#3498db";
                      }
                    }}
                  >
                    {isSubmittingComment ? "投稿中..." : "💬 コメント投稿"}
                  </button>
                </div>
              </form>
            ) : (
              <div
                style={{
                  marginBottom: "2rem",
                  padding: "1.5rem",
                  backgroundColor: "#f5f6fa",
                  borderRadius: "8px",
                  textAlign: "center",
                  border: "2px dashed #bdc3c7",
                }}
              >
                <p style={{ margin: 0, color: "#7f8c8d" }}>
                  コメントを投稿するには{" "}
                  <Link
                    to="/login"
                    style={{ color: "#3498db", fontWeight: "600" }}
                  >
                    ログイン
                  </Link>{" "}
                  してください
                </p>
              </div>
            )}

            {/* コメント一覧 (新しい順) */}
            {sortedComments.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {sortedComments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: "1.25rem",
                      border: "1px solid #e8eaed",
                      borderRadius: "8px",
                      backgroundColor: "#fafbfc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "600",
                          color: "#2c3e50",
                          fontSize: "0.9375rem",
                        }}
                      >
                        👤 {comment.user?.username || "ユーザー"}
                      </span>
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          color: "#95a5a6",
                        }}
                      >
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        color: "#2c3e50",
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 2rem",
                  color: "#95a5a6",
                }}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💭</div>
                <p style={{ margin: 0, fontSize: "1rem", fontWeight: "500" }}>
                  まだコメントがありません
                </p>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
                  最初のコメントを投稿しましょう！
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentDetailPage;
