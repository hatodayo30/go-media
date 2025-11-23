import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { AuthResponse } from "../types";
import { useAuth } from "../contexts/AuthContext";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // useCallbackで認証状態チェックをメモ化
  const checkIfAlreadyLoggedIn = useCallback(() => {
    const token = localStorage.getItem("token");
    if (token) {
      console.log("✅ 既にログイン済み、ダッシュボードへリダイレクト");
      navigate("/dashboard");
    }
  }, [navigate]);

  // useCallbackでフォーム変更をメモ化
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // useCallbackでバリデーションをメモ化
  const validateForm = useCallback(() => {
    if (!formData.email.trim()) {
      setError("メールアドレスを入力してください");
      return false;
    }

    if (!formData.password.trim()) {
      setError("パスワードを入力してください");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("有効なメールアドレスを入力してください");
      return false;
    }

    if (formData.password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return false;
    }

    return true;
  }, [formData]);

  const handleLogin = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("🔐 ログイン開始:", {
        email: formData.email,
        password: "[HIDDEN]",
      });

      const response: AuthResponse = await api.login(
        formData.email,
        formData.password
      );
      console.log("📥 ログインレスポンス（完全）:", response);

      // バックエンドのレスポンス構造を確認
      console.log("🔍 レスポンス解析:", {
        responseType: typeof response,
        responseKeys: Object.keys(response),
        hasData: !!(response as any).data,
        hasToken: !!(response as any).token,
        hasUser: !!(response as any).user,
        dataType: (response as any).data
          ? typeof (response as any).data
          : "undefined",
        dataKeys: (response as any).data
          ? Object.keys((response as any).data)
          : null,
      });

      // レスポンス構造に応じて柔軟に処理
      let token: string | undefined;
      let user: any;

      // パターン1: 直接tokenとuserがある場合
      if ((response as any).token && (response as any).user) {
        token = (response as any).token;
        user = (response as any).user;
      }
      // パターン2: dataの中にtokenとuserがある場合
      else if (
        (response as any).data &&
        typeof (response as any).data === "object"
      ) {
        const data = (response as any).data;
        token = data.token;
        user = data.user;
      }
      // パターン3: ネストしたdata構造の場合
      else if ((response as any).data?.data) {
        const nestedData = (response as any).data.data;
        token = nestedData.token;
        user = nestedData.user;
      }

      console.log("🔍 抽出結果:", {
        hasToken: !!token,
        hasUser: !!user,
        tokenLength: token?.length,
        userKeys: user ? Object.keys(user) : null,
      });

      if (token && user) {
        // ✅ 修正: AuthContext の login を呼ぶ
        authLogin(token, user);

        console.log("💾 認証情報保存完了:", {
          userId: user.id,
          username: user.username,
          role: user.role,
        });

        console.log("✅ ログイン成功 - ダッシュボードへリダイレクト");
        navigate("/dashboard");
      } else {
        console.error("❌ 認証情報が見つかりません");
        throw new Error("認証レスポンスが不正です");
      }
    } catch (err: any) {
      console.error("❌ ログインエラー:", err);

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        console.error("📥 エラーレスポンス詳細:", {
          status,
          statusText: err.response.statusText,
          data,
        });

        if (status === 401) {
          setError("メールアドレスまたはパスワードが間違っています");
        } else if (status === 422) {
          setError(data?.message || "入力内容に不備があります");
        } else if (status >= 500) {
          setError("サーバーエラーが発生しました。しばらく後でお試しください");
        } else {
          setError(data?.message || data?.error || `エラー: ${status}`);
        }
      } else if (err.request) {
        console.error("🌐 ネットワークエラー:", err.request);
        setError(
          "サーバーに接続できません。ネットワーク接続を確認してください"
        );
      } else {
        console.error("❓ その他のエラー:", err.message);
        setError(err.message || "ログインに失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }, [formData, navigate, validateForm, authLogin]);

  // useCallbackでフォーム送信をメモ化
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleLogin();
    },
    [handleLogin]
  );

  // useCallbackでテストログインをメモ化
  const handleTestLogin = useCallback(() => {
    setFormData({
      email: "test@example.com",
      password: "test123",
    });
    setError("");
  }, []);

  // useCallbackでクリアをメモ化
  const handleClear = useCallback(() => {
    setFormData({
      email: "",
      password: "",
    });
    setError("");
  }, []);

  // useMemoでフォーム状態をメモ化
  const formState = useMemo(
    () => ({
      isValid: formData.email.trim() !== "" && formData.password.trim() !== "",
      hasData: formData.email !== "" || formData.password !== "",
      emailError:
        formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      passwordError: formData.password && formData.password.length < 6,
    }),
    [formData]
  );

  // useMemoでUI状態をメモ化
  const uiState = useMemo(
    () => ({
      canSubmit: formState.isValid && !loading,
      showClearButton: formState.hasData && !loading,
      buttonText: loading ? "ログイン中..." : "ログイン",
      buttonStyle: {
        width: "100%",
        backgroundColor: loading ? "#6b7280" : "#3b82f6",
        color: "white",
        padding: "0.75rem",
        border: "none",
        borderRadius: "6px",
        fontSize: "1rem",
        cursor: loading || !formState.isValid ? "not-allowed" : "pointer",
        opacity: loading || !formState.isValid ? 0.6 : 1,
        transition: "all 0.2s",
      },
    }),
    [formState, loading]
  );

  // 初期化時の認証チェック
  useEffect(() => {
    checkIfAlreadyLoggedIn();
  }, [checkIfAlreadyLoggedIn]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {/* ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              margin: "0 0 0.5rem 0",
              color: "#374151",
            }}
          >
            🔐 ログイン
          </h2>
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            アカウントにログインしてください
          </p>
        </div>

        {/* テスト用アカウント情報 */}
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            backgroundColor: "#f0f9ff",
            borderRadius: "6px",
            fontSize: "0.875rem",
            border: "1px solid #e0f2fe",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <strong style={{ color: "#0369a1" }}>🧪 テスト用アカウント</strong>
            <button
              type="button"
              onClick={handleTestLogin}
              disabled={loading}
              style={{
                padding: "0.25rem 0.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.75rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              自動入力
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#0369a1" }}>
            📧 Email: test@example.com
            <br />
            🔑 Password: test123
          </div>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#dc2626",
                padding: "0.75rem",
                borderRadius: "6px",
                marginBottom: "1rem",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              📧 メールアドレス
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: `1px solid ${
                  formState.emailError ? "#ef4444" : "#d1d5db"
                }`,
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              placeholder="your@example.com"
              disabled={loading}
            />
            {formState.emailError && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#ef4444",
                  marginTop: "0.25rem",
                }}
              >
                有効なメールアドレスを入力してください
              </div>
            )}
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
              🔑 パスワード
            </label>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: `1px solid ${
                  formState.passwordError ? "#ef4444" : "#d1d5db"
                }`,
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
              placeholder="パスワード（6文字以上）"
              disabled={loading}
            />
            {formState.passwordError && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#ef4444",
                  marginTop: "0.25rem",
                }}
              >
                パスワードは6文字以上で入力してください
              </div>
            )}
          </div>

          {/* フォーム統計 */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{formState.isValid ? "✅ 入力完了" : "📝 入力中..."}</span>
            {uiState.showClearButton && (
              <button
                type="button"
                onClick={handleClear}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.75rem",
                  textDecoration: "underline",
                }}
              >
                クリア
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!uiState.canSubmit}
            style={uiState.buttonStyle}
          >
            {uiState.buttonText}
          </button>

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link
              to="/register"
              style={{
                color: "#3b82f6",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              ✨ アカウントをお持ちでない方はこちら
            </Link>
          </div>
        </form>

        {/* デバッグ情報 */}
        {process.env.NODE_ENV === "development" && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              backgroundColor: "#f0fdf4",
              borderRadius: "6px",
              fontSize: "0.75rem",
              border: "1px solid #dcfce7",
            }}
          >
            <strong style={{ color: "#15803d" }}>🔍 開発モード</strong>
            <br />
            <span style={{ color: "#16a34a" }}>
              フォーム状態: {formState.isValid ? "有効" : "無効"} | エラー:{" "}
              {error ? "あり" : "なし"} | ローディング:{" "}
              {loading ? "中" : "なし"}
            </span>
          </div>
        )}
      </div>

      {/* ローディング表示 */}
      {loading && (
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
          🔐 ログイン中...
        </div>
      )}
    </div>
  );
};

export default LoginPage;
