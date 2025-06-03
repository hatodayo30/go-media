import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h1>メディアプラットフォーム</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>こんにちは、{user?.username}さん</span>
          <button
            onClick={logout}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ログアウト
          </button>
        </div>
      </header>
      
      <main>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}>
          <h2>ダッシュボード</h2>
          <p>メディアプラットフォームへようこそ！</p>
          <p>ログインユーザー: {user?.username}</p>
          <p>メールアドレス: {user?.email}</p>
          <p>ロール: {user?.role}</p>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;