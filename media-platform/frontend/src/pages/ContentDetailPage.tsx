import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";
import { Content, Comment } from "../types";
import { useAuth } from "../contexts/AuthContext";

const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [content, setContent] = useState<Content | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  // useCallbackを使用してfetchContentをメモ化
  const fetchContent = useCallback(async () => {
    if (!id) {
      setError("コンテンツIDが指定されていません");
      setLoading(false);
      return;
    }

    try {
      console.log(`📄 コンテンツ ${id} を取得中...`);
      // 修正: 型注釈を削除
      const response = await api.getContentById(id);

      if (response.success && response.data) {
        setContent(response.data);
        console.log("✅ コンテンツ取得成功:", response.data);
      } else {
        setError(response.message || "コンテンツの取得に失敗しました");
        console.error("❌ コンテンツ取得失敗:", response.message);
      }
    } catch (err: any) {
      console.error("❌ コンテンツ取得エラー:", err);
      setError("コンテンツの取得中にエラーが発生しました");
    }
  }, [id]); // idに依存

  // useCallbackを使用してfetchCommentsをメモ化 - 修正版
  const fetchComments = useCallback(async () => {
    if (!id) return;

    try {
      console.log(`💬 コンテンツ ${id} のコメントを取得中...`);
      // 修正: 型注釈を削除
      const response = await api.getCommentsByContentId(id);

      if (response.success && response.data) {
        setComments(response.data);
        console.log(`✅ コメント取得成功: ${response.data.length}件`);
      } else {
        console.error("❌ コメント取得失敗:", response.message);
        // エラーの場合も空配列を設定
        setComments([]);
      }
    } catch (err: any) {
      console.error("❌ コメント取得エラー:", err);
      setComments([]);
    }
  }, [id]); // idに依存

  // useCallbackを使用してfetchUserRatingをメモ化 - 修正版
  const fetchUserRating = useCallback(async () => {
    if (!id || !currentUser) return;

    try {
      console.log(`⭐ ユーザー ${currentUser.id} の評価を取得中...`);
      // 修正: 型注釈を削除
      const response = await api.getRatingsByUser(currentUser.id.toString());

      if (response.success && response.data) {
        const contentRating = response.data.find(
          (rating) => rating.content_id === parseInt(id)
        );
        if (contentRating) {
          setUserRating(contentRating.value);
          console.log(`✅ ユーザー評価取得: ${contentRating.value}`);
        } else {
          console.log("📭 このコンテンツの評価なし");
          setUserRating(null);
        }
      } else {
        console.error("❌ 評価取得失敗:", response.message);
        setUserRating(null);
      }
    } catch (err: any) {
      console.error("❌ 評価取得エラー:", err);
      setUserRating(null);
    }
  }, [id, currentUser]); // idとcurrentUserに依存

  // useCallbackを使用してloadDataをメモ化
  const loadData = useCallback(async () => {
    console.log("🔄 データ読み込み開始");
    setLoading(true);
    setError("");

    try {
      await Promise.all([fetchContent(), fetchComments(), fetchUserRating()]);
      console.log("✅ 全データ読み込み完了");
    } catch (error) {
      console.error("❌ データ読み込みエラー:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchContent, fetchComments, fetchUserRating]); // 関数に依存

  useEffect(() => {
    loadData();
  }, [loadData]); // loadDataを依存配列に含める

  // useCallbackを使用してhandleCommentSubmitをメモ化 - 修正版
  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!commentText.trim() || !id || !currentUser) {
        console.warn("⚠️ コメント投稿: 必要な情報が不足");
        return;
      }

      setIsSubmittingComment(true);

      try {
        console.log("💬 コメント投稿中...");
        // 修正: 型注釈を削除
        const response = await api.createComment({
          body: commentText.trim(),
          content_id: parseInt(id),
        });

        if (response.success && response.data) {
          // 修正: non-null assertionを使用
          setComments((prev) => [...prev, response.data!]);
          setCommentText("");
          console.log("✅ コメント投稿成功");
        } else {
          alert(response.message || "コメントの投稿に失敗しました");
          console.error("❌ コメント投稿失敗:", response.message);
        }
      } catch (err: any) {
        console.error("❌ コメント投稿エラー:", err);
        alert("コメントの投稿中にエラーが発生しました");
      } finally {
        setIsSubmittingComment(false);
      }
    },
    [commentText, id, currentUser]
  ); // 状態と依存関係に依存

  // useCallbackを使用してhandleRatingをメモ化 - 修正版
  const handleRating = useCallback(
    async (rating: number) => {
      if (!id || !currentUser) {
        console.warn("⚠️ 評価更新: 必要な情報が不足");
        return;
      }

      try {
        console.log(`⭐ 評価更新中: ${rating}`);
        // 修正: 型注釈を削除
        const response = await api.createOrUpdateRating(parseInt(id), rating);

        if (response.success) {
          setUserRating(rating);
          console.log("✅ 評価更新成功");
        } else {
          alert(response.message || "評価の更新に失敗しました");
          console.error("❌ 評価更新失敗:", response.message);
        }
      } catch (err: any) {
        console.error("❌ 評価更新エラー:", err);
        alert("評価の更新中にエラーが発生しました");
      }
    },
    [id, currentUser]
  ); // idとcurrentUserに依存

  // useCallbackを使用してformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []); // 純粋関数なので依存関係なし

  // useCallbackを使用してhandleCommentChangeをメモ化
  const handleCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCommentText(e.target.value);
    },
    []
  ); // setCommentTextは安定しているので依存関係なし

  // useCallbackを使用してhandleGoodRatingをメモ化
  const handleGoodRating = useCallback(() => {
    handleRating(1);
  }, [handleRating]);

  // useCallbackを使用してhandleBadRatingをメモ化
  const handleBadRating = useCallback(() => {
    handleRating(0);
  }, [handleRating]);

  // useCallbackを使用してrenderCommentをメモ化
  const renderComment = useCallback(
    (comment: Comment) => (
      <div
        key={comment.id}
        style={{
          padding: "1rem",
          border: "1px solid #e5e7eb",
          borderRadius: "4px",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ fontWeight: "500", color: "#374151" }}>
            {comment.user?.username || "ユーザー"}
          </span>
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p
          style={{
            margin: 0,
            color: "#374151",
            lineHeight: "1.5",
            whiteSpace: "pre-wrap",
          }}
        >
          {comment.body}
        </p>
      </div>
    ),
    [formatDate]
  ); // formatDateに依存

  // useCallbackを使用してrenderCommentsListをメモ化
  const renderCommentsList = useCallback(() => {
    if (comments.length === 0) {
      return (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>
          まだコメントがありません
        </p>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {comments.map(renderComment)}
      </div>
    );
  }, [comments, renderComment]); // commentsとrenderCommentに依存

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <div>読み込み中...</div>
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
        }}
      >
        <h2>エラー</h2>
        <p>{error || "コンテンツが見つかりません"}</p>
        <Link
          to="/dashboard"
          style={{
            display: "inline-block",
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "4px",
          }}
        >
          ダッシュボードに戻る
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          to="/dashboard"
          style={{
            color: "#6b7280",
            textDecoration: "none",
            fontSize: "0.875rem",
          }}
        >
          ← ダッシュボードに戻る
        </Link>
      </div>

      {/* コンテンツ */}
      <article
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          marginBottom: "2rem",
        }}
      >
        <header style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              margin: "0 0 1rem 0",
              color: "#111827",
            }}
          >
            {content.title}
          </h1>

          <div
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {content.author && <span>✍️ {content.author.username}</span>}
            <span>📅 {formatDate(content.created_at)}</span>
            {content.updated_at !== content.created_at && (
              <span>🔄 更新: {formatDate(content.updated_at)}</span>
            )}
            <span>👁️ {content.view_count} 回閲覧</span>
            {content.category && <span>🏷️ {content.category.name}</span>}
          </div>
        </header>

        <div
          style={{
            lineHeight: "1.7",
            color: "#374151",
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
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            marginBottom: "2rem",
          }}
        >
          <h3 style={{ marginBottom: "1rem", color: "#374151" }}>
            この記事を評価
          </h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleGoodRating}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: userRating === 1 ? "#10b981" : "#f3f4f6",
                color: userRating === 1 ? "white" : "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              👍 グッド
            </button>
            <button
              onClick={handleBadRating}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: userRating === 0 ? "#ef4444" : "#f3f4f6",
                color: userRating === 0 ? "white" : "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              👎 バッド
            </button>
          </div>
          {userRating !== null && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                color: "#6b7280",
              }}
            >
              現在の評価: {userRating === 1 ? "👍 グッド" : "👎 バッド"}
            </div>
          )}
        </div>
      )}

      {/* コメントセクション */}
      <div
        style={{
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h3 style={{ marginBottom: "1.5rem", color: "#374151" }}>
          コメント ({comments.length})
        </h3>

        {/* コメント投稿フォーム */}
        {currentUser && (
          <form onSubmit={handleCommentSubmit} style={{ marginBottom: "2rem" }}>
            <textarea
              value={commentText}
              onChange={handleCommentChange}
              placeholder="コメントを入力してください..."
              style={{
                width: "100%",
                minHeight: "100px",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                resize: "vertical",
                fontSize: "0.875rem",
              }}
            />
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isSubmittingComment ? "not-allowed" : "pointer",
                  opacity: isSubmittingComment ? 0.7 : 1,
                }}
              >
                {isSubmittingComment ? "投稿中..." : "コメント投稿"}
              </button>
            </div>
          </form>
        )}

        {!currentUser && (
          <div
            style={{
              marginBottom: "2rem",
              padding: "1rem",
              backgroundColor: "#f3f4f6",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, color: "#6b7280" }}>
              コメントを投稿するには
              <Link to="/login" style={{ color: "#3b82f6" }}>
                ログイン
              </Link>
              してください
            </p>
          </div>
        )}

        {/* コメント一覧 */}
        {renderCommentsList()}
      </div>
    </div>
  );
};

export default ContentDetailPage;
