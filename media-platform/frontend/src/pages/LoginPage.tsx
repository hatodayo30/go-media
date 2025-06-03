import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', { email, password });
      
      // API通信
      const response = await api.login(email, password);
      console.log('Login response:', response);
      
      // トークンを保存
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        console.log('Token saved to localStorage');
        
        // ダッシュボードに遷移
        navigate('/dashboard');
      } else {
        setError('ログインレスポンスが不正です');
      }
      
    } catch (err: any) {
      console.error('Login error:', err);
      
      if (err.response) {
        // サーバーからのエラーレスポンス
        const errorMessage = err.response.data?.error || err.response.data?.message || `エラー: ${err.response.status}`;
        setError(errorMessage);
      } else if (err.request) {
        // ネットワークエラー
        setError('サーバーに接続できません。APIサーバーが起動しているか確認してください。');
      } else {
        // その他のエラー
        setError('ログインに失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '2rem' }}>
          ログイン
        </h2>
        
        {/* テスト用アカウント情報 */}
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}>
          <strong>テスト用アカウント:</strong><br />
          Email: test@example.com<br />
          Password: test123
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              メールアドレス
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
              placeholder="メールアドレス"
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              パスワード
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
              placeholder="パスワード"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/register" style={{ color: '#3b82f6', textDecoration: 'none' }}>
              アカウントをお持ちでない方はこちら
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;