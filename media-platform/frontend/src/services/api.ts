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

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<any>("/api/users/me");

    console.log("🔍 getCurrentUser raw response:", response.data);

    // ✅ バックエンドの実際の構造に合わせる
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data?.user
    ) {
      return {
        success: true,
        message: "ユーザー情報の取得に成功しました",
        data: response.data.data.user,
      };
    }

    return {
      success: false,
      message: response.data?.error || "ユーザー情報の取得に失敗しました",
      data: {} as User,
    };
  },

  updateUser: async (
    userData: UpdateUserRequest
  ): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<any>("/api/users/me", userData);

    console.log("🔍 updateUser raw response:", response.data);

    // ✅ バックエンドの実際の構造に合わせる
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data?.user
    ) {
      return {
        success: true,
        message: "ユーザー情報の更新に成功しました",
        data: response.data.data.user,
      };
    }

    return {
      success: false,
      message: response.data?.error || "ユーザー情報の更新に失敗しました",
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
    const response = await apiClient.get("/api/contents", {
      params,
    });

    console.log("🔍 getContents raw response:", response.data);

    // ✅ バックエンドの実際の構造に合わせる
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data
    ) {
      return {
        success: true,
        message: "コンテンツの取得に成功しました",
        data: response.data.data.contents || [],
      };
    }

    return {
      success: false,
      message: response.data?.error || "コンテンツの取得に失敗しました",
      data: [],
    };
  },

  getPublishedContents: async (): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get("/api/contents", {
      params: { status: "published" },
    });

    console.log("🔍 getPublishedContents raw response:", response.data);

    // ✅ 修正
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data
    ) {
      return {
        success: true,
        message: "公開コンテンツの取得に成功しました",
        data: response.data.data.contents || [],
      };
    }

    return {
      success: false,
      message: response.data?.error || "公開コンテンツの取得に失敗しました",
      data: [],
    };
  },

  getContentById: async (id: string): Promise<ApiResponse<Content>> => {
    console.log("🔍 Fetching content with ID:", id);

    const response = await apiClient.get(`/api/contents/${id}`);

    console.log("📦 getContentById raw response:", response.data);

    // ✅ Backend のレスポンス構造: { status: "success", data: { content: {...} } }
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data &&
      response.data.data.content
    ) {
      return {
        success: true,
        message: "コンテンツの取得に成功しました",
        data: response.data.data.content, // ✅ data.content を返す
      };
    }

    return {
      success: false,
      message: response.data?.error || "コンテンツの取得に失敗しました",
      data: null as any,
    };
  },

  createContent: async (
    contentData: CreateContentRequest
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.post<any>("/api/contents", contentData);

    console.log("🔍 createContent raw response:", response.data);

    // バックエンドのレスポンス構造: { status: "success", data: { content: {...} } }
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data
    ) {
      return {
        success: true,
        message: "コンテンツの作成に成功しました",
        data: response.data.data.content,
      };
    }

    // エラーの場合
    return {
      success: false,
      message: response.data?.error || "コンテンツの作成に失敗しました",
      data: {} as Content,
    };
  },

  updateContent: async (
    id: string,
    contentData: UpdateContentRequest
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.put<any>(
      `/api/contents/${id}`,
      contentData
    );

    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data
    ) {
      return {
        success: true,
        message: "コンテンツの更新に成功しました",
        data: response.data.data.content,
      };
    }

    return {
      success: false,
      message: response.data?.error || "コンテンツの更新に失敗しました",
      data: {} as Content,
    };
  },

  updateContentStatus: async (
    id: string,
    status: string
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.patch<any>(`/api/contents/${id}/status`, {
      status,
    });

    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data
    ) {
      return {
        success: true,
        message: "ステータスの更新に成功しました",
        data: response.data.data.content,
      };
    }

    return {
      success: false,
      message: response.data?.error || "ステータスの更新に失敗しました",
      data: {} as Content,
    };
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
    const response = await apiClient.get(
      `/api/contents/category/${categoryId}`
    );

    console.log("🔍 getContentsByCategory raw response:", response.data);

    // ✅ 修正
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data
    ) {
      return {
        success: true,
        message: "カテゴリ別コンテンツの取得に成功しました",
        data: response.data.data.contents || [],
      };
    }

    return {
      success: false,
      message:
        response.data?.error || "カテゴリ別コンテンツの取得に失敗しました",
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
    const response = await apiClient.get<any>(`/api/users/${userId}/ratings`);

    console.log("🔍 getRatingsByUser raw response:", response.data);

    // ✅ バックエンドの実際の構造に合わせる
    if (
      response.data &&
      response.data.status === "success" &&
      response.data.data?.ratings
    ) {
      return {
        success: true,
        message: "評価の取得に成功しました",
        data: response.data.data.ratings,
      };
    }

    return {
      success: false,
      message: response.data?.error || "評価の取得に失敗しました",
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
      const response = await apiClient.get<any>(
        `/api/contents/${contentId}/comments`
      );

      console.log("🔍 getCommentsByContentId raw response:", response.data);

      // ✅ バックエンドの実際の構造に合わせる
      if (
        response.data &&
        response.data.status === "success" &&
        response.data.data?.comments
      ) {
        return {
          success: true,
          message: "コメントの取得に成功しました",
          data: response.data.data.comments,
        };
      }

      return {
        success: false,
        message: response.data?.error || "コメントの取得に失敗しました",
        data: [],
      };
    } catch (error: any) {
      console.error("❌ getCommentsByContentId error:", error);
      return {
        data: [],
        success: false,
        message: error.response?.data?.error || "Failed to get comments",
      };
    }
  },

  createComment: async (
    commentData: CreateCommentRequest
  ): Promise<ApiResponse<Comment>> => {
    try {
      const response = await apiClient.post<any>("/api/comments", commentData);

      console.log("🔍 createComment raw response:", response.data);

      // ✅ バックエンドの実際の構造に合わせる
      if (
        response.data &&
        response.data.status === "success" &&
        response.data.data?.comment
      ) {
        return {
          success: true,
          message: "コメントの作成に成功しました",
          data: response.data.data.comment,
        };
      }

      return {
        success: false,
        message: response.data?.error || "コメントの作成に失敗しました",
        data: {} as Comment,
      };
    } catch (error: any) {
      console.error("❌ createComment error:", error);
      return {
        data: {} as Comment,
        success: false,
        message: error.response?.data?.error || "Failed to create comment",
      };
    }
  },

  // 評価関連の追加メソッド
  getAverageRating: async (
    contentId: string
  ): Promise<ApiResponse<AverageRating>> => {
    try {
      // ✅ エンドポイントを修正
      const response = await apiClient.get<any>(
        `/api/contents/${contentId}/ratings/stats`
      );

      console.log("🔍 getAverageRating raw response:", response.data);

      // ✅ バックエンドの実際の構造に合わせる
      if (
        response.data &&
        response.data.status === "success" &&
        response.data.data
      ) {
        // バックエンドは { good_count, count, content_id } を返す
        return {
          success: true,
          message: "評価統計の取得に成功しました",
          data: {
            average: response.data.data.count > 0 ? 1 : 0, // グッドのみなので常に1または0
            count: response.data.data.count,
            like_count: response.data.data.good_count,
          },
        };
      }

      return {
        data: { average: 0, count: 0, like_count: 0 },
        success: false,
        message: response.data?.error || "評価統計の取得に失敗しました",
      };
    } catch (error: any) {
      console.error("❌ getAverageRating error:", error);
      return {
        data: { average: 0, count: 0, like_count: 0 },
        success: false,
        message: error.response?.data?.error || "Failed to get average rating",
      };
    }
  },

  createOrUpdateRating: async (
    contentId: number,
    value: number
  ): Promise<ApiResponse<Rating>> => {
    try {
      const response = await apiClient.post<any>(
        "/api/ratings/create-or-update",
        {
          content_id: contentId,
          value,
        }
      );

      console.log("🔍 createOrUpdateRating raw response:", response.data);

      // ✅ バックエンドの実際の構造に合わせる
      if (
        response.data &&
        response.data.status === "success" &&
        response.data.data
      ) {
        // ✅ 削除時と作成時の両方に対応
        if (response.data.data.action === "removed") {
          // 評価が削除された場合
          return {
            success: true,
            message: response.data.data.message || "評価を取り消しました",
            data: null as any, // null を返す
          };
        }

        // 評価が作成された場合
        if (response.data.data.rating) {
          return {
            success: true,
            message: response.data.data.message || "評価を追加しました",
            data: response.data.data.rating,
          };
        }
      }

      return {
        success: false,
        message: response.data?.error || "評価の更新に失敗しました",
        data: {} as Rating,
      };
    } catch (error: any) {
      console.error("❌ createOrUpdateRating error:", error);
      return {
        data: {} as Rating,
        success: false,
        message:
          error.response?.data?.error || "Failed to create or update rating",
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
      // ✅ エンドポイントを修正 - userIdは不要
      const response = await apiClient.get<any>(
        "/api/users/following-feed", // ✅ /api を追加、userIdを削除
        { params }
      );

      console.log("🔍 getFollowingFeed raw response:", response.data);

      // ✅ バックエンドの実際の構造に合わせる
      if (
        response.data &&
        response.data.status === "success" &&
        response.data.data?.feed
      ) {
        return {
          success: true,
          message: "フォローフィードの取得に成功しました",
          data: response.data.data.feed,
        };
      }

      return {
        success: false,
        message:
          response.data?.error || "フォロー中ユーザーの取得に失敗しました",
        data: [],
      };
    } catch (error: any) {
      console.error("❌ getFollowingFeed error:", error);
      return {
        data: [],
        success: false,
        message: error.response?.data?.error || "Failed to get following feed",
      };
    }
  },
};

export default api;
