import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";

interface Category {
  id: number;
  name: string;
  description?: string;
}

const CreateContentPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    type: "article",
    category_id: 0,
    status: "draft" as "draft" | "published",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 認証チェック
      const token = localStorage.getItem("token");
      console.log("🔑 Token存在チェック:", !!token);
      if (!token) {
        navigate("/login");
        return;
      }

      console.log("📂 カテゴリ取得開始...");
      const categoriesRes = await api.getCategories();

      console.log("📂 カテゴリ取得結果:", categoriesRes);
      setCategories(
        categoriesRes.data?.categories ||
          categoriesRes.categories ||
          categoriesRes ||
          []
      );

      console.log("✅ 初期化完了");
      setPageLoading(false);
    } catch (error) {
      console.error("❌ カテゴリの取得に失敗しました:", error);
      setError("初期化に失敗しました");
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 フォーム送信開始");
    console.log("📝 フォームデータ:", formData);

    setError("");
    setSuccess("");
    setLoading(true);

    // バリデーション
    if (!formData.title.trim()) {
      console.log("❌ バリデーションエラー: タイトル未入力");
      setError("タイトルを入力してください");
      setLoading(false);
      return;
    }

    if (!formData.body.trim()) {
      console.log("❌ バリデーションエラー: 本文未入力");
      setError("本文を入力してください");
      setLoading(false);
      return;
    }

    if (!formData.category_id) {
      console.log("❌ バリデーションエラー: カテゴリ未選択");
      setError("カテゴリを選択してください");
      setLoading(false);
      return;
    }

    console.log("✅ バリデーション通過");

    try {
      console.log("🌐 API リクエスト送信開始");
      console.log("📤 送信データ:", JSON.stringify(formData, null, 2));

      const response = await api.createContent(formData);
      console.log("✅ API レスポンス受信:", response);

      setSuccess(
        formData.status === "published"
          ? "コンテンツが正常に公開されました！"
          : "コンテンツが下書きとして保存されました！"
      );

      console.log("🎉 作成成功、リダイレクト実行中...");
      // 3秒後にダッシュボードにリダイレクト
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("❌ コンテンツ作成エラー:", err);
      console.error("❌ エラー詳細:", {
        message: err.message,
        response: err.response,
        request: err.request,
        config: err.config,
      });

      // より詳細なエラーハンドリング
      if (err.response) {
        const statusCode = err.response.status;
        const errorData = err.response.data;

        console.log(`❌ HTTPエラー ${statusCode}:`, errorData);

        if (statusCode === 401) {
          setError("認証が切れています。再度ログインしてください。");
          setTimeout(() => navigate("/login"), 2000);
        } else if (statusCode === 400) {
          setError(errorData?.error || "リクエストデータが無効です");
        } else if (statusCode === 500) {
          setError(
            "サーバーエラーが発生しました。しばらく待ってから再度お試しください。"
          );
        } else {
          setError(errorData?.error || `エラーが発生しました (${statusCode})`);
        }
      } else if (err.request) {
        console.log("❌ ネットワークエラー:", err.request);
        setError(
          "サーバーに接続できません。ネットワーク接続を確認してください。"
        );
      } else {
        console.log("❌ その他のエラー:", err.message);
        setError("コンテンツの作成に失敗しました");
      }
    } finally {
      setLoading(false);
      console.log("🏁 処理完了");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    console.log(`📝 フィールド変更: ${name} = ${value}`);
    setFormData((prev) => ({
      ...prev,
      [name]: name === "category_id" ? parseInt(value) : value,
    }));
  };

  const handleStatusChange = (status: "draft" | "published") => {
    console.log("🔄 ステータス変更:", status);
    setFormData((prev) => ({
      ...prev,
      status,
    }));
  };

  if (pageLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>初期化中...</div>
      </div>
    );
  }

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
          <div>
            <Link
              to="/dashboard"
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                textDecoration: "none",
                color: "#1f2937",
              }}
            >
              メディアプラットフォーム
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              ログイン済みユーザー
            </span>
            <Link
              to="/dashboard"
              style={{
                backgroundColor: "#6b7280",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

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
            borderRadius: "8px",
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
        >
          <div style={{ marginBottom: "2rem" }}>
            <h1
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "2rem",
                fontWeight: "bold",
                color: "#1f2937",
              }}
            >
              新規コンテンツ作成
            </h1>
            <p style={{ margin: 0, color: "#6b7280" }}>
              新しい記事を作成してください
            </p>
          </div>

          {/* デバッグ情報表示 */}
          <div
            style={{
              backgroundColor: "#f3f4f6",
              padding: "1rem",
              borderRadius: "6px",
              marginBottom: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            <strong>🔍 デバッグ情報:</strong>
            <br />
            カテゴリ数: {categories.length}
            <br />
            現在のステータス: {formData.status}
            <br />
            タイトル: {formData.title || "(空)"}
            <br />
            カテゴリID: {formData.category_id || "(未選択)"}
          </div>

          <form onSubmit={handleSubmit}>
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
                {error}
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
                {success}
              </div>
            )}

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
                placeholder="魅力的なタイトルを入力してください"
              />
            </div>

            {/* カテゴリとタイプ */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <div>
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
                  }}
                >
                  <option value={0}>カテゴリを選択してください</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    color: "#374151",
                  }}
                >
                  コンテンツタイプ
                </label>
                <select
                  name="type"
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
                  <option value="article">記事</option>
                  <option value="tutorial">チュートリアル</option>
                  <option value="news">ニュース</option>
                  <option value="review">レビュー</option>
                </select>
              </div>
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
                本文 *
              </label>
              <textarea
                name="body"
                required
                rows={15}
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
                placeholder="ここに記事の内容を書いてください..."
              />
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                }}
              >
                文字数: {formData.body.length}
              </div>
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
                公開状態
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
                    fontSize: "0.875rem",
                    fontWeight: formData.status === "draft" ? "600" : "400",
                    transition: "all 0.2s ease-in-out",
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
                    fontSize: "0.875rem",
                    fontWeight: formData.status === "published" ? "600" : "400",
                    transition: "all 0.2s ease-in-out",
                  }}
                >
                  🌟 今すぐ公開
                </button>
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginTop: "0.5rem",
                }}
              >
                現在選択中:{" "}
                {formData.status === "published" ? "今すぐ公開" : "下書き保存"}
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
              <Link
                to="/dashboard"
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  textDecoration: "none",
                  color: "#374151",
                  backgroundColor: "white",
                }}
              >
                キャンセル
              </Link>

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "0.75rem 2rem",
                  backgroundColor: loading ? "#9ca3af" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {loading
                  ? "作成中..."
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
