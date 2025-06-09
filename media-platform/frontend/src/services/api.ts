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

  searchContents: async (query: string) => {
    const response = await apiClient.get('/api/contents/search', { params: { q: query } });
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

  // 評価関連（既に実装済みの場合はスキップ）
  getRatingsByContent: async (contentId: string) => {
    const response = await apiClient.get(`/api/contents/${contentId}/ratings`);
    return response.data;
  },

  getAverageRating: async (contentId: string) => {
    const response = await apiClient.get(`/api/contents/${contentId}/rating/average`);
    return response.data;
  },

  getRatingsByUser: async (userId: string) => {
    const response = await apiClient.get(`/api/users/${userId}/ratings`);
    return response.data;
  },

  createOrUpdateRating: async (ratingData: any) => {
    const response = await apiClient.post('/api/ratings', ratingData);
    return response.data;
  },

  deleteRating: async (id: string) => {
    const response = await apiClient.delete(`/api/ratings/${id}`);
    return response.data;
  },

  // ヘルスチェック
  healthCheck: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

export default apiClient;