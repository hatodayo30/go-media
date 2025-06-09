import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Comments from '../components/Comments';
import ContentActions from '../components/ContentActions';


interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface Content {
  id: number;
  title: string;
  content?: string;
  body?: string;
  status: string;
  category_id: number;
  author_id: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: User;
  category?: Category;
}

const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      fetchContent();
      fetchCurrentUser();
    }
  }, [id]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      console.log(`📄 コンテンツ ${id} を取得中...`);
      
      const response = await api.getContentById(id!);
      console.log('📥 コンテンツレスポンス:', response);
      
      const contentData = response.data?.content || response.content || response;
      setContent(contentData);
      
    } catch (err: any) {
      console.error('❌ コンテンツ取得エラー:', err);
      if (err.response?.status === 404) {
        setError('記事が見つかりませんでした');
      } else {
        setError('記事の取得に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await api.getCurrentUser();
      setCurrentUser(response.data || response);
    } catch (err) {
      console.error('ユーザー情報の取得に失敗:', err);
    }
  };

  const handleEdit = () => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = async () => {
    if (!window.confirm('この記事を削除しますか？')) {
      return;
    }

    try {
      console.log(`🗑️ コンテンツ ${id} を削除中...`);
      
      await api.deleteContent(id!);
      console.log('✅ 削除完了');
      
      alert('記事を削除しました');
      navigate('/dashboard');
      
    } catch (err: any) {
      console.error('❌ 削除エラー:', err);
      alert('削除に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return { bg: '#dcfce7', color: '#15803d', text: '公開中' };
      case 'draft':
        return { bg: '#fef3c7', color: '#92400e', text: '下書き' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280', text: status };
    }
  };

  const canEdit = () => {
    if (!currentUser || !content) return false;
    return currentUser.id === content.author_id || currentUser.role === 'admin';
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '50vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ marginBottom: '1rem', color: '#374151' }}>
            {error || '記事が見つかりませんでした'}
          </h2>
          <Link 
            to="/dashboard"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            ダッシュボードに戻る
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusColor(content.status);

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* ナビゲーション */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <Link 
          to="/dashboard"
          style={{
            color: '#6b7280',
            textDecoration: 'none',
            fontSize: '0.875rem'
          }}
        >
          ← ダッシュボード
        </Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span style={{ color: '#374151', fontSize: '0.875rem' }}>
          記事詳細
        </span>
      </div>

      {/* 記事ヘッダー */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <span style={{ 
                backgroundColor: statusInfo.bg,
                color: statusInfo.color,
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}>
                {statusInfo.text}
              </span>
              
              {content.category && (
                <span style={{
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  📁 {content.category.name}
                </span>
              )}
            </div>

            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold',
              margin: '0 0 1rem 0',
              color: '#374151',
              lineHeight: '1.3'
            }}>
              {content.title}
            </h1>

            <div style={{ 
              display: 'flex',
              gap: '1.5rem',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <span>✍️ {content.author?.username || '不明'}</span>
              <span>📅 {formatDate(content.created_at)}</span>
              <span>👁️ {content.view_count} 回閲覧</span>
              {content.updated_at !== content.created_at && (
                <span>🔄 {formatDate(content.updated_at)} 更新</span>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          {canEdit() && (
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              <button
                onClick={handleEdit}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                ✏️ 編集
              </button>
              
              <button
                onClick={handleDelete}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                🗑️ 削除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 記事本文 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        marginBottom: '2rem'
      }}>
        <div style={{
          color: '#374151',
          fontSize: '1rem',
          lineHeight: '1.7',
          whiteSpace: 'pre-wrap'
        }}>
          {content.content || content.body || '内容が設定されていません'}
        </div>
      </div>

      <Comments contentId={content.id} />

        // JSX部分を以下に変更
      <div style={{ marginTop: '2rem' }}>
      <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '600', 
          marginBottom: '1rem',
          color: '#374151'
       }}>
          📊 この記事への反応
      </h3>
  
       <ContentActions 
         contentId={content.id} 
          size="medium" 
       showCounts={true} 
      />
      </div>
    

      {/* フッター */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <Link 
            to="/dashboard"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6b7280',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            📊 ダッシュボード
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
              fontWeight: '500'
            }}
          >
            📄 マイ投稿
          </Link>
          
          <Link 
            to="/create"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            ✏️ 新規投稿
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ContentDetailPage;