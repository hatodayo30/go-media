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
  UpdateCommentRequest,
  Follow,
  FollowStats,
  FollowingFeedParams,
  AverageRating,
} from "../types";

// APIのベースURL
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8003";

// Axiosインスタンスを作成
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// リクエストインターセプター（認証トークンを自動的に付与）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（エラーハンドリング）
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラーの場合、トークンを削除してログインページにリダイレクト
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
    const response = await apiClient.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(
      "/auth/register",
      userData
    );
    return response.data;
  },

  // ユーザー関連
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>("/users/me");
    return response.data;
  },

  updateUser: async (
    userData: UpdateUserRequest
  ): Promise<ApiResponse<User>> => {
    const response = await apiClient.put<ApiResponse<User>>(
      "/users/me",
      userData
    );
    return response.data;
  },

  getUsers: async (): Promise<ApiResponse<User[]>> => {
    const response = await apiClient.get<ApiResponse<User[]>>("/users");
    return response.data;
  },

  // コンテンツ関連
  getContents: async (
    params?: ContentFilters
  ): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<Content[]>>("/contents", {
      params,
    });
    return response.data;
  },

  getPublishedContents: async (): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<Content[]>>(
      "/contents?status=published"
    );
    return response.data;
  },

  getContentById: async (id: string): Promise<ApiResponse<Content>> => {
    const response = await apiClient.get<ApiResponse<Content>>(
      `/contents/${id}`
    );
    return response.data;
  },

  createContent: async (
    contentData: CreateContentRequest
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.post<ApiResponse<Content>>(
      "/contents",
      contentData
    );
    return response.data;
  },

  updateContent: async (
    id: string,
    contentData: UpdateContentRequest
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.put<ApiResponse<Content>>(
      `/contents/${id}`,
      contentData
    );
    return response.data;
  },

  updateContentStatus: async (
    id: string,
    status: string
  ): Promise<ApiResponse<Content>> => {
    const response = await apiClient.patch<ApiResponse<Content>>(
      `/contents/${id}/status`,
      { status }
    );
    return response.data;
  },

  deleteContent: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/contents/${id}`
    );
    return response.data;
  },

  getContentsByCategory: async (
    categoryId: string
  ): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<Content[]>>(
      `/contents?category_id=${categoryId}`
    );
    return response.data;
  },

  searchContents: async (
    params: SearchParams
  ): Promise<ApiResponse<Content[]>> => {
    const response = await apiClient.get<ApiResponse<Content[]>>(
      "/contents/search",
      { params }
    );
    return response.data;
  },

  // カテゴリ関連
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    const response = await apiClient.get<ApiResponse<Category[]>>(
      "/categories"
    );
    return response.data;
  },

  getCategoryById: async (id: string): Promise<ApiResponse<Category>> => {
    const response = await apiClient.get<ApiResponse<Category>>(
      `/categories/${id}`
    );
    return response.data;
  },

  // 評価関連
  getRatingsByUser: async (userId: string): Promise<ApiResponse<Rating[]>> => {
    const response = await apiClient.get<ApiResponse<Rating[]>>(
      `/ratings/user/${userId}`
    );
    return response.data;
  },

  createRating: async (
    contentId: string,
    value: number
  ): Promise<ApiResponse<Rating>> => {
    const response = await apiClient.post<ApiResponse<Rating>>("/ratings", {
      content_id: contentId,
      value,
    });
    return response.data;
  },

  updateRating: async (
    ratingId: string,
    value: number
  ): Promise<ApiResponse<Rating>> => {
    const response = await apiClient.put<ApiResponse<Rating>>(
      `/ratings/${ratingId}`,
      { value }
    );
    return response.data;
  },

  deleteRating: async (ratingId: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `/ratings/${ratingId}`
    );
    return response.data;
  },
  // コメント関連
  getCommentsByContentId: async (
    contentId: string
  ): Promise<ApiResponse<Comment[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Comment[]>>(
        `/contents/${contentId}/comments`
      );
      return response.data;
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
        "/comments",
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

  updateComment: async (
    commentId: string,
    commentData: UpdateCommentRequest
  ): Promise<ApiResponse<Comment>> => {
    try {
      const response = await apiClient.put<ApiResponse<Comment>>(
        `/comments/${commentId}`,
        commentData
      );
      return response.data;
    } catch (error: any) {
      return {
        data: {} as Comment,
        success: false,
        message: error.response?.data?.message || "Failed to update comment",
      };
    }
  },

  deleteComment: async (commentId: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `/comments/${commentId}`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: undefined,
        success: false,
        message: error.response?.data?.message || "Failed to delete comment",
      };
    }
  },

  // 評価関連の追加メソッド
  getAverageRating: async (
    contentId: string
  ): Promise<ApiResponse<AverageRating>> => {
    try {
      const response = await apiClient.get<ApiResponse<AverageRating>>(
        `/contents/${contentId}/rating`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: {
          average: 0,
          count: 0,
          like_count: 0,
        },
        success: false,
        message:
          error.response?.data?.message || "Failed to get average rating",
      };
    }
  },

  getRatingsByContent: async (
    contentId: string
  ): Promise<ApiResponse<Rating[]>> => {
    try {
      const response = await apiClient.get<ApiResponse<Rating[]>>(
        `/contents/${contentId}/ratings`
      );
      return response.data;
    } catch (error: any) {
      return {
        data: [],
        success: false,
        message:
          error.response?.data?.message || "Failed to get content ratings",
      };
    }
  },

  createOrUpdateRating: async (
    contentId: number,
    value: number
  ): Promise<ApiResponse<Rating>> => {
    try {
      const response = await apiClient.post<ApiResponse<Rating>>(
        "/ratings/create-or-update",
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
  ): Promise<ApiResponse<FollowStats>> => {
    try {
      const params = currentUserId ? { current_user_id: currentUserId } : {};
      const response = await apiClient.get<ApiResponse<FollowStats>>(
        `/users/${userId}/follow-stats`,
        { params }
      );
      return response.data;
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
      const response = await apiClient.get<ApiResponse<User[]>>(
        `/users/${userId}/followers`
      );
      return response.data;
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
      const response = await apiClient.get<ApiResponse<User[]>>(
        `/users/${userId}/following`
      );
      return response.data;
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
      const response = await apiClient.get<ApiResponse<Content[]>>(
        `/users/${userId}/following-feed`,
        { params }
      );
      return response.data;
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
