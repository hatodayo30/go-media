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
  author?: {
    id: number;
    username: string;
  };
}

interface Rating {
  id: number;
  user_id: number;
  content_id: number;
  value: number;
  created_at: string;
  content?: Content;
}

type TabType = 'my-posts' | 'liked' | 'bookmarked';

const MyPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('my-posts');
  const [myPosts, setMyPosts] = useState<Content[]>([]);
  const [likedContents, setLikedContents] = useState<Content[]>([]);
  const [bookmarkedContents, setBookmarkedContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (activeTab === 'my-posts') {
        await fetchMyPosts();
      } else if (activeTab === 'liked') {
        await fetchLikedContents();
      } else if (activeTab === 'bookmarked') {
        await fetchBookmarkedContents();
      }
      
    } catch (err: any) {
      console.error('❌ データ取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyPosts = async () => {
    console.log('📥 マイ投稿を取得中...');
    const response = await api.getContents();
    console.log('📝 マイ投稿レスポンス:', response);
    
    if (response.data && response.data.contents) {
      setMyPosts(response.data.contents);
      console.log(`📋 投稿数: ${response.data.contents.length}`);
    } else {
      setMyPosts([]);
    }
  };

  const fetchLikedContents = async () => {
    console.log('👍 いいねした記事を取得中...');
    
    try {
      // 現在のユーザー情報を取得
      const userResponse = await api.getCurrentUser();
      const userId = userResponse.data?.id || userResponse.id;
      
      if (!userId) {
        throw new Error('ユーザー情報を取得できませんでした');
      }

      // ユーザーの評価一覧を取得
      const ratingsResponse = await api.getRatingsByUser(userId.toString());
      console.log('📊 ユーザー評価レスポンス:', ratingsResponse);
      
      const ratings = ratingsResponse.data?.ratings || ratingsResponse.ratings || [];
      
      // いいね（value = 1）のみをフィルター
      const likedRatings = ratings.filter((rating: Rating) => rating.value === 1);
      
      // 各いいねに対応するコンテンツを取得
      const likedContentsPromises = likedRatings.map(async (rating: Rating) => {
        try {
          const contentResponse = await api.getContentById(rating.content_id.toString());
          return contentResponse.data?.content || contentResponse.content || contentResponse;
        } catch (error) {
          console.error(`コンテンツ ${rating.content_id} の取得に失敗:`, error);
          return null;
        }
      });
      
      const likedContentsResults = await Promise.all(likedContentsPromises);
      const validLikedContents = likedContentsResults.filter(content => content !== null);
      
      setLikedContents(validLikedContents);
      console.log(`👍 いいねした記事数: ${validLikedContents.length}`);
      
    } catch (error) {
      console.error('❌ いいねした記事の取得エラー:', error);
      setLikedContents([]);
    }
  };

  const fetchBookmarkedContents = async () => {
    console.log('🔖 ブックマークした記事を取得中...');
    
    // TODO: ブックマークAPI実装後に実装
    // 現在は空の配列を設定
    setBookmarkedContents([]);
    console.log('📌 ブックマーク機能は今後実装予定');
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
      await fetchMyPosts();
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
      await fetchMyPosts();
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

  const getTabInfo = (tab: TabType) => {
    switch (tab) {
      case 'my-posts':
        return {
          title: 'マイ投稿',
          icon: '📄',
          description: '自分が作成した記事一覧',
          count: myPosts.length
        };
      case 'liked':
        return {
          title: 'いいねした記事',
          icon: '👍',
          description: 'いいねした記事一覧',
          count: likedContents.length
        };
      case 'bookmarked':
        return {
          title: 'ブックマーク',
          icon: '🔖',
          description: 'ブックマークした記事一覧',
          count: bookmarkedContents.length
        };
    }
  };

  const filteredPosts = activeTab === 'my-posts' 
    ? myPosts.filter(post => {
        if (filter === 'all') return true;
        return post.status === filter;
      })
    : [];

  const getCurrentContents = () => {
    switch (activeTab) {
      case 'my-posts':
        return filteredPosts;
      case 'liked':
        return likedContents;
      case 'bookmarked':
        return bookmarkedContents;
      default:
        return [];
    }
  };

  const renderContentCard = (content: Content, showAuthor: boolean = false) => {
    const statusInfo = getStatusColor(content.status);
    
    return (
      <div
        key={content.id}
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
              <Link 
                to={`/content/${content.id}`}
                style={{
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  margin: 0,
                  color: '#374151',
                  textDecoration: 'none'
                }}
              >
                {content.title}
              </Link>
              {activeTab === 'my-posts' && (
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
              )}
            </div>
            
            <div style={{ 
              color: '#6b7280', 
              fontSize: '0.875rem',
              marginBottom: '0.75rem',
              display: 'flex',
              gap: '1rem'
            }}>
              <span>📅 {formatDate(content.updated_at)}</span>
              {showAuthor && content.author && (
                <span>✍️ {content.author.username}</span>
              )}
              <span>👁️ {content.view_count} 回閲覧</span>
            </div>

            {/* コンテンツのプレビュー */}
            <div style={{ 
              color: '#374151',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              marginBottom: '1rem'
            }}>
              {(content.content || content.body || '').substring(0, 150)}
              {(content.content || content.body || '').length > 150 && '...'}
            </div>
          </div>

          {/* アクションボタン（マイ投稿のみ） */}
          {activeTab === 'my-posts' && (
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem',
              marginLeft: '1rem',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => navigate(`/edit/${content.id}`)}
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
              
              {content.status === 'draft' ? (
                <button
                  onClick={() => handleStatusChange(content.id, 'published')}
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
                  onClick={() => handleStatusChange(content.id, 'draft')}
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
                onClick={() => handleDelete(content.id)}
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
    );
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

  const currentTabInfo = getTabInfo(activeTab);
  const currentContents = getCurrentContents();

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
          👤 マイページ
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

      {/* タブナビゲーション */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex' }}>
          {(['my-posts', 'liked', 'bookmarked'] as TabType[]).map((tab) => {
            const tabInfo = getTabInfo(tab);
            const isActive = activeTab === tab;
            
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '1rem 1.5rem',
                  border: 'none',
                  backgroundColor: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  borderBottom: isActive ? 'none' : '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>{tabInfo.icon}</span>
                  <span>{tabInfo.title}</span>
                  <span style={{ 
                    fontSize: '0.875rem',
                    padding: '0.125rem 0.5rem',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                    borderRadius: '9999px'
                  }}>
                    {tabInfo.count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* フィルター（マイ投稿タブのみ） */}
      {activeTab === 'my-posts' && (
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
                {filterType === 'all' && ` (${myPosts.length})`}
                {filterType === 'published' && ` (${myPosts.filter(p => p.status === 'published').length})`}
                {filterType === 'draft' && ` (${myPosts.filter(p => p.status === 'draft').length})`}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* コンテンツ一覧 */}
      {currentContents.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{currentTabInfo.icon}</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#374151' }}>
            {currentTabInfo.title}がありません
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            {currentTabInfo.description}
          </p>
          {activeTab === 'my-posts' && (
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
          )}
          {activeTab === 'bookmarked' && (
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              📌 ブックマーク機能は今後実装予定です
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {currentContents.map((content) => 
            renderContentCard(content, activeTab !== 'my-posts')
          )}
        </div>
      )}
    </div>
  );
};

export default MyPage;