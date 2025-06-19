import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    bio: "",
  });

  // useCallbackを使用してfetchUserProfileをメモ化
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      console.log("👤 ユーザープロフィールを取得中...");

      const response = await api.getCurrentUser();
      console.log("📥 プロフィールレスポンス:", response);

      const userData = response.data || response;
      setUser(userData);
      setFormData({
        username: userData.username || "",
        email: userData.email || "",
        bio: userData.bio || "",
      });
    } catch (err: any) {
      console.error("❌ プロフィール取得エラー:", err);
      setError("プロフィールの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []); // 依存関係なし

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]); // fetchUserProfileを依存配列に含める

  // useCallbackを使用してhandleSubmitをメモ化
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSuccess("");

      try {
        console.log("💾 プロフィールを更新中...", formData);

        const response = await api.updateUser(formData);
        console.log("✅ プロフィール更新完了:", response);

        setUser(response.data || response);
        setEditing(false);
        setSuccess("プロフィールを更新しました");
      } catch (err: any) {
        console.error("❌ プロフィール更新エラー:", err);
        if (err.response?.data?.error) {
          setError(err.response.data.error);
        } else {
          setError("プロフィールの更新に失敗しました");
        }
      }
    },
    [formData]
  ); // formDataに依存

  // useCallbackを使用してhandleChangeをメモ化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  ); // 依存関係なし（関数型更新を使用）

  // useCallbackを使用してhandleEditStartをメモ化
  const handleEditStart = useCallback(() => {
    setEditing(true);
  }, []); // 依存関係なし

  // useCallbackを使用してhandleCancelEditをメモ化
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
  }, [user]); // userに依存

  // useCallbackを使用してformatDateをメモ化
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []); // 純粋関数なので依存関係なし

  // useCallbackを使用してgetRoleDisplayをメモ化
  const getRoleDisplay = useCallback((role: string) => {
    switch (role) {
      case "admin":
        return { text: "管理者", color: "#dc2626", bg: "#fee2e2" };
      case "editor":
        return { text: "編集者", color: "#059669", bg: "#d1fae5" };
      case "user":
        return { text: "ユーザー", color: "#3b82f6", bg: "#dbeafe" };
      default:
        return { text: role, color: "#6b7280", bg: "#f3f4f6" };
    }
  }, []); // 純粋関数なので依存関係なし

  // useCallbackを使用してマウスイベントハンドラーをメモ化
  const handleCardMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
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

  if (!user) {
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
        <div>ユーザー情報を取得できませんでした</div>
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
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            margin: 0,
            color: "#374151",
          }}
        >
          👤 プロフィール
        </h1>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link
            to="/dashboard"
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
            ダッシュボードに戻る
          </Link>
        </div>
      </div>

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
          {error}
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
          {success}
        </div>
      )}

      {/* プロフィール表示・編集 */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
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
            }}
          >
            👤
          </div>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>
            {user.username}
          </h2>
          <div
            style={{
              display: "inline-block",
              backgroundColor: roleInfo.bg,
              color: roleInfo.color,
              padding: "0.25rem 0.75rem",
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
                  基本情報
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
                      ユーザー名
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
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
                      メールアドレス
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
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
                      自己紹介
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                        minHeight: "4rem",
                        whiteSpace: "pre-wrap",
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
                  アカウント情報
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
                      登録日
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                      }}
                    >
                      📅 {formatDate(user.created_at)}
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
                      最終更新
                    </label>
                    <div
                      style={{
                        padding: "0.75rem",
                        backgroundColor: "#f9fafb",
                        borderRadius: "6px",
                        color: "#374151",
                      }}
                    >
                      🔄 {formatDate(user.updated_at)}
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
                プロフィール編集
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
                    ユーザー名 *
                  </label>
                  <input
                    type="text"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "1rem",
                    }}
                    placeholder="ユーザー名を入力"
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
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "1rem",
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
                    自己紹介
                  </label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "1rem",
                      resize: "vertical",
                    }}
                    placeholder="自己紹介を入力（任意）"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                }}
              >
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#6b7280",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                >
                  キャンセル
                </button>

                <button
                  type="submit"
                  style={{
                    padding: "0.75rem 1.5rem",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                >
                  💾 保存
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
          marginTop: "2rem",
        }}
      >
        <Link
          to="/my-posts"
          style={{
            display: "block",
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</div>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.125rem",
              fontWeight: "600",
            }}
          >
            マイ投稿
          </h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            投稿した記事を管理
          </p>
        </Link>

        <Link
          to="/drafts"
          style={{
            display: "block",
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📝</div>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.125rem",
              fontWeight: "600",
            }}
          >
            下書き一覧
          </h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            保存した下書きを確認
          </p>
        </Link>

        <Link
          to="/create"
          style={{
            display: "block",
            backgroundColor: "white",
            padding: "1.5rem",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            textDecoration: "none",
            color: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✏️</div>
          <h3
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.125rem",
              fontWeight: "600",
            }}
          >
            新規投稿
          </h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            新しい記事を作成
          </p>
        </Link>
      </div>
    </div>
  );
};

export default ProfilePage;
