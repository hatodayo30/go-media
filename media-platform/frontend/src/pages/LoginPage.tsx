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
      console.log('🔐 ログイン開始:', { email, password: password ? '[HIDDEN]' : '[EMPTY]' });
      
      // API通信
      const response = await api.login(email, password);
      console.log('📥 ログインレスポンス（完全）:', response);
      
      // レスポンス構造の詳細確認
      console.log('🔍 レスポンス解析:', {
        hasData: !!response.data,
        hasToken: response.data && !!response.data.token,
        hasUser: response.data && !!response.data.user,
        status: response.status,
        responseKeys: Object.keys(response),
        dataKeys: response.data ? Object.keys(response.data) : null
      });
      
      // トークンを保存
      if (response.data && response.data.token) {
        const token = response.data.token;
        console.log('💾 トークン保存開始:', {
          tokenExists: !!token,
          tokenLength: token?.length,
          tokenPreview: token?.substring(0, 20) + '...'
        });
        
        localStorage.setItem('token', token);
        
        // 保存確認
        const savedToken = localStorage.getItem('token');
        console.log('✅ トークン保存確認:', {
          savedSuccessfully: !!savedToken,
          savedLength: savedToken?.length,
          tokensMatch: savedToken === token
        });
        
        // ユーザー情報も保存
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          console.log('👤 ユーザー情報保存:', response.data.user);
        }
        
        console.log('🎉 ログイン成功 - ダッシュボードへリダイレクト');
        
        // 最終確認
        setTimeout(() => {
          const finalCheck = localStorage.getItem('token');
          console.log('🔍 最終トークン確認:', {
            exists: !!finalCheck,
            length: finalCheck?.length
          });
        }, 100);
        
        navigate('/dashboard');
      } else {
        console.error('❌ トークンが見つかりません:', {
          hasData: !!response.data,
          dataContent: response.data,
          fullResponse: response
        });
        setError('ログインレスポンスが不正です');
      }
      
    } catch (err: any) {
      console.error('❌ ログインエラー:', err);
      
      if (err.response) {
        console.error('📥 エラーレスポンス詳細:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // サーバーからのエラーレスポンス
        const errorMessage = err.response.data?.error || err.response.data?.message || `エラー: ${err.response.status}`;
        setError(errorMessage);
      } else if (err.request) {
        console.error('🌐 ネットワークエラー:', err.request);
        // ネットワークエラー
        setError('サーバーに接続できません。APIサーバーが起動しているか確認してください。');
      } else {
        console.error('❓ その他のエラー:', err.message);
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
        
        {/* デバッグ情報 */}
        <div style={{ 
          marginBottom: '1rem', 
          padding: '0.75rem', 
          backgroundColor: '#f0fdf4', 
          borderRadius: '6px',
          fontSize: '0.875rem'
        }}>
          <strong>🔍 デバッグモード有効</strong><br />
          コンソールで詳細ログを確認してください
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