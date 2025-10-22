import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { Category, CreateContentRequest, Content, ApiResponse } from "../types";

const CreateContentPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateContentRequest>({
    title: "",
    body: "",
    type: "音楽",
    category_id: 0,
    status: "draft",

    // 趣味投稿専用フィールド
    work_title: "",
    rating: undefined,
    recommendation_level: "",
    tags: [],
    image_url: "",
    external_url: "",
    release_year: undefined,
    artist_name: "",
    genre: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");

  // 認証チェック
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return false;
    }
    return true;
  }, [navigate]);

  // カテゴリ取得
  const fetchCategories = useCallback(async () => {
    try {
      const response: ApiResponse<Category[]> = await api.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error: any) {
      console.error("❌ カテゴリ取得エラー:", error);
      setError("カテゴリの取得に失敗しました");
    }
  }, []);

  // 初期化
  const fetchInitialData = useCallback(async () => {
    try {
      setPageLoading(true);
      if (!checkAuthentication()) return;
      await fetchCategories();
    } catch (error: any) {
      setError("初期化に失敗しました");
    } finally {
      setPageLoading(false);
    }
  }, [checkAuthentication, fetchCategories]);

  // バリデーション
  const validateForm = useCallback(() => {
    if (!formData.title.trim()) {
      setError("タイトルを入力してください");
      return false;
    }
    if (!formData.body.trim()) {
      setError("本文を入力してください");
      return false;
    }
    if (!formData.category_id || formData.category_id === 0) {
      setError("カテゴリを選択してください");
      return false;
    }
    if (formData.rating && (formData.rating < 0 || formData.rating > 5)) {
      setError("評価は0〜5の範囲で入力してください");
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

        const response: ApiResponse<Content> = await api.createContent(
          formData
        );

        if (response.success && response.data) {
          const successMessage =
            formData.status === "published"
              ? "投稿が正常に公開されました！"
              : "投稿が下書きとして保存されました！";

          setSuccess(successMessage);
          setTimeout(() => navigate("/dashboard"), 2000);
        } else {
          throw new Error(response.message || "投稿の作成に失敗しました");
        }
      } catch (err: any) {
        setError(err.response?.data?.error || "投稿の作成に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [formData, validateForm, navigate]
  );

  // フィールド変更
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]:
          name === "category_id" || name === "release_year" || name === "rating"
            ? value
              ? parseInt(value)
              : undefined
            : value,
      }));
    },
    []
  );

  // ステータス変更
  const handleStatusChange = useCallback((status: "draft" | "published") => {
    setFormData((prev) => ({ ...prev, status }));
  }, []);

  // キャンセル
  const handleCancel = useCallback(() => {
    if (formData.title || formData.body) {
      if (!window.confirm("入力内容が失われますが、よろしいですか？")) return;
    }
    navigate("/dashboard");
  }, [formData, navigate]);

  // 星評価の設定
  const handleRatingChange = useCallback((rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  }, []);

  // タグ追加
  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && formData.tags && formData.tags.length < 10) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  }, [tagInput, formData.tags]);

  // タグ削除
  const handleRemoveTag = useCallback((indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((_, index) => index !== indexToRemove) || [],
    }));
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (pageLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div>初期化中...</div>
        </div>
      </div>
    );
  }

  const getCategoryIcon = (type: string) => {
    const icons: Record<string, string> = {
      音楽: "🎵",
      アニメ: "📺",
      漫画: "📚",
      映画: "🎬",
      ゲーム: "🎮",
    };
    return icons[type] || "📝";
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link
            to="/dashboard"
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              textDecoration: "none",
              color: "#1f2937",
            }}
          >
            {getCategoryIcon(formData.type)} 趣味投稿プラットフォーム
          </Link>
          <button
            onClick={handleCancel}
            style={{
              backgroundColor: "#6b7280",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            ← 戻る
          </button>
        </div>
      </header>

      <div
        style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem" }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <h1
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "2rem",
              fontWeight: "bold",
            }}
          >
            ✨ おすすめを投稿
          </h1>
          <p style={{ margin: "0 0 2rem 0", color: "#6b7280" }}>
            あなたのお気に入りの作品を共有しましょう！
          </p>

          <form onSubmit={handleSubmit}>
            {/* エラー・成功メッセージ */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#dc2626",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1.5rem",
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  backgroundColor: "#d1fae5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1.5rem",
                }}
              >
                ✅ {success}
              </div>
            )}

            {/* カテゴリ選択 */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                カテゴリ <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                name="type"
                required
                value={formData.type}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
              >
                <option value="音楽">🎵 音楽</option>
                <option value="アニメ">📺 アニメ</option>
                <option value="漫画">📚 漫画</option>
                <option value="映画">🎬 映画</option>
                <option value="ゲーム">🎮 ゲーム</option>
              </select>
            </div>

            {/* 作品名 */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                作品名
              </label>
              <input
                type="text"
                name="work_title"
                value={formData.work_title}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
                placeholder="例：鬼滅の刃、ONE PIECE、呪術廻戦 など"
              />
            </div>

            {/* タイトル */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
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
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
                placeholder="例：感動で涙が止まらない！超おすすめ作品"
              />
            </div>

            {/* 評価（星） */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                あなたの評価
              </label>
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "2rem" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "transform 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "scale(1.2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    {formData.rating && formData.rating >= star ? "⭐" : "☆"}
                  </button>
                ))}
                {formData.rating && (
                  <span
                    style={{
                      fontSize: "1rem",
                      lineHeight: "2rem",
                      marginLeft: "0.5rem",
                      color: "#6b7280",
                    }}
                  >
                    {formData.rating}.0
                  </span>
                )}
              </div>
            </div>

            {/* おすすめ度 */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                おすすめ度
              </label>
              <select
                name="recommendation_level"
                value={formData.recommendation_level}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
              >
                <option value="">選択しない</option>
                <option value="必見">🔥 必見！絶対見て！</option>
                <option value="おすすめ">👍 おすすめ</option>
                <option value="普通">😐 普通</option>
                <option value="イマイチ">👎 イマイチ</option>
              </select>
            </div>

            {/* 本文 */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                感想・レビュー <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                name="body"
                required
                rows={10}
                value={formData.body}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
                placeholder="どんなところが良かったか、どんな人におすすめか、など自由に書いてください..."
              />
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                }}
              >
                📊 {formData.body.length}文字
              </div>
            </div>

            {/* タグ */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                タグ（最大10個）
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                  }}
                  placeholder="例：感動、泣ける、バトル、恋愛"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={
                    !tagInput.trim() || (formData.tags?.length || 0) >= 10
                  }
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor:
                      tagInput.trim() && (formData.tags?.length || 0) < 10
                        ? "pointer"
                        : "not-allowed",
                    opacity:
                      tagInput.trim() && (formData.tags?.length || 0) < 10
                        ? 1
                        : 0.5,
                  }}
                >
                  追加
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {formData.tags?.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: "#e5e7eb",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "9999px",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(index)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#6b7280",
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* カテゴリID（サブカテゴリ） */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                ジャンル <span style={{ color: "#ef4444" }}>*</span>
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
                }}
              >
                <option value={0}>ジャンルを選択してください</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 画像URL */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                画像URL（オプション）
              </label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            {/* 外部リンク */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                関連リンク（オプション）
              </label>
              <input
                type="url"
                name="external_url"
                value={formData.external_url}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                }}
                placeholder="公式サイト、Amazonリンクなど"
              />
            </div>

            {/* 公開状態 */}
            <div style={{ marginBottom: "2rem" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.75rem",
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                公開設定
              </label>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => handleStatusChange("draft")}
                  style={{
                    padding: "0.75rem 1.5rem",
                    border:
                      formData.status === "draft"
                        ? "2px solid #3b82f6"
                        : "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor:
                      formData.status === "draft" ? "#dbeafe" : "white",
                    color: formData.status === "draft" ? "#1d4ed8" : "#374151",
                    cursor: "pointer",
                    fontWeight: formData.status === "draft" ? "600" : "400",
                  }}
                >
                  📝 下書き保存
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("published")}
                  style={{
                    padding: "0.75rem 1.5rem",
                    border:
                      formData.status === "published"
                        ? "2px solid #059669"
                        : "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor:
                      formData.status === "published" ? "#dcfce7" : "white",
                    color:
                      formData.status === "published" ? "#166534" : "#374151",
                    cursor: "pointer",
                    fontWeight: formData.status === "published" ? "600" : "400",
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
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  backgroundColor: "white",
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                ❌ キャンセル
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.75rem 2rem",
                  backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
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
  );
};

export default CreateContentPage;
