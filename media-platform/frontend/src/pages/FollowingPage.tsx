import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FollowingFeed from "../components/FollowingFeed";

const FollowingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 認証チェックとユーザーIDの取得
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (!token || !userStr) {
        console.log("❌ 認証なし、ログインページへリダイレクト");
        navigate("/login");
        return;
      }

      try {
        const user = JSON.parse(userStr);
        if (user && user.id) {
          setCurrentUserId(user.id);
          console.log("✅ ユーザーID取得:", user.id);
        } else {
          console.error("❌ ユーザーIDが見つかりません");
          navigate("/login");
        }
      } catch (error) {
        console.error("❌ ユーザー情報の解析エラー:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

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

  if (!currentUserId) {
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
              ユーザー情報を取得できませんでした
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
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          {/* ページヘッダー */}
          <div
            style={{
              marginBottom: "2rem",
              backgroundColor: "white",
              padding: "1.5rem",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                margin: "0 0 0.5rem 0",
                color: "#1f2937",
              }}
            >
              👥 フォロー中
            </h1>
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "0.875rem",
              }}
            >
              フォローしているユーザーの最新投稿を表示
            </p>
          </div>

          {/* FollowingFeedコンポーネント */}
          <FollowingFeed currentUserId={currentUserId} />
        </div>
      </div>
    </div>
  );
};

export default FollowingPage;
