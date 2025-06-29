import axios from "axios";
import type {
  ApiResponse,
  User,
  RegisterRequest,
  AuthResponse,
  UpdateUserRequest,
  Content,
  CreateContentRequest,
  UpdateContentRequest,
  ContentFilters,
  Category,
  Rating,
  SearchParams,
  Comment,
  CreateCommentRequest,
  Follow,
  FollowStats,
  FollowingFeedParams,
  AverageRating,
  UserApiResponse,
  ContentsApiResponse,
  CategoriesApiResponse,
  CommentsApiResponse,
  RatingsApiResponse,
  FollowStatsApiResponse,
  FollowersApiResponse,
  FollowingApiResponse,
  FollowingFeedApiResponse,
} from "../types";

// APIのベースURL - Docker環境に合わせて修正
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8082";

// デバッグ用ログ
console.log("🔗 API Base URL:", API_BASE_URL);

// Axiosインスタンスを作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10秒のタイムアウトを追加
});

// リクエストインターセプター（認証トークンを自動的に付与）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // デバッグ用ログ
    console.log(`🔗 ${config.method?.toUpperCase()} ${config.url}`, {
      hasToken: !!token,
      baseURL: config.baseURL,
    });

    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（エラーハンドリング）
apiClient.interceptors.response.use(
  (response) => {
    // 🔍 完全なレスポンス内容をデバッグ表示
    console.log(
      `✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${
        response.status
      }`,
      {
        status: response.status,
        dataType: typeof response.data,
        hasData: !!response.data,
        // 🆕 実際のデータ内容を表示
        actualData: response.data,
        // 🆕 データの構造を詳細表示
        dataStructure: response.data
          ? {
              keys: Object.keys(response.data),
              values: Object.values(response.data).map((v) => typeof v),
              stringified: JSON.stringify(response.data, null, 2),
            }
          : null,
      }
    );

    return response;
  },
  (error) => {
    // 詳細なエラーログ
    console.error("❌ API Error:", {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      // 認証エラーの場合、トークンを削除してログインページにリダイレクト
      console.warn("🔓 Authentication failed - redirecting to login");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// APIクライアント
export const api = {
  // 認証関連
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/api/users/login", {
      email,
      password,
    });
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      "/api/users/register",
      userData
    );
    return response.data;
  },

  // ユーザー関連
  getCurrentUser: async (): Promise<ApiResponse<UserApiResponse>> => {
    const response = await apiClient.get<ApiResponse<UserApiResponse>>(
      "/api/users/me"
    );
    return response.data;
  },

  updateUser: async (
    userData: UpdateUserRequest
  ): Promise<ApiResponse<UserApiResponse>> => {
    const response = await apiClient.put<ApiResponse<UserApiResponse>>(
      "/api/users/me",
      userData
    );
    return response.data;
  },

  // 🆕 公開ユーザー一覧を取得
  getPublicUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get<ApiResponse<User[]>>(
      "/api/users/public"
    );
    return response.data;
  },

  // コンテンツ関連
  getContents: async (
    params?: ContentFilters
  ): Promise<ApiResponse<ContentsApiResponse>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      "/api/contents",
      {
        params,
      }
    );
    return response.data;
  },

  getPublishedContents: async (): Promise<ApiResponse<ContentsApiResponse>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      "/api/contents?status=published"
    );
    return response.data;
  },

  getContentById: async (id: string): Promise<ApiResponse<Content>> => {
    const response = await apiClient.get<ApiResponse<Content>>(
      `/api/contents/${id}`
    );
    return response.data;
  },

  createContent: async (
    contentData: CreateContentRequest
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.post<ApiResponse<Content>>(
      "/api/contents",
      contentData
    );
    return response.data;
  },

  updateContent: async (
    id: string,
    contentData: UpdateContentRequest
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.put<ApiResponse<Content>>(
      `/api/contents/${id}`,
      contentData
    );
    return response.data;
  },

  updateContentStatus: async (
    id: string,
    status: string
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.patch<ApiResponse<Content>>(
      `/api/contents/${id}/status`,
      { status }
    );
    return response.data;
  },

  deleteContent: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/api/contents/${id}`
    );
    return response.data;
  },

  getContentsByCategory: async (
    categoryId: string
  ): Promise<ApiResponse<ContentsApiResponse>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      `/api/contents?category_id=${categoryId}`
    );
    return response.data;
  },

  searchContents: async (
    params: SearchParams
  ): Promise<ApiResponse<ContentsApiResponse>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      "/api/contents/search",
      { params }
    );
    return response.data;
  },

  // カテゴリ関連
  getCategories: async (): Promise<ApiResponse<CategoriesApiResponse>> => {
    const response = await apiClient.get<ApiResponse<CategoriesApiResponse>>(
      "/api/categories"
    );
    return response.data;
  },

  // 評価関連
  getRatingsByUser: async (
    userId: string
  ): Promise<ApiResponse<RatingsApiResponse>> => {
    const response = await apiClient.get<ApiResponse<RatingsApiResponse>>(
      `/api/users/${userId}/ratings`
    );
    return response.data;
  },

  deleteRating: async (ratingId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/api/ratings/${ratingId}`
    );
    return response.data;
  },

  // コメント関連
  getCommentsByContentId: async (
    contentId: string
  ): Promise<ApiResponse<CommentsApiResponse>> => {
    try {
      const response = await apiClient.get<ApiResponse<CommentsApiResponse>>(
        `/api/contents/${contentId}/comments`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: { comments: [] },
        success: false,
        message: error.response?.data?.message || "Failed to get comments",
      };
    }
  },

  createComment: async (
    commentData: CreateCommentRequest
  ): Promise<ApiResponse<Comment>> => {
    try {
      const response = await apiClient.post<ApiResponse<Comment>>(
        "/api/comments",
        commentData
      );
      return response.data;
    } catch (error: any) {
      return {
        data: {} as Comment,
        success: false,
        message: error.response?.data?.message || "Failed to create comment",
      };
    }
  },

  // 評価関連の追加メソッド
  getAverageRating: async (
    contentId: string
  ): Promise<ApiResponse<AverageRating>> => {
    try {
      const response = await apiClient.get<ApiResponse<AverageRating>>(
        `/api/contents/${contentId}/ratings/average`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: { average: 0, count: 0, like_count: 0 },
        success: false,
        message:
          error.response?.data?.message || "Failed to get average rating",
      };
    }
  },

  createOrUpdateRating: async (
    contentId: number,
    value: number
  ): Promise<ApiResponse<Rating>> => {
    try {
      const response = await apiClient.post<ApiResponse<Rating>>(
        "/api/ratings/create-or-update",
        {
          content_id: contentId,
          value,
        }
      );
      return response.data;
    } catch (error: any) {
      return {
        data: {} as Rating,
        success: false,
        message:
          error.response?.data?.message || "Failed to create or update rating",
      };
    }
  },

  // フォロー関連
  followUser: async (userId: number): Promise<ApiResponse<Follow>> => {
    try {
      const response = await apiClient.post<ApiResponse<Follow>>(
        `/users/${userId}/follow`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: {} as Follow,
        success: false,
        message: error.response?.data?.message || "Failed to follow user",
      };
    }
  },

  unfollowUser: async (userId: number): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/users/${userId}/follow`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: undefined,
        success: false,
        message: error.response?.data?.message || "Failed to unfollow user",
      };
    }
  },

  getFollowStats: async (
    userId: number,
    currentUserId?: number
  ): Promise<ApiResponse<FollowStatsApiResponse>> => {
    try {
      const params = currentUserId ? { current_user_id: currentUserId } : {};
      const response = await apiClient.get<ApiResponse<FollowStatsApiResponse>>(
        `/users/${userId}/follow-stats`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      return {
        data: {
          followStats: {
            followers_count: 0,
            following_count: 0,
            is_following: false,
            is_followed_by: false,
          },
        },
        success: false,
        message: error.response?.data?.message || "Failed to get follow stats",
      };
    }
  },

  getFollowers: async (
    userId: number
  ): Promise<ApiResponse<FollowersApiResponse>> => {
    try {
      const response = await apiClient.get<ApiResponse<FollowersApiResponse>>(
        `/users/${userId}/followers`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: { followers: [] },
        success: false,
        message: error.response?.data?.message || "Failed to get followers",
      };
    }
  },

  getFollowing: async (
    userId: number
  ): Promise<ApiResponse<FollowingApiResponse>> => {
    try {
      const response = await apiClient.get<ApiResponse<FollowingApiResponse>>(
        `/users/${userId}/following`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: { following: [] },
        success: false,
        message: error.response?.data?.message || "Failed to get following",
      };
    }
  },

  getFollowingFeed: async (
    userId: number,
    params?: FollowingFeedParams
  ): Promise<ApiResponse<FollowingFeedApiResponse>> => {
    try {
      const response = await apiClient.get<
        ApiResponse<FollowingFeedApiResponse>
      >(`/users/${userId}/following-feed`, { params });
      return response.data;
    } catch (error: any) {
      return {
        data: { feed: [] },
        success: false,
        message:
          error.response?.data?.message || "Failed to get following feed",
      };
    }
  },
};

export default api;
