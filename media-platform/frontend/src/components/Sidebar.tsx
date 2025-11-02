import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  currentPage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // 現在のパスを取得
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    { path: "/dashboard", label: "ホーム", icon: "🏠" },
    { path: "/profile", label: "プロフィール", icon: "👤" },
    { path: "/drafts", label: "下書き", icon: "📝" },
    { path: "/create", label: "投稿", icon: "➕" },
    { path: "/following", label: "フォロー", icon: "👥" }, // ← 有効化！
    { path: "/likes", label: "いいね", icon: "❤️" }, // ← 有効化！
  ];

  return (
    <aside
      style={{
        width: "240px",
        backgroundColor: "#f9fafb",
        borderRight: "1px solid #e5e7eb",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      {/* アプリタイトル */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#1f2937",
            margin: 0,
            cursor: "pointer",
          }}
          onClick={() => navigate("/dashboard")}
        >
          ⚡️ プレイリスト
        </h1>
      </div>

      {/* ナビゲーションメニュー */}
      <nav style={{ flex: 1 }}>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0.75rem 1rem",
              marginBottom: "0.5rem",
              backgroundColor: isActive(item.path) ? "#e5e7eb" : "transparent",
              color: isActive(item.path) ? "#1f2937" : "#6b7280",
              textDecoration: "none",
              borderRadius: "8px",
              fontWeight: isActive(item.path) ? "500" : "normal",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = "#e5e7eb";
                e.currentTarget.style.color = "#1f2937";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#6b7280";
              }
            }}
          >
            <span style={{ marginRight: "0.75rem" }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* ログアウトボタン */}
      <button
        onClick={handleLogout}
        style={{
          marginTop: "auto",
          padding: "0.75rem 1rem",
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: "500",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#dc2626";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#ef4444";
        }}
      >
        ログアウト
      </button>
    </aside>
  );
};

export default Sidebar;
