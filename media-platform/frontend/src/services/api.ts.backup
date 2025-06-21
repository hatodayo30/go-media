import axios from "axios";

// APIのベースURL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8082";

// Axiosインスタンスの作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// リクエストインターセプター（JWTトークンの自動付与）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("🔐 Request interceptor - Token check:", {
      hasToken: !!token,
      tokenLength: token?.length,
      url: config.url,
      method: config.method,
    });

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        "✅ Authorization header set:",
        `Bearer ${token.substring(0, 20)}...`
      );
    } else {
      console.warn("⚠️ No token found in localStorage");
    }
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（一時的に無効化してデバッグ用ログ追加）
apiClient.interceptors.response.use(
  (response) => {
    console.log("✅ Response interceptor - Success:", {
      status: response.status,
      url: response.config.url,
      method: response.config.method,
    });
    return response;
  },
  (error) => {
    console.error("❌ Response interceptor - Error:", {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
    });

    if (error.response?.status === 401) {
      console.warn(
        "🚫 401 Unauthorized detected, but NOT redirecting for debugging"
      );
      // 一時的にリダイレクトを無効化
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// TypeScript型定義
export interface User {
  id: number;
  username: string;
  email: string;
  bio: string;
  avatar?: string; // オプショナル
  role: string;
  created_at: string;
  updated_at?: string; // オプショナル
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface Content {
  id: number;
  title: string;
  body: string;
  type: string;
  author?: User; // User型を参照
  category?: Category; // Category型を参照
  status: string;
  view_count: number;
  published_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface SearchFilters {
  q: string;
  category_id?: number;
  author_id?: number;
  date_start?: string;
  date_end?: string;
  sort_by?: "date" | "popularity" | "rating";
  page?: number;
  limit?: number;
}

export interface SearchResult {
  contents: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchSuggestion {
  id: number;
  text: string;
  type: "content" | "category" | "author";
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
  trend: "up" | "down" | "stable";
}

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  follower?: User;
  following?: User;
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface FeedParams {
  page?: number;
  limit?: number;
  sort_by?: "date" | "popularity";
}

// API関数の定義
export const api = {
  // 認証関連
  login: async (email: string, password: string) => {
    const response = await apiClient.post("/api/users/login", {
      email,
      password,
    });
    return response.data;
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    bio?: string;
  }) => {
    const response = await apiClient.post("/api/users/register", userData);
    return response.data;
  },

  // ユーザー関連
  getCurrentUser: async () => {
    const response = await apiClient.get("/api/users/me");
    return response.data;
  },

  updateUser: async (userData: any) => {
    const response = await apiClient.put("/api/users/me", userData);
    return response.data;
  },

  getAllUsers: async () => {
    const response = await apiClient.get("/api/users");
    return response.data;
  },

  // 🔍 新規追加: 検索機能で使用するユーザー一覧（著者フィルター用）
  getUsers: async () => {
    console.log("👥 ユーザー一覧取得（著者フィルター用）");
    const response = await apiClient.get("/api/users");
    console.log("✅ ユーザー一覧レスポンス:", response.data);
    return response.data;
  },

  // カテゴリ関連
  getCategories: async () => {
    const response = await apiClient.get("/api/categories");
    return response.data;
  },

  getCategoryById: async (id: string) => {
    const response = await apiClient.get(`/api/categories/${id}`);
    return response.data;
  },

  createCategory: async (categoryData: any) => {
    const response = await apiClient.post("/api/categories", categoryData);
    return response.data;
  },

  // コンテンツ関連
  getContents: async (params?: any) => {
    console.log("🔍 API リクエスト params:", params);
    const response = await apiClient.get("/api/contents", { params });
    console.log("📥 API レスポンス:", response.data);
    return response.data;
  },

  getPublishedContents: async () => {
    const response = await apiClient.get("/api/contents/published");
    return response.data;
  },

  getTrendingContents: async () => {
    const response = await apiClient.get("/api/contents/trending");
    return response.data;
  },

  // 🔍 拡張: 検索機能対応
  searchContents: async (params: SearchFilters | string) => {
    console.log("🔍 検索リクエスト:", params);

    let searchParams: URLSearchParams;

    // 文字列の場合（従来の互換性維持）
    if (typeof params === "string") {
      searchParams = new URLSearchParams({ q: params });
    } else {
      // オブジェクトの場合（新しい拡張機能）
      searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString());
        }
      });
    }

    console.log("📤 検索パラメータ:", searchParams.toString());
    const response = await apiClient.get(
      `/api/contents/search?${searchParams.toString()}`
    );
    console.log("✅ 検索レスポンス:", response.data);
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
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) => {
    console.log("🔍 高度な検索リクエスト:", searchQuery);
    const response = await apiClient.post(
      "/api/contents/advanced-search",
      searchQuery
    );
    console.log("✅ 高度な検索レスポンス:", response.data);
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
    const response = await apiClient.get(
      `/api/contents/category/${categoryId}`
    );
    return response.data;
  },

  createContent: async (contentData: any) => {
    const response = await apiClient.post("/api/contents", contentData);
    return response.data;
  },

  updateContent: async (id: string, contentData: any) => {
    const response = await apiClient.put(`/api/contents/${id}`, contentData);
    return response.data;
  },

  updateContentStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/api/contents/${id}/status`, {
      status,
    });
    return response.data;
  },

  deleteContent: async (id: string) => {
    const response = await apiClient.delete(`/api/contents/${id}`);
    return response.data;
  },

  // 🔍 新規追加: 検索履歴関連
  saveSearchHistory: async (query: string) => {
    console.log("💾 検索履歴保存:", query);
    try {
      const response = await apiClient.post("/api/search/history", { query });
      console.log("✅ 検索履歴保存成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ 検索履歴保存は未実装またはエラー:", error);
      // エラーでも処理を続行（検索履歴は必須機能ではないため）
      return null;
    }
  },

  getSearchHistory: async () => {
    console.log("📚 検索履歴取得");
    try {
      const response = await apiClient.get("/api/search/history");
      console.log("✅ 検索履歴取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ 検索履歴取得は未実装またはエラー:", error);
      return { history: [] }; // 空の配列を返す
    }
  },

  // 🔍 新規追加: 人気検索キーワード
  getPopularSearchKeywords: async () => {
    console.log("🔥 人気検索キーワード取得");
    try {
      const response = await apiClient.get("/api/search/popular");
      console.log("✅ 人気検索キーワード取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ 人気検索キーワード取得は未実装またはエラー:", error);
      return { keywords: [] }; // 空の配列を返す
    }
  },

  // 🔍 新規追加: 検索候補（オートコンプリート用）
  getSearchSuggestions: async (query: string) => {
    console.log("💡 検索候補取得:", query);
    try {
      const response = await apiClient.get(
        `/api/search/suggestions?q=${encodeURIComponent(query)}`
      );
      console.log("✅ 検索候補取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ 検索候補取得は未実装またはエラー:", error);
      return { suggestions: [] }; // 空の配列を返す
    }
  },

  // 🔍 新規追加: 統計情報
  getCategoryStats: async () => {
    console.log("📊 カテゴリ統計取得");
    try {
      const response = await apiClient.get("/api/categories/stats");
      console.log("✅ カテゴリ統計取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ カテゴリ統計取得は未実装またはエラー:", error);
      // 既存のカテゴリ取得で代替
      const categories = await api.getCategories();
      return {
        stats: categories.map((cat: any) => ({
          ...cat,
          content_count: 0,
        })),
      };
    }
  },

  getAuthorStats: async () => {
    console.log("📊 著者統計取得");
    try {
      const response = await apiClient.get("/api/authors/stats");
      console.log("✅ 著者統計取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ 著者統計取得は未実装またはエラー:", error);
      // 既存のユーザー取得で代替
      const users = await api.getUsers();
      return {
        stats: users.map((user: any) => ({
          ...user,
          content_count: 0,
        })),
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
    const response = await apiClient.get(
      `/api/comments/parent/${parentId}/replies`
    );
    return response.data;
  },

  createComment: async (commentData: any) => {
    console.log("💬 Creating comment:", commentData);
    const response = await apiClient.post("/api/comments", commentData);
    console.log("✅ Comment created:", response.data);
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
    console.log("📊 グッド統計取得:", contentId);
    console.log(
      "⚠️ /goods エンドポイントが未実装のため、既存エンドポイントを使用"
    );
    const response = await apiClient.get(
      `/api/contents/${contentId}/ratings/average`
    );
    console.log("✅ グッド統計レスポンス:", response.data);
    return response.data;
  },

  // 🔄 既存のエンドポイントを使用
  getAverageRating: async (contentId: string) => {
    console.log("📊 平均評価取得:", contentId);
    const response = await apiClient.get(
      `/api/contents/${contentId}/ratings/average`
    );
    console.log("✅ 平均評価レスポンス:", response.data);
    return response.data;
  },

  // 🔄 変更: getLikeStats → getGoodStats のエイリアス（下位互換性）
  getLikeStats: async (contentId: string) => {
    console.log(
      "⚠️ getLikeStats は非推奨です。getGoodStats を使用してください。"
    );
    return api.getGoodStats(contentId);
  },

  getRatingsByUser: async (userId: string) => {
    const response = await apiClient.get(`/api/users/${userId}/ratings`);
    return response.data;
  },

  // 評価作成・更新（グッド専用）
  createOrUpdateRating: async (contentId: number, value: number) => {
    console.log("🎯 グッド評価リクエスト:", { contentId, value });

    // value は常に1（グッド）に強制
    const requestData = {
      content_id: contentId,
      value: 1, // グッド専用なので常に1
    };

    console.log("📤 送信データ:", JSON.stringify(requestData, null, 2));

    const response = await apiClient.post("/api/ratings", requestData);
    console.log("✅ グッド評価レスポンス:", response.data);
    return response.data;
  },

  deleteRating: async (id: string) => {
    console.log("🗑️ 評価削除リクエスト:", id);
    const response = await apiClient.delete(`/api/ratings/${id}`);
    console.log("✅ 評価削除成功");
    return response.data;
  },

  // ヘルスチェック
  healthCheck: async () => {
    const response = await apiClient.get("/health");
    return response.data;
  },
  // ユーザーをフォローする
  followUser: async (userId: number) => {
    console.log("👥 ユーザーフォローリクエスト:", userId);
    const response = await apiClient.post("/api/follows", {
      following_id: userId,
    });
    console.log("✅ フォロー成功:", response.data);
    return response.data;
  },

  // ユーザーのフォローを解除する
  unfollowUser: async (userId: number) => {
    console.log("🚫 ユーザーアンフォローリクエスト:", userId);
    const response = await apiClient.delete(`/api/follows/${userId}`);
    console.log("✅ アンフォロー成功:", response.data);
    return response.data;
  },

  // フォロー統計情報を取得する
  getFollowStats: async (userId: number, currentUserId?: number) => {
    console.log("📊 フォロー統計取得:", { userId, currentUserId });

    const params: any = {};
    if (currentUserId) {
      params.current_user_id = currentUserId;
    }

    const response = await apiClient.get(`/api/users/${userId}/follow-stats`, {
      params,
    });
    console.log("✅ フォロー統計取得成功:", response.data);
    return response.data;
  },

  // ユーザーのフォロワー一覧を取得する
  getFollowers: async (
    userId: number,
    params?: { page?: number; limit?: number }
  ) => {
    console.log("👥 フォロワー一覧取得:", userId, params);

    const queryParams = {
      page: params?.page || 1,
      limit: params?.limit || 20,
    };

    const response = await apiClient.get(`/api/users/${userId}/followers`, {
      params: queryParams,
    });
    console.log("✅ フォロワー一覧取得成功:", response.data);
    return response.data?.followers || response.data || [];
  },

  // ユーザーのフォロー中一覧を取得する
  getFollowing: async (
    userId: number,
    params?: { page?: number; limit?: number }
  ) => {
    console.log("➡️ フォロー中一覧取得:", userId, params);

    const queryParams = {
      page: params?.page || 1,
      limit: params?.limit || 20,
    };

    const response = await apiClient.get(`/api/users/${userId}/following`, {
      params: queryParams,
    });
    console.log("✅ フォロー中一覧取得成功:", response.data);
    return response.data?.following || response.data || [];
  },

  // フォロー中ユーザーの投稿フィードを取得する
  getFollowingFeed: async (userId: number, params?: FeedParams) => {
    console.log("📡 フォロー中フィード取得:", userId, params);

    const queryParams = {
      page: params?.page || 1,
      limit: params?.limit || 10,
      sort_by: params?.sort_by || "date",
    };

    const response = await apiClient.get(
      `/api/users/${userId}/following-feed`,
      {
        params: queryParams,
      }
    );
    console.log("✅ フォロー中フィード取得成功:", response.data);
    return response.data;
  },

  // 相互フォロー関係を確認する
  getMutualFollows: async (userId: number, targetUserId: number) => {
    console.log("🔄 相互フォロー確認:", { userId, targetUserId });

    const response = await apiClient.get(
      `/api/users/${userId}/mutual-follows/${targetUserId}`
    );
    console.log("✅ 相互フォロー確認成功:", response.data);
    return response.data;
  },

  // フォロー推奨ユーザーを取得する
  getRecommendedUsers: async (userId: number, limit: number = 10) => {
    console.log("💡 推奨ユーザー取得:", { userId, limit });

    try {
      const response = await apiClient.get(
        `/api/users/${userId}/recommendations`,
        {
          params: { limit },
        }
      );
      console.log("✅ 推奨ユーザー取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ 推奨ユーザー取得は未実装またはエラー:", error);
      return { users: [] }; // 空の配列を返す
    }
  },

  // フォロー履歴を取得する
  getFollowHistory: async (
    userId: number,
    params?: { page?: number; limit?: number }
  ) => {
    console.log("📜 フォロー履歴取得:", userId, params);

    try {
      const queryParams = {
        page: params?.page || 1,
        limit: params?.limit || 20,
      };

      const response = await apiClient.get(
        `/api/users/${userId}/follow-history`,
        {
          params: queryParams,
        }
      );
      console.log("✅ フォロー履歴取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ フォロー履歴取得は未実装またはエラー:", error);
      return { history: [] }; // 空の配列を返す
    }
  },

  // フォロー通知設定を更新する
  updateFollowNotificationSettings: async (settings: {
    new_follower_notification?: boolean;
    following_post_notification?: boolean;
  }) => {
    console.log("🔔 フォロー通知設定更新:", settings);

    try {
      const response = await apiClient.put(
        "/api/users/follow-notification-settings",
        settings
      );
      console.log("✅ フォロー通知設定更新成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ フォロー通知設定更新は未実装またはエラー:", error);
      return null;
    }
  },

  // 一括フォロー操作
  bulkFollowUsers: async (userIds: number[]) => {
    console.log("📦 一括フォローリクエスト:", userIds);

    try {
      const response = await apiClient.post("/api/follows/bulk", {
        user_ids: userIds,
      });
      console.log("✅ 一括フォロー成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ 一括フォローは未実装またはエラー:", error);
      throw error;
    }
  },

  // フォロー関係の分析データを取得
  getFollowAnalytics: async (userId: number) => {
    console.log("📈 フォロー分析データ取得:", userId);

    try {
      const response = await apiClient.get(
        `/api/users/${userId}/follow-analytics`
      );
      console.log("✅ フォロー分析データ取得成功:", response.data);
      return response.data;
    } catch (error) {
      console.warn("⚠️ フォロー分析データ取得は未実装またはエラー:", error);
      return {
        follow_growth: [],
        engagement_stats: {},
        popular_content: [],
      };
    }
  },
};

// 🔍 検索関連のユーティリティ関数
export const searchUtils = {
  // 検索クエリの正規化
  normalizeQuery: (query: string): string => {
    return query.trim().toLowerCase().replace(/\s+/g, " ");
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
      if (value !== undefined && value !== null && value !== "") {
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

    const terms = query.split(" ").filter((term) => term.length > 0);
    let highlightedText = text;

    terms.forEach((term) => {
      const regex = new RegExp(`(${term})`, "gi");
      highlightedText = highlightedText.replace(regex, "<mark>$1</mark>");
    });

    return highlightedText;
  },

  // 検索クエリの分析
  analyzeQuery: (query: string) => {
    const trimmed = query.trim();
    return {
      isEmpty: trimmed.length === 0,
      wordCount: trimmed.split(" ").filter((word) => word.length > 0).length,
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(trimmed),
      isLongQuery: trimmed.length > 100,
    };
  },
};

export const followUtils = {
  // フォロー関係の確認
  checkFollowRelationship: (
    followers: Follow[],
    following: Follow[],
    userId: number,
    targetUserId: number
  ) => {
    const isFollowing = following.some((f) => f.following_id === targetUserId);
    const isFollower = followers.some((f) => f.follower_id === targetUserId);

    return {
      isFollowing,
      isFollower,
      isMutual: isFollowing && isFollower,
    };
  },

  // フォロー状態の文字列化
  getFollowStatusText: (isFollowing: boolean, isFollower: boolean) => {
    if (isFollowing && isFollower) return "相互フォロー";
    if (isFollowing) return "フォロー中";
    if (isFollower) return "フォロワー";
    return "フォローなし";
  },

  // フォロー日時のフォーマット
  formatFollowDate: (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "今日";
    if (diffDays <= 7) return `${diffDays}日前`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}週間前`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)}ヶ月前`;
    return `${Math.ceil(diffDays / 365)}年前`;
  },

  // フォロー数の表示形式
  formatFollowCount: (count: number) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  },
};

// フォロー関連のエラーハンドリング
export const followErrorHandler = {
  handleFollowError: (error: any) => {
    console.error("👥 フォローエラー:", error);

    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error("無効なフォローリクエストです");
        case 401:
          throw new Error("ログインが必要です");
        case 403:
          throw new Error("このユーザーをフォローする権限がありません");
        case 404:
          throw new Error("ユーザーが見つかりません");
        case 409:
          throw new Error("既にフォロー済みです");
        case 429:
          throw new Error("フォロー操作の回数制限に達しました");
        default:
          throw new Error("フォロー操作に失敗しました");
      }
    } else if (error.request) {
      throw new Error("ネットワークエラーが発生しました");
    } else {
      throw new Error("予期せぬエラーが発生しました");
    }
  },
};

// 🔍 検索エラーハンドリング用のユーティリティ
export const searchErrorHandler = {
  handleSearchError: (error: any) => {
    console.error("🔍 検索エラー:", error);

    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error("検索パラメータが不正です");
        case 401:
          throw new Error("認証が必要です");
        case 404:
          throw new Error("検索結果が見つかりませんでした");
        case 429:
          throw new Error(
            "検索回数の上限に達しました。しばらく待ってから再試行してください"
          );
        case 500:
          throw new Error("サーバーエラーが発生しました");
        default:
          throw new Error("検索中にエラーが発生しました");
      }
    } else if (error.request) {
      throw new Error("ネットワークエラーが発生しました");
    } else {
      throw new Error("予期せぬエラーが発生しました");
    }
  },
};

export default apiClient;
