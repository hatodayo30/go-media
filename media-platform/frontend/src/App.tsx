// App.tsx または Router.tsx の例

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ページコンポーネントのインポート
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateContentPage from './pages/CreateContentPage';
import DraftsPage from './pages/DraftsPage';
import MyPostsPage from './pages/MyPostsPage';
import ProfilePage from './pages/ProfilePage';
import ContentDetailPage from './pages/ContentDetailPage';
import EditContentPage from './pages/EditContentPage';
import SearchPage from './pages/SearchPage';

// プライベートルートのコンポーネント
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* パブリックルート */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* プライベートルート */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } />
          
          <Route path="/create" element={
            <PrivateRoute>
              <CreateContentPage />
            </PrivateRoute>
          } />
          
          <Route path="/drafts" element={
            <PrivateRoute>
              <DraftsPage />
            </PrivateRoute>
          } />
          
          <Route path="/my-posts" element={
            <PrivateRoute>
              <MyPostsPage />
            </PrivateRoute>
          } />
          
          <Route path="/profile" element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          } />
          
          <Route path="/contents/:id" element={
            <PrivateRoute>
              <ContentDetailPage />
            </PrivateRoute>
          } />
          
          <Route path="/edit/:id" element={
            <PrivateRoute>
              <EditContentPage />
            </PrivateRoute>
          } />

          <Route path="/search" element={
            <PrivateRoute>
              <SearchPage />
            </PrivateRoute>
          } />
          
          {/* 旧ルートのリダイレクト */}
          <Route path="/contents/new" element={<Navigate to="/create" />} />
          
          {/* デフォルトルート */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          {/* 404エラーページ */}
          <Route path="*" element={
            <div style={{ 
              minHeight: '100vh', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              backgroundColor: '#f9fafb'
            }}>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404</h1>
              <p style={{ marginBottom: '2rem' }}>ページが見つかりませんでした</p>
              <a href="/dashboard" style={{ 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                textDecoration: 'none'
              }}>
                ダッシュボードに戻る
              </a>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;