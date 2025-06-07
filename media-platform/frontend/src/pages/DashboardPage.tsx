import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

// 一時的に型定義（後で types/index.ts から import）
interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  role: string;
}

interface Content {
  id: number;
  title: string;
  body: string;
  type: string;
  author?: User;
  category?: any;
  status: string;
  view_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  const fetchUserAndData = async () => {
    try {
      setLoading(true);
      
      // ユーザー情報を取得
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const userResponse = await api.getCurrentUser();
      setUser(userResponse.data || userResponse);

      // コンテンツとカテゴリを取得
      const [contentsRes, categoriesRes] = await Promise.all([
        api.getPublishedContents(),
        api.getCategories()
      ]);
      
      // APIレスポンスの構造に合わせて修正
      setContents(contentsRes.data?.contents || contentsRes.contents || contentsRes || []);
      setCategories(categoriesRes.data?.categories || categoriesRes.categories || categoriesRes || []);
      
    } catch (error) {
      console.error('データの取得に失敗しました:', error);
      // 認証エラーの場合はログインページへ
      if ((error as any)?.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = async (categoryId: number | null) => {
    try {
      setSelectedCategory(categoryId);
      
      let filteredContents;
      if (categoryId) {
        filteredContents = await api.getContentsByCategory(categoryId.toString());
      } else {
        filteredContents = await api.getPublishedContents();
      }
      
      // APIレスポンスの構造に合わせて修正
      setContents(filteredContents.data?.contents || filteredContents.contents || filteredContents || []);
    } catch (error) {
      console.error('カテゴリフィルターエラー:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* ヘッダー */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1rem'
        }}>
          {/* トップヘッダー：タイトルとユーザー情報 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                メディアプラットフォーム
              </h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                こんにちは、{user?.username}さん ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                ログアウト
              </button>
            </div>
          </div>

          {/* ナビゲーションボタン */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}>
            <Link 
              to="/create"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              ✏️ 新規投稿
            </Link>
            
            <Link 
              to="/drafts"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#f59e0b',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📝 下書き一覧
            </Link>

            <Link 
              to="/my-posts"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#8b5cf6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📄 マイ投稿
            </Link>

            <Link 
              to="/profile"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#6b7280',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              👤 プロフィール
            </Link>
          </div>
        </div>
      </header>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem',
        display: 'flex',
        gap: '2rem'
      }}>
        {/* サイドバー - カテゴリフィルター */}
        <aside style={{ width: '250px', flexShrink: 0 }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
              📂 カテゴリ
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <button
                  onClick={() => handleCategoryFilter(null)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.75rem',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: selectedCategory === null ? '#dbeafe' : 'transparent',
                    color: selectedCategory === null ? '#1d4ed8' : '#374151',
                    fontWeight: selectedCategory === null ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                >
                  🏠 すべて
                </button>
              </li>
              {categories.map((category) => (
                <li key={category.id} style={{ marginBottom: '0.5rem' }}>
                  <button
                    onClick={() => handleCategoryFilter(category.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedCategory === category.id ? '#dbeafe' : 'transparent',
                      color: selectedCategory === category.id ? '#1d4ed8' : '#374151',
                      fontWeight: selectedCategory === category.id ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                  >
                    📁 {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* 統計情報 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            marginTop: '1rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: '600' }}>
              📊 統計
            </h3>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                📝 公開記事: {contents.length}件
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                🏷️ カテゴリ: {categories.length}件
              </div>
              <div>
                👤 ログイン: {user?.role}
              </div>
            </div>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main style={{ flex: 1 }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.875rem', fontWeight: 'bold' }}>
              {selectedCategory 
                ? `📁 ${categories.find(c => c.id === selectedCategory)?.name}` 
                : '🏠 すべてのコンテンツ'
              }
            </h2>
            <p style={{ margin: 0, color: '#6b7280' }}>
              {contents.length}件のコンテンツが見つかりました
            </p>
          </div>

          {/* コンテンツ一覧 */}
          {contents.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.5rem'
            }}>
              {contents.map((content) => (
                <div key={content.id} style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  border: '1px solid #e5e7eb'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontWeight: '500'
                    }}>
                      📁 {content.category?.name || 'カテゴリなし'}
                    </span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      backgroundColor: '#f3f4f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      👁️ {content.view_count}
                    </span>
                  </div>
                  
                  <h3 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    lineHeight: '1.4'
                  }}>
                    <Link 
                      to={`/contents/${content.id}`}
                      style={{ 
                        textDecoration: 'none', 
                        color: 'inherit',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'inherit';
                      }}
                    >
                      {content.title}
                    </Link>
                  </h3>
                  
                  <p style={{
                    margin: '0 0 1rem 0',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {content.body.substring(0, 120)}...
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '0.75rem'
                  }}>
                    <span style={{ fontWeight: '500' }}>
                      ✍️ {content.author?.username || '不明'}
                    </span>
                    <span>
                      📅 {new Date(content.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📝</div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '1.25rem' }}>
                {selectedCategory 
                  ? 'このカテゴリにはまだコンテンツがありません' 
                  : 'コンテンツが見つかりませんでした'
                }
              </h3>
              <p style={{ margin: '0 0 2rem 0', color: '#9ca3af' }}>
                新しいコンテンツを作成して、プラットフォームを充実させましょう！
              </p>
              <Link
                to="/create"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}
              >
                ✏️ 最初のコンテンツを作成
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;