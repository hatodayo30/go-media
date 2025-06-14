import axios from 'axios';

// APIのベースURL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8082';

// Axiosインスタンスの作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター（JWTトークンの自動付与）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔐 Request interceptor - Token check:', {
      hasToken: !!token,
      tokenLength: token?.length,
      url: config.url,
      method: config.method
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
    } else {
      console.warn('⚠️ No token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（一時的に無効化してデバッグ用ログ追加）
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Response interceptor - Success:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method
    });
    return response;
  },
  (error) => {
    console.error('❌ Response interceptor - Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      console.warn('🚫 401 Unauthorized detected, but NOT redirecting for debugging');
      // 一時的にリダイレクトを無効化
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// TypeScript型定義
export interface SearchFilters {
  q: string;
  category_id?: number;
  author_id?: number;
  date_start?: string;
  date_end?: string;
  sort_by?: 'date' | 'popularity' | 'rating';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  contents: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchSuggestion {
  id: number;
  text: string;
  type: 'content' | 'category' | 'author';
  count: number;
}

export interface SearchHistory {
  id: number;
  query: string;
  created_at: string;
  result_count: number;
}

export interface PopularKeyword {
  keyword: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

// API関数の定義
export const api = {
  // 認証関連
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/users/login', { email, password });
    return response.data;
  },

  register: async (userData: { username: string; email: string; password: string; bio?: string }) => {
    const response = await apiClient.post('/api/users/register', userData);
    return response.data;
  },

  // ユーザー関連
  getCurrentUser: async () => {
    const response = await apiClient.get('/api/users/me');
    return response.data;
  },

  updateUser: async (userData: any) => {
    const response = await apiClient.put('/api/users/me', userData);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await apiClient.get('/api/users');
    return response.data;
  },

  // 🔍 新規追加: 検索機能で使用するユーザー一覧（著者フィルター用）
  getUsers: async () => {
    console.log('👥 ユーザー一覧取得（著者フィルター用）');
    const response = await apiClient.get('/api/users');
    console.log('✅ ユーザー一覧レスポンス:', response.data);
    return response.data;
  },

  // カテゴリ関連
  getCategories: async () => {
    const response = await apiClient.get('/api/categories');
    return response.data;
  },

  getCategoryById: async (id: string) => {
    const response = await apiClient.get(`/api/categories/${id}`);
    return response.data;
  },

  createCategory: async (categoryData: any) => {
    const response = await apiClient.post('/api/categories', categoryData);
    return response.data;
  },

  // コンテンツ関連
  getContents: async (params?: any) => {
    console.log('🔍 API リクエスト params:', params);
    const response = await apiClient.get('/api/contents', { params });
    console.log('📥 API レスポンス:', response.data);
    return response.data;
  },

  getPublishedContents: async () => {
    const response = await apiClient.get('/api/contents/published');
    return response.data;
  },

  getTrendingContents: async () => {
    const response = await apiClient.get('/api/contents/trending');
    return response.data;
  },

  // 🔍 拡張: 検索機能対応
  searchContents: async (params: SearchFilters | string) => {
    console.log('🔍 検索リクエスト:', params);
    
    let searchParams: URLSearchParams;
    
    // 文字列の場合（従来の互換性維持）
    if (typeof params === 'string') {
      searchParams = new URLSearchParams({ q: params });
    } else {
      // オブジェクトの場合（新しい拡張機能）
      searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
    }

    console.log('📤 検索パラメータ:', searchParams.toString());
    const response = await apiClient.get(`/api/contents/search?${searchParams.toString()}`);
    console.log('✅ 検索レスポンス:', response.data);
    return response.data;
  },

  // 🔍 新規追加: 高度な検索（将来の拡張用）
  advancedSearch: async (searchQuery: {
    query?: string;
    title?: string;
    content?: string;
    tags?: string[];
    categories?: number[];
    authors?: number[];
    dateRange?: {
      start: string;
      end: string;
    };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) => {
    console.log('🔍 高度な検索リクエスト:', searchQuery);
    const response = await apiClient.post('/api/contents/advanced-search', searchQuery);
    console.log('✅ 高度な検索レスポンス:', response.data);
    return response.data;
  },

  getContentById: async (id: string) => {
    const response = await apiClient.get(`/api/contents/${id}`);
    return response.data;
  },

  getContentsByAuthor: async (authorId: string) => {
    const response = await apiClient.get(`/api/contents/author/${authorId}`);
    return response.data;
  },

  getContentsByCategory: async (categoryId: string) => {
    const response = await apiClient.get(`/api/contents/category/${categoryId}`);
    return response.data;
  },

  createContent: async (contentData: any) => {
    const response = await apiClient.post('/api/contents', contentData);
    return response.data;
  },

  updateContent: async (id: string, contentData: any) => {
    const response = await apiClient.put(`/api/contents/${id}`, contentData);
    return response.data;
  },

  updateContentStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/api/contents/${id}/status`, { status });
    return response.data;
  },

  deleteContent: async (id: string) => {
    const response = await apiClient.delete(`/api/contents/${id}`);
    return response.data;
  },

  // 🔍 新規追加: 検索履歴関連
  saveSearchHistory: async (query: string) => {
    console.log('💾 検索履歴保存:', query);
    try {
      const response = await apiClient.post('/api/search/history', { query });
      console.log('✅ 検索履歴保存成功:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ 検索履歴保存は未実装またはエラー:', error);
      // エラーでも処理を続行（検索履歴は必須機能ではないため）
      return null;
    }
  },

  getSearchHistory: async () => {
    console.log('📚 検索履歴取得');
    try {
      const response = await apiClient.get('/api/search/history');
      console.log('✅ 検索履歴取得成功:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ 検索履歴取得は未実装またはエラー:', error);
      return { history: [] }; // 空の配列を返す
    }
  },

  // 🔍 新規追加: 人気検索キーワード
  getPopularSearchKeywords: async () => {
    console.log('🔥 人気検索キーワード取得');
    try {
      const response = await apiClient.get('/api/search/popular');
      console.log('✅ 人気検索キーワード取得成功:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ 人気検索キーワード取得は未実装またはエラー:', error);
      return { keywords: [] }; // 空の配列を返す
    }
  },

  // 🔍 新規追加: 検索候補（オートコンプリート用）
  getSearchSuggestions: async (query: string) => {
    console.log('💡 検索候補取得:', query);
    try {
      const response = await apiClient.get(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      console.log('✅ 検索候補取得成功:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ 検索候補取得は未実装またはエラー:', error);
      return { suggestions: [] }; // 空の配列を返す
    }
  },

  // 🔍 新規追加: 統計情報
  getCategoryStats: async () => {
    console.log('📊 カテゴリ統計取得');
    try {
      const response = await apiClient.get('/api/categories/stats');
      console.log('✅ カテゴリ統計取得成功:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ カテゴリ統計取得は未実装またはエラー:', error);
      // 既存のカテゴリ取得で代替
      const categories = await api.getCategories();
      return { 
        stats: categories.map((cat: any) => ({ 
          ...cat, 
          content_count: 0 
        })) 
      };
    }
  },

  getAuthorStats: async () => {
    console.log('📊 著者統計取得');
    try {
      const response = await apiClient.get('/api/authors/stats');
      console.log('✅ 著者統計取得成功:', response.data);
      return response.data;
    } catch (error) {
      console.warn('⚠️ 著者統計取得は未実装またはエラー:', error);
      // 既存のユーザー取得で代替
      const users = await api.getUsers();
      return { 
        stats: users.map((user: any) => ({ 
          ...user, 
          content_count: 0 
        })) 
      };
    }
  },

  // コメント関連
  getCommentById: async (id: string) => {
    const response = await apiClient.get(`/api/comments/${id}`);
    return response.data;
  },
  
  getCommentsByContentId: async (contentId: string) => {
    const response = await apiClient.get(`/api/contents/${contentId}/comments`);
    return response.data;
  },

  getReplies: async (parentId: string) => {
    const response = await apiClient.get(`/api/comments/parent/${parentId}/replies`);
    return response.data;
  },

  createComment: async (commentData: any) => {
    console.log('💬 Creating comment:', commentData);
    const response = await apiClient.post('/api/comments', commentData);
    console.log('✅ Comment created:', response.data);
    return response.data;
  },

  updateComment: async (id: string, commentData: any) => {
    const response = await apiClient.put(`/api/comments/${id}`, commentData);
    return response.data;
  },

  deleteComment: async (id: string) => {
    const response = await apiClient.delete(`/api/comments/${id}`);
    return response.data;
  },

  // 評価関連
  getRatingsByContent: async (contentId: string) => {
    const response = await apiClient.get(`/api/contents/${contentId}/ratings`);
    return response.data;
  },

  // 🔄 変更: getGoodStats（将来の新エンドポイント用）
  getGoodStats: async (contentId: string) => {
    console.log('📊 グッド統計取得:', contentId);
    console.log('⚠️ /goods エンドポイントが未実装のため、既存エンドポイントを使用');
    const response = await apiClient.get(`/api/contents/${contentId}/ratings/average`);
    console.log('✅ グッド統計レスポンス:', response.data);
    return response.data;
  },

  // 🔄 既存のエンドポイントを使用
  getAverageRating: async (contentId: string) => {
    console.log('📊 平均評価取得:', contentId);
    const response = await apiClient.get(`/api/contents/${contentId}/ratings/average`);
    console.log('✅ 平均評価レスポンス:', response.data);
    return response.data;
  },

  // 🔄 変更: getLikeStats → getGoodStats のエイリアス（下位互換性）
  getLikeStats: async (contentId: string) => {
    console.log('⚠️ getLikeStats は非推奨です。getGoodStats を使用してください。');
    return api.getGoodStats(contentId);
  },

  getRatingsByUser: async (userId: string) => {
    const response = await apiClient.get(`/api/users/${userId}/ratings`);
    return response.data;
  },

  // 評価作成・更新（グッド専用）
  createOrUpdateRating: async (contentId: number, value: number) => {
    console.log('🎯 グッド評価リクエスト:', { contentId, value });
    
    // value は常に1（グッド）に強制
    const requestData = {
      content_id: contentId,
      value: 1  // グッド専用なので常に1
    };
    
    console.log('📤 送信データ:', JSON.stringify(requestData, null, 2));
    
    const response = await apiClient.post('/api/ratings', requestData);
    console.log('✅ グッド評価レスポンス:', response.data);
    return response.data;
  },

  deleteRating: async (id: string) => {
    console.log('🗑️ 評価削除リクエスト:', id);
    const response = await apiClient.delete(`/api/ratings/${id}`);
    console.log('✅ 評価削除成功');
    return response.data;
  },

  // ヘルスチェック
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

// 🔍 検索関連のユーティリティ関数
export const searchUtils = {
  // 検索クエリの正規化
  normalizeQuery: (query: string): string => {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  },

  // 日付範囲のバリデーション
  validateDateRange: (start: string, end: string): boolean => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return startDate <= endDate;
  },

  // 検索パラメータの構築
  buildSearchParams: (filters: SearchFilters): URLSearchParams => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((item: any) => {
            params.append(`${key}[]`, item.toString());
          });
        } else {
          params.append(key, value.toString());
        }
      }
    });

    return params;
  },

  // 検索結果のハイライト（HTML文字列作成用）
  highlightSearchTerms: (text: string, query: string): string => {
    if (!query) return text;
    
    const terms = query.split(' ').filter(term => term.length > 0);
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });
    
    return highlightedText;
  },

  // 検索クエリの分析
  analyzeQuery: (query: string) => {
    const trimmed = query.trim();
    return {
      isEmpty: trimmed.length === 0,
      wordCount: trimmed.split(' ').filter(word => word.length > 0).length,
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(trimmed),
      isLongQuery: trimmed.length > 100
    };
  }
};

// 🔍 検索エラーハンドリング用のユーティリティ
export const searchErrorHandler = {
  handleSearchError: (error: any) => {
    console.error('🔍 検索エラー:', error);
    
    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error('検索パラメータが不正です');
        case 401:
          throw new Error('認証が必要です');
        case 404:
          throw new Error('検索結果が見つかりませんでした');
        case 429:
          throw new Error('検索回数の上限に達しました。しばらく待ってから再試行してください');
        case 500:
          throw new Error('サーバーエラーが発生しました');
        default:
          throw new Error('検索中にエラーが発生しました');
      }
    } else if (error.request) {
      throw new Error('ネットワークエラーが発生しました');
    } else {
      throw new Error('予期せぬエラーが発生しました');
    }
  }
};

export default apiClient;