import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { User, ApiResponse, UpdateUserRequest } from "../types";
import Sidebar from "../components/Sidebar";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState<UpdateUserRequest>({
    username: "",
    email: "",
    bio: "",
  });

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

  // useCallbackでfetchUserProfileをメモ化
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // 認証チェック
      if (!checkAuthentication()) {
        return;
      }

      console.log("👤 ユーザープロフィールを取得中...");

      const response: ApiResponse<User> = await api.getCurrentUser();
      console.log("📥 プロフィールレスポンス:", response);

      if (response.success && response.data) {
        setUser(response.data);
        setFormData({
          username: response.data.username || "",
          email: response.data.email || "",
          bio: response.data.bio || "",
        });
        console.log("✅ プロフィール取得成功:", {
          id: response.data.id,
          username: response.data.username,
          role: response.data.role,
        });
      } else {
        throw new Error(response.message || "プロフィールの取得に失敗しました");
      }
    } catch (err: any) {
      console.error("❌ プロフィール取得エラー:", err);

      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      setError(err.message || "プロフィールの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [checkAuthentication, navigate]);

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

  // useCallbackでバリデーションをメモ化
  const validateForm = useCallback(() => {
    if (!formData.username?.trim()) {
      setError("ユーザー名を入力してください");
      return false;
    }

    if (!formData.email?.trim()) {
      setError("メールアドレスを入力してください");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("有効なメールアドレスを入力してください");
      return false;
    }

    return true;
  }, [formData]);

  // useCallbackで保存処理をメモ化
  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      console.log("💾 プロフィールを更新中...", formData);

      const response: ApiResponse<User> = await api.updateUser(formData);

      if (response.success && response.data) {
        setUser(response.data);
        setFormData({
          username: response.data.username || "",
          email: response.data.email || "",
          bio: response.data.bio || "",
        });
        setEditing(false);
        setSuccess("✅ プロフィールを更新しました");
        console.log("✅ 更新成功:", response.data);

        // ローカルストレージのユーザー情報も更新
        const existingUser = localStorage.getItem("user");
        if (existingUser) {
          const parsedUser = JSON.parse(existingUser);
          localStorage.setItem(
            "user",
            JSON.stringify({ ...parsedUser, ...response.data })
          );
        }

        // 成功メッセージを3秒後に消す
        setTimeout(() => {
          setSuccess("");
        }, 3000);
      } else {
        throw new Error(response.message || "プロフィールの更新に失敗しました");
      }
    } catch (err: any) {
      console.error("❌ 更新エラー:", err);
      setError(err.message || "プロフィールの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [formData, validateForm]);

  // useCallbackで編集キャンセルをメモ化
  const handleCancel = useCallback(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        bio: user.bio || "",
      });
    }
    setEditing(false);
    setError("");
  }, [user]);

  // useCallbackでダッシュボード遷移をメモ化
  const handleBackToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // useCallbackでログアウトをメモ化
  const handleLogout = useCallback(() => {
    console.log("🚪 ログアウト処理開始");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  // useMemoでユーザー統計を計算
  const userStats = useMemo(() => {
    if (!user) return null;

    const createdAt = new Date(user.created_at);
    const updatedAt = new Date(user.updated_at);
    const now = new Date();

    const daysSinceJoined = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const hoursSinceUpdate = Math.floor(
      (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
    );

    return {
      daysSinceJoined,
      isRecentlyUpdated: hoursSinceUpdate < 24,
    };
  }, [user]);

  // useMemoでフォーム変更検知をメモ化
  const hasChanges = useMemo(() => {
    if (!user) return false;

    return (
      formData.username !== user.username ||
      formData.email !== user.email ||
      (formData.bio || "") !== (user.bio || "")
    );
  }, [formData, user]);

  // useMemoで入力フィールドスタイルをメモ化
  const inputStyle = useMemo(
    () => ({
      width: "100%",
      padding: "0.75rem 1rem",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      fontSize: "0.875rem",
      boxSizing: "border-box" as const,
      backgroundColor: editing ? "white" : "#f9fafb",
      cursor: editing ? "text" : "not-allowed",
    }),
    [editing]
  );

  // useMemoでテキストエリアスタイルをメモ化
  const textareaStyle = useMemo(
    () => ({
      ...inputStyle,
      minHeight: "120px",
      resize: "vertical" as const,
      fontFamily: "inherit",
    }),
    [inputStyle]
  );

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  // ローディング状態
  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
            <p style={{ fontSize: "1.125rem", color: "#6b7280" }}>
              読み込み中...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error && !user) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
            <p
              style={{
                fontSize: "1.125rem",
                color: "#ef4444",
                marginBottom: "1rem",
              }}
            >
              {error}
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "500",
              }}
            >
              ログインページへ
            </button>
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
                👤 プロフィール
              </h1>
              {userStats && (
                <p
                  style={{
                    margin: 0,
                    color: "#6b7280",
                    fontSize: "0.875rem",
                  }}
                >
                  登録から{userStats.daysSinceJoined}日経過
                  {userStats.isRecentlyUpdated && " • 最近更新されました"}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleBackToDashboard}
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
                ← ダッシュボード
              </button>
            </div>
          </div>

          {/* ユーザー統計 */}
          {userStats && (
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
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#3b82f6",
                    }}
                  >
                    {userStats.daysSinceJoined}
                  </div>
                  <div>📅 登録日数</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#10b981",
                    }}
                  >
                    {user?.role === "admin" ? "管理者" : "ユーザー"}
                  </div>
                  <div>🎭 ロール</div>
                </div>
              </div>
            </div>
          )}

          {/* 成功メッセージ */}
          {success && (
            <div
              style={{
                backgroundColor: "#d1fae5",
                border: "1px solid #10b981",
                color: "#047857",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.875rem",
              }}
            >
              {success}
            </div>
          )}

          {/* エラーメッセージ */}
          {error && user && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                border: "1px solid #ef4444",
                color: "#dc2626",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.875rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* プロフィール情報 */}
          <div
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* 編集/保存ボタン */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "600",
                  margin: 0,
                  color: "#1f2937",
                }}
              >
                基本情報
              </h2>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {editing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#f3f4f6",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        cursor: saving ? "not-allowed" : "pointer",
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      style={{
                        padding: "0.5rem 1rem",
                        backgroundColor:
                          saving || !hasChanges ? "#9ca3af" : "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        cursor:
                          saving || !hasChanges ? "not-allowed" : "pointer",
                      }}
                    >
                      {saving ? "保存中..." : "💾 保存"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                    }}
                  >
                    ✏️ 編集
                  </button>
                )}
              </div>
            </div>

            {/* フォーム */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* ユーザー名 */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  ユーザー名
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={!editing}
                  style={inputStyle}
                  placeholder="ユーザー名を入力"
                />
              </div>

              {/* メールアドレス */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  メールアドレス
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!editing}
                  style={inputStyle}
                  placeholder="email@example.com"
                />
              </div>

              {/* 自己紹介 */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "0.5rem",
                  }}
                >
                  自己紹介
                </label>
                <textarea
                  name="bio"
                  value={formData.bio || ""}
                  onChange={handleChange}
                  disabled={!editing}
                  style={textareaStyle}
                  placeholder="自己紹介を入力してください..."
                />
              </div>

              {/* アカウント情報 */}
              <div
                style={{
                  paddingTop: "1.5rem",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#6b7280",
                    marginBottom: "0.75rem",
                  }}
                >
                  アカウント情報
                </h3>
                <div style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                  <p style={{ margin: "0.25rem 0" }}>
                    登録日:{" "}
                    {user?.created_at &&
                      new Date(user.created_at).toLocaleDateString("ja-JP")}
                  </p>
                  <p style={{ margin: "0.25rem 0" }}>
                    最終更新:{" "}
                    {user?.updated_at &&
                      new Date(user.updated_at).toLocaleDateString("ja-JP")}
                  </p>
                  <p style={{ margin: "0.25rem 0" }}>ユーザーID: {user?.id}</p>
                </div>
              </div>
            </div>
          </div>

          {/* その他のアクション */}
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleLogout}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              🚪 ログアウト
            </button>
          </div>
        </div>
      </div>

      {/* 保存中のオーバーレイ */}
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
          💾 プロフィールを保存中...
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
