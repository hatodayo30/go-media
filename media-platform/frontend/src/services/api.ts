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

  // ユーザー関連 - 修正版
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<UserApiResponse>>(
      "/api/users/me"
    );

    // レスポンス構造を適切に変換
    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.user,
      };
    }
    return {
      success: false,
      message: response.data.message || "ユーザー情報の取得に失敗しました",
      data: {} as User,
    };
  },

  updateUser: async (
    userData: UpdateUserRequest
  ): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<UserApiResponse>>(
      "/api/users/me",
      userData
    );

    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.user,
      };
    }
    return {
      success: false,
      message: response.data.message || "ユーザー情報の更新に失敗しました",
      data: {} as User,
    };
  },

  // 🆕 公開ユーザー一覧を取得
  getPublicUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get<ApiResponse<User[]>>(
      "/api/users/public"
    );
    return response.data;
  },

  // コンテンツ関連 - 修正版
  getContents: async (
    params?: ContentFilters
  ): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      "/api/contents",
      {
        params,
      }
    );

    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.contents,
      };
    }
    return {
      success: false,
      message: response.data.message || "コンテンツの取得に失敗しました",
      data: [],
    };
  },

  getPublishedContents: async (): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      "/api/contents?status=published"
    );

    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.contents,
      };
    }
    return {
      success: false,
      message: response.data.message || "公開コンテンツの取得に失敗しました",
      data: [],
    };
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
  ): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      `/api/contents?category_id=${categoryId}`
    );

    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.contents,
      };
    }
    return {
      success: false,
      message:
        response.data.message || "カテゴリ別コンテンツの取得に失敗しました",
      data: [],
    };
  },

  searchContents: async (
    params: SearchParams
  ): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<ContentsApiResponse>>(
      "/api/contents/search",
      { params }
    );

    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.contents,
      };
    }
    return {
      success: false,
      message: response.data.message || "コンテンツ検索に失敗しました",
      data: [],
    };
  },

  // カテゴリ関連 - 修正版
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await apiClient.get<ApiResponse<CategoriesApiResponse>>(
      "/api/categories"
    );

    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.categories,
      };
    }
    return {
      success: false,
      message:
        response.data.message || "カテゴリ別コンテンツの取得に失敗しました",
      data: [],
    };
  },

  // 評価関連 - 修正版
  getRatingsByUser: async (userId: string): Promise<ApiResponse<Rating[]>> => {
    const response = await apiClient.get<ApiResponse<RatingsApiResponse>>(
      `/api/users/${userId}/ratings`
    );

    if (response.data.success && response.data.data) {
      return {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data.ratings,
      };
    }
    return {
      success: false,
      message: response.data.message || "評価の取得に失敗しました",
      data: [],
    };
  },

  deleteRating: async (ratingId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/api/ratings/${ratingId}`
    );
    return response.data;
  },

  // コメント関連 - 修正版
  getCommentsByContentId: async (
    contentId: string
  ): Promise<ApiResponse<Comment[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<CommentsApiResponse>>(
        `/api/contents/${contentId}/comments`
      );

      if (response.data.success && response.data.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data.comments,
        };
      }
      // 修正: 適切なフォールバック
      return {
        success: false,
        message: response.data.message || "コメントの取得に失敗しました",
        data: [],
      };
    } catch (error: any) {
      return {
        data: [],
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

  // フォロー関連 - 修正版
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
  ): Promise<ApiResponse<FollowStats>> => {
    try {
      const params = currentUserId ? { current_user_id: currentUserId } : {};
      const response = await apiClient.get<ApiResponse<FollowStatsApiResponse>>(
        `/users/${userId}/follow-stats`,
        { params }
      );

      if (response.data.success && response.data.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data.followStats,
        };
      }
      return {
        success: false,
        message: response.data.message || "フォロー統計の取得に失敗しました",
        data: {
          followers_count: 0,
          following_count: 0,
          is_following: false,
          is_followed_by: false,
        },
      };
    } catch (error: any) {
      return {
        data: {
          followers_count: 0,
          following_count: 0,
          is_following: false,
          is_followed_by: false,
        },
        success: false,
        message: error.response?.data?.message || "Failed to get follow stats",
      };
    }
  },

  getFollowers: async (userId: number): Promise<ApiResponse<User[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<FollowersApiResponse>>(
        `/users/${userId}/followers`
      );

      if (response.data.success && response.data.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data.followers,
        };
      }
      return {
        success: false,
        message: response.data.message || "フォロワーの取得に失敗しました",
        data: [],
      };
    } catch (error: any) {
      return {
        data: [],
        success: false,
        message: error.response?.data?.message || "Failed to get followers",
      };
    }
  },

  getFollowing: async (userId: number): Promise<ApiResponse<User[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<FollowingApiResponse>>(
        `/users/${userId}/following`
      );

      if (response.data.success && response.data.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data.following,
        };
      }
      return {
        success: false,
        message:
          response.data.message || "フォロー中ユーザーの取得に失敗しました",
        data: [],
      };
    } catch (error: any) {
      return {
        data: [],
        success: false,
        message: error.response?.data?.message || "Failed to get following",
      };
    }
  },

  getFollowingFeed: async (
    userId: number,
    params?: FollowingFeedParams
  ): Promise<ApiResponse<Content[]>> => {
    try {
      const response = await apiClient.get<
        ApiResponse<FollowingFeedApiResponse>
      >(`/users/${userId}/following-feed`, { params });

      if (response.data.success && response.data.data) {
        return {
          success: response.data.success,
          message: response.data.message,
          data: response.data.data.feed,
        };
      }
      return {
        success: false,
        message:
          response.data.message || "フォロー中ユーザーの取得に失敗しました",
        data: [],
      };
    } catch (error: any) {
      return {
        data: [],
        success: false,
        message:
          error.response?.data?.message || "Failed to get following feed",
      };
    }
  },
};

export default api;
