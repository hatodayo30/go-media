import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Content, ApiResponse } from "../types";

const DraftsPage: React.FC = () => {
  const navigate = useNavigate();

  const [drafts, setDrafts] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<{ [key: number]: string }>(
    {}
  );

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

  // useCallbackでfetchDraftsをメモ化
  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // 認証チェック
      if (!checkAuthentication()) {
        return;
      }

      console.log("📥 下書き一覧を取得中...");

      const response: ApiResponse<Content[]> = await api.getContents({
        status: "draft",
      });
      console.log("📝 下書きレスポンス:", response);

      if (response.success && response.data) {
        setDrafts(response.data);
        console.log(`📋 下書き数: ${response.data.length}`);
      } else {
        console.error("❌ 下書き取得失敗:", response.message);
        setDrafts([]);
        setError(response.message || "下書きの取得に失敗しました");
      }
    } catch (err: any) {
      console.error("❌ 下書き取得エラー:", err);
      setError("下書きの取得に失敗しました");
      setDrafts([]);

      // 401エラーの場合は認証エラー
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [checkAuthentication, navigate]);

  // useCallbackでhandlePublishをメモ化
  const handlePublish = useCallback(
    async (id: number) => {
      try {
        setActionLoading((prev) => ({ ...prev, [id]: "publishing" }));
        console.log(`🚀 コンテンツ ${id} を公開中...`);

        const response: ApiResponse<Content> = await api.updateContentStatus(
          id.toString(),
          "published"
        );

        if (response.success) {
          console.log("✅ 公開完了");
          await fetchDrafts(); // 下書き一覧を更新
          alert("記事を公開しました！");
        } else {
          throw new Error(response.message || "公開に失敗しました");
        }
      } catch (err: any) {
        console.error("❌ 公開エラー:", err);
        alert(err.message || "公開に失敗しました");
      } finally {
        setActionLoading((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }
    },
    [fetchDrafts]
  );

  // useCallbackでhandleDeleteをメモ化
  const handleDelete = useCallback(
    async (id: number, title: string) => {
      if (
        !window.confirm(
          `「${title}」を削除しますか？この操作は取り消せません。`
        )
      ) {
        return;
      }

      try {
        setActionLoading((prev) => ({ ...prev, [id]: "deleting" }));
        console.log(`🗑️ コンテンツ ${id} を削除中...`);

        const response: ApiResponse<void> = await api.deleteContent(
          id.toString()
        );

        if (response.success) {
          console.log("✅ 削除完了");
          await fetchDrafts(); // 下書き一覧を更新
          alert("下書きを削除しました");
        } else {
          throw new Error(response.message || "削除に失敗しました");
        }
      } catch (err: any) {
        console.error("❌ 削除エラー:", err);
        alert(err.message || "削除に失敗しました");
      } finally {
        setActionLoading((prev) => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }
    },
    [fetchDrafts]
  );

  // useCallbackでhandleEditをメモ化
  const handleEdit = useCallback(
    (id: number) => {
      console.log(`✏️ 編集ページへ遷移: コンテンツID ${id}`);
      navigate(`/edit/${id}`);
    },
    [navigate]
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

  // useCallbackでhandleCreateNewをメモ化
  const handleCreateNew = useCallback(() => {
    navigate("/create");
  }, [navigate]);

  // useCallbackでhandleBackToDashboardをメモ化
  const handleBackToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // useCallbackでrenderDraftCardをメモ化
  const renderDraftCard = useCallback(
    (draft: Content) => {
      const isPublishing = actionLoading[draft.id] === "publishing";
      const isDeleting = actionLoading[draft.id] === "deleting";
      const isActionLoading = isPublishing || isDeleting;

      return (
        <div
          key={draft.id}
          style={{
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e5e7eb",
            opacity: isActionLoading ? 0.7 : 1,
            transition: "opacity 0.2s",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#374151",
                }}
              >
                {draft.title}
              </h3>

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  marginBottom: "0.75rem",
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <span>📅 更新: {formatDate(draft.updated_at)}</span>
                <span>📝 作成: {formatDate(draft.created_at)}</span>
                {draft.category && <span>🏷️ {draft.category.name}</span>}
                <span
                  style={{
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "500",
                  }}
                >
                  📝 下書き
                </span>
              </div>

              {/* コンテンツのプレビュー */}
              <div
                style={{
                  color: "#374151",
                  fontSize: "0.875rem",
                  lineHeight: "1.5",
                  marginBottom: "1rem",
                }}
              >
                {draft.body.substring(0, 150)}
                {draft.body.length > 150 && "..."}
              </div>

              {/* 統計情報 */}
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  display: "flex",
                  gap: "1rem",
                }}
              >
                <span>📊 文字数: {draft.body.length}</span>
                <span>🆔 ID: {draft.id}</span>
                {draft.author && (
                  <span>✍️ 作成者: {draft.author.username}</span>
                )}
              </div>
            </div>

            {/* アクションボタン */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginLeft: "1rem",
                flexDirection: "column",
              }}
            >
              <button
                onClick={() => handleEdit(draft.id)}
                disabled={isActionLoading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  cursor: isActionLoading ? "not-allowed" : "pointer",
                  opacity: isActionLoading ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                ✏️ 編集
              </button>

              <button
                onClick={() => handlePublish(draft.id)}
                disabled={isActionLoading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: isPublishing ? "#6b7280" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  cursor: isActionLoading ? "not-allowed" : "pointer",
                  opacity: isActionLoading ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {isPublishing ? "🔄 公開中..." : "🚀 公開"}
              </button>

              <button
                onClick={() => handleDelete(draft.id, draft.title)}
                disabled={isActionLoading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: isDeleting ? "#6b7280" : "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  cursor: isActionLoading ? "not-allowed" : "pointer",
                  opacity: isActionLoading ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {isDeleting ? "🔄 削除中..." : "🗑️ 削除"}
              </button>
            </div>
          </div>
        </div>
      );
    },
    [actionLoading, formatDate, handleEdit, handlePublish, handleDelete]
  );

  // useMemoで統計情報をメモ化
  const stats = useMemo(
    () => ({
      totalDrafts: drafts.length,
      totalCharacters: drafts.reduce(
        (sum, draft) => sum + draft.body.length,
        0
      ),
      averageCharacters:
        drafts.length > 0
          ? Math.round(
              drafts.reduce((sum, draft) => sum + draft.body.length, 0) /
                drafts.length
            )
          : 0,
    }),
    [drafts]
  );

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          minHeight: "50vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📝</div>
          <div>下書きを読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "2rem",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              margin: "0 0 0.5rem 0",
              color: "#374151",
            }}
          >
            📝 下書き一覧
          </h1>
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            {stats.totalDrafts}件の下書きがあります
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={handleBackToDashboard}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            ← ダッシュボードに戻る
          </button>
          <button
            onClick={handleCreateNew}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            ✏️ 新規投稿
          </button>
        </div>
      </div>

      {/* 統計情報 */}
      {drafts.length > 0 && (
        <div
          style={{
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
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
                {stats.totalDrafts}
              </div>
              <div>📝 下書き数</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#10b981",
                }}
              >
                {stats.totalCharacters.toLocaleString()}
              </div>
              <div>📊 総文字数</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#f59e0b",
                }}
              >
                {stats.averageCharacters.toLocaleString()}
              </div>
              <div>📈 平均文字数</div>
            </div>
          </div>
        </div>
      )}

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

      {/* 下書き一覧 */}
      {drafts.length === 0 ? (
        <div
          style={{
            backgroundColor: "white",
            padding: "3rem",
            borderRadius: "8px",
            textAlign: "center",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
          <h3
            style={{
              fontSize: "1.25rem",
              marginBottom: "0.5rem",
              color: "#374151",
            }}
          >
            下書きはありません
          </h3>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            まだ下書きされた記事がありません。新しい記事を作成してみましょう。
          </p>
          <button
            onClick={handleCreateNew}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            ✏️ 新規投稿を作成
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {drafts.map(renderDraftCard)}
        </div>
      )}

      {/* アクション中の場合の表示 */}
      {Object.keys(actionLoading).length > 0 && (
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
          🔄 処理中... ({Object.keys(actionLoading).length}件)
        </div>
      )}
    </div>
  );
};

export default DraftsPage;
