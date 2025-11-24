import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { CreateContentRequest, Content, ApiResponse } from "../types";
import Sidebar from "../components/Sidebar";

const CreateContentPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<{
    title: string;
    body: string;
    type: "" | "音楽" | "ゲーム" | "映画" | "アニメ" | "漫画";
    genre: string;
    category_id: number;
    status: "draft" | "published";
  }>({
    title: "",
    body: "",
    type: "",
    genre: "",
    category_id: 0,
    status: "draft",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  // ✅ カテゴリ名からIDへのマッピング
  const getCategoryId = useCallback((categoryName: string): number => {
    const categoryMap: Record<string, number> = {
      音楽: 1,
      ゲーム: 2,
      映画: 3,
      アニメ: 4,
      漫画: 5,
    };
    return categoryMap[categoryName] || 1;
  }, []);

  // 認証チェック
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return false;
    }
    return true;
  }, [navigate]);

  // 初期化
  useEffect(() => {
    setPageLoading(true);
    if (!checkAuthentication()) return;
    setPageLoading(false);
  }, [checkAuthentication]);

  // バリデーション
  const validateForm = useCallback(() => {
    if (!formData.type) {
      setError("カテゴリーを選択してください");
      return false;
    }
    if (!formData.title.trim()) {
      setError("投稿タイトルを入力してください");
      return false;
    }
    if (!formData.body.trim()) {
      setError("感想・レビューを入力してください");
      return false;
    }
    return true;
  }, [formData]);

  // フォーム送信
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccess("");
      setLoading(true);

      try {
        if (!validateForm()) {
          setLoading(false);
          return;
        }

        // ✅ デバッグログ追加
        console.log("📤 送信するデータ:", formData);
        console.log("📤 ステータス:", formData.status); // ← 追加

        const response: ApiResponse<Content> = await api.createContent({
          title: formData.title.trim(),
          body: formData.body.trim(),
          type: formData.type as CreateContentRequest["type"],
          genre: formData.genre,
          category_id: formData.category_id,
          status: formData.status,
        });

        if (response.success && response.data) {
          const successMessage =
            formData.status === "published"
              ? "投稿が正常に公開されました！"
              : "投稿が下書きとして保存されました！";

          setSuccess(successMessage);

          // ✅ ステータスに応じてリダイレクト先を変更
          setTimeout(() => {
            if (formData.status === "published") {
              navigate("/dashboard"); // 公開の場合はダッシュボードへ
            } else {
              navigate("/drafts"); // 下書きの場合は下書きページへ
            }
          }, 2000);
        } else {
          throw new Error(response.message || "投稿の作成に失敗しました");
        }
      } catch (err: any) {
        console.error("❌ 投稿エラー:", err); // ← 追加
        setError(err.response?.data?.error || "投稿の作成に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [formData, validateForm, navigate]
  );

  // ✅ フィールド変更 - category_idも更新
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;

      // ✅ typeが変更されたらcategory_idも更新
      if (name === "type") {
        const categoryId = getCategoryId(value);
        console.log(`🔄 カテゴリ変更: ${value} → ID: ${categoryId}`);
        setFormData((prev) => ({
          ...prev,
          type: value as CreateContentRequest["type"], // ← 型アサーションを追加
          category_id: categoryId,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    },
    [getCategoryId]
  );

  // ステータス変更
  const handleStatusChange = useCallback((status: "draft" | "published") => {
    setFormData((prev) => ({ ...prev, status }));
  }, []);

  // キャンセル
  const handleCancel = useCallback(() => {
    if (formData.title || formData.body) {
      if (!window.confirm("入力内容が失われますが、よろしいですか?")) return;
    }
    navigate("/dashboard");
  }, [formData, navigate]);

  if (pageLoading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
            <div style={{ color: "#6b7280", fontSize: "1.125rem" }}>
              読み込み中...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          backgroundColor: "#f9fafb",
          overflow: "auto",
        }}
      >
        <div
          style={{
            maxWidth: "900px",
            margin: "0 auto",
            padding: "3rem 2rem",
          }}
        >
          {/* ページタイトル */}
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "3rem",
              textAlign: "center",
            }}
          >
            新規投稿
          </h1>

          {/* メインフォームエリア */}
          <div
            style={{
              backgroundColor: "white",
              padding: "3rem",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* ✅ デバッグ表示（開発時のみ表示） */}
            {process.env.NODE_ENV === "development" && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  marginBottom: "2rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                }}
              >
                <strong>🔍 デバッグ情報:</strong>
                <br />
                カテゴリ: {formData.type} (ID: {formData.category_id})
              </div>
            )}

            {/* エラー表示 */}
            {error && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#fee2e2",
                  border: "1px solid #ef4444",
                  color: "#dc2626",
                  borderRadius: "8px",
                  marginBottom: "2rem",
                  fontSize: "0.875rem",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* 成功表示 */}
            {success && (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#d1fae5",
                  border: "1px solid #10b981",
                  color: "#059669",
                  borderRadius: "8px",
                  marginBottom: "2rem",
                  fontSize: "0.875rem",
                }}
              >
                ✅ {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* カテゴリー選択（カード形式） */}
              <div style={{ marginBottom: "2.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "1rem",
                  }}
                >
                  カテゴリー <span style={{ color: "#ef4444" }}>*</span>
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {[
                    { value: "音楽", icon: "🎵", color: "#ec4899" },
                    { value: "ゲーム", icon: "🎮", color: "#8b5cf6" },
                    { value: "映画", icon: "🎬", color: "#f59e0b" },
                    { value: "アニメ", icon: "📺", color: "#10b981" },
                    { value: "漫画", icon: "📚", color: "#3b82f6" },
                  ].map((category) => {
                    const isSelected = formData.type === category.value;
                    return (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => {
                          const categoryId = getCategoryId(category.value);
                          console.log(
                            `🔄 カテゴリ選択: ${category.value} → ID: ${categoryId}`
                          );
                          setFormData((prev) => ({
                            ...prev,
                            type: category.value as CreateContentRequest["type"],
                            category_id: categoryId,
                          }));
                        }}
                        style={{
                          padding: "1.5rem 1rem",
                          border: isSelected
                            ? `3px solid ${category.color}`
                            : "2px solid #e5e7eb",
                          borderRadius: "12px",
                          backgroundColor: isSelected
                            ? `${category.color}20`
                            : "white",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.5rem",
                          transform: isSelected ? "scale(1.05)" : "scale(1)",
                          boxShadow: isSelected
                            ? `0 4px 12px ${category.color}40`
                            : "0 1px 3px rgba(0, 0, 0, 0.1)",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = category.color;
                            e.currentTarget.style.transform = "scale(1.03)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = "#e5e7eb";
                            e.currentTarget.style.transform = "scale(1)";
                          }
                        }}
                      >
                        <div
                          style={{
                            fontSize: "2.5rem",
                            lineHeight: "1",
                          }}
                        >
                          {category.icon}
                        </div>
                        <div
                          style={{
                            fontWeight: "600",
                            fontSize: "0.95rem",
                            color: isSelected ? category.color : "#6b7280",
                            transition: "color 0.2s",
                          }}
                        >
                          {category.value}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* 未選択の場合の警告メッセージ */}
                {!formData.type && (
                  <p
                    style={{
                      marginTop: "0.75rem",
                      fontSize: "0.875rem",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>⚠️</span>
                    <span>カテゴリーを選択してください</span>
                  </p>
                )}
              </div>

              {/* ジャンル */}
              <div style={{ marginBottom: "2.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "1rem",
                  }}
                >
                  ジャンル
                </label>
                <input
                  type="text"
                  name="genre"
                  value={formData.genre}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1.125rem",
                    transition: "border-color 0.2s",
                  }}
                  placeholder="例:アクション、恋愛、コメディ"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.outline = "none";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                />
              </div>

              {/* 投稿タイトル */}
              <div style={{ marginBottom: "2.5rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "1rem",
                  }}
                >
                  投稿タイトル <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1.125rem",
                    transition: "border-color 0.2s",
                  }}
                  placeholder="例:感動の名作!何度見ても泣ける"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.outline = "none";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                />
              </div>

              {/* 感想・レビュー */}
              <div style={{ marginBottom: "3rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "1rem",
                  }}
                >
                  感想・レビュー <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  name="body"
                  required
                  value={formData.body}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    padding: "1rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "1.125rem",
                    resize: "vertical",
                    fontFamily: "inherit",
                    lineHeight: "1.6",
                    transition: "border-color 0.2s",
                  }}
                  placeholder="あなたの感想やレビューを自由に書いてください..."
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.outline = "none";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                  }}
                />
              </div>

              {/* 公開設定 */}
              <div style={{ marginBottom: "3rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "1.25rem",
                    fontWeight: "600",
                    color: "#374151",
                    marginBottom: "1rem",
                  }}
                >
                  公開設定
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleStatusChange("draft")}
                    style={{
                      flex: "1",
                      minWidth: "200px",
                      padding: "1rem 1.5rem",
                      border:
                        formData.status === "draft"
                          ? "2px solid #3b82f6"
                          : "2px solid #e5e7eb",
                      borderRadius: "8px",
                      backgroundColor:
                        formData.status === "draft" ? "#eff6ff" : "white",
                      color:
                        formData.status === "draft" ? "#1e40af" : "#6b7280",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "1rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (formData.status !== "draft") {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.status !== "draft") {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }
                    }}
                  >
                    📝 下書き保存
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange("published")}
                    style={{
                      flex: "1",
                      minWidth: "200px",
                      padding: "1rem 1.5rem",
                      border:
                        formData.status === "published"
                          ? "2px solid #10b981"
                          : "2px solid #e5e7eb",
                      borderRadius: "8px",
                      backgroundColor:
                        formData.status === "published" ? "#d1fae5" : "white",
                      color:
                        formData.status === "published" ? "#065f46" : "#6b7280",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "1rem",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (formData.status !== "published") {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.status !== "published") {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                      }
                    }}
                  >
                    🌟 今すぐ公開
                  </button>
                </div>
              </div>

              {/* ボタン */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: "1rem 2rem",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    backgroundColor: "white",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "1rem",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#cbd5e1";
                    e.currentTarget.style.backgroundColor = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  ❌ キャンセル
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "1rem 2.5rem",
                    backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    fontSize: "1rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = "#2563eb";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(59, 130, 246, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = "#3b82f6";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }
                  }}
                >
                  {loading
                    ? "投稿中..."
                    : formData.status === "published"
                    ? "✨ 公開する"
                    : "📝 下書き保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContentPage;
