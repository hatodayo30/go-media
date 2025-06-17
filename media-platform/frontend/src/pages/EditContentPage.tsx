import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface Content {
  id: number;
  title: string;
  content?: string;
  body?: string;
  status: string;
  category_id: number;
  author_id: number;
}

const EditContentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    if (id) {
      fetchContentAndCategories();
    }
  }, [id]);

  const fetchContentAndCategories = async () => {
    try {
      setLoading(true);
      console.log(`📄 コンテンツ ${id} と カテゴリを取得中...`);

      const [contentRes, categoriesRes] = await Promise.all([
        api.getContentById(id!),
        api.getCategories(),
      ]);

      console.log("📥 コンテンツレスポンス:", contentRes);
      console.log("📥 カテゴリレスポンス:", categoriesRes);

      const contentData =
        contentRes.data?.content || contentRes.content || contentRes;
      const categoriesData =
        categoriesRes.data?.categories ||
        categoriesRes.categories ||
        categoriesRes ||
        [];

      setOriginalContent(contentData);
      setCategories(categoriesData);

      // フォームにデータを設定
      setFormData({
        title: contentData.title || "",
        body: contentData.content || contentData.body || "",
        category_id: contentData.category_id?.toString() || "",
        status: contentData.status || "draft",
      });
    } catch (err: any) {
      console.error("❌ データ取得エラー:", err);
      if (err.response?.status === 404) {
        setError("記事が見つかりませんでした");
      } else if (err.response?.status === 403) {
        setError("この記事を編集する権限がありません");
      } else {
        setError("データの取得に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();

    // バリデーション
    if (!formData.title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    if (!formData.body.trim()) {
      setError("本文を入力してください");
      return;
    }

    if (!formData.category_id) {
      setError("カテゴリを選択してください");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const submitData = {
        title: formData.title.trim(),
        content: formData.body.trim(),
        category_id: parseInt(formData.category_id),
        status: isDraft ? "draft" : "published",
      };

      console.log("💾 コンテンツを更新中...", submitData);

      const response = await api.updateContent(id!, submitData);
      console.log("✅ 更新レスポンス:", response);

      alert(isDraft ? "下書きを保存しました！" : "コンテンツを公開しました！");
      navigate("/my-posts");
    } catch (err: any) {
      console.error("❌ 保存エラー:", err);

      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 403) {
        setError("この記事を編集する権限がありません");
      } else {
        setError("保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  if (error && !originalContent) {
    return (
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "2rem",
          textAlign: "center",
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
          <Link
            to="/my-posts"
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
            マイ投稿に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "800px",
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
          ✏️ 記事編集
        </h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link
            to={`/contents/${id}`}
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
            記事を表示
          </Link>
          <Link
            to="/my-posts"
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#8b5cf6",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            マイ投稿に戻る
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

      {/* フォーム */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "2rem",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <form onSubmit={(e) => handleSubmit(e, false)}>
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
              }}
              placeholder="記事のタイトルを入力してください"
            />
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
              }}
            >
              <option value="">カテゴリを選択してください</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
              }}
              placeholder="記事の本文を入力してください..."
            />
          </div>

          {/* ステータス表示 */}
          <div
            style={{
              marginBottom: "2rem",
              padding: "1rem",
              backgroundColor: "#f9fafb",
              borderRadius: "6px",
              border: "1px solid #e5e7eb",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1rem",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              現在のステータス
            </h3>
            <span
              style={{
                backgroundColor:
                  originalContent?.status === "published"
                    ? "#dcfce7"
                    : "#fef3c7",
                color:
                  originalContent?.status === "published"
                    ? "#15803d"
                    : "#92400e",
                padding: "0.25rem 0.75rem",
                borderRadius: "9999px",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              {originalContent?.status === "published"
                ? "🚀 公開中"
                : "📝 下書き"}
            </span>
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
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "#f59e0b",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "保存中..." : "📝 下書き保存"}
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "0.75rem 2rem",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "1rem",
                fontWeight: "500",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "公開中..." : "🚀 公開する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContentPage;
