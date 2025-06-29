import React, { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { Comment, ApiResponse, CommentsApiResponse } from "../types";

interface CommentsProps {
  contentId: number;
}

const Comments: React.FC<CommentsProps> = ({ contentId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // useCallbackでnormalizeCommentをメモ化
  const normalizeComment = useCallback((comment: Comment): Comment => {
    return {
      ...comment,
      // content と body フィールドの統一（bodyを優先）
      body: comment.body || "",
      // author と user フィールドの統一
      user: comment.user || {
        id: 0,
        username: "不明なユーザー",
        email: "",
        role: "user",
        created_at: "",
        updated_at: "",
      },
      // repliesがある場合は再帰的に正規化
      replies: comment.replies
        ? comment.replies.map(normalizeComment)
        : undefined,
    };
  }, []); // 純粋関数なので依存関係なし

  // useCallbackでfetchCommentsをメモ化
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`📥 コメント取得: コンテンツID ${contentId}`);

      const response: ApiResponse<CommentsApiResponse> =
        await api.getCommentsByContentId(contentId.toString());
      console.log("📋 コメントレスポンス:", response);

      if (response.success && response.data) {
        // APIレスポンス構造に対応した修正
        let commentsData: Comment[] = [];

        if (response.data.comments && Array.isArray(response.data.comments)) {
          // CommentsApiResponse構造の場合: { comments: Comment[] }
          commentsData = response.data.comments;
        } else {
          // データが期待される構造でない場合
          console.warn("⚠️ 予期しないコメントデータ構造:", response.data);
          commentsData = [];
        }

        // コメントデータの正規化
        const normalizedComments = commentsData.map(normalizeComment);
        console.log("📋 正規化後のコメント:", normalizedComments);
        setComments(normalizedComments);
      } else {
        console.error("❌ コメント取得失敗:", response.message);
        setComments([]);
        setError(response.message || "コメントの取得に失敗しました");
      }
    } catch (error: any) {
      console.error("❌ コメント取得エラー:", error);

      let errorMessage = "コメントの取得に失敗しました";

      if (error.response) {
        console.error("レスポンスエラー:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
        });

        if (error.response.status === 404) {
          errorMessage = "コンテンツが見つかりません";
        } else if (error.response.status === 500) {
          errorMessage = "サーバーエラーが発生しました";
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        console.error("リクエストエラー:", error.request);
        errorMessage = "サーバーに接続できません";
      } else {
        console.error("その他のエラー:", error.message);
        errorMessage = error.message || errorMessage;
      }

      setError(errorMessage);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [contentId, normalizeComment]);

  // useCallbackでauthCheckをメモ化
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    checkAuth();
    fetchComments();
  }, [checkAuth, fetchComments]);

  // useCallbackでhandleSubmitCommentをメモ化
  const handleSubmitComment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;

      if (!isAuthenticated) {
        alert("コメントを投稿するにはログインが必要です");
        return;
      }

      try {
        setSubmitting(true);
        setError(null);
        console.log("📝 コメント投稿:", {
          body: newComment, // contentではなくbodyを使用
          content_id: contentId,
        });

        const response: ApiResponse<Comment> = await api.createComment({
          body: newComment, // contentではなくbodyを使用
          content_id: contentId,
        });

        if (response.success && response.data) {
          console.log("✅ コメント投稿成功:", response);
          setNewComment("");
          await fetchComments(); // コメント一覧を再取得
        } else {
          throw new Error(response.message || "コメントの投稿に失敗しました");
        }
      } catch (error: any) {
        console.error("❌ コメント投稿エラー:", error);

        let errorMessage = "コメントの投稿に失敗しました";

        if (error.response) {
          console.error("レスポンスエラー:", {
            status: error.response.status,
            data: error.response.data,
          });

          if (error.response.status === 401) {
            errorMessage = "認証が必要です。再度ログインしてください。";
            localStorage.removeItem("token");
            setIsAuthenticated(false);
          } else if (error.response.status === 400) {
            errorMessage =
              error.response.data?.message || "リクエストデータが無効です";
          } else if (error.response.status === 404) {
            errorMessage = "コンテンツが見つかりません";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        alert(errorMessage);
        setError(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
    [newComment, contentId, isAuthenticated, fetchComments]
  );

  // useCallbackでhandleSubmitReplyをメモ化
  const handleSubmitReply = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!replyContent.trim() || !replyTo) return;

      if (!isAuthenticated) {
        alert("返信を投稿するにはログインが必要です");
        return;
      }

      try {
        setSubmitting(true);
        setError(null);
        console.log("💬 返信投稿:", {
          body: replyContent, // contentではなくbodyを使用
          content_id: contentId,
          parent_id: replyTo,
        });

        const response: ApiResponse<Comment> = await api.createComment({
          body: replyContent, // contentではなくbodyを使用
          content_id: contentId,
          parent_id: replyTo,
        });

        if (response.success && response.data) {
          console.log("✅ 返信投稿成功:", response);
          setReplyContent("");
          setReplyTo(null);
          await fetchComments(); // コメント一覧を再取得
        } else {
          throw new Error(response.message || "返信の投稿に失敗しました");
        }
      } catch (error: any) {
        console.error("❌ 返信投稿エラー:", error);

        let errorMessage = "返信の投稿に失敗しました";

        if (error.response) {
          if (error.response.status === 401) {
            errorMessage = "認証が必要です。再度ログインしてください。";
            localStorage.removeItem("token");
            setIsAuthenticated(false);
          } else if (error.response.status === 400) {
            errorMessage =
              error.response.data?.message || "リクエストデータが無効です";
          } else if (error.response.status === 404) {
            errorMessage =
              error.response.data?.message ||
              "親コメントまたはコンテンツが見つかりません";
          } else {
            errorMessage = error.response.data?.message || errorMessage;
          }
        }

        alert(errorMessage);
        setError(errorMessage);
      } finally {
        setSubmitting(false);
      }
    },
    [replyContent, replyTo, contentId, isAuthenticated, fetchComments]
  );

  // useCallbackでformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // useCallbackでhandleReplyToggleをメモ化
  const handleReplyToggle = useCallback(
    (commentId: number) => {
      setReplyTo(replyTo === commentId ? null : commentId);
      setReplyContent("");
    },
    [replyTo]
  );

  // useCallbackでhandleReplyCancelをメモ化
  const handleReplyCancel = useCallback(() => {
    setReplyTo(null);
    setReplyContent("");
  }, []);

  // useCallbackでhandleNewCommentChangeをメモ化
  const handleNewCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewComment(e.target.value);
    },
    []
  );

  // useCallbackでhandleReplyContentChangeをメモ化
  const handleReplyContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReplyContent(e.target.value);
    },
    []
  );

  // useCallbackでrenderCommentをメモ化
  const renderComment = useCallback(
    (comment: Comment, isReply: boolean = false) => {
      // 安全なユーザー情報の取得
      const user = comment.user || {
        id: 0,
        username: "不明なユーザー",
        email: "",
        role: "user",
        created_at: "",
        updated_at: "",
      };

      // 安全なコンテンツの取得
      const body = comment.body || "";

      return (
        <div
          key={comment.id}
          style={{
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            marginLeft: isReply ? "2rem" : "0",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
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
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              👤 {user.username}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
              }}
            >
              📅 {formatDate(comment.created_at)}
            </div>
          </div>

          <div
            style={{
              color: "#374151",
              lineHeight: "1.6",
              marginBottom: "0.75rem",
            }}
          >
            {body}
          </div>

          {!isReply && isAuthenticated && (
            <button
              onClick={() => handleReplyToggle(comment.id)}
              style={{
                padding: "0.25rem 0.75rem",
                backgroundColor: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              💬 返信
            </button>
          )}

          {/* 返信フォーム */}
          {replyTo === comment.id && isAuthenticated && (
            <form onSubmit={handleSubmitReply} style={{ marginTop: "1rem" }}>
              <textarea
                value={replyContent}
                onChange={handleReplyContentChange}
                placeholder={`${user.username}さんに返信...`}
                required
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  resize: "vertical",
                  marginBottom: "0.5rem",
                }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? "投稿中..." : "返信投稿"}
                </button>
                <button
                  type="button"
                  onClick={handleReplyCancel}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          )}

          {/* 返信表示 */}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              {comment.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      );
    },
    [
      formatDate,
      isAuthenticated,
      replyTo,
      replyContent,
      submitting,
      handleReplyToggle,
      handleReplyContentChange,
      handleSubmitReply,
      handleReplyCancel,
    ]
  );

  return (
    <div
      style={{
        backgroundColor: "#f9fafb",
        padding: "1.5rem",
        borderRadius: "8px",
        marginTop: "2rem",
      }}
    >
      <h3
        style={{
          fontSize: "1.25rem",
          fontWeight: "600",
          marginBottom: "1.5rem",
          color: "#374151",
        }}
      >
        💬 コメント ({comments.length})
      </h3>

      {/* エラー表示 */}
      {error && (
        <div
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            padding: "0.75rem",
            borderRadius: "6px",
            marginBottom: "1rem",
            border: "1px solid #fecaca",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* 認証状態に応じたコメント投稿フォーム */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmitComment} style={{ marginBottom: "2rem" }}>
          <textarea
            value={newComment}
            onChange={handleNewCommentChange}
            placeholder="コメントを投稿..."
            required
            rows={4}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.875rem",
              resize: "vertical",
              marginBottom: "1rem",
            }}
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor:
                submitting || !newComment.trim() ? "not-allowed" : "pointer",
              opacity: submitting || !newComment.trim() ? 0.6 : 1,
            }}
          >
            {submitting ? "投稿中..." : "💬 コメント投稿"}
          </button>
        </form>
      ) : (
        <div
          style={{
            backgroundColor: "#fef3c7",
            color: "#92400e",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          🔒 コメントを投稿するにはログインが必要です
        </div>
      )}

      {/* コメント一覧 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          読み込み中...
        </div>
      ) : comments.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            backgroundColor: "white",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</div>
          <p style={{ color: "#6b7280", margin: 0 }}>
            まだコメントがありません。最初のコメントを投稿しましょう！
          </p>
        </div>
      ) : (
        <div>{comments.map((comment) => renderComment(comment))}</div>
      )}
    </div>
  );
};

export default Comments;
