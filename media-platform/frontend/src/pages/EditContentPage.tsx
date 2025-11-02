import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type {
  Content,
  Category,
  ApiResponse,
  UpdateContentRequest,
} from "../types";
import Sidebar from "../components/Sidebar";

const EditContentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<{
    title: string;
    body: string;
    category_id: string;
    status: "draft" | "published" | "archived";
  }>({
    title: "",
    body: "",
    category_id: "",
    status: "draft",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [originalContent, setOriginalContent] = useState<Content | null>(null);

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

  // useCallbackでfetchContentAndCategoriesをメモ化
  const fetchContentAndCategories = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      // 認証チェック
      if (!checkAuthentication()) {
        return;
      }

      console.log(`📄 コンテンツ ${id} と カテゴリを取得中...`);

      const [contentResponse, categoriesResponse] = await Promise.all([
        api.getContentById(id),
        api.getCategories(),
      ]);

      console.log("📥 コンテンツレスポンス:", contentResponse);
      console.log("📥 カテゴリレスポンス:", categoriesResponse);

      // ApiResponse型に対応したデータ取得
      if (contentResponse.success && contentResponse.data) {
        setOriginalContent(contentResponse.data);
        setFormData({
          title: contentResponse.data.title || "",
          body: contentResponse.data.body || "",
          category_id: contentResponse.data.category_id?.toString() || "",
          status: contentResponse.data.status,
        });
      } else {
        throw new Error(
          contentResponse.message || "コンテンツの取得に失敗しました"
        );
      }

      if (categoriesResponse.success && categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      } else {
        console.warn("⚠️ カテゴリ取得失敗:", categoriesResponse.message);
        setCategories([]);
      }
    } catch (err: any) {
      console.error("❌ データ取得エラー:", err);

      if (err.response?.status === 404) {
        setError("記事が見つかりませんでした");
      } else if (err.response?.status === 403) {
        setError("この記事を編集する権限がありません");
      } else if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      } else {
        setError(err.message || "データの取得に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }, [id, checkAuthentication, navigate]);

  // useCallbackでhandleChangeをメモ化
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // エラーをクリア
      if (error) {
        setError("");
      }
    },
    [error]
  );

  // useCallbackでvalidateFormをメモ化
  const validateForm = useCallback(() => {
    if (!formData.title.trim()) {
      setError("タイトルを入力してください");
      return false;
    }

    if (!formData.body.trim()) {
      setError("本文を入力してください");
      return false;
    }

    if (!formData.category_id) {
      setError("カテゴリを選択してください");
      return false;
    }

    return true;
  }, [formData]);

  // useCallbackでhandleSubmitをメモ化
  const handleSubmit = useCallback(
    async (isDraft: boolean = false) => {
      if (!validateForm()) {
        return;
      }

      if (!id) {
        setError("記事IDが不正です");
        return;
      }

      try {
        setSaving(true);
        setError("");

        const updateData: UpdateContentRequest = {
          title: formData.title.trim(),
          body: formData.body.trim(),
          category_id: parseInt(formData.category_id),
          status: isDraft ? "draft" : "published",
        };

        console.log("💾 コンテンツを更新中...", updateData);

        const response: ApiResponse<Content> = await api.updateContent(
          id,
          updateData
        );

        if (response.success) {
          console.log("✅ 更新完了");
          alert(
            isDraft ? "下書きを保存しました！" : "コンテンツを公開しました！"
          );
          navigate("/dashboard");
        } else {
          throw new Error(response.message || "保存に失敗しました");
        }
      } catch (err: any) {
        console.error("❌ 保存エラー:", err);

        if (err.response?.status === 403) {
          setError("この記事を編集する権限がありません");
        } else if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        } else {
          setError(err.message || "保存に失敗しました");
        }
      } finally {
        setSaving(false);
      }
    },
    [formData, id, navigate, validateForm]
  );

  // useCallbackでhandleDraftSaveをメモ化
  const handleDraftSave = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      handleSubmit(true);
    },
    [handleSubmit]
  );

  // useCallbackでhandlePublishをメモ化
  const handlePublish = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(false);
    },
    [handleSubmit]
  );

  // useCallbackでhandleBackToDashboardをメモ化
  const handleBackToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // useCallbackでhandleViewContentをメモ化
  const handleViewContent = useCallback(() => {
    if (id) {
      navigate(`/contents/${id}`);
    }
  }, [id, navigate]);

  // useMemoでフォーム統計をメモ化
  const formStats = useMemo(
    () => ({
      titleLength: formData.title.length,
      bodyLength: formData.body.length,
      selectedCategory: categories.find(
        (c) => c.id.toString() === formData.category_id
      ),
      hasChanges: originalContent
        ? formData.title !== originalContent.title ||
          formData.body !== originalContent.body ||
          formData.category_id !== originalContent.category_id?.toString()
        : true,
    }),
    [formData, originalContent, categories]
  );

  // useMemoでisFormValidをメモ化
  const isFormValid = useMemo(() => {
    return (
      formData.title.trim() !== "" &&
      formData.body.trim() !== "" &&
      formData.category_id !== ""
    );
  }, [formData]);

  useEffect(() => {
    if (id) {
      fetchContentAndCategories();
    } else {
      navigate("/dashboard");
    }
  }, [id, fetchContentAndCategories, navigate]);

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
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✏️</div>
          <div>記事を読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error && !originalContent) {
    return (
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "2rem",
          textAlign: "center",
          backgroundColor: "#f9fafb",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "3rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
          <h2 style={{ marginBottom: "1rem", color: "#374151" }}>{error}</h2>
          <button
            onClick={handleBackToDashboard}
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
            ダッシュボードに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, backgroundColor: "#f9fafb", overflow: "auto" }}>
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto",
            padding: "2rem",
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
                ✏️ 記事編集
              </h1>
              {originalContent && (
                <p
                  style={{
                    margin: 0,
                    color: "#6b7280",
                    fontSize: "0.875rem",
                  }}
                >
                  {originalContent.title}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleViewContent}
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
                📄 記事を表示
              </button>
              <button
                onClick={handleBackToDashboard}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#8b5cf6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                ← ダッシュボード
              </button>
            </div>
          </div>

          {/* 統計情報 */}
          {originalContent && (
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: "1rem",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      color: "#3b82f6",
                    }}
                  >
                    {formStats.titleLength}
                  </div>
                  <div>📝 タイトル文字数</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      color: "#10b981",
                    }}
                  >
                    {formStats.bodyLength.toLocaleString()}
                  </div>
                  <div>📊 本文文字数</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      color:
                        originalContent.status === "published"
                          ? "#10b981"
                          : "#f59e0b",
                    }}
                  >
                    {originalContent.status === "published" ? "🚀" : "📝"}
                  </div>
                  <div>
                    {originalContent.status === "published"
                      ? "公開中"
                      : "下書き"}
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "bold",
                      color: formStats.hasChanges ? "#f59e0b" : "#6b7280",
                    }}
                  >
                    {formStats.hasChanges ? "📝" : "✅"}
                  </div>
                  <div>{formStats.hasChanges ? "変更あり" : "保存済み"}</div>
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

          {/* フォーム */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "2rem",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            }}
          >
            <form onSubmit={handlePublish}>
              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  タイトル *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                  }}
                  placeholder="記事のタイトルを入力してください"
                />
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "0.25rem",
                  }}
                >
                  {formStats.titleLength}/100文字
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  カテゴリ *
                </label>
                <select
                  name="category_id"
                  required
                  value={formData.category_id}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    backgroundColor: "white",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">カテゴリを選択してください</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {formStats.selectedCategory && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.25rem",
                    }}
                  >
                    選択中: {formStats.selectedCategory.name}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  本文 *
                </label>
                <textarea
                  name="body"
                  required
                  value={formData.body}
                  onChange={handleChange}
                  rows={15}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                  placeholder="記事の本文を入力してください..."
                />
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "0.25rem",
                  }}
                >
                  {formStats.bodyLength.toLocaleString()}文字
                </div>
              </div>

              {/* 保存ボタン */}
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleDraftSave}
                  disabled={saving || !isFormValid}
                  style={{
                    padding: "0.75rem 2rem",
                    backgroundColor: saving ? "#6b7280" : "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    fontWeight: "500",
                    cursor: saving || !isFormValid ? "not-allowed" : "pointer",
                    opacity: saving || !isFormValid ? 0.6 : 1,
                  }}
                >
                  {saving ? "保存中..." : "📝 下書き保存"}
                </button>

                <button
                  type="submit"
                  disabled={saving || !isFormValid}
                  style={{
                    padding: "0.75rem 2rem",
                    backgroundColor: saving ? "#6b7280" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    fontWeight: "500",
                    cursor: saving || !isFormValid ? "not-allowed" : "pointer",
                    opacity: saving || !isFormValid ? 0.6 : 1,
                  }}
                >
                  {saving ? "公開中..." : "🚀 公開する"}
                </button>
              </div>
            </form>
          </div>

          {/* 保存状態表示 */}
          {saving && (
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
              💾 保存中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditContentPage;
