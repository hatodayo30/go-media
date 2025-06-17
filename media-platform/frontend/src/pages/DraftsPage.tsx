import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";

interface Content {
  id: number;
  title: string;
  content?: string;
  body?: string;
  status: string;
  category_id: number;
  author_id: number;
  created_at: string;
  updated_at: string;
  category?: {
    id: number;
    name: string;
  };
  author?: {
    id: number;
    username: string;
  };
}

const DraftsPage: React.FC = () => {
  const [drafts, setDrafts] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // useCallbackを使用してfetchDraftsをメモ化
  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true);
      console.log("📥 下書き一覧を取得中...");

      // 下書きのコンテンツを取得
      const response = await api.getContents({ status: "draft" });
      console.log("📝 下書きレスポンス:", response);

      if (response.data && response.data.contents) {
        setDrafts(response.data.contents);
        console.log(`📋 下書き数: ${response.data.contents.length}`);
      } else {
        setDrafts([]);
      }
    } catch (err: any) {
      console.error("❌ 下書き取得エラー:", err);
      setError("下書きの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []); // 依存関係なし

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]); // fetchDraftsを依存配列に含める

  // useCallbackを使用してhandlePublishをメモ化
  const handlePublish = useCallback(
    async (id: number) => {
      try {
        console.log(`🚀 コンテンツ ${id} を公開中...`);

        await api.updateContentStatus(id.toString(), "published");
        console.log("✅ 公開完了");

        // 成功後、下書き一覧を更新
        fetchDrafts();
        alert("記事を公開しました！");
      } catch (err: any) {
        console.error("❌ 公開エラー:", err);
        alert("公開に失敗しました");
      }
    },
    [fetchDrafts]
  ); // fetchDraftsが依存配列に含まれる

  // useCallbackを使用してhandleDeleteをメモ化
  const handleDelete = useCallback(
    async (id: number) => {
      if (!window.confirm("この下書きを削除しますか？")) {
        return;
      }

      try {
        console.log(`🗑️ コンテンツ ${id} を削除中...`);

        await api.deleteContent(id.toString());
        console.log("✅ 削除完了");

        // 成功後、下書き一覧を更新
        fetchDrafts();
        alert("下書きを削除しました");
      } catch (err: any) {
        console.error("❌ 削除エラー:", err);
        alert("削除に失敗しました");
      }
    },
    [fetchDrafts]
  ); // fetchDraftsが依存配列に含まれる

  // useCallbackを使用してhandleEditをメモ化
  const handleEdit = useCallback(
    (id: number) => {
      navigate(`/edit/${id}`);
    },
    [navigate]
  ); // navigateが依存配列に含まれる

  // useCallbackを使用してformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []); // 純粋関数なので依存関係なし

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
        }}
      >
        <div>読み込み中...</div>
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
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            margin: 0,
            color: "#374151",
          }}
        >
          📝 下書き一覧
        </h1>
        <div style={{ display: "flex", gap: "1rem" }}>
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
            ダッシュボードに戻る
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
            新規投稿
          </Link>
        </div>
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
          {error}
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
          <Link
            to="/create"
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            新規投稿を作成
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {drafts.map((draft) => (
            <div
              key={draft.id}
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e5e7eb",
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
                    }}
                  >
                    <span>📅 {formatDate(draft.updated_at)}</span>
                    <span>🏷️ カテゴリID: {draft.category_id}</span>
                    <span
                      style={{
                        backgroundColor: "#fef3c7",
                        color: "#92400e",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                      }}
                    >
                      下書き
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
                    {(draft.content || draft.body || "").substring(0, 150)}
                    {(draft.content || draft.body || "").length > 150 && "..."}
                  </div>
                </div>

                {/* アクションボタン */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginLeft: "1rem",
                  }}
                >
                  <button
                    onClick={() => handleEdit(draft.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ 編集
                  </button>

                  <button
                    onClick={() => handlePublish(draft.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    🚀 公開
                  </button>

                  <button
                    onClick={() => handleDelete(draft.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DraftsPage;
