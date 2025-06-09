import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

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
  category?: {
    id: number;
    name: string;
  };
}

const MyPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      console.log('📥 マイ投稿を取得中...');
      
      // 全コンテンツを取得（自分の投稿のみフィルタされるはず）
      const response = await api.getContents();
      console.log('📝 マイ投稿レスポンス:', response);
      
      if (response.data && response.data.contents) {
        setPosts(response.data.contents);
        console.log(`📋 投稿数: ${response.data.contents.length}`);
      } else {
        setPosts([]);
      }
      
    } catch (err: any) {
      console.error('❌ マイ投稿取得エラー:', err);
      setError('投稿の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('この投稿を削除しますか？')) {
      return;
    }

    try {
      console.log(`🗑️ コンテンツ ${id} を削除中...`);
      
      await api.deleteContent(id.toString());
      console.log('✅ 削除完了');
      
      // 成功後、投稿一覧を更新
      fetchMyPosts();
      alert('投稿を削除しました');
      
    } catch (err: any) {
      console.error('❌ 削除エラー:', err);
      alert('削除に失敗しました');
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      console.log(`🔄 コンテンツ ${id} のステータスを ${newStatus} に変更中...`);
      
      await api.updateContentStatus(id.toString(), newStatus);
      console.log('✅ ステータス変更完了');
      
      // 成功後、投稿一覧を更新
      fetchMyPosts();
      alert(`投稿を${newStatus === 'published' ? '公開' : '下書き'}にしました`);
      
    } catch (err: any) {
      console.error('❌ ステータス変更エラー:', err);
      alert('ステータスの変更に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
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

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    return post.status === filter;
  });

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

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '2rem',
      backgroundColor: '#f9fafb',
      minHeight: '100vh'
    }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold',
          margin: 0,
          color: '#374151'
        }}>
          📄 マイ投稿
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
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
            ダッシュボードに戻る
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
            新規投稿
          </Link>
        </div>
      </div>

      {/* フィルター */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: '500', color: '#374151' }}>フィルター:</span>
          {(['all', 'published', 'draft'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: filter === filterType ? '#3b82f6' : 'white',
                color: filter === filterType ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {filterType === 'all' ? 'すべて' : 
               filterType === 'published' ? '公開中' : '下書き'}
              {filterType === 'all' && ` (${posts.length})`}
              {filterType === 'published' && ` (${posts.filter(p => p.status === 'published').length})`}
              {filterType === 'draft' && ` (${posts.filter(p => p.status === 'draft').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '6px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {/* 投稿一覧 */}
      {filteredPosts.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#374151' }}>
            {filter === 'all' ? '投稿がありません' :
             filter === 'published' ? '公開中の投稿がありません' : '下書きがありません'}
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            新しい記事を作成してみましょう。
          </p>
          <Link 
            to="/create"
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
            新規投稿を作成
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filteredPosts.map((post) => {
            const statusInfo = getStatusColor(post.status);
            return (
              <div
                key={post.id}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '0.75rem'
                    }}>
                      <h3 style={{ 
                        fontSize: '1.25rem', 
                        fontWeight: '600',
                        margin: 0,
                        color: '#374151'
                      }}>
                        {post.title}
                      </h3>
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
                   P </div>
                    
                    <div style={{ 
                      color: '#6b7280', 
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      gap: '1rem'
                    }}>
                      <span>📅 {formatDate(post.updated_at)}</span>
                      <span>🏷️ カテゴリID: {post.category_id}</span>
                      <span>👁️ {post.view_count} 回閲覧</span>
                    </div>

                    {/* コンテンツのプレビュー */}
                    <div style={{ 
                      color: '#374151',
                      fontSize: '0.875rem',
                      lineHeight: '1.5',
                      marginBottom: '1rem'
                    }}>
                      {(post.content || post.body || '').substring(0, 150)}
                      {(post.content || post.body || '').length > 150 && '...'}
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    marginLeft: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => navigate(`/edit/${post.id}`)}
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
                    
                    {post.status === 'draft' ? (
                      <button
                        onClick={() => handleStatusChange(post.id, 'published')}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        🚀 公開
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(post.id, 'draft')}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          cursor: 'pointer'
                        }}
                      >
                        📝 下書きに戻す
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(post.id)}
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPostsPage;