import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateContentPage from "./pages/CreateContentPage";
import EditContentPage from "./pages/EditContentPage";
import DraftsPage from "./pages/DraftsPage";
import ProfilePage from "./pages/ProfilePage";
import CategoryPage from "./pages/CategoryPage";
import ContentDetailPage from "./pages/ContentDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import FollowingPage from "./pages/FollowingPage";
import LikesPage from "./pages/LikesPage";
import "./App.css";

// 認証が必要なルートのためのコンポーネント
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const token = localStorage.getItem("token");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// 認証済みユーザーをダッシュボードにリダイレクトするコンポーネント
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* ルートパスはダッシュボードにリダイレクト */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 認証不要のルート */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* 認証が必要なルート */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />

            {/* カテゴリページ */}
            <Route
              path="/categories/:categoryName"
              element={
                <PrivateRoute>
                  <CategoryPage />
                </PrivateRoute>
              }
            />

            {/* コンテンツ関連 */}
            <Route
              path="/create"
              element={
                <PrivateRoute>
                  <CreateContentPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/contents/:id"
              element={
                <PrivateRoute>
                  <ContentDetailPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/contents/:id/edit"
              element={
                <PrivateRoute>
                  <EditContentPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/drafts"
              element={
                <PrivateRoute>
                  <DraftsPage />
                </PrivateRoute>
              }
            />

            {/* ユーザー関連 */}
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <ProfilePage />
                </PrivateRoute>
              }
            />
            {/* フォロー関連 */}
            <Route
              path="/following"
              element={
                <PrivateRoute>
                  <FollowingPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/likes"
              element={
                <PrivateRoute>
                  <LikesPage />
                </PrivateRoute>
              }
            />

            {/* 404ページ */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
