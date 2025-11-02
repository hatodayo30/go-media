import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { Category, CreateContentRequest, Content, ApiResponse } from "../types";
import Sidebar from "../components/Sidebar";

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
          backgroundColor: "#f5f6fa",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ color: "#7f8c8d" }}>初期化中...</div>
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
          {/* メインコンテンツエリア */}
          <div
            style={{
              marginLeft: "240px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* ページコンテンツ */}
            <main
              style={{
                padding: "2rem",
                flex: 1,
                overflowY: "auto",
                backgroundColor: "#f5f5f5",
              }}
            >
              <div style={{ minHeight: "100vh", backgroundColor: "#f5f6fa" }}>
                <div
                  style={{
                    maxWidth: "800px",
                    margin: "0 auto",
                    padding: "2rem 1rem",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "white",
                      padding: "2.5rem",
                      borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <h2
                      style={{
                        margin: "0 0 0.5rem 0",
                        fontSize: "1.75rem",
                        fontWeight: "700",
                        color: "#2c3e50",
                      }}
                    >
                      ✨ 新規投稿
                    </h2>
                    <p
                      style={{
                        marginTop: 0,
                        marginBottom: "2rem",
                        color: "#7f8c8d",
                      }}
                    >
                      あなたのお気に入りを共有しましょう
                    </p>

                    {/* エラー表示 */}
                    {error && (
                      <div
                        style={{
                          padding: "1rem",
                          backgroundColor: "#fadbd8",
                          color: "#c0392b",
                          borderRadius: "8px",
                          marginBottom: "1.5rem",
                          fontSize: "0.9375rem",
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
                          backgroundColor: "#d5f4e6",
                          color: "#27ae60",
                          borderRadius: "8px",
                          marginBottom: "1.5rem",
                          fontSize: "0.9375rem",
                        }}
                      >
                        ✅ {success}
                      </div>
                    )}

                    <form onSubmit={handleSubmit}>
                      {/* カテゴリタイプ */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          カテゴリタイプ{" "}
                          <span style={{ color: "#e74c3c" }}>*</span>
                        </label>
                        <select
                          name="type"
                          required
                          value={formData.type}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            backgroundColor: "white",
                            cursor: "pointer",
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
                            fontWeight: "600",
                            color: "#2c3e50",
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
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                          }}
                          placeholder="例：ワンピース、進撃の巨人、千と千尋の神隠し"
                        />
                      </div>

                      {/* アーティスト名 */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          アーティスト名・作者名
                        </label>
                        <input
                          type="text"
                          name="artist_name"
                          value={formData.artist_name}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                          }}
                          placeholder="例：米津玄師、尾田栄一郎、宮崎駿"
                        />
                      </div>

                      {/* タイトル */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          投稿タイトル{" "}
                          <span style={{ color: "#e74c3c" }}>*</span>
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
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                          }}
                          placeholder="例：感動の名作！何度見ても泣ける"
                        />
                      </div>

                      {/* 本文 */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          感想・レビュー{" "}
                          <span style={{ color: "#e74c3c" }}>*</span>
                        </label>
                        <textarea
                          name="body"
                          required
                          value={formData.body}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            minHeight: "200px",
                            padding: "0.75rem",
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            resize: "vertical",
                            fontFamily: "inherit",
                          }}
                          placeholder="作品の魅力、おすすめポイント、感想などを詳しく書いてください"
                        />
                      </div>

                      {/* 評価（星） */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.75rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          あなたの評価
                        </label>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRatingChange(star)}
                              style={{
                                fontSize: "2rem",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                opacity:
                                  formData.rating && formData.rating >= star
                                    ? 1
                                    : 0.3,
                                transition: "opacity 0.2s",
                              }}
                            >
                              ⭐
                            </button>
                          ))}
                          {formData.rating && (
                            <span
                              style={{
                                marginLeft: "0.5rem",
                                display: "flex",
                                alignItems: "center",
                                color: "#7f8c8d",
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
                            marginBottom: "0.75rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          おすすめ度
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.75rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {["必見", "おすすめ", "普通", "イマイチ"].map(
                            (level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    recommendation_level: level as
                                      | ""
                                      | "必見"
                                      | "おすすめ"
                                      | "普通"
                                      | "イマイチ"
                                      | undefined,
                                  }))
                                }
                                style={{
                                  padding: "0.5rem 1rem",
                                  border:
                                    formData.recommendation_level === level
                                      ? "2px solid #3498db"
                                      : "1px solid #e8eaed",
                                  borderRadius: "20px",
                                  backgroundColor:
                                    formData.recommendation_level === level
                                      ? "#e8f4fd"
                                      : "white",
                                  color:
                                    formData.recommendation_level === level
                                      ? "#1e40af"
                                      : "#5a6c7d",
                                  cursor: "pointer",
                                  fontWeight:
                                    formData.recommendation_level === level
                                      ? "600"
                                      : "400",
                                  fontSize: "0.9375rem",
                                }}
                              >
                                {level}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* ジャンル */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#2c3e50",
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
                            padding: "0.75rem",
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                          }}
                          placeholder="例：アクション、恋愛、コメディ、SF"
                        />
                      </div>

                      {/* リリース年 */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          リリース年
                        </label>
                        <input
                          type="number"
                          name="release_year"
                          value={formData.release_year || ""}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                          }}
                          placeholder="例：2024"
                          min="1900"
                          max="2100"
                        />
                      </div>

                      {/* タグ */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <label
                          style={{
                            display: "block",
                            marginBottom: "0.5rem",
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          タグ（最大10個）
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            marginBottom: "0.75rem",
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
                              border: "1px solid #e8eaed",
                              borderRadius: "6px",
                            }}
                            placeholder="例：感動、泣ける、バトル、恋愛"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            disabled={
                              !tagInput.trim() ||
                              (formData.tags?.length || 0) >= 10
                            }
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#3498db",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor:
                                tagInput.trim() &&
                                (formData.tags?.length || 0) < 10
                                  ? "pointer"
                                  : "not-allowed",
                              opacity:
                                tagInput.trim() &&
                                (formData.tags?.length || 0) < 10
                                  ? 1
                                  : 0.5,
                            }}
                          >
                            追加
                          </button>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "0.5rem",
                          }}
                        >
                          {formData.tags?.map((tag, index) => (
                            <span
                              key={index}
                              style={{
                                backgroundColor: "#ecf0f1",
                                padding: "0.25rem 0.75rem",
                                borderRadius: "9999px",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                color: "#2c3e50",
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
                                  color: "#7f8c8d",
                                  padding: 0,
                                  fontSize: "1.25rem",
                                  lineHeight: 1,
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
                            fontWeight: "600",
                            color: "#2c3e50",
                          }}
                        >
                          サブカテゴリ{" "}
                          <span style={{ color: "#e74c3c" }}>*</span>
                        </label>
                        <select
                          name="category_id"
                          required
                          value={formData.category_id}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            fontSize: "1rem",
                            backgroundColor: "white",
                            cursor: "pointer",
                          }}
                        >
                          <option value={0}>
                            サブカテゴリを選択してください
                          </option>
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
                            fontWeight: "600",
                            color: "#2c3e50",
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
                            border: "1px solid #e8eaed",
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
                            fontWeight: "600",
                            color: "#2c3e50",
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
                            border: "1px solid #e8eaed",
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
                            fontWeight: "600",
                            color: "#2c3e50",
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
                                  ? "2px solid #3498db"
                                  : "1px solid #e8eaed",
                              borderRadius: "6px",
                              backgroundColor:
                                formData.status === "draft"
                                  ? "#e8f4fd"
                                  : "white",
                              color:
                                formData.status === "draft"
                                  ? "#1e40af"
                                  : "#5a6c7d",
                              cursor: "pointer",
                              fontWeight:
                                formData.status === "draft" ? "600" : "400",
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
                                  ? "2px solid #27ae60"
                                  : "1px solid #e8eaed",
                              borderRadius: "6px",
                              backgroundColor:
                                formData.status === "published"
                                  ? "#d5f4e6"
                                  : "white",
                              color:
                                formData.status === "published"
                                  ? "#27ae60"
                                  : "#5a6c7d",
                              cursor: "pointer",
                              fontWeight:
                                formData.status === "published" ? "600" : "400",
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
                            border: "1px solid #e8eaed",
                            borderRadius: "6px",
                            backgroundColor: "white",
                            color: "#5a6c7d",
                            cursor: "pointer",
                            fontWeight: "500",
                          }}
                        >
                          ❌ キャンセル
                        </button>

                        <button
                          type="submit"
                          disabled={loading}
                          style={{
                            padding: "0.75rem 2rem",
                            backgroundColor: loading ? "#95a5a6" : "#3498db",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "600",
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
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContentPage;
