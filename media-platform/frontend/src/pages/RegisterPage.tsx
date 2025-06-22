import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { RegisterRequest, AuthResponse } from "../types";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<
    RegisterRequest & { confirmPassword: string }
  >({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // useCallbackで認証状態チェックをメモ化
  const checkIfAlreadyLoggedIn = useCallback(() => {
    const token = localStorage.getItem("token");
    if (token) {
      console.log("✅ 既にログイン済み、ダッシュボードへリダイレクト");
      navigate("/dashboard");
    }
  }, [navigate]);

  // useCallbackでフォーム変更をメモ化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  // useCallbackでバリデーション関数をメモ化
  const validateForm = useCallback(() => {
    if (!formData.username.trim()) {
      setError("ユーザー名を入力してください");
      return false;
    }

    if (formData.username.length < 2) {
      setError("ユーザー名は2文字以上で入力してください");
      return false;
    }

    if (formData.username.length > 50) {
      setError("ユーザー名は50文字以下で入力してください");
      return false;
    }

    if (!formData.email.trim()) {
      setError("メールアドレスを入力してください");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("有効なメールアドレスを入力してください");
      return false;
    }

    if (!formData.password) {
      setError("パスワードを入力してください");
      return false;
    }

    if (formData.password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return false;
    }

    if (formData.password.length > 100) {
      setError("パスワードは100文字以下で入力してください");
      return false;
    }

    if (!formData.confirmPassword) {
      setError("パスワード確認を入力してください");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("パスワードが一致しません");
      return false;
    }

    if (formData.bio && formData.bio.length > 500) {
      setError("自己紹介は500文字以下で入力してください");
      return false;
    }

    return true;
  }, [formData]);

  // useCallbackで登録処理をメモ化
  const handleRegister = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("📝 新規登録開始:", {
        username: formData.username,
        email: formData.email,
        bio: formData.bio ? "あり" : "なし",
      });

      const registerData: RegisterRequest = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        bio: formData.bio?.trim() || undefined,
      };

      const response: AuthResponse = await api.register(registerData);
      console.log("📥 登録レスポンス（完全）:", response);

      // レスポンス構造の詳細確認
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
        console.log("✅ 登録成功");
        alert("🎉 登録が完了しました！ログインページに移動します。");
        navigate("/login");
      } else {
        // 登録は成功したが、自動ログインに失敗した場合
        console.log("⚠️ 登録成功、但し自動ログインなし");
        alert("🎉 登録が完了しました！ログインページに移動します。");
        navigate("/login");
      }
    } catch (err: any) {
      console.error("❌ 登録エラー:", err);

      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        console.error("📥 エラーレスポンス詳細:", {
          status,
          statusText: err.response.statusText,
          data,
        });

        if (status === 409) {
          setError("このメールアドレスまたはユーザー名は既に登録されています");
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
        setError(err.message || "登録に失敗しました");
      }
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, navigate]);

  // useCallbackでフォーム送信をメモ化
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleRegister();
    },
    [handleRegister]
  );

  // useCallbackでパスワード表示切り替えをメモ化
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  // useCallbackでフォームクリアをメモ化
  const handleClearForm = useCallback(() => {
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      bio: "",
    });
    setError("");
  }, []);

  // useCallbackでテストユーザー作成をメモ化
  const handleCreateTestUser = useCallback(() => {
    const timestamp = Date.now();
    setFormData({
      username: `testuser${timestamp}`,
      email: `test${timestamp}@example.com`,
      password: "test123",
      confirmPassword: "test123",
      bio: "これはテストユーザーです。",
    });
    setError("");
  }, []);
  // useCallbackでパスワード強度判定をメモ化
  const getPasswordStrength = useCallback((password: string) => {
    if (password.length === 0) return { level: 0, text: "", color: "#6b7280" };
    if (password.length < 6)
      return { level: 1, text: "弱い", color: "#ef4444" };
    if (password.length < 8)
      return { level: 2, text: "普通", color: "#f59e0b" };
    if (
      password.length >= 8 &&
      /[A-Za-z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return { level: 3, text: "強い", color: "#10b981" };
    }
    return { level: 2, text: "普通", color: "#f59e0b" };
  }, []);

  // useMemoでフォーム状態をメモ化
  const formState = useMemo(() => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const isPasswordLongEnough = formData.password.length >= 6;
    const doPasswordsMatch =
      formData.password === formData.confirmPassword &&
      formData.confirmPassword !== "";

    return {
      isValidEmail,
      isPasswordLongEnough,
      doPasswordsMatch,
      isUsernameValid: formData.username.trim().length >= 2,
      isFormValid:
        formData.username.trim() !== "" &&
        formData.email.trim() !== "" &&
        formData.password !== "" &&
        formData.confirmPassword !== "" &&
        isValidEmail &&
        isPasswordLongEnough &&
        doPasswordsMatch,
      hasData: Object.values(formData).some((value) => value !== ""),
      usernameLength: formData.username.length,
      bioLength: formData.bio?.length || 0,
      passwordStrength: getPasswordStrength(formData.password),
    };
  }, [formData, getPasswordStrength]); // getPasswordStrengthを依存配列に追加

  // useMemoでUI状態をメモ化
  const uiState = useMemo(
    () => ({
      canSubmit: formState.isFormValid && !loading,
      showClearButton: formState.hasData && !loading,
      buttonText: loading ? "登録中..." : "✨ 新規登録",
      buttonStyle: {
        width: "100%",
        backgroundColor: loading ? "#6b7280" : "#3b82f6",
        color: "white",
        padding: "0.75rem",
        border: "none",
        borderRadius: "6px",
        fontSize: "1rem",
        cursor: loading || !formState.isFormValid ? "not-allowed" : "pointer",
        opacity: loading || !formState.isFormValid ? 0.6 : 1,
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
          maxWidth: "450px",
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
            ✨ 新規登録
          </h2>
          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            アカウントを作成してサービスを利用開始
          </p>
        </div>

        {/* テスト用機能 */}
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
            <strong style={{ color: "#0369a1" }}>🧪 テスト用機能</strong>
            <button
              type="button"
              onClick={handleCreateTestUser}
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
              テストユーザー作成
            </button>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#0369a1" }}>
            自動でテストデータを入力します
          </div>
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
              👤 ユーザー名 *
            </label>
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: `1px solid ${
                  !formState.isUsernameValid && formData.username
                    ? "#ef4444"
                    : "#d1d5db"
                }`,
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
                opacity: loading ? 0.6 : 1,
              }}
              placeholder="ユーザー名を入力（2文字以上）"
            />
            <div
              style={{
                fontSize: "0.75rem",
                color: formState.isUsernameValid ? "#10b981" : "#6b7280",
                marginTop: "0.25rem",
              }}
            >
              {formState.usernameLength}/50文字
              {formState.isUsernameValid && " ✅"}
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              📧 メールアドレス *
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: `1px solid ${
                  !formState.isValidEmail && formData.email
                    ? "#ef4444"
                    : "#d1d5db"
                }`,
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
                opacity: loading ? 0.6 : 1,
              }}
              placeholder="your@example.com"
            />
            {formData.email && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: formState.isValidEmail ? "#10b981" : "#ef4444",
                  marginTop: "0.25rem",
                }}
              >
                {formState.isValidEmail
                  ? "✅ 有効なメールアドレス"
                  : "❌ 無効なメールアドレス"}
              </div>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              🔑 パスワード *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  paddingRight: "3rem",
                  border: `1px solid ${
                    !formState.isPasswordLongEnough && formData.password
                      ? "#ef4444"
                      : "#d1d5db"
                  }`,
                  borderRadius: "6px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                  opacity: loading ? 0.6 : 1,
                }}
                placeholder="パスワードを入力（6文字以上）"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={loading}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {formData.password && (
              <div
                style={{
                  fontSize: "0.75rem",
                  marginTop: "0.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: formState.passwordStrength.color }}>
                  強度: {formState.passwordStrength.text}
                </span>
                <span style={{ color: "#6b7280" }}>
                  {formData.password.length}/100文字
                </span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#374151",
              }}
            >
              🔑 パスワード確認 *
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  paddingRight: "3rem",
                  border: `1px solid ${
                    !formState.doPasswordsMatch && formData.confirmPassword
                      ? "#ef4444"
                      : "#d1d5db"
                  }`,
                  borderRadius: "6px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                  opacity: loading ? 0.6 : 1,
                }}
                placeholder="パスワードを再入力"
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                disabled={loading}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {formData.confirmPassword && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: formState.doPasswordsMatch ? "#10b981" : "#ef4444",
                  marginTop: "0.25rem",
                }}
              >
                {formState.doPasswordsMatch
                  ? "✅ パスワードが一致しています"
                  : "❌ パスワードが一致しません"}
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
              📝 自己紹介
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "1rem",
                resize: "vertical",
                boxSizing: "border-box",
                opacity: loading ? 0.6 : 1,
              }}
              placeholder="簡単な自己紹介（任意）"
            />
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginTop: "0.25rem",
              }}
            >
              {formState.bioLength}/500文字
            </div>
          </div>

          {/* フォーム状態表示 */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              {formState.isFormValid ? "✅ 入力完了" : "📝 入力中..."}
            </span>
            {uiState.showClearButton && (
              <button
                type="button"
                onClick={handleClearForm}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#6b7280",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "0.75rem",
                  textDecoration: "underline",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                フォームをクリア
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
              to="/login"
              style={{
                color: "#3b82f6",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: "500",
              }}
            >
              🔑 すでにアカウントをお持ちの方はこちら
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
              フォーム状態: {formState.isFormValid ? "有効" : "無効"} | エラー:{" "}
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
          📝 アカウントを作成中...
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
