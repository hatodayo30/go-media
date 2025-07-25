import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import { Category, CreateContentRequest, Content, ApiResponse } from "../types";

const CreateContentPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateContentRequest>({
    title: "",
    body: "",
    type: "article",
    category_id: 0,
    status: "draft",
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  // useCallbackで認証チェックをメモ化
  const checkAuthentication = useCallback(() => {
    const token = localStorage.getItem("token");
    console.log("🔑 Token存在チェック:", !!token);

    if (!token) {
      console.log("❌ 認証なし、ログインページへリダイレクト");
      navigate("/login");
      return false;
    }
    return true;
  }, [navigate]);

  // useCallbackでfetchCategoriesをメモ化
  const fetchCategories = useCallback(async () => {
    try {
      console.log("📂 カテゴリ取得開始...");
      const response: ApiResponse<Category[]> = await api.getCategories();

      if (response.success && response.data) {
        setCategories(response.data);
        console.log(`✅ カテゴリ取得成功: ${response.data.length}件`);
      } else {
        console.error("❌ カテゴリ取得失敗:", response.message);
        setError(response.message || "カテゴリの取得に失敗しました");
        setCategories([]);
      }
    } catch (error: any) {
      console.error("❌ カテゴリ取得エラー:", error);
      setError("カテゴリの取得に失敗しました");
      setCategories([]);
    }
  }, []);

  // useCallbackで初期化処理をメモ化
  const fetchInitialData = useCallback(async () => {
    try {
      setPageLoading(true);
      setError("");

      // 認証チェック
      if (!checkAuthentication()) {
        return;
      }

      // カテゴリ取得
      await fetchCategories();

      console.log("✅ 初期化完了");
    } catch (error: any) {
      console.error("❌ 初期化エラー:", error);
      setError("初期化に失敗しました");
    } finally {
      setPageLoading(false);
    }
  }, [checkAuthentication, fetchCategories]);

  // useCallbackでバリデーションをメモ化
  const validateForm = useCallback(() => {
    if (!formData.title.trim()) {
      console.log("❌ バリデーションエラー: タイトル未入力");
      setError("タイトルを入力してください");
      return false;
    }

    if (!formData.body.trim()) {
      console.log("❌ バリデーションエラー: 本文未入力");
      setError("本文を入力してください");
      return false;
    }

    if (!formData.category_id || formData.category_id === 0) {
      console.log("❌ バリデーションエラー: カテゴリ未選択");
      setError("カテゴリを選択してください");
      return false;
    }

    console.log("✅ バリデーション通過");
    return true;
  }, [formData.title, formData.body, formData.category_id]);

  // useCallbackでhandleSubmitをメモ化
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      console.log("🚀 フォーム送信開始");
      console.log("📝 フォームデータ:", formData);

      setError("");
      setSuccess("");
      setLoading(true);

      try {
        // バリデーション
        if (!validateForm()) {
          setLoading(false);
          return;
        }

        console.log("🌐 API リクエスト送信開始");
        console.log("📤 送信データ:", JSON.stringify(formData, null, 2));

        const response: ApiResponse<Content> = await api.createContent(
          formData
        );

        if (response.success && response.data) {
          console.log("✅ API レスポンス受信:", response);

          const successMessage =
            formData.status === "published"
              ? "コンテンツが正常に公開されました！"
              : "コンテンツが下書きとして保存されました！";

          setSuccess(successMessage);

          console.log("🎉 作成成功、リダイレクト実行中...");
          // 2秒後にダッシュボードにリダイレクト
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } else {
          throw new Error(response.message || "コンテンツの作成に失敗しました");
        }
      } catch (err: any) {
        console.error("❌ コンテンツ作成エラー:", err);

        let errorMessage = "コンテンツの作成に失敗しました";

        if (err.response) {
          const statusCode = err.response.status;
          const errorData = err.response.data;

          console.log(`❌ HTTPエラー ${statusCode}:`, errorData);

          switch (statusCode) {
            case 401:
              errorMessage = "認証が切れています。再度ログインしてください。";
              setTimeout(() => navigate("/login"), 2000);
              break;
            case 400:
              errorMessage =
                errorData?.message ||
                errorData?.error ||
                "リクエストデータが無効です";
              break;
            case 500:
              errorMessage =
                "サーバーエラーが発生しました。しばらく待ってから再度お試しください。";
              break;
            default:
              errorMessage =
                errorData?.message ||
                errorData?.error ||
                `エラーが発生しました (${statusCode})`;
          }
        } else if (err.request) {
          console.log("❌ ネットワークエラー:", err.request);
          errorMessage =
            "サーバーに接続できません。ネットワーク接続を確認してください。";
        } else {
          console.log("❌ その他のエラー:", err.message);
          errorMessage = err.message || errorMessage;
        }

        setError(errorMessage);
      } finally {
        setLoading(false);
        console.log("🏁 処理完了");
      }
    },
    [formData, validateForm, navigate]
  );

  // useCallbackでhandleChangeをメモ化
  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;
      console.log(`📝 フィールド変更: ${name} = ${value}`);

      setFormData((prev) => ({
        ...prev,
        [name]: name === "category_id" ? parseInt(value) || 0 : value,
      }));
    },
    []
  );

  // useCallbackでhandleStatusChangeをメモ化
  const handleStatusChange = useCallback((status: "draft" | "published") => {
    console.log("🔄 ステータス変更:", status);
    setFormData((prev) => ({
      ...prev,
      status,
    }));
  }, []);

  // useCallbackでhandleCancelをメモ化
  const handleCancel = useCallback(() => {
    if (formData.title || formData.body) {
      const confirmLeave = window.confirm(
        "入力内容が失われますが、よろしいですか？"
      );
      if (!confirmLeave) return;
    }
    navigate("/dashboard");
  }, [formData.title, formData.body, navigate]);

  // useMemoで計算値をメモ化
  const currentStatusText = useMemo(() => {
    return formData.status === "published" ? "今すぐ公開" : "下書き保存";
  }, [formData.status]);

  const submitButtonText = useMemo(() => {
    if (loading) return "作成中...";
    return formData.status === "published" ? "✨ 公開する" : "📝 下書き保存";
  }, [loading, formData.status]);

  const characterCount = useMemo(() => {
    return formData.body.length;
  }, [formData.body.length]);

  // useMemoでスタイルをメモ化
  const statusButtonStyle = useCallback(
    (isSelected: boolean, colorScheme: "blue" | "green") => {
      const colors = {
        blue: {
          border: isSelected ? "2px solid #3b82f6" : "1px solid #d1d5db",
          background: isSelected ? "#dbeafe" : "white",
          color: isSelected ? "#1d4ed8" : "#374151",
        },
        green: {
          border: isSelected ? "2px solid #059669" : "1px solid #d1d5db",
          background: isSelected ? "#dcfce7" : "white",
          color: isSelected ? "#166534" : "#374151",
        },
      };

      return {
        padding: "0.75rem 1.5rem",
        border: colors[colorScheme].border,
        borderRadius: "6px",
        backgroundColor: colors[colorScheme].background,
        color: colors[colorScheme].color,
        cursor: "pointer",
        fontSize: "0.875rem",
        fontWeight: isSelected ? "600" : "400",
        transition: "all 0.2s ease-in-out",
      };
    },
    []
  );

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
              📝 メディアプラットフォーム
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              新規作成
            </span>
            <button
              onClick={handleCancel}
              style={{
                backgroundColor: "#6b7280",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "none",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              ← ダッシュボードに戻る
            </button>
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
              ✍️ 新規コンテンツ作成
            </h1>
            <p style={{ margin: 0, color: "#6b7280" }}>
              新しい記事を作成してください
            </p>
          </div>

          {/* デバッグ情報表示（開発環境のみ） */}
          {process.env.NODE_ENV === "development" && (
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
              <br />
              本文文字数: {characterCount}
            </div>
          )}

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
                タイトル <span style={{ color: "#ef4444" }}>*</span>
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
                  カテゴリ <span style={{ color: "#ef4444" }}>*</span>
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
                  <option value="article">📄 記事</option>
                  <option value="tutorial">📚 チュートリアル</option>
                  <option value="news">📰 ニュース</option>
                  <option value="review">⭐ レビュー</option>
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
                本文 <span style={{ color: "#ef4444" }}>*</span>
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
                📊 文字数: {characterCount}
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
                  style={statusButtonStyle(formData.status === "draft", "blue")}
                >
                  📝 下書き保存
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("published")}
                  style={statusButtonStyle(
                    formData.status === "published",
                    "green"
                  )}
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
                現在選択中: {currentStatusText}
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
                  fontSize: "1rem",
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
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateContentPage;
