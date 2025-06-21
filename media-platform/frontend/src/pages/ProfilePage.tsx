import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import type { User, ApiResponse, UpdateUserRequest } from "../types";

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

    if (formData.username.length < 2) {
      setError("ユーザー名は2文字以上で入力してください");
      return false;
    }

    if (formData.username.length > 50) {
      setError("ユーザー名は50文字以下で入力してください");
      return false;
    }

    if (formData.bio && formData.bio.length > 500) {
      setError("自己紹介は500文字以下で入力してください");
      return false;
    }

    return true;
  }, [formData]);

  // useCallbackでhandleSubmitをメモ化
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        console.log("💾 プロフィールを更新中...", formData);

        const updateData: UpdateUserRequest = {
          username: formData.username?.trim(),
          email: formData.email?.trim(),
          bio: formData.bio?.trim() || undefined,
        };

        const response: ApiResponse<User> = await api.updateUser(updateData);

        if (response.success && response.data) {
          console.log("✅ プロフィール更新完了");
          setUser(response.data);
          setEditing(false);
          setSuccess("プロフィールを更新しました");

          // ローカルストレージのユーザー情報も更新
          localStorage.setItem("user", JSON.stringify(response.data));
        } else {
          throw new Error(
            response.message || "プロフィールの更新に失敗しました"
          );
        }
      } catch (err: any) {
        console.error("❌ プロフィール更新エラー:", err);

        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (err.response?.status === 422) {
          setError(err.response.data?.message || "入力内容に不備があります");
        } else {
          setError(err.message || "プロフィールの更新に失敗しました");
        }
      } finally {
        setSaving(false);
      }
    },
    [formData, validateForm, navigate]
  );

  // useCallbackでhandleEditStartをメモ化
  const handleEditStart = useCallback(() => {
    setEditing(true);
    setError("");
    setSuccess("");
  }, []);

  // useCallbackでhandleCancelEditをメモ化
  const handleCancelEdit = useCallback(() => {
    if (user) {
      setEditing(false);
      setFormData({
        username: user.username || "",
        email: user.email || "",
        bio: user.bio || "",
      });
      setError("");
      setSuccess("");
    }
  }, [user]);

  // useCallbackでhandleBackToDashboardをメモ化
  const handleBackToDashboard = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  // useCallbackでformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // useCallbackでgetRoleDisplayをメモ化
  const getRoleDisplay = useCallback((role: string) => {
    switch (role) {
      case "admin":
        return { text: "👑 管理者", color: "#dc2626", bg: "#fee2e2" };
      case "editor":
        return { text: "✏️ 編集者", color: "#059669", bg: "#d1fae5" };
      case "user":
        return { text: "👤 ユーザー", color: "#3b82f6", bg: "#dbeafe" };
      default:
        return { text: role, color: "#6b7280", bg: "#f3f4f6" };
    }
  }, []);

  // useCallbackでカードマウスイベントをメモ化
  const handleCardMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
    },
    []
  );

  const handleCardMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
    },
    []
  );

  // useMemoでフォーム状態をメモ化
  const formState = useMemo(
    () => ({
      isValid:
        formData.username?.trim() !== "" &&
        formData.email?.trim() !== "" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email || ""),
      hasChanges: user
        ? formData.username !== user.username ||
          formData.email !== user.email ||
          formData.bio !== (user.bio || "")
        : false,
      usernameLength: formData.username?.length || 0,
      bioLength: formData.bio?.length || 0,
    }),
    [formData, user]
  );

  // useMemoでユーザー統計をメモ化
  const userStats = useMemo(() => {
    if (!user) return null;

    const createdDate = new Date(user.created_at);
    const updatedDate = new Date(user.updated_at);
    const daysSinceJoined = Math.floor(
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isRecentlyUpdated =
      Date.now() - updatedDate.getTime() < 1000 * 60 * 60 * 24; // 24時間以内

    return {
      daysSinceJoined,
      isRecentlyUpdated,
      hasAvatar: !!user.avatar,
      hasBio: !!user.bio?.trim(),
    };
  }, [user]);

  // useMemoでアクションカードをメモ化
  const actionCards = useMemo(
    () => [
      {
        to: "/dashboard",
        icon: "📊",
        title: "ダッシュボード",
        description: "アクティビティを確認",
        color: "#3b82f6",
      },
      {
        to: "/my-posts",
        icon: "📄",
        title: "マイ投稿",
        description: "投稿した記事を管理",
        color: "#10b981",
      },
      {
        to: "/create",
        icon: "✏️",
        title: "新規投稿",
        description: "新しい記事を作成",
        color: "#f59e0b",
      },
    ],
    []
  );

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

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
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>👤</div>
          <div>プロフィールを読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!user) {
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
          <h2 style={{ marginBottom: "1rem", color: "#374151" }}>
            ユーザー情報を取得できませんでした
          </h2>
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

  const roleInfo = getRoleDisplay(user.role);

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
                  color: userStats.hasBio ? "#10b981" : "#6b7280",
                }}
              >
                {userStats.hasBio ? "✅" : "❌"}
              </div>
              <div>📝 自己紹介</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: roleInfo.color,
                }}
              >
                {roleInfo.text.split(" ")[0]}
              </div>
              <div>👤 ロール</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: userStats.isRecentlyUpdated ? "#f59e0b" : "#6b7280",
                }}
              >
                {userStats.isRecentlyUpdated ? "🔄" : "💤"}
              </div>
              <div>🕒 最近の活動</div>
            </div>
          </div>
        </div>
      )}

      {/* メッセージ表示 */}
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

      {success && (
        <div
          style={{
            backgroundColor: "#d1fae5",
            border: "1px solid #6ee7b7",
            color: "#059669",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1rem",
          }}
        >
          ✅ {success}
        </div>
      )}

      {/* プロフィール表示・編集 */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
          marginBottom: "2rem",
        }}
      >
        {/* プロフィールヘッダー */}
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "2rem",
            color: "white",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: "2.5rem",
              border: "3px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              "👤"
            )}
          </div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.8rem" }}>
            {user.username}
          </h2>
          <div
            style={{ fontSize: "0.9rem", marginBottom: "1rem", opacity: 0.9 }}
          >
            {user.email}
          </div>
          <div
            style={{
              display: "inline-block",
              backgroundColor: roleInfo.bg,
              color: roleInfo.color,
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            {roleInfo.text}
          </div>
        </div>

        {/* プロフィール内容 */}
        <div style={{ padding: "2rem" }}>
          {!editing ? (
            // 表示モード
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#374151",
                  }}
                >
                  📋 基本情報
                </h3>

                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      👤 ユーザー名
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {user.username}
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      📧 メールアドレス
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {user.email}
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      📝 自己紹介
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                        minHeight: "4rem",
                        whiteSpace: "pre-wrap",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {user.bio || "自己紹介が設定されていません"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    marginBottom: "1rem",
                    color: "#374151",
                  }}
                >
                  🔍 アカウント情報
                </h3>

                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      📅 登録日
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {formatDate(user.created_at)}
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "#6b7280",
                        marginBottom: "0.25rem",
                      }}
                    >
                      🔄 最終更新
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {formatDate(user.updated_at)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                <button
                  onClick={handleEditStart}
                  style={{
                    padding: "0.75rem 2rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#2563eb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#3b82f6";
                  }}
                >
                  ✏️ プロフィールを編集
                </button>
              </div>
            </div>
          ) : (
            // 編集モード
            <form onSubmit={handleSubmit}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "1.5rem",
                  color: "#374151",
                }}
              >
                ✏️ プロフィール編集
              </h3>

              <div
                style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}
              >
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
                    👤 ユーザー名 *
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username || ""}
                    onChange={handleChange}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      opacity: saving ? 0.6 : 1,
                    }}
                    placeholder="ユーザー名を入力"
                  />
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.25rem",
                    }}
                  >
                    {formState.usernameLength}/50文字
                  </div>
                </div>

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
                    📧 メールアドレス *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email || ""}
                    onChange={handleChange}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "1rem",
                      boxSizing: "border-box",
                      opacity: saving ? 0.6 : 1,
                    }}
                    placeholder="メールアドレスを入力"
                  />
                </div>

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
                    📝 自己紹介
                  </label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={formData.bio || ""}
                    onChange={handleChange}
                    disabled={saving}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "1rem",
                      resize: "vertical",
                      boxSizing: "border-box",
                      opacity: saving ? 0.6 : 1,
                    }}
                    placeholder="自己紹介を入力（任意）"
                  />
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.25rem",
                    }}
                  ></div>
                </div>
              </div>

              {/* フォーム状態表示 */}
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginBottom: "1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {formState.isValid ? "✅ 入力完了" : "📝 入力中..."}
                  {formState.hasChanges && " • 変更あり"}
                </span>
                <span>必須項目: {formState.isValid ? "完了" : "未完了"}</span>
              </div>

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
                  onClick={handleCancelEdit}
                  disabled={saving}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  ❌ キャンセル
                </button>

                <button
                  type="submit"
                  disabled={saving || !formState.isValid}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: saving ? "#6b7280" : "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    cursor:
                      saving || !formState.isValid ? "not-allowed" : "pointer",
                    opacity: saving || !formState.isValid ? 0.6 : 1,
                  }}
                >
                  {saving ? "💾 保存中..." : "💾 保存"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* アクションカード */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        {actionCards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            style={{
              display: "block",
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              textDecoration: "none",
              color: "inherit",
              transition: "transform 0.2s, box-shadow 0.2s",
              border: `2px solid transparent`,
            }}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          >
            <div
              style={{
                fontSize: "2rem",
                marginBottom: "0.5rem",
                color: card.color,
              }}
            >
              {card.icon}
            </div>
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "1.125rem",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              {card.title}
            </h3>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "0.875rem",
                lineHeight: "1.5",
              }}
            >
              {card.description}
            </p>
          </Link>
        ))}
      </div>

      {/* 保存中の表示 */}
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
