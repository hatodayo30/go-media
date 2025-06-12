import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface SearchFilters {
  query: string;
  category_id?: number;
  author_id?: number;
  date_range?: { start: string; end: string };
  sort_by?: 'date' | 'popularity' | 'rating';
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
  author?: {
    id: number;
    username: string;
  };
  category?: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
  description?: string;
}

interface Author {
  id: number;
  username: string;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 検索状態
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    category_id: searchParams.get('category') ? parseInt(searchParams.get('category')!) : undefined,
    author_id: searchParams.get('author') ? parseInt(searchParams.get('author')!) : undefined,
    date_range: searchParams.get('start') && searchParams.get('end') ? {
      start: searchParams.get('start')!,
      end: searchParams.get('end')!
    } : undefined,
    sort_by: (searchParams.get('sort') as 'date' | 'popularity' | 'rating') || 'date'
  });

  // データ状態
  const [results, setResults] = useState<Content[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // 検索実行
  const performSearch = useCallback(async () => {
    if (!filters.query.trim()) {
      setResults([]);
      setTotalResults(0);
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('🔍 検索実行:', filters);

      // 基本検索
      const searchResponse = await api.searchContents(filters.query);
      console.log('📥 検索レスポンス:', searchResponse);
      
      let searchResults = searchResponse.data?.contents || searchResponse.contents || [];

      // フィルタリング適用
      if (filters.category_id) {
        searchResults = searchResults.filter((content: Content) => 
          content.category_id === filters.category_id
        );
      }

      if (filters.author_id) {
        searchResults = searchResults.filter((content: Content) => 
          content.author_id === filters.author_id
        );
      }

      if (filters.date_range) {
        const startDate = new Date(filters.date_range.start);
        const endDate = new Date(filters.date_range.end);
        searchResults = searchResults.filter((content: Content) => {
          const contentDate = new Date(content.created_at);
          return contentDate >= startDate && contentDate <= endDate;
        });
      }

      // ソート適用
      switch (filters.sort_by) {
        case 'date':
          searchResults.sort((a: Content, b: Content) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
        case 'popularity':
          searchResults.sort((a: Content, b: Content) => b.view_count - a.view_count);
          break;
        case 'rating':
          // TODO: 評価データを組み込んだソート（今後実装）
          searchResults.sort((a: Content, b: Content) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
      }

      setResults(searchResults);
      setTotalResults(searchResults.length);

    } catch (err: any) {
      console.error('❌ 検索エラー:', err);
      setError('検索に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // カテゴリ・著者データ取得
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // カテゴリ一覧取得
        const categoriesResponse = await api.getCategories();
        setCategories(categoriesResponse.data?.categories || categoriesResponse.categories || []);

        // 著者一覧取得（全ユーザー）
        const authorsResponse = await api.getAllUsers();
        setAuthors(authorsResponse.data?.users || authorsResponse.users || []);

      } catch (err) {
        console.error('❌ メタデータ取得エラー:', err);
      }
    };

    fetchMetadata();
  }, []);

  // 検索実行（フィルター変更時）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 500); // デバウンス

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  // URLパラメータ更新
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.category_id) params.set('category', filters.category_id.toString());
    if (filters.author_id) params.set('author', filters.author_id.toString());
    if (filters.date_range) {
      params.set('start', filters.date_range.start);
      params.set('end', filters.date_range.end);
    }
    if (filters.sort_by) params.set('sort', filters.sort_by);

    setSearchParams(params);
  }, [filters, setSearchParams]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      query: filters.query, // 検索キーワードは保持
      sort_by: 'date'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fef08a;">$1</mark>');
  };

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
          🔍 記事検索
        </h1>
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
      </div>

      {/* 検索バー */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              placeholder="記事を検索..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: showFilters ? '#3b82f6' : '#f3f4f6',
              color: showFilters ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            🔧 フィルター
          </button>
        </div>

        {/* 検索結果サマリー */}
        {filters.query && (
          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
            「{filters.query}」の検索結果: {totalResults}件
            {loading && <span> (検索中...)</span>}
          </div>
        )}
      </div>

      {/* 高度なフィルター */}
      {showFilters && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {/* カテゴリフィルター */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                📁 カテゴリ
              </label>
              <select
                value={filters.category_id || ''}
                onChange={(e) => handleFilterChange('category_id', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">すべてのカテゴリ</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 著者フィルター */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                ✍️ 著者
              </label>
              <select
                value={filters.author_id || ''}
                onChange={(e) => handleFilterChange('author_id', 
                  e.target.value ? parseInt(e.target.value) : undefined
                )}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">すべての著者</option>
                {authors.map(author => (
                  <option key={author.id} value={author.id}>
                    {author.username}
                  </option>
                ))}
              </select>
            </div>

            {/* ソートオプション */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151'
              }}>
                📊 並び順
              </label>
              <select
                value={filters.sort_by || 'date'}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="date">新しい順</option>
                <option value="popularity">人気順 (閲覧数)</option>
                <option value="rating">評価順</option>
              </select>
            </div>
          </div>

          {/* 日付範囲フィルター */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              📅 投稿日期間
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="date"
                value={filters.date_range?.start || ''}
                onChange={(e) => handleFilterChange('date_range', 
                  e.target.value ? { 
                    start: e.target.value, 
                    end: filters.date_range?.end || e.target.value 
                  } : undefined
                )}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
              <span style={{ color: '#6b7280' }}>〜</span>
              <input
                type="date"
                value={filters.date_range?.end || ''}
                onChange={(e) => handleFilterChange('date_range', 
                  e.target.value ? { 
                    start: filters.date_range?.start || e.target.value, 
                    end: e.target.value 
                  } : undefined
                )}
                style={{
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          {/* フィルタークリア */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={clearFilters}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              🔄 フィルターをクリア
            </button>
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
          ❌ {error}
        </div>
      )}

      {/* 検索結果 */}
      {filters.query && !loading && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {results.length === 0 ? (
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#374151' }}>
                検索結果が見つかりません
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                検索キーワードやフィルターを変更してお試しください
              </p>
            </div>
          ) : (
            results.map((content) => (
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
                        to={`/contents/${content.id}`}
                        style={{
                          fontSize: '1.25rem', 
                          fontWeight: '600',
                          margin: 0,
                          color: '#374151',
                          textDecoration: 'none'
                        }}
                        dangerouslySetInnerHTML={{
                          __html: getHighlightedText(content.title, filters.query)
                        }}
                      />
                      
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
                    
                    <div style={{ 
                      color: '#6b7280', 
                      fontSize: '0.875rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      gap: '1rem'
                    }}>
                      <span>✍️ {content.author?.username || '不明'}</span>
                      <span>📅 {formatDate(content.created_at)}</span>
                      <span>👁️ {content.view_count} 回閲覧</span>
                    </div>

                    {/* コンテンツのプレビュー */}
                    <div 
                      style={{ 
                        color: '#374151',
                        fontSize: '0.875rem',
                        lineHeight: '1.5',
                        marginBottom: '1rem'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: getHighlightedText(
                          (content.content || content.body || '').substring(0, 200),
                          filters.query
                        )
                      }}
                    />
                    {(content.content || content.body || '').length > 200 && '...'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 初期状態（検索前） */}
      {!filters.query && (
        <div style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#374151' }}>
            記事を検索
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            キーワードを入力して記事を検索してください
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchPage;